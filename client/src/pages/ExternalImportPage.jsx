import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import externalService from '../services/externalService';
import { PageHeader, Loader, ErrorAlert, EmptyState } from '../components/common';
import { FormModal } from '../components/Modals';
import FormField from '../components/FormField';
import { formatDate, pipe, truncate } from '../pipes';
import { POSITIONS, PLAYER_STATUSES } from '../utils/validators';
import { positionName, statusLabel } from '../pipes';

/** Integration with the external source TheSportsDB: search real players and import them. */
export default function ExternalImportPage() {
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get('name') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // player being imported (modal)
  const [overrides, setOverrides] = useState({});
  const [importErrors, setImportErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    const name = term.trim();
    if (!/^[\p{L}\s.'-]{3,40}$/u.test(name)) {
      setError({ message: 'Внесете најмалку 3 букви (без бројки и специјални знаци).' });
      return;
    }
    setParams({ name });
    setLoading(true);
    setError(null);
    try {
      setResults(await externalService.searchPlayers(name));
    } catch (err) {
      setError(err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const openImport = (p) => {
    setSelected(p);
    setImportErrors({});
    setOverrides({ position: p.position || 'CM', status: 'monitoring', dateOfBirth: p.dateOfBirth || '' });
  };

  const doImport = async () => {
    if (!overrides.dateOfBirth) return setImportErrors({ dateOfBirth: 'Задолжително (TheSportsDB нема датум)' });
    setBusy(true);
    try {
      const player = await externalService.importPlayer(selected.externalId, overrides);
      setResults((list) => list.map((r) => (r.externalId === selected.externalId ? { ...r, importedId: player._id } : r)));
      setSelected(null);
    } catch (err) {
      setImportErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Увоз од TheSportsDB" icon="bi-cloud-download"
        subtitle="Пребарај професионални играчи во надворешниот извор и увези ги нивните податоци (биографија, фото, клуб)." />
      <form className="input-group mb-4" onSubmit={search} noValidate>
        <input className="form-control" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="пр. Elmas, Pandev, Modric..." aria-label="Име на играч" />
        <button className="btn btn-primary" type="submit" disabled={loading}><i className="bi bi-search me-1" />Пребарај</button>
      </form>

      <ErrorAlert error={error} />
      {loading ? <Loader text="Се пребарува TheSportsDB..." /> : results && (results.length === 0 ? (
        <EmptyState icon="bi-cloud-slash" text={`TheSportsDB нема фудбалери со име „${params.get('name')}“.`} />
      ) : (
        <div className="row g-3">
          {results.map((p) => (
            <div className="col-md-6 col-lg-4" key={p.externalId}>
              <div className="card h-100">
                {p.photoUrl
                  ? <img src={p.photoUrl} className="card-img-top ext-photo" alt={p.name} loading="lazy" />
                  : <div className="ext-photo d-flex align-items-center justify-content-center bg-light text-muted"><i className="bi bi-person fs-1" /></div>}
                <div className="card-body">
                  <h2 className="h5 card-title">{p.name}</h2>
                  <p className="small mb-1">{p.positionRaw || '–'} · {p.team || 'без клуб'}</p>
                  <p className="small text-muted">{p.dateOfBirth ? `Роден ${formatDate(p.dateOfBirth)}` : 'Непознат датум'} · {p.nationality || '–'}</p>
                  {p.bio && <p className="small">{pipe(p.bio, truncate(140))}</p>}
                </div>
                <div className="card-footer">
                  {p.importedId
                    ? <Link to={`/players/${p.importedId}`} className="btn btn-sm btn-outline-success"><i className="bi bi-check2 me-1" />Веќе увезен – отвори</Link>
                    : <button type="button" className="btn btn-sm btn-success" onClick={() => openImport(p)}><i className="bi bi-download me-1" />Увези</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <FormModal show={!!selected} title={`Увези: ${selected?.name}`} onHide={() => setSelected(null)} onSubmit={doImport} busy={busy} submitText="Увези">
        {importErrors._ && <div className="col-12"><div className="alert alert-danger mb-0">{importErrors._}</div></div>}
        <p className="col-12 small text-muted mb-0">Ќе се креира играч (и клубот „{selected?.team}“ ако не постои). Проверете ги податоците:</p>
        <FormField className="col-md-6" label="Позиција" name="position" type="select" value={overrides.position} onChange={(k, v) => setOverrides({ ...overrides, [k]: v })}
          options={POSITIONS.map((p) => [p, positionName(p, true)])} help={`TheSportsDB: ${selected?.positionRaw || '–'}`} />
        <FormField className="col-md-6" label="Статус" name="status" type="select" value={overrides.status} onChange={(k, v) => setOverrides({ ...overrides, [k]: v })}
          options={PLAYER_STATUSES.map((s) => [s, statusLabel(s)])} />
        <FormField label="Датум на раѓање" name="dateOfBirth" type="date" value={overrides.dateOfBirth} error={importErrors.dateOfBirth} onChange={(k, v) => setOverrides({ ...overrides, [k]: v })} required />
      </FormModal>
    </>
  );
}
