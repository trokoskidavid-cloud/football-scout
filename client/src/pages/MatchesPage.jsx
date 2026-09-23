import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { FormModal, ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import { formatDate } from '../pipes';

const EMPTY = { homeClub: '', awayClub: '', date: new Date().toISOString().slice(0, 10), competition: 'Prva MFL', homeScore: 0, awayScore: 0, performances: [] };

/** Admin popup for entering a match with per-player statistics. */
function MatchFormModal({ onHide, onSaved }) {
  const clubs = useAsync(() => api.getClubs(), []);
  const [m, setM] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const clubIds = [m.homeClub, m.awayClub].filter(Boolean);
  const squad = useAsync(
    () => (clubIds.length ? Promise.all(clubIds.map((c) => api.getClub(c))).then((cs) => cs.flatMap((c) => c.players)) : Promise.resolve([])),
    [m.homeClub, m.awayClub],
  );

  const set = (k, v) => { setM((x) => ({ ...x, [k]: v, ...(k.endsWith('Club') ? { performances: [] } : {}) })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const togglePlayer = (pid) => setM((x) => ({
    ...x,
    performances: x.performances.some((p) => p.player === pid)
      ? x.performances.filter((p) => p.player !== pid)
      : [...x.performances, { player: pid, minutes: 90, goals: 0, assists: 0, rating: 7 }],
  }));
  const setPerf = (pid, k, v) => setM((x) => ({ ...x, performances: x.performances.map((p) => (p.player === pid ? { ...p, [k]: v } : p)) }));

  const submit = async () => {
    const e = {};
    if (!m.homeClub) e.homeClub = 'Изберете домаќин';
    if (!m.awayClub) e.awayClub = 'Изберете гостин';
    if (m.homeClub && m.homeClub === m.awayClub) e.awayClub = 'Клубовите мора да се различни';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) e.date = 'Невалиден датум';
    if (!/^[\p{L}\d\s.'-]{2,60}$/u.test(m.competition)) e.competition = '2–60 знаци';
    ['homeScore', 'awayScore'].forEach((k) => { if (!/^\d{1,2}$/.test(String(m[k])) || Number(m[k]) > 30) e[k] = '0–30'; });
    m.performances.forEach((p) => {
      if (!(p.minutes >= 0 && p.minutes <= 130) || !(p.goals >= 0 && p.goals <= 15) || !(p.assists >= 0 && p.assists <= 15) || !(p.rating >= 1 && p.rating <= 10)) {
        e.performances = 'Минути 0–130, голови/асистенции 0–15, оцена 1–10';
      }
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const perf = m.performances.map((p) => ({ ...p, minutes: Number(p.minutes), goals: Number(p.goals), assists: Number(p.assists), rating: Number(p.rating) }));
      await api.saveMatch(null, { ...m, homeScore: Number(m.homeScore), awayScore: Number(m.awayScore), performances: perf });
      onSaved();
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };

  const clubOptions = [['', '– избери –'], ...(clubs.data || []).map((c) => [c._id, c.name])];
  return (
    <FormModal show size="lg" title="Внеси натпревар" onHide={onHide} onSubmit={submit} busy={busy}>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <FormField className="col-md-5" label="Домаќин" name="homeClub" type="select" value={m.homeClub} onChange={set} error={errors.homeClub} options={clubOptions} required />
      <FormField className="col-md-1 col-6" label="Гол." name="homeScore" type="number" min="0" max="30" value={m.homeScore} onChange={set} error={errors.homeScore} />
      <FormField className="col-md-1 col-6" label="Гол." name="awayScore" type="number" min="0" max="30" value={m.awayScore} onChange={set} error={errors.awayScore} />
      <FormField className="col-md-5" label="Гостин" name="awayClub" type="select" value={m.awayClub} onChange={set} error={errors.awayClub} options={clubOptions} required />
      <FormField className="col-md-6" label="Датум" name="date" type="date" value={m.date} onChange={set} error={errors.date} required />
      <FormField className="col-md-6" label="Натпреварување" name="competition" value={m.competition} onChange={set} error={errors.competition} required />
      <div className="col-12">
        <h3 className="h6">Статистика на играчи</h3>
        {errors.performances && <div className="alert alert-warning py-1">{errors.performances}</div>}
        {!clubIds.length ? <p className="text-muted small">Изберете клубови.</p> : squad.loading ? <Loader /> : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th /><th>Играч</th><th>Мин.</th><th>Гол.</th><th>Ас.</th><th>Оцена</th></tr></thead>
              <tbody>
                {(squad.data || []).map((pl) => {
                  const perf = m.performances.find((p) => p.player === pl._id);
                  return (
                    <tr key={pl._id}>
                      <td><input type="checkbox" className="form-check-input" checked={!!perf} onChange={() => togglePlayer(pl._id)} aria-label={`Настапи ${pl.fullName}`} /></td>
                      <td>{pl.fullName} <small className="text-muted">{pl.position}</small></td>
                      {['minutes', 'goals', 'assists', 'rating'].map((k) => (
                        <td key={k} style={{ width: 80 }}>
                          <input type="number" className="form-control form-control-sm" disabled={!perf} value={perf?.[k] ?? ''} step={k === 'rating' ? 0.1 : 1}
                            onChange={(e) => setPerf(pl._id, k, e.target.value)} aria-label={k} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {squad.data?.length === 0 && <tr><td colSpan={6} className="text-muted">Клубовите немаат играчи.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormModal>
  );
}

export default function MatchesPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useAsync(() => api.getMatches({ page, limit: 15 }), [page]);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  return (
    <>
      <PageHeader title="Натпревари" icon="bi-calendar-event" subtitle="Резултати и статистика по играч">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><i className="bi bi-plus-lg me-1" />Внеси натпревар</button>}
      </PageHeader>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.items.length === 0 ? <EmptyState text="Нема внесени натпревари." /> : (
        <>
          <div className="table-responsive">
            <table className="table bg-white align-middle shadow-sm">
              <thead className="table-light"><tr><th>Датум</th><th>Натпревар</th><th className="d-none d-md-table-cell">Натпреварување</th><th>Статистика на играчи</th>{isAdmin && <th />}</tr></thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m._id}>
                    <td className="text-nowrap">{formatDate(m.date)}</td>
                    <td className="fw-bold text-nowrap">
                      <Link to={`/clubs/${m.homeClub?._id}`}>{m.homeClub?.name}</Link> {m.homeScore} : {m.awayScore} <Link to={`/clubs/${m.awayClub?._id}`}>{m.awayClub?.name}</Link>
                    </td>
                    <td className="d-none d-md-table-cell">{m.competition}</td>
                    <td className="small">
                      {m.performances.filter((p) => p.player).map((p) => (
                        <span key={p.player._id} className="me-2 d-inline-block">
                          <Link to={`/players/${p.player._id}`}>{p.player.lastName}</Link> {p.minutes}'
                          {p.goals > 0 && ` ⚽${p.goals}`}{p.assists > 0 && ` 🅰${p.assists}`} ({p.rating})
                        </span>
                      ))}
                    </td>
                    {isAdmin && <td><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(m)} aria-label="Избриши"><i className="bi bi-trash" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => setParams({ page: n })} />
        </>
      )}
      {adding && <MatchFormModal onHide={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
      <ConfirmModal show={!!toDelete} title="Избриши натпревар" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deleteMatch(toDelete._id); setToDelete(null); reload(); }}>
        Дали сте сигурни дека сакате да го избришете натпреварот <strong>{toDelete?.title}</strong> и неговата статистика?
      </ConfirmModal>
    </>
  );
}
