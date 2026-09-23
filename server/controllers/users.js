const User = require('../models/user');
const Report = require('../models/report');
const Comment = require('../models/comment');
const { HttpError, asyncHandler } = require('../utils/http');
const { logActivity } = require('../services/activity');

const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const counts = await Report.aggregate([{ $group: { _id: '$scout', n: { $sum: 1 } } }]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(users.map((u) => ({ ...u.toJSON(), reportCount: byUser[String(u._id)] || 0 })));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  res.json(user);
});

/** Admin: any field incl. role. User: only own fullName/country/emailNotifications. */
const update = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && req.user._id !== req.params.id) throw new HttpError(403, 'Може да го менувате само својот профил');
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');

  const allowed = ['fullName', 'country', 'emailNotifications', ...(isAdmin ? ['role'] : [])];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) user[k] = req.body[k];
  });
  if (isAdmin && req.body.role && req.user._id === req.params.id && req.body.role !== 'admin') {
    throw new HttpError(400, 'Администраторот не може сам да си ја одземе улогата');
  }
  await user.save();
  logActivity(req.user, 'update', 'User', user._id, `Ажуриран корисник ${user.username}`);
  res.json(user);
});

const remove = asyncHandler(async (req, res) => {
  if (req.user._id === req.params.id) throw new HttpError(400, 'Не може да се избришете самите себе');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  // cascade: the user's comments; reports stay but lose their author reference only if we delete them
  const reports = await Report.find({ scout: user._id }).select('_id');
  await Comment.deleteMany({ $or: [{ author: user._id }, { report: { $in: reports.map((r) => r._id) } }] });
  await Report.deleteMany({ scout: user._id });
  logActivity(req.user, 'delete', 'User', user._id, `Избришан корисник ${user.username}`);
  res.status(204).end();
});

module.exports = { list, getOne, update, remove };
