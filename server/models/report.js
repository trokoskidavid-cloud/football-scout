const mongoose = require('mongoose');
const { RECOMMENDATIONS, RATING_KEYS } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Ratings:
 *       type: object
 *       required: [technique, physical, tactical, mental, potential]
 *       properties:
 *         technique: { type: integer, minimum: 1, maximum: 10, example: 8 }
 *         physical: { type: integer, minimum: 1, maximum: 10, example: 7 }
 *         tactical: { type: integer, minimum: 1, maximum: 10, example: 8 }
 *         mental: { type: integer, minimum: 1, maximum: 10, example: 9 }
 *         potential: { type: integer, minimum: 1, maximum: 10, example: 9 }
 *     Report:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         player: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Player' } ] }
 *         scout: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         match: { type: string, nullable: true }
 *         ratings: { $ref: '#/components/schemas/Ratings' }
 *         overall: { type: number, example: 8.2 }
 *         strengths: { type: string }
 *         weaknesses: { type: string }
 *         summary: { type: string }
 *         recommendation: { type: string, enum: [sign, monitor, reject] }
 *         commentCount: { type: integer }
 *         createdAt: { type: string, format: date-time }
 *     ReportInput:
 *       type: object
 *       required: [player, ratings, summary, recommendation]
 *       properties:
 *         player: { type: string, description: Player ObjectId }
 *         match: { type: string, description: Match ObjectId (optional) }
 *         ratings: { $ref: '#/components/schemas/Ratings' }
 *         strengths: { type: string, example: 'Finishing, off-the-ball movement' }
 *         weaknesses: { type: string, example: Weak left foot }
 *         summary: { type: string, example: 'Excellent performance, scored and assisted.' }
 *         recommendation: { type: string, enum: [sign, monitor, reject] }
 */
const ratingField = {
  type: Number,
  required: true,
  min: [1, 'Оценката мора да е меѓу 1 и 10'],
  max: [10, 'Оценката мора да е меѓу 1 и 10'],
  validate: { validator: Number.isInteger, message: 'Оценката мора да е цел број' },
};

const reportSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: [true, 'Играчот е задолжителен'] },
    scout: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    ratings: Object.fromEntries(RATING_KEYS.map((k) => [k, ratingField])),
    overall: { type: Number, min: 1, max: 10 },
    strengths: { type: String, trim: true, maxlength: 500 },
    weaknesses: { type: String, trim: true, maxlength: 500 },
    summary: {
      type: String,
      required: [true, 'Резимето е задолжително'],
      trim: true,
      minlength: [10, 'Резимето мора да има најмалку 10 знаци'],
      maxlength: [2000, 'Резимето може да има најмногу 2000 знаци'],
    },
    recommendation: {
      type: String,
      required: [true, 'Препораката е задолжителна'],
      enum: { values: RECOMMENDATIONS, message: 'Непозната препорака: {VALUE}' },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// overall = average of the five ratings (rounded to one decimal)
reportSchema.pre('save', function computeOverall(next) {
  if (this.ratings) {
    const values = RATING_KEYS.map((k) => this.ratings[k]).filter((v) => typeof v === 'number');
    if (values.length) this.overall = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }
  next();
});

reportSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'report',
  count: true,
});

reportSchema.index({ player: 1, createdAt: -1 });
reportSchema.index({ scout: 1 });

module.exports = mongoose.model('Report', reportSchema);
