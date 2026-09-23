import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, StatCard, StatusBadge, RatingBadge, RecommendationBadge, EmptyState } from '../components/common';
import { ConfirmModal, ImageZoomModal } from '../components/Modals';
import { RatingsRadar, LineChart } from '../components/Charts';
import { formatDate, marketValue, positionName, footLabel, pipe, truncate } from '../pipes';

/** Detailed view of one player: profile, match stats, radar of report averages, reports. */
export default function PlayerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, canModify } = useAuth();
  const player = useAsync(() => api.getPlayer(id), [id]);
  const stats = useAsync(() => api.getPlayerStats(id), [id]);
  const [zoom, setZoom] = useState(false);
  const [confirm, setConfirm] = useState(null); // dependency counts when the delete modal is open
  const [showBio, setShowBio] = useState(false);

  if (player.loading) return <Loader />;
  if (player.error) return <ErrorAlert error={player.error} onRetry={player.reload} />;
  const p = player.data;
  const s = stats.data;

  const openDelete = async () => setConfirm(await api.getPlayerDependencies(id).catch(() => ({ reports: '?', comments: '?' })));
  const doDelete = async () => {
    await api.deletePlayer(id);
    navigate('/players', { replace: true });
  };

  return (
    <>
      <PageHeader title={p.fullName} breadcrumbs={[['Играчи', '/players'], [p.fullName]]}>
        {canModify(p.createdBy) && <Link to={`/players/${id}/edit`} className="btn btn-outline-secondary"><i className="bi bi-pencil me-1" />Уреди</Link>}
        {isAdmin && <button type="button" className="btn btn-outline-danger" onClick={openDelete}><i className="bi bi-trash me-1" />Избриши</button>}
      </PageHeader>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <button type="button" className="btn p-0 border-0 zoomable" onClick={() => setZoom(true)} title="Зумирај">
              <img src={p.photo} className="card-img-top player-photo" alt={p.fullName} />
            </button>
            <div className="card-body">
              <p className="text-muted mb-2">
                <span className="badge text-bg-dark me-1">{p.position}</span>{positionName(p.position)}
                {p.club && <> · <Link to={`/clubs/${p.club._id}`}>{p.club.name}</Link></>}
              </p>
              <StatusBadge status={p.status} />
              {p.externalId && <span className="badge text-bg-info ms-1" title="Увезен од TheSportsDB"><i className="bi bi-cloud-check" /> TheSportsDB</span>}
              <ul className="list-group list-group-flush mt-3">
                <li className="list-group-item d-flex justify-content-between"><span>Датум на раѓање</span><strong>{formatDate(p.dateOfBirth)} ({p.age})</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Националност</span><strong>{p.nationality}</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Висина</span><strong>{p.heightCm ? `${p.heightCm} cm` : '–'}</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Подобра нога</span><strong>{footLabel(p.preferredFoot)}</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Пазарна вредност</span><strong>{marketValue(p.marketValue)}</strong></li>
              </ul>
              {p.notes && <p className="small mt-3 mb-0"><i className="bi bi-sticky me-1" />{p.notes}</p>}
              {p.bio && (
                <div className="small mt-3">
                  <strong>Биографија (TheSportsDB):</strong>{' '}
                  {showBio ? p.bio : pipe(p.bio, truncate(220))}{' '}
                  {p.bio.length > 220 && <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowBio(!showBio)}>{showBio ? 'помалку' : 'повеќе'}</button>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3"><StatCard value={s?.appearances} label="Настапи" /></div>
            <div className="col-6 col-md-3"><StatCard value={s?.goals} label="Голови" /></div>
            <div className="col-6 col-md-3"><StatCard value={s?.assists} label="Асистенции" /></div>
            <div className="col-6 col-md-3"><StatCard value={s?.avgMatchRating} label="Прос. оцена на натпр." /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between">
                  <span>Профил на способности</span><RatingBadge value={p.avgRating} />
                </div>
                <div className="card-body">
                  {p.averages ? <RatingsRadar datasets={[{ label: 'Просек', ratings: p.averages }]} height={250} /> : <EmptyState icon="bi-bullseye" text="Нема извештаи." />}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">Форма по натпревари</div>
                <div className="card-body">
                  {s?.timeline?.length ? (
                    <LineChart
                      height={250}
                      labels={s.timeline.map((t) => formatDate(t.date))}
                      datasets={[
                        { label: 'Оцена', data: s.timeline.map((t) => t.rating) },
                        { label: 'Голови', data: s.timeline.map((t) => t.goals) },
                      ]}
                    />
                  ) : <EmptyState icon="bi-graph-up" text="Нема натпревари." />}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Scouting извештаи ({p.reports.length})</span>
              {isLoggedIn && <Link to={`/reports/new?player=${id}`} className="btn btn-sm btn-primary"><i className="bi bi-plus-lg" /> Нов извештај</Link>}
            </div>
            <div className="list-group list-group-flush">
              {p.reports.length === 0 && <div className="list-group-item text-muted">Сè уште нема извештаи за овој играч.</div>}
              {p.reports.map((r) => (
                <Link key={r._id} to={`/reports/${r._id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2">
                  <span>
                    <strong>{r.scout?.username}</strong> · {formatDate(r.createdAt)}
                    {r.match && <span className="text-muted"> · {r.match.title}</span>}
                    <br /><small className="text-muted">{pipe(r.summary, truncate(90))}</small>
                  </span>
                  <span className="text-nowrap"><RecommendationBadge value={r.recommendation} /> <RatingBadge value={r.overall} /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ImageZoomModal show={zoom} src={p.photo} alt={p.fullName} onHide={() => setZoom(false)} />
      <ConfirmModal show={!!confirm} title="Потврди бришење" confirmText="Избриши" onCancel={() => setConfirm(null)} onConfirm={doDelete}>
        <p>Дали сте сигурни дека сакате да го избришете играчот <strong>{p.fullName}</strong>?</p>
        <div className="alert alert-warning small mb-0">
          Ќе бидат избришани и <strong>{confirm?.reports} извештаи</strong> и <strong>{confirm?.comments} коментари</strong> поврзани со играчот. Акцијата не може да се врати.
        </div>
      </ConfirmModal>
    </>
  );
}
