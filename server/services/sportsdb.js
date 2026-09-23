/**
 * Integration with the external source TheSportsDB (https://www.thesportsdb.com/api.php).
 * Free public key "123" is used by default; set SPORTSDB_API_KEY for a premium key.
 * Uses the built-in fetch of Node 20+.
 */
const { HttpError } = require('../utils/http');

const BASE = () => `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_API_KEY || '123'}`;

// very small in-memory cache so we don't hammer the free API
const cache = new Map();
const TTL = 10 * 60 * 1000;

async function call(path) {
  const url = `${BASE()}/${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) return hit.data;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (err) {
    throw new HttpError(502, 'Надворешниот извор (TheSportsDB) не е достапен');
  }
  if (!res.ok) throw new HttpError(502, `TheSportsDB врати статус ${res.status}`);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new HttpError(502, 'TheSportsDB врати невалиден одговор');
  }
  cache.set(url, { t: Date.now(), data });
  return data;
}

// "Centre-Forward", "Left Winger", "Defensive Midfield"… -> our closed set
function mapPosition(pos = '') {
  const p = pos.toLowerCase();
  if (p.includes('goal')) return 'GK';
  if (p.includes('left') && (p.includes('back') || p.includes('full'))) return 'LB';
  if (p.includes('right') && (p.includes('back') || p.includes('full'))) return 'RB';
  if (p.includes('back') || p.includes('defen')) return p.includes('midfield') ? 'CDM' : 'CB';
  if (p.includes('attacking mid')) return 'CAM';
  if (p.includes('left') && p.includes('wing')) return 'LW';
  if (p.includes('right') && p.includes('wing')) return 'RW';
  if (p.includes('wing')) return 'LW';
  if (p.includes('midfield')) return 'CM';
  if (p.includes('forward') || p.includes('striker') || p.includes('attack')) return 'ST';
  return 'CM';
}

// "1.85 m", "185 cm", "6 ft 1 in" -> 185
function mapHeight(h = '') {
  if (!h) return undefined;
  const m = h.match(/(\d)[.,](\d{2})\s*m/);
  if (m) return Number(`${m[1]}${m[2]}`);
  const cm = h.match(/(\d{3})\s*cm/);
  if (cm) return Number(cm[1]);
  const ft = h.match(/(\d)\s*ft\s*(\d{1,2})?/);
  if (ft) return Math.round((Number(ft[1]) * 12 + Number(ft[2] || 0)) * 2.54);
  return undefined;
}

function normalizePlayer(p) {
  const [firstName, ...rest] = (p.strPlayer || '').split(' ');
  const side = (p.strSide || '').toLowerCase();
  const height = mapHeight(p.strHeight);
  return {
    externalId: p.idPlayer,
    name: p.strPlayer,
    firstName,
    lastName: rest.join(' ') || firstName,
    dateOfBirth: p.dateBorn || null,
    nationality: p.strNationality || '',
    positionRaw: p.strPosition || '',
    position: mapPosition(p.strPosition),
    preferredFoot: side.includes('left') ? 'left' : side.includes('both') ? 'both' : 'right',
    heightCm: height && height >= 150 && height <= 215 ? height : undefined,
    photoUrl: p.strCutout || p.strThumb || p.strRender || null,
    team: p.strTeam || '',
    teamId: p.idTeam || null,
    sport: p.strSport,
    bio: p.strDescriptionEN || '',
  };
}

function normalizeTeam(t) {
  return {
    externalId: t.idTeam,
    name: t.strTeam,
    country: t.strCountry || '',
    league: t.strLeague || '',
    founded: t.intFormedYear ? Number(t.intFormedYear) : undefined,
    stadium: t.strStadium || '',
    logoUrl: t.strBadge || t.strTeamBadge || null,
    description: t.strDescriptionEN || '',
  };
}

async function searchPlayers(name) {
  const data = await call(`searchplayers.php?p=${encodeURIComponent(name)}`);
  return (data.player || []).filter((p) => !p.strSport || p.strSport === 'Soccer').map(normalizePlayer);
}

async function lookupPlayer(id) {
  const data = await call(`lookupplayer.php?id=${encodeURIComponent(id)}`);
  const p = (data.players || data.player || [])[0];
  return p ? normalizePlayer(p) : null;
}

async function searchTeams(name) {
  const data = await call(`searchteams.php?t=${encodeURIComponent(name)}`);
  return (data.teams || []).filter((t) => !t.strSport || t.strSport === 'Soccer').map(normalizeTeam);
}

async function lookupTeam(id) {
  const data = await call(`lookupteam.php?id=${encodeURIComponent(id)}`);
  const t = (data.teams || [])[0];
  return t ? normalizeTeam(t) : null;
}

module.exports = { searchPlayers, lookupPlayer, searchTeams, lookupTeam, mapPosition, mapHeight };
