import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, RatingBadge, RecommendationBadge } from '../components/common';
import { ConfirmModal } from '../components/Modals';
import { RatingsRadar } from '../components/Charts';
import CommentSection from '../components/CommentSection';
import { Report } from '../models';
import { formatDate, positionName } from '../pipes';

export default function ReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: r, loading, error, reload } = useAsync(() => api.getReport(id), [id]);
  const [confirm, setConfirm] = useState(false);

  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const title = `${r.player?.fullName || 'Избришан играч'} · ${formatDate(r.createdAt)}`;
  return (
    <>
      <PageHeader title="Scouting извештај" icon="bi-clipboard-data" breadcrumbs={[['Извештаи', '/reports'], [title]]}>
        <button type="button" className="btn btn-outline-secondary d-print-none" onClick={() => window.print()}><i className="bi bi-printer me-1" />Печати</button>
        {r.isOwnedBy(user) && (
          <>
            <Link to={`/reports/${id}/edit`} className="btn btn-outline-secondary d-print-none"><i className="bi bi-pencil me-1" />Уреди</Link>
            <button type="button" className="btn btn-outline-danger d-print-none" onClick={() => setConfirm(true)}><i className="bi bi-trash me-1" />Избриши</button>
          </>
        )}
      </PageHeader>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="d-flex gap-3 align-items-center">
                  {r.player && <img src={r.player.photo} alt="" className="player-thumb rounded" />}
                  <div>
                    <h2 className="h4 mb-0">{r.player ? <Link to={`/players/${r.player._id}`}>{r.player.fullName}</Link> : 'Избришан играч'}</h2>
                    <small className="text-muted">{positionName(r.player?.position, true)}{r.player?.club && ` · ${r.player.club.name}`}</small>
                  </div>
                </div>
                <RatingBadge value={r.overall} size="fs-4" />
              </div>
              <p className="text-muted small my-3">
                <i className="bi bi-person me-1" />{r.scout?.username} · {formatDate(r.createdAt, 'long')}
                {r.match && <> · <i className="bi bi-calendar-event mx-1" />{r.match.title} ({formatDate(r.match.date)})</>}
                {' '}· <RecommendationBadge value={r.recommendation} />
              </p>
              <h3 className="h6">Резиме</h3>
              <p className="report-text">{r.summary}</p>
              <div className="row">
                <div className="col-sm-6"><h3 className="h6 text-success"><i className="bi bi-plus-circle me-1" />Силни страни</h3><p>{r.strengths || '–'}</p></div>
                <div className="col-sm-6"><h3 className="h6 text-danger"><i className="bi bi-dash-circle me-1" />Слаби страни</h3><p>{r.weaknesses || '–'}</p></div>
              </div>
            </div>
          </div>
          <CommentSection reportId={id} />
        </div>
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">Оценки</div>
            <div className="card-body">
              <RatingsRadar datasets={[{ label: 'Оценки', ratings: r.ratings }]} height={300} />
              <table className="table table-sm mt-3 mb-0">
                <tbody>
                  {Report.RATING_KEYS.map((k) => (
                    <tr key={k}>
                      <td>{Report.RATING_LABELS[k]}</td>
                      <td className="w-50"><div className="progress" role="progressbar" aria-valuenow={r.ratings[k]} aria-valuemin="0" aria-valuemax="10"><div className="progress-bar bg-success" style={{ width: `${r.ratings[k] * 10}%` }} /></div></td>
                      <td className="text-end fw-bold">{r.ratings[k]}</td>
                    </tr>
                  ))}
                  <tr className="table-light"><td>Просек</td><td /><td className="text-end fw-bold">{r.overall}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal show={confirm} title="Избриши извештај" confirmText="Избриши" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await api.deleteReport(id); navigate('/reports', { replace: true }); }}>
        Дали сте сигурни? Ќе бидат избришани и сите <strong>{r.commentCount}</strong> коментари на овој извештај.
      </ConfirmModal>
    </>
  );
}
