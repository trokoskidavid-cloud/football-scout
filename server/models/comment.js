const mongoose = require('mongoose');

/**
 * @openapi
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         report: { type: string }
 *         author: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         text: { type: string, example: 'I agree, very fast player.' }
 *         createdAt: { type: string, format: date-time }
 */
const commentSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: {
      type: String,
      required: [true, 'Коментарот не може да е празен'],
      trim: true,
      minlength: [2, 'Коментарот мора да има најмалку 2 знаци'],
      maxlength: [500, 'Коментарот може да има најмногу 500 знаци'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
