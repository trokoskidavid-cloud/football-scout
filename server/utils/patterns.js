/**
 * Regular expressions and closed value sets shared by the Mongoose schemas
 * (schema-level validation) and the validation middleware (application level).
 * The React client has an equivalent copy in client/src/utils/validators.js.
 */
const PATTERNS = {
  username: /^[a-zA-Z0-9._]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
  // at least 8 chars, one letter and one digit
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
  personName: /^[\p{L}][\p{L}\s.'-]{1,49}$/u,
  country: /^[\p{L}][\p{L}\s.'-]{1,59}$/u,
  clubName: /^[\p{L}\d][\p{L}\d\s.'&()-]{1,59}$/u,
  url: /^https?:\/\/[^\s]+$/i,
  objectId: /^[a-f\d]{24}$/i,
};

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const FEET = ['left', 'right', 'both'];
const PLAYER_STATUSES = ['monitoring', 'shortlisted', 'recommended', 'rejected'];
const RECOMMENDATIONS = ['sign', 'monitor', 'reject'];
const ROLES = ['user', 'admin'];
const RATING_KEYS = ['technique', 'physical', 'tactical', 'mental', 'potential'];
const ACTIVITY_ACTIONS = ['create', 'update', 'delete', 'login', 'register', 'import'];
const ENTITY_TYPES = ['User', 'Player', 'Club', 'Match', 'Report', 'Comment', 'Database'];

module.exports = {
  PATTERNS,
  POSITIONS,
  FEET,
  PLAYER_STATUSES,
  RECOMMENDATIONS,
  ROLES,
  RATING_KEYS,
  ACTIVITY_ACTIONS,
  ENTITY_TYPES,
};
