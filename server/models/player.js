const mongoose = require('mongoose');
const { PATTERNS, POSITIONS, FEET, PLAYER_STATUSES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       required: [firstName, lastName, dateOfBirth, nationality, position]
 *       properties:
 *         _id: { type: string }
 *         firstName: { type: string, example: Marko }
 *         lastName: { type: string, example: Petrovski }
 *         dateOfBirth: { type: string, format: date, example: 2007-03-14 }
 *         nationality: { type: string, example: North Macedonia }
 *         position: { type: string, enum: [GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST] }
 *         preferredFoot: { type: string, enum: [left, right, both] }
 *         heightCm: { type: integer, minimum: 150, maximum: 215, example: 184 }
 *         marketValue: { type: number, minimum: 0, example: 450000 }
 *         club: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Club' } ] }
 *         status: { type: string, enum: [monitoring, shortlisted, recommended, rejected] }
 *         photoUrl: { type: string, format: uri }
 *         notes: { type: string }
 *         bio: { type: string, description: Biography imported from TheSportsDB }
 *         externalId: { type: string, description: TheSportsDB idPlayer }
 *         createdBy: { type: string }
 *         avgRating: { type: number, description: Average overall rating from reports (computed) }
 *         reportCount: { type: integer }
 *     PlayerInput:
 *       type: object
 *       required: [firstName, lastName, dateOfBirth, nationality, position]
 *       properties:
 *         firstName: { type: string, example: Marko }
 *         lastName: { type: string, example: Petrovski }
 *         dateOfBirth: { type: string, format: date, example: 2007-03-14 }
 *         nationality: { type: string, example: North Macedonia }
 *         position: { type: string, example: ST }
 *         preferredFoot: { type: string, example: right }
 *         heightCm: { type: integer, example: 184 }
 *         marketValue: { type: number, example: 450000 }
 *         club: { type: string, description: Club ObjectId }
 *         status: { type: string, example: monitoring }
 *         photoUrl: { type: string }
 *         notes: { type: string }
 */
const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Името е задолжително'],
      trim: true,
      match: [PATTERNS.personName, 'Невалидно име'],
    },
    lastName: {
      type: String,
      required: [true, 'Презимето е задолжително'],
      trim: true,
      match: [PATTERNS.personName, 'Невалидно презиме'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Датумот на раѓање е задолжителен'],
      validate: {
        validator(v) {
          const age = (Date.now() - v.getTime()) / (365.25 * 24 * 3600 * 1000);
          return age >= 14 && age <= 45;
        },
        message: 'Играчот мора да има помеѓу 14 и 45 години',
      },
    },
    nationality: {
      type: String,
      required: [true, 'Националноста е задолжителна'],
      trim: true,
      match: [PATTERNS.country, 'Невалидна националност'],
    },
    position: {
      type: String,
      required: [true, 'Позицијата е задолжителна'],
      enum: { values: POSITIONS, message: 'Непозната позиција: {VALUE}' },
    },
    preferredFoot: { type: String, enum: FEET, default: 'right' },
    heightCm: { type: Number, min: [150, 'Висина мин. 150 cm'], max: [215, 'Висина макс. 215 cm'] },
    marketValue: { type: Number, min: [0, 'Вредноста не може да е негативна'], default: 0 },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    status: { type: String, enum: PLAYER_STATUSES, default: 'monitoring' },
    photoUrl: { type: String, trim: true, match: [PATTERNS.url, 'Невалиден URL'] },
    notes: { type: String, maxlength: 1000 },
    bio: { type: String, maxlength: 5000 },
    externalId: { type: String, index: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

playerSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

playerSchema.index({ lastName: 1, firstName: 1 });
playerSchema.index({ firstName: 'text', lastName: 'text', nationality: 'text' });

module.exports = mongoose.model('Player', playerSchema);
