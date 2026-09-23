const Report = require('../models/report');
const Player = require('../models/player');
const Match = require('../models/match');
const Comment = require('../models/comment');
const User = require('../models/user');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');
const { RECOMMENDATIONS, RATING_KEYS, PATTERNS } = require('../utils/patterns');

const FIELDS = ['match', 'ratings', 'strengths', 'weaknesses', 'summary', 'recommendation'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? undefined : body[k]]));

const populate = (q) =>
  q.populate({ path: 'player', select: 'firstName lastName position photoUrl club', populate: { path: 'club', select: 'name' } })
    .populate('scout', 'username fullName')
    .populate({ path: 'match', populate: [{ path: 'homeClub', select: 'name' }, { path: 'awayClub', select: 'name' }] })
    .populate('commentCount');

function buildFilter(query, user) {
  const filter = {};
  if (query.player && PATTERNS.objectId.test(query.player)) filter.player = query.player;
  if (query.recommendation && RECOMMENDATIONS.includes(query.recommendation)) filter.recommendation = query.recommendation;
  if (query.scout && PATTERNS.objectId.test(query.scout)) filter.scout = query.scout;
  if (query.mine === 'true' && user) filter.scout = user._id;
  if (query.minOverall) filter.overall = { $gte: Number(query.minOverall) };
  return filter;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = buildFilter(req.query, req.user);
  const sort = req.query.sort === 'rating' ? { overall: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    populate(Report.find(filter).sort(sort).skip(skip).limit(limit)),
    Report.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const report = await populate(Report.findById(req.params.id));
  if (!report) throw new HttpError(404, 'Извештајот не постои');
  res.json(report);
});

async function assertRefs({ player, match }) {
  if (player && !(await Player.exists({ _id: player }))) throw new HttpError(400, 'Играчот не постои', { player: 'не постои' });
  if (match && !(await Match.exists({ _id: match }))) throw new HttpError(400, 'Натпреварот не постои', { match: 'не постои' });
}

const create = asyncHandler(async (req, res) => {
  await assertRefs(req.body);
  const report = new Report({ ...pick(req.body), player: req.body.player, scout: req.user._id });
  await report.save();
  const player = await Player.findById(report.player);

  // business rule: a "sign" recommendation moves a monitored player to the shortlist
  if (report.recommendation === 'sign' && player.status === 'monitoring') {
    player.status = 'shortlisted';
    await player.save();
  }
  if (report.recommendation === 'sign') {
    const admins = await User.find({ role: 'admin', emailNotifications: true }).select('email');
    admins.forEach((a) => sendMail({ to: a.email, ...templates.playerRecommended(player, req.user) }));
  }
  logActivity(req.user, 'create', 'Report', report._id, `Извештај за ${player.fullName} (${report.overall})`);
  res.status(201).json(await populate(Report.findById(report._id)));
});

const update = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Извештајот не постои');
  if (!canModify(req.user, report.scout)) throw new HttpError(403, 'Може да ги менувате само своите извештаи');
  await assertRefs(req.body);
  const data = pick(req.body);
  if (data.ratings) data.ratings = { ...report.toObject().ratings, ...data.ratings };
  report.set(data);
  await report.save(); // pre('save') recomputes overall
  logActivity(req.user, 'update', 'Report', report._id, `Ажуриран извештај (${report.overall})`);
  res.json(await populate(Report.findById(report._id)));
});

const remove = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Извештајот не постои');
  if (!canModify(req.user, report.scout)) throw new HttpError(403, 'Може да ги бришете само своите извештаи');
  await Comment.deleteMany({ report: report._id });
  await report.deleteOne();
  logActivity(req.user, 'delete', 'Report', report._id, 'Избришан извештај со коментари');
  res.status(204).end();
});

/** GET /api/reports/export.csv – report generation (CSV download) */
const exportCsv = asyncHandler(async (req, res) => {
  const reports = await populate(Report.find(buildFilter(req.query, req.user)).sort({ createdAt: -1 }));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Датум', 'Играч', 'Позиција', 'Клуб', 'Скаут', ...RATING_KEYS, 'Просек', 'Препорака', 'Резиме'];
  const rows = reports.map((r) => [
    r.createdAt.toISOString().slice(0, 10),
    r.player ? `${r.player.firstName} ${r.player.lastName}` : '',
    r.player?.position,
    r.player?.club?.name,
    r.scout?.username,
    ...RATING_KEYS.map((k) => r.ratings[k]),
    r.overall,
    r.recommendation,
    r.summary,
  ].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="footballscout-reports-${Date.now()}.csv"`);
  res.send(`﻿${header.map(esc).join(',')}\n${rows.join('\n')}`);
});

module.exports = { list, getOne, create, update, remove, exportCsv };
