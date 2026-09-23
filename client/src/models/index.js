/**
 * Client-side classes equivalent to the MongoDB documents.
 * Each class wraps the JSON returned by the REST API and adds derived properties.
 */
import { age } from '../pipes';

const RATING_KEYS = ['technique', 'physical', 'tactical', 'mental', 'potential'];

export class User {
  constructor(json = {}) {
    this._id = json._id;
    this.username = json.username || '';
    this.email = json.email || '';
    this.fullName = json.fullName || '';
    this.country = json.country || '';
    this.role = json.role || 'user';
    this.emailNotifications = json.emailNotifications ?? true;
    this.reportCount = json.reportCount ?? 0;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get isAdmin() { return this.role === 'admin'; }
  get displayName() { return this.fullName || this.username; }
}

export class Club {
  constructor(json = {}) {
    this._id = json._id;
    this.name = json.name || '';
    this.country = json.country || '';
    this.league = json.league || '';
    this.founded = json.founded ?? '';
    this.stadium = json.stadium || '';
    this.logoUrl = json.logoUrl || '';
    this.externalId = json.externalId || null;
    this.playerCount = json.playerCount ?? 0;
    this.players = (json.players || []).map((p) => new Player(p));
  }
  toPayload() {
    const { name, country, league, founded, stadium, logoUrl } = this;
    return { name, country, league, founded: founded === '' ? undefined : Number(founded), stadium, logoUrl: logoUrl || undefined };
  }
}

export class Player {
  constructor(json = {}) {
    this._id = json._id;
    this.firstName = json.firstName || '';
    this.lastName = json.lastName || '';
    this.dateOfBirth = json.dateOfBirth ? String(json.dateOfBirth).slice(0, 10) : '';
    this.nationality = json.nationality || '';
    this.position = json.position || '';
    this.preferredFoot = json.preferredFoot || 'right';
    this.heightCm = json.heightCm ?? '';
    this.marketValue = json.marketValue ?? '';
    this.club = json.club && typeof json.club === 'object' ? new Club(json.club) : null;
    this.clubId = json.club?._id || (typeof json.club === 'string' ? json.club : '');
    this.status = json.status || 'monitoring';
    this.photoUrl = json.photoUrl || '';
    this.notes = json.notes || '';
    this.bio = json.bio || '';
    this.externalId = json.externalId || null;
    this.createdBy = json.createdBy?._id || json.createdBy || null;
    this.avgRating = json.avgRating ?? null;
    this.reportCount = json.reportCount ?? 0;
    this.averages = json.averages || null;
    this.reports = (json.reports || []).map((r) => new Report(r));
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : null;
  }
  get fullName() { return `${this.firstName} ${this.lastName}`.trim(); }
  get age() { return age(this.dateOfBirth); }
  get photo() { return this.photoUrl || `https://ui-avatars.com/api/?background=146c43&color=fff&name=${encodeURIComponent(this.fullName)}`; }
  toPayload() {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    return {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      dateOfBirth: this.dateOfBirth,
      nationality: this.nationality.trim(),
      position: this.position,
      preferredFoot: this.preferredFoot,
      heightCm: num(this.heightCm),
      marketValue: num(this.marketValue),
      club: this.clubId || '', // '' -> server unsets the club (free agent)
      status: this.status,
      photoUrl: this.photoUrl.trim(),
      notes: this.notes,
    };
  }
}

export class Match {
  constructor(json = {}) {
    this._id = json._id;
    this.homeClub = json.homeClub && typeof json.homeClub === 'object' ? new Club(json.homeClub) : null;
    this.awayClub = json.awayClub && typeof json.awayClub === 'object' ? new Club(json.awayClub) : null;
    this.date = json.date ? new Date(json.date) : null;
    this.competition = json.competition || '';
    this.homeScore = json.homeScore ?? 0;
    this.awayScore = json.awayScore ?? 0;
    this.performances = (json.performances || []).map((p) => ({
      ...p,
      player: p.player && typeof p.player === 'object' ? new Player(p.player) : p.player,
    }));
  }
  get title() { return `${this.homeClub?.name || '?'} ${this.homeScore}:${this.awayScore} ${this.awayClub?.name || '?'}`; }
  get totalGoals() { return this.homeScore + this.awayScore; }
}

export class Report {
  constructor(json = {}) {
    this._id = json._id;
    this.player = json.player && typeof json.player === 'object' ? new Player(json.player) : null;
    this.playerId = json.player?._id || (typeof json.player === 'string' ? json.player : '');
    this.scout = json.scout && typeof json.scout === 'object' ? new User(json.scout) : null;
    this.match = json.match && typeof json.match === 'object' ? new Match(json.match) : null;
    this.matchId = json.match?._id || (typeof json.match === 'string' ? json.match : '');
    this.ratings = { technique: 5, physical: 5, tactical: 5, mental: 5, potential: 5, ...(json.ratings || {}) };
    this.overall = json.overall ?? null;
    this.strengths = json.strengths || '';
    this.weaknesses = json.weaknesses || '';
    this.summary = json.summary || '';
    this.recommendation = json.recommendation || 'monitor';
    this.commentCount = json.commentCount ?? 0;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  /** live average while the form is being edited */
  get computedOverall() {
    const vals = RATING_KEYS.map((k) => Number(this.ratings[k]));
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  isOwnedBy(user) { return !!user && (user.role === 'admin' || this.scout?._id === user._id); }
  toPayload() {
    return {
      player: this.playerId,
      match: this.matchId || undefined,
      ratings: Object.fromEntries(RATING_KEYS.map((k) => [k, Number(this.ratings[k])])),
      strengths: this.strengths,
      weaknesses: this.weaknesses,
      summary: this.summary.trim(),
      recommendation: this.recommendation,
    };
  }
}
Report.RATING_KEYS = RATING_KEYS;
Report.RATING_LABELS = { technique: 'Техника', physical: 'Физичка', tactical: 'Тактика', mental: 'Ментална', potential: 'Потенцијал' };

export class Comment {
  constructor(json = {}) {
    this._id = json._id;
    this.report = json.report;
    this.author = json.author && typeof json.author === 'object' ? new User(json.author) : null;
    this.text = json.text || '';
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : null;
  }
  get edited() { return this.updatedAt && this.createdAt && this.updatedAt - this.createdAt > 1000; }
}

export class Activity {
  constructor(json = {}) {
    this._id = json._id;
    this.user = json.user && typeof json.user === 'object' ? new User(json.user) : null;
    this.action = json.action;
    this.entityType = json.entityType;
    this.entityId = json.entityId;
    this.description = json.description || '';
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get link() {
    const map = { Player: '/players/', Report: '/reports/', Club: '/clubs/' };
    return this.action !== 'delete' && map[this.entityType] && this.entityId ? map[this.entityType] + this.entityId : null;
  }
}

/** Wrap a paginated API response */
export const toPage = (json, Cls) => ({ ...json, items: (json.items || []).map((i) => new Cls(i)) });
