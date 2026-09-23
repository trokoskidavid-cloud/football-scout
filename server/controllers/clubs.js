const Club = require('../models/club');
const Player = require('../models/player');
const Match = require('../models/match');
const { HttpError, asyncHandler, escapeRegex } = require('../utils/http');
const { logActivity } = require('../services/activity');

const FIELDS = ['name', 'country', 'league', 'founded', 'stadium', 'logoUrl'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.name = { $regex: escapeRegex(req.query.q), $options: 'i' };
  const clubs = await Club.find(filter).sort({ name: 1 }).populate('playerCount');
  res.json(clubs);
});

const getOne = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id).populate('playerCount');
  if (!club) throw new HttpError(404, 'Клубот не постои');
  const players = await Player.aggregate([
    { $match: { club: club._id } },
    { $lookup: { from: 'reports', localField: '_id', foreignField: 'player', as: 'reports' } },
    { $addFields: { avgRating: { $round: [{ $avg: '$reports.overall' }, 1] }, reportCount: { $size: '$reports' } } },
    { $project: { reports: 0 } },
    { $sort: { lastName: 1 } },
  ]);
  res.json({ ...club.toJSON(), players });
});

const create = asyncHandler(async (req, res) => {
  const club = await Club.create(pick(req.body));
  logActivity(req.user, 'create', 'Club', club._id, `Креиран клуб ${club.name}`);
  res.status(201).json(club);
});

const update = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw new HttpError(404, 'Клубот не постои');
  club.set(pick(req.body));
  await club.save();
  logActivity(req.user, 'update', 'Club', club._id, `Ажуриран клуб ${club.name}`);
  res.json(club);
});

const remove = asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw new HttpError(404, 'Клубот не постои');
  const matches = await Match.countDocuments({ $or: [{ homeClub: club._id }, { awayClub: club._id }] });
  if (matches > 0) throw new HttpError(409, `Клубот има ${matches} натпревари – прво избришете ги`);
  await Player.updateMany({ club: club._id }, { $unset: { club: 1 } }); // players become free agents
  await club.deleteOne();
  logActivity(req.user, 'delete', 'Club', club._id, `Избришан клуб ${club.name}`);
  res.status(204).end();
});

module.exports = { list, getOne, create, update, remove };
