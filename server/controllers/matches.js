const Match = require('../models/match');
const Report = require('../models/report');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { PATTERNS } = require('../utils/patterns');

const FIELDS = ['homeClub', 'awayClub', 'date', 'competition', 'homeScore', 'awayScore', 'performances'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const populate = (q) =>
  q.populate('homeClub', 'name logoUrl')
    .populate('awayClub', 'name logoUrl')
    .populate('performances.player', 'firstName lastName position');

function checkPerformances(perfs) {
  if (perfs === undefined) return;
  if (!Array.isArray(perfs)) throw new HttpError(400, 'performances мора да е низа');
  const seen = new Set();
  perfs.forEach((p, i) => {
    if (!PATTERNS.objectId.test(String(p.player))) throw new HttpError(400, `performances[${i}].player е невалиден`);
    if (seen.has(String(p.player))) throw new HttpError(400, 'Играчот е внесен повеќе пати во ист натпревар');
    seen.add(String(p.player));
  });
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 20);
  const filter = {};
  if (req.query.club && PATTERNS.objectId.test(req.query.club)) {
    filter.$or = [{ homeClub: req.query.club }, { awayClub: req.query.club }];
  }
  const [items, total] = await Promise.all([
    populate(Match.find(filter).sort({ date: -1 }).skip(skip).limit(limit)),
    Match.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const match = await populate(Match.findById(req.params.id));
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  res.json(match);
});

const create = asyncHandler(async (req, res) => {
  checkPerformances(req.body.performances);
  const match = await Match.create(pick(req.body));
  logActivity(req.user, 'create', 'Match', match._id, `Внесен натпревар (${match.competition})`);
  res.status(201).json(await populate(Match.findById(match._id)));
});

const update = asyncHandler(async (req, res) => {
  checkPerformances(req.body.performances);
  const match = await Match.findById(req.params.id);
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  match.set(pick(req.body));
  await match.save();
  logActivity(req.user, 'update', 'Match', match._id, `Ажуриран натпревар (${match.competition})`);
  res.json(await populate(Match.findById(match._id)));
});

const remove = asyncHandler(async (req, res) => {
  const match = await Match.findByIdAndDelete(req.params.id);
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  await Report.updateMany({ match: match._id }, { $unset: { match: 1 } });
  logActivity(req.user, 'delete', 'Match', match._id, `Избришан натпревар (${match.competition})`);
  res.status(204).end();
});

module.exports = { list, getOne, create, update, remove };
