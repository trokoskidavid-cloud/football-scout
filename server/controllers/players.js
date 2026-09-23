const mongoose = require('mongoose');
const Player = require('../models/player');
const Report = require('../models/report');
const Comment = require('../models/comment');
const Match = require('../models/match');
const Club = require('../models/club');
const { HttpError, asyncHandler, pagination, escapeRegex } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { POSITIONS, PLAYER_STATUSES } = require('../utils/patterns');

const FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'position', 'preferredFoot',
  'heightCm', 'marketValue', 'club', 'status', 'photoUrl', 'notes'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? undefined : body[k]]));

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

// Macedonian Cyrillic -> Latin, so "Петровски" also finds "Petrovski"
const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dj', ш: 'sh' };
const toLatin = (str) => str.toLowerCase().split('').map((ch) => CYR[ch] ?? ch).join('');
const SORTS = {
  rating: { avgRating: -1, lastName: 1 },
  age: { dateOfBirth: -1 },
  value: { marketValue: -1 },
  name: { lastName: 1, firstName: 1 },
  newest: { createdAt: -1 },
};

/**
 * GET /api/players – list with filtering, sorting and pagination.
 * avgRating / reportCount are computed from the dependent Reports collection.
 */
const list = asyncHandler(async (req, res) => {
  const { q, position, status, nationality, club, minAge, maxAge, minRating, maxValue, sort } = req.query;
  const { page, limit, skip } = pagination(req.query);
  const match = {};

  if (q && String(q).trim()) {
    const terms = [...new Set([String(q).trim(), toLatin(String(q).trim())])];
    const rxs = terms.map((t) => new RegExp(escapeRegex(t), 'i'));
    const clubs = await Club.find({ $or: rxs.map((rx) => ({ name: rx })) }).select('_id');
    match.$or = [
      ...rxs.flatMap((rx) => [{ firstName: rx }, { lastName: rx }, { nationality: rx }]),
      ...(clubs.length ? [{ club: { $in: clubs.map((c) => c._id) } }] : []),
    ];
  }
  if (position) {
    const list = String(position).split(',').filter((p) => POSITIONS.includes(p));
    if (list.length) match.position = { $in: list };
  }
  if (status && PLAYER_STATUSES.includes(status)) match.status = status;
  if (nationality) match.nationality = new RegExp(`^${escapeRegex(nationality)}$`, 'i');
  if (club && mongoose.isValidObjectId(club)) match.club = new mongoose.Types.ObjectId(club);
  if (maxValue) match.marketValue = { $lte: Number(maxValue) };
  if (minAge || maxAge) {
    match.dateOfBirth = {};
    if (minAge) match.dateOfBirth.$lte = new Date(Date.now() - Number(minAge) * YEAR_MS);
    if (maxAge) match.dateOfBirth.$gt = new Date(Date.now() - (Number(maxAge) + 1) * YEAR_MS);
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'reports', localField: '_id', foreignField: 'player', as: 'reports' } },
    { $addFields: { avgRating: { $round: [{ $avg: '$reports.overall' }, 1] }, reportCount: { $size: '$reports' } } },
    { $project: { reports: 0 } },
  ];
  if (minRating) pipeline.push({ $match: { avgRating: { $gte: Number(minRating) } } });

  const [result] = await Player.aggregate([
    ...pipeline,
    {
      $facet: {
        items: [
          { $sort: SORTS[sort] || SORTS.name },
          { $skip: skip },
          { $limit: limit },
          { $lookup: { from: 'clubs', localField: 'club', foreignField: '_id', as: 'club' } },
          { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ]);
  const total = result.total[0]?.n || 0;
  res.json({ items: result.items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id).populate('club').populate('createdBy', 'username');
  if (!player) throw new HttpError(404, 'Играчот не постои');

  const reports = await Report.find({ player: player._id })
    .sort({ createdAt: -1 })
    .populate('scout', 'username')
    .populate({ path: 'match', populate: [{ path: 'homeClub', select: 'name' }, { path: 'awayClub', select: 'name' }] });

  const avg = (k) => (reports.length ? Math.round((reports.reduce((s, r) => s + r.ratings[k], 0) / reports.length) * 10) / 10 : null);
  const averages = reports.length
    ? { technique: avg('technique'), physical: avg('physical'), tactical: avg('tactical'), mental: avg('mental'), potential: avg('potential') }
    : null;
  const avgRating = reports.length ? Math.round((reports.reduce((s, r) => s + r.overall, 0) / reports.length) * 10) / 10 : null;

  res.json({ ...player.toJSON(), reports, averages, avgRating, reportCount: reports.length });
});

/** GET /api/players/:id/stats – aggregated match statistics */
const stats = asyncHandler(async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params.id);
  const [agg] = await Match.aggregate([
    { $match: { 'performances.player': id } },
    { $unwind: '$performances' },
    { $match: { 'performances.player': id } },
    {
      $group: {
        _id: null,
        appearances: { $sum: 1 },
        minutes: { $sum: '$performances.minutes' },
        goals: { $sum: '$performances.goals' },
        assists: { $sum: '$performances.assists' },
        avgMatchRating: { $avg: '$performances.rating' },
      },
    },
  ]);
  const matches = await Match.find({ 'performances.player': id })
    .sort({ date: 1 })
    .populate('homeClub', 'name')
    .populate('awayClub', 'name');
  const timeline = matches.map((m) => {
    const p = m.performances.find((x) => x.player.equals(id));
    return { matchId: m._id, date: m.date, label: `${m.homeClub?.name} ${m.homeScore}:${m.awayScore} ${m.awayClub?.name}`, goals: p.goals, assists: p.assists, rating: p.rating, minutes: p.minutes };
  });
  res.json({
    appearances: agg?.appearances || 0,
    minutes: agg?.minutes || 0,
    goals: agg?.goals || 0,
    assists: agg?.assists || 0,
    avgMatchRating: agg?.avgMatchRating ? Math.round(agg.avgMatchRating * 10) / 10 : null,
    timeline,
  });
});

const create = asyncHandler(async (req, res) => {
  const player = await Player.create({ ...pick(req.body), createdBy: req.user._id });
  logActivity(req.user, 'create', 'Player', player._id, `Додаден играч ${player.fullName}`);
  res.status(201).json(player);
});

/** Admin or the scout who added the player can edit it. */
const update = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) throw new HttpError(404, 'Играчот не постои');
  if (!canModify(req.user, player.createdBy)) throw new HttpError(403, 'Може да ги уредувате само играчите што сте ги додале');
  const before = player.status;
  player.set(pick(req.body));
  await player.save();
  const extra = before !== player.status ? ` (статус: ${before} → ${player.status})` : '';
  logActivity(req.user, 'update', 'Player', player._id, `Ажуриран играч ${player.fullName}${extra}`);
  res.json(player);
});

/** Admin only – cascades to reports and their comments. */
const remove = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) throw new HttpError(404, 'Играчот не постои');
  const reports = await Report.find({ player: player._id }).select('_id');
  const ids = reports.map((r) => r._id);
  const { deletedCount: comments } = await Comment.deleteMany({ report: { $in: ids } });
  await Report.deleteMany({ _id: { $in: ids } });
  await Match.updateMany({}, { $pull: { performances: { player: player._id } } });
  await player.deleteOne();
  logActivity(req.user, 'delete', 'Player', player._id,
    `Избришан играч ${player.fullName} (+${ids.length} извештаи, ${comments} коментари)`);
  res.status(204).end();
});

/** GET /api/players/:id/dependencies – how many docs a delete would remove (for the confirm modal) */
const dependencies = asyncHandler(async (req, res) => {
  const reports = await Report.find({ player: req.params.id }).select('_id');
  const comments = await Comment.countDocuments({ report: { $in: reports.map((r) => r._id) } });
  res.json({ reports: reports.length, comments });
});

module.exports = { list, getOne, stats, create, update, remove, dependencies };
