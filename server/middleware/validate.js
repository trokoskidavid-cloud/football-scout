/**
 * Application-level validation (before data reaches the controllers / Mongoose).
 * Each rule set maps a (dotted) field path to constraints.
 * With { partial: true } (PUT/PATCH) required fields are only checked if present.
 */
const {
  PATTERNS, POSITIONS, FEET, PLAYER_STATUSES, RECOMMENDATIONS, ROLES, RATING_KEYS,
} = require('../utils/patterns');
const { HttpError } = require('../utils/http');

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const isEmpty = (v) => v === undefined || v === null || v === '';

function checkField(value, rule) {
  if (rule.type === 'number' || rule.type === 'integer') {
    const n = Number(value);
    if (Number.isNaN(n)) return 'мора да е број';
    if (rule.type === 'integer' && !Number.isInteger(n)) return 'мора да е цел број';
    if (rule.min !== undefined && n < rule.min) return `минимум ${rule.min}`;
    if (rule.max !== undefined && n > rule.max) return `максимум ${rule.max}`;
    return null;
  }
  if (rule.type === 'date') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'невалиден датум';
    return null;
  }
  if (rule.type === 'boolean') {
    return typeof value === 'boolean' ? null : 'мора да е true/false';
  }
  if (typeof value !== 'string') return 'мора да е текст';
  const s = value.trim();
  if (rule.minLength && s.length < rule.minLength) return `најмалку ${rule.minLength} знаци`;
  if (rule.maxLength && s.length > rule.maxLength) return `најмногу ${rule.maxLength} знаци`;
  if (rule.enum && !rule.enum.includes(s)) return `дозволени вредности: ${rule.enum.join(', ')}`;
  if (rule.pattern && !rule.pattern.test(s)) return rule.message || 'невалиден формат';
  return null;
}

const validate = (rules, { partial = false } = {}) => (req, _res, next) => {
  const errors = {};
  for (const [path, rule] of Object.entries(rules)) {
    const value = get(req.body, path);
    if (isEmpty(value)) {
      if (rule.required && !partial) errors[path] = 'задолжително поле';
      continue;
    }
    const err = checkField(value, rule);
    if (err) errors[path] = err;
  }
  if (Object.keys(errors).length) return next(new HttpError(400, 'Податоците не се валидни', errors));
  return next();
};

/** Validates :id style route params as MongoDB ObjectIds */
const validateId = (param = 'id') => (req, _res, next) =>
  PATTERNS.objectId.test(req.params[param])
    ? next()
    : next(new HttpError(400, `Невалиден идентификатор „${req.params[param]}“`));

const rules = {
  register: {
    username: { required: true, pattern: PATTERNS.username, message: '3–20 знаци: букви, бројки, . и _' },
    email: { required: true, pattern: PATTERNS.email, message: 'невалидна е-пошта' },
    password: { required: true, pattern: PATTERNS.password, message: 'мин. 8 знаци, барем една буква и една бројка' },
    fullName: { pattern: PATTERNS.personName, message: 'невалидно име' },
    country: { pattern: PATTERNS.country, message: 'невалидна држава' },
    emailNotifications: { type: 'boolean' },
  },
  login: {
    email: { required: true, pattern: PATTERNS.email, message: 'невалидна е-пошта' },
    password: { required: true, minLength: 1 },
  },
  userUpdate: {
    role: { enum: ROLES },
    fullName: { pattern: PATTERNS.personName, message: 'невалидно име' },
    country: { pattern: PATTERNS.country, message: 'невалидна држава' },
    emailNotifications: { type: 'boolean' },
  },
  club: {
    name: { required: true, pattern: PATTERNS.clubName, message: 'невалидно име на клуб' },
    country: { required: true, pattern: PATTERNS.country, message: 'невалидна држава' },
    league: { maxLength: 60 },
    founded: { type: 'integer', min: 1850, max: new Date().getFullYear() },
    stadium: { maxLength: 80 },
    logoUrl: { pattern: PATTERNS.url, message: 'невалиден URL' },
  },
  player: {
    firstName: { required: true, pattern: PATTERNS.personName, message: 'невалидно име' },
    lastName: { required: true, pattern: PATTERNS.personName, message: 'невалидно презиме' },
    dateOfBirth: { required: true, type: 'date' },
    nationality: { required: true, pattern: PATTERNS.country, message: 'невалидна националност' },
    position: { required: true, enum: POSITIONS },
    preferredFoot: { enum: FEET },
    heightCm: { type: 'integer', min: 150, max: 215 },
    marketValue: { type: 'number', min: 0, max: 500000000 },
    club: { pattern: PATTERNS.objectId, message: 'невалиден клуб' },
    status: { enum: PLAYER_STATUSES },
    photoUrl: { pattern: PATTERNS.url, message: 'невалиден URL' },
    notes: { maxLength: 1000 },
  },
  match: {
    homeClub: { required: true, pattern: PATTERNS.objectId, message: 'невалиден клуб' },
    awayClub: { required: true, pattern: PATTERNS.objectId, message: 'невалиден клуб' },
    date: { required: true, type: 'date' },
    competition: { required: true, minLength: 2, maxLength: 60 },
    homeScore: { type: 'integer', min: 0, max: 30 },
    awayScore: { type: 'integer', min: 0, max: 30 },
  },
  report: {
    player: { required: true, pattern: PATTERNS.objectId, message: 'невалиден играч' },
    match: { pattern: PATTERNS.objectId, message: 'невалиден натпревар' },
    ...Object.fromEntries(RATING_KEYS.map((k) => [`ratings.${k}`, { required: true, type: 'integer', min: 1, max: 10 }])),
    strengths: { maxLength: 500 },
    weaknesses: { maxLength: 500 },
    summary: { required: true, minLength: 10, maxLength: 2000 },
    recommendation: { required: true, enum: RECOMMENDATIONS },
  },
  comment: {
    text: { required: true, minLength: 2, maxLength: 500 },
  },
};

module.exports = { validate, validateId, rules };
