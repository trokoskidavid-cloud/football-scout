import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Club } from '../models';
import { PageHeader, Loader, ErrorAlert, EmptyState } from '../components/common';
import { PlayerCard } from '../components/Cards';
import { FormModal, ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import { validate, clubSchema } from '../utils/validators';
import { initials, formatDate } from '../pipes';

/** Add / edit club popup (admin) */
function ClubFormModal({ club, onHide, onSaved }) {
  const [values, setValues] = useState(club);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const change = (k, v) => { setValues((c) => Object.assign(new Club(), c, { [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const submit = async () => {
    const errs = validate(values, clubSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onSaved(await api.saveClub(values));
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormModal show title={club._id ? `Уреди: ${club.name}` : 'Нов клуб'} onHide={onHide} onSubmit={submit} busy={busy}>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <FormField className="col-md-6" label="Име" name="name" value={values.name} onChange={change} error={errors.name} required />
      <FormField className="col-md-6" label="Држава" name="country" value={values.country} onChange={change} error={errors.country} required />
      <FormField className="col-md-6" label="Лига" name="league" value={values.league} onChange={change} error={errors.league} />
      <FormField className="col-md-6" label="Година на основање" name="founded" type="number" value={values.founded} onChange={change} error={errors.founded} />
      <FormField label="Стадион" name="stadium" value={values.stadium} onChange={change} error={errors.stadium} />
      <FormField label="URL на грб" name="logoUrl" type="url" value={values.logoUrl} onChange={change} error={errors.logoUrl} />
    </FormModal>
  );
}

const Logo = ({ club, size = 72 }) => (club.logoUrl
  ? <img src={club.logoUrl} alt={club.name} width={size} height={size} className="object-fit-contain" />
  : <span className="club-logo" style={{ width: size, height: size }}>{initials(club.name)}</span>);

export function ClubsPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.getClubs(), []);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');
  const list = (data || []).filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <PageHeader title="Клубови" icon="bi-shield" subtitle={data ? `${data.length} клубови` : ' '}>
        <input className="form-control" placeholder="Филтрирај..." value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Филтер" />
        {isAdmin && <button type="button" className="btn btn-primary text-nowrap" onClick={() => setEditing(new Club())}><i className="bi bi-plus-lg me-1" />Нов клуб</button>}
      </PageHeader>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : list.length === 0 ? <EmptyState text="Нема клубови." /> : (
        <div className="row g-3">
          {list.map((c) => (
            <div className="col-6 col-md-4 col-lg-3" key={c._id}>
              <div className="card text-center h-100 player-card">
                <div className="card-body">
                  <div className="mb-2"><Logo club={c} /></div>
                  <Link to={`/clubs/${c._id}`} className="h6 stretched-link text-decoration-none">{c.name}</Link>
                  <div className="small text-muted">{c.league || c.country}{c.founded && <><br />Основан {c.founded}</>}</div>
                </div>
                <div className="card-footer small">{c.playerCount} играчи</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ClubFormModal club={editing} onHide={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

export function ClubDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const club = useAsync(() => api.getClub(id), [id]);
  const matches = useAsync(() => api.getMatches({ club: id, limit: 10 }), [id]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (club.loading) return <Loader />;
  if (club.error) return <ErrorAlert error={club.error} onRetry={club.reload} />;
  const c = club.data;

  return (
    <>
      <PageHeader title={c.name} breadcrumbs={[['Клубови', '/clubs'], [c.name]]}>
        {isAdmin && (
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(true)}><i className="bi bi-pencil me-1" />Уреди</button>
            <button type="button" className="btn btn-outline-danger" onClick={() => setConfirm(true)}><i className="bi bi-trash me-1" />Избриши</button>
          </>
        )}
      </PageHeader>
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card text-center"><div className="card-body">
            <Logo club={c} size={110} />
            <ul className="list-group list-group-flush text-start mt-3">
              <li className="list-group-item d-flex justify-content-between"><span>Држава</span><strong>{c.country}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Лига</span><strong>{c.league || '–'}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Основан</span><strong>{c.founded || '–'}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Стадион</span><strong>{c.stadium || '–'}</strong></li>
            </ul>
          </div></div>
          <div className="card mt-3">
            <div className="card-header">Последни натпревари</div>
            <ul className="list-group list-group-flush small">
              {(matches.data?.items || []).map((m) => <li className="list-group-item" key={m._id}>{formatDate(m.date)} · {m.title}</li>)}
              {matches.data?.items.length === 0 && <li className="list-group-item text-muted">Нема натпревари</li>}
            </ul>
          </div>
        </div>
        <div className="col-lg-8">
          <h2 className="h5">Играчи ({c.players.length})</h2>
          {c.players.length === 0 ? <EmptyState text="Клубот нема играчи во базата." /> : (
            <div className="row g-2">{c.players.map((p) => <div className="col-md-6" key={p._id}><PlayerCard player={p} compact /></div>)}</div>
          )}
        </div>
      </div>
      {editing && <ClubFormModal club={c} onHide={() => setEditing(false)} onSaved={() => { setEditing(false); club.reload(); }} />}
      <ConfirmModal show={confirm} title="Избриши клуб" confirmText="Избриши" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await api.deleteClub(id); navigate('/clubs', { replace: true }); }}>
        Играчите на <strong>{c.name}</strong> ќе останат без клуб. Клуб со внесени натпревари не може да се избрише.
      </ConfirmModal>
    </>
  );
}
