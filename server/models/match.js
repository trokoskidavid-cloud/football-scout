const mongoose = require('mongoose');

/**
 * @openapi
 * components:
 *   schemas:
 *     Performance:
 *       type: object
 *       required: [player]
 *       properties:
 *         player: { type: string, description: Player ObjectId }
 *         minutes: { type: integer, minimum: 0, maximum: 130, example: 90 }
 *         goals: { type: integer, minimum: 0, example: 1 }
 *         assists: { type: integer, minimum: 0, example: 0 }
 *         rating: { type: number, minimum: 1, maximum: 10, example: 7.5 }
 *     Match:
 *       type: object
 *       required: [homeClub, awayClub, date, competition]
 *       properties:
 *         _id: { type: string }
 *         homeClub: { type: string, description: Club ObjectId }
 *         awayClub: { type: string, description: Club ObjectId }
 *         date: { type: string, format: date-time }
 *         competition: { type: string, example: Prva MFL }
 *         homeScore: { type: integer, example: 2 }
 *         awayScore: { type: integer, example: 1 }
 *         performances:
 *           type: array
 *           items: { $ref: '#/components/schemas/Performance' }
 */
const performanceSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    minutes: { type: Number, min: 0, max: 130, default: 90 },
    goals: { type: Number, min: 0, max: 15, default: 0 },
    assists: { type: Number, min: 0, max: 15, default: 0 },
    rating: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    homeClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Домаќинот е задолжителен'] },
    awayClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Гостинот е задолжителен'] },
    date: { type: Date, required: [true, 'Датумот е задолжителен'] },
    competition: { type: String, required: [true, 'Натпреварувањето е задолжително'], trim: true, maxlength: 60 },
    homeScore: { type: Number, min: 0, max: 30, default: 0 },
    awayScore: { type: Number, min: 0, max: 30, default: 0 },
    performances: [performanceSchema],
  },
  { timestamps: true }
);

matchSchema.pre('validate', function sameClubs(next) {
  if (this.homeClub && this.awayClub && this.homeClub.equals(this.awayClub)) {
    this.invalidate('awayClub', 'Домаќинот и гостинот мора да се различни клубови');
  }
  next();
});

matchSchema.index({ date: -1 });
matchSchema.index({ 'performances.player': 1 });

module.exports = mongoose.model('Match', matchSchema);
