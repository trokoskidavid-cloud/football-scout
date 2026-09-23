const Player = require('../models/player');
const Club = require('../models/club');
const Match = require('../models/match');
const Report = require('../models/report');
const User = require('../models/user');
const { asyncHandler } = require('../utils/http');

/** GET /api/stats/overview – data for the home page and the charts dashboard */
const overview = asyncHandler(async (_req, res) => {
  const [players, clubs, matches, reports, scouts, byRecommendation, byPosition, topScorers, topScouts, byStatus, monthly] =
    await Promise.all([
      Player.countDocuments(),
      Club.countDocuments(),
      Match.countDocuments(),
      Report.countDocuments(),
      User.countDocuments(),
      Report.aggregate([{ $group: { _id: '$recommendation', count: { $sum: 1 } } }]),
      Report.aggregate([
        { $lookup: { from: 'players', localField: 'player', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $group: { _id: '$p.position', avg: { $avg: '$overall' }, count: { $sum: 1 } } },
        { $project: { avg: { $round: ['$avg', 1] }, count: 1 } },
        { $sort: { avg: -1 } },
      ]),
      Match.aggregate([
        { $unwind: '$performances' },
        { $group: { _id: '$performances.player', goals: { $sum: '$performances.goals' }, assists: { $sum: '$performances.assists' } } },
        { $sort: { goals: -1, assists: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $project: { goals: 1, assists: 1, name: { $concat: ['$p.firstName', ' ', '$p.lastName'] } } },
      ]),
      Report.aggregate([
        { $group: { _id: '$scout', reports: { $sum: 1 }, avg: { $avg: '$overall' } } },
        { $sort: { reports: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
        { $unwind: '$u' },
        { $project: { reports: 1, avg: { $round: ['$avg', 1] }, username: '$u.username' } },
      ]),
      Player.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        { $sort: { _id: 1 } },
      ]),
    ]);

  res.json({
    counts: { players, clubs, matches, reports, scouts },
    byRecommendation,
    byPosition,
    byStatus,
    topScorers,
    topScouts,
    monthly,
  });
});

module.exports = { overview };
