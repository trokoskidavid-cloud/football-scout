const Player = require('../models/player');
const Club = require('../models/club');
const sportsdb = require('../services/sportsdb');
const { HttpError, asyncHandler, escapeRegex } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { POSITIONS, PLAYER_STATUSES } = require('../utils/patterns');

/** GET /api/external/players?name= – search TheSportsDB and flag already imported players */
const searchPlayers = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (name.length < 3) throw new HttpError(400, 'Внесете најмалку 3 знаци за пребарување');
  const results = await sportsdb.searchPlayers(name);
  const existing = await Player.find({ externalId: { $in: results.map((r) => r.externalId) } }).select('externalId');
  const map = Object.fromEntries(existing.map((p) => [p.externalId, p._id]));
  res.json(results.map((r) => ({ ...r, importedId: map[r.externalId] || null })));
});

/** GET /api/external/teams?name= */
const searchTeams = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (name.length < 3) throw new HttpError(400, 'Внесете најмалку 3 знаци за пребарување');
  res.json(await sportsdb.searchTeams(name));
});

async function findOrCreateClub(ext, user) {
  if (!ext.team) return null;
  let club = await Club.findOne({
    $or: [{ externalId: ext.teamId }, { name: new RegExp(`^${escapeRegex(ext.team)}$`, 'i') }],
  });
  if (club) return club;
  const team = ext.teamId ? await sportsdb.lookupTeam(ext.teamId).catch(() => null) : null;
  club = await Club.create({
    name: ext.team,
    country: team?.country || ext.nationality || 'Unknown',
    league: team?.league,
    founded: team?.founded,
    stadium: team?.stadium,
    logoUrl: team?.logoUrl || undefined,
    externalId: ext.teamId || undefined,
  });
  logActivity(user, 'import', 'Club', club._id, `Увезен клуб ${club.name} од TheSportsDB`);
  return club;
}

/**
 * POST /api/external/import { externalId, position?, dateOfBirth?, status? }
 * Creates a Player (and its Club if needed) from TheSportsDB data.
 */
const importPlayer = asyncHandler(async (req, res) => {
  const { externalId } = req.body;
  if (!externalId || !/^\d{1,10}$/.test(String(externalId))) throw new HttpError(400, 'Невалиден externalId');
  const already = await Player.findOne({ externalId: String(externalId) });
  if (already) throw new HttpError(409, 'Играчот е веќе увезен', { importedId: already._id });

  const ext = await sportsdb.lookupPlayer(externalId);
  if (!ext) throw new HttpError(404, 'Играчот не е пронајден во TheSportsDB');

  const dateOfBirth = req.body.dateOfBirth || ext.dateOfBirth;
  if (!dateOfBirth) throw new HttpError(400, 'TheSportsDB нема датум на раѓање – внесете го рачно', { dateOfBirth: 'задолжително' });
  const position = POSITIONS.includes(req.body.position) ? req.body.position : ext.position;
  const status = PLAYER_STATUSES.includes(req.body.status) ? req.body.status : 'monitoring';

  const club = await findOrCreateClub(ext, req.user);
  const player = await Player.create({
    firstName: ext.firstName,
    lastName: ext.lastName,
    dateOfBirth,
    nationality: ext.nationality || 'Unknown',
    position,
    preferredFoot: ext.preferredFoot,
    heightCm: ext.heightCm,
    photoUrl: ext.photoUrl || undefined,
    bio: ext.bio ? ext.bio.slice(0, 5000) : undefined,
    club: club?._id,
    status,
    externalId: String(ext.externalId),
    createdBy: req.user._id,
  });
  logActivity(req.user, 'import', 'Player', player._id, `Увезен играч ${player.fullName} од TheSportsDB`);
  res.status(201).json(await player.populate('club'));
});

module.exports = { searchPlayers, searchTeams, importPlayer };
