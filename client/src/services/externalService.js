/**
 * Service 2: external service – TheSportsDB (https://www.thesportsdb.com).
 * Searches go through our backend proxy (/api/external/*), which normalizes the data,
 * caches it and marks players that are already imported. If the proxy is not reachable
 * the service falls back to calling TheSportsDB directly from the browser.
 */
import api, { ApiError } from './api';

const DIRECT = 'https://www.thesportsdb.com/api/v1/json/123';

function normalizeDirect(p) {
  const [firstName, ...rest] = (p.strPlayer || '').split(' ');
  return {
    externalId: p.idPlayer,
    name: p.strPlayer,
    firstName,
    lastName: rest.join(' ') || firstName,
    dateOfBirth: p.dateBorn,
    nationality: p.strNationality,
    positionRaw: p.strPosition,
    photoUrl: p.strCutout || p.strThumb || null,
    team: p.strTeam,
    bio: p.strDescriptionEN || '',
    importedId: null,
  };
}

class ExternalService {
  async searchPlayers(name) {
    try {
      return await api.get(`/external/players?name=${encodeURIComponent(name)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err; // validation errors
      // fallback: call the public API directly
      const res = await fetch(`${DIRECT}/searchplayers.php?p=${encodeURIComponent(name)}`).catch(() => null);
      if (!res || !res.ok) throw new ApiError(502, 'TheSportsDB моментално не е достапен');
      const data = await res.json();
      return (data.player || []).filter((p) => !p.strSport || p.strSport === 'Soccer').map(normalizeDirect);
    }
  }

  searchTeams(name) {
    return api.get(`/external/teams?name=${encodeURIComponent(name)}`);
  }

  importPlayer(externalId, overrides = {}) {
    return api.importExternalPlayer({ externalId, ...overrides });
  }
}

export const externalService = new ExternalService();
export default externalService;
