const Comment = require('../models/comment');
const Report = require('../models/report');
const User = require('../models/user');
const { HttpError, asyncHandler } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');

const listForReport = asyncHandler(async (req, res) => {
  if (!(await Report.exists({ _id: req.params.reportId }))) throw new HttpError(404, 'Извештајот не постои');
  const comments = await Comment.find({ report: req.params.reportId })
    .sort({ createdAt: 1 })
    .populate('author', 'username fullName role');
  res.json(comments);
});

const create = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.reportId).populate('player', 'firstName lastName');
  if (!report) throw new HttpError(404, 'Извештајот не постои');
  const comment = await Comment.create({ report: report._id, author: req.user._id, text: req.body.text });

  // notify the report's author (not when commenting on your own report)
  if (String(report.scout) !== String(req.user._id)) {
    const scout = await User.findById(report.scout);
    if (scout?.emailNotifications) sendMail({ to: scout.email, ...templates.newComment(report, comment, req.user) });
  }
  logActivity(req.user, 'create', 'Comment', comment._id, `Коментар на извештај за ${report.player?.firstName} ${report.player?.lastName}`);
  res.status(201).json(await comment.populate('author', 'username fullName role'));
});

const update = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Коментарот не постои');
  if (String(comment.author) !== String(req.user._id)) throw new HttpError(403, 'Може да ги уредувате само своите коментари');
  comment.text = req.body.text;
  await comment.save();
  logActivity(req.user, 'update', 'Comment', comment._id, 'Изменет коментар');
  res.json(await comment.populate('author', 'username fullName role'));
});

const remove = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Коментарот не постои');
  if (!canModify(req.user, comment.author)) throw new HttpError(403, 'Може да ги бришете само своите коментари');
  await comment.deleteOne();
  logActivity(req.user, 'delete', 'Comment', comment._id, 'Избришан коментар');
  res.status(204).end();
});

module.exports = { listForReport, create, update, remove };
