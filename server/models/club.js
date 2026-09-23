const mongoose = require('mongoose');
const { PATTERNS } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Club:
 *       type: object
 *       required: [name, country]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: FK Vardar }
 *         country: { type: string, example: North Macedonia }
 *         league: { type: string, example: Prva MFL }
 *         founded: { type: integer, example: 1947 }
 *         stadium: { type: string, example: Toše Proeski Arena }
 *         logoUrl: { type: string, format: uri }
 *         externalId: { type: string, description: TheSportsDB idTeam }
 */
const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Името на клубот е задолжително'],
      unique: true,
      trim: true,
      match: [PATTERNS.clubName, 'Невалидно име на клуб'],
    },
    country: {
      type: String,
      required: [true, 'Државата е задолжителна'],
      trim: true,
      match: [PATTERNS.country, 'Невалидна држава'],
    },
    league: { type: String, trim: true, maxlength: 60 },
    founded: {
      type: Number,
      min: [1850, 'Годината на основање мора да е по 1850'],
      max: [new Date().getFullYear(), 'Годината не може да е во иднина'],
    },
    stadium: { type: String, trim: true, maxlength: 80 },
    logoUrl: { type: String, trim: true, match: [PATTERNS.url, 'Невалиден URL'] },
    externalId: { type: String, index: true, sparse: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

clubSchema.virtual('playerCount', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'club',
  count: true,
});

module.exports = mongoose.model('Club', clubSchema);
