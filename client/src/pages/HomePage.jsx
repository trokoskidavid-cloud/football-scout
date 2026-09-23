import { Link } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { StatCard, Loader, ErrorAlert, EmptyState } from '../components/common';
import { ReportCard } from '../components/Cards';

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const overview = useAsync(() => api.getOverview(), []);
  const latest = useAsync(() => api.getReports({ limit: 6 }), []);
  const c = overview.data?.counts || {};

  return (
    <>
      <div className="p-4 p-md-5 mb-4 rounded-4 hero text-white">
        <h1 className="display-6 fw-bold">{isLoggedIn ? `Добредојде, ${user.username}!` : 'Откриј го следниот ѕвезден играч'}</h1>
        <p className="lead col-lg-8">
          FootballScout е платформа каде скаутите следат фудбалери, пишуваат scouting извештаи со оценки,
          ги споредуваат статистиките од натпреварите и дискутираат со колегите.
        </p>
        <Link to="/players" className="btn btn-warning btn-lg me-2 mb-2">Прегледај играчи</Link>
        {isLoggedIn
          ? <Link to="/reports/new" className="btn btn-outline-light btn-lg mb-2">Нов извештај</Link>
          : <Link to="/register" className="btn btn-outline-light btn-lg mb-2">Стани скаут</Link>}
      </div>

      <ErrorAlert error={overview.error} onRetry={overview.reload} />
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><StatCard value={c.players} label="Играчи" icon="bi-people" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.clubs} label="Клубови" icon="bi-shield" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.reports} label="Извештаи" icon="bi-clipboard-data" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.matches} label="Натпревари" icon="bi-calendar-event" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h4 mb-0">Најнови извештаи</h2>
            <Link to="/reports">Сите →</Link>
          </div>
          {latest.loading ? <Loader /> : latest.error ? <ErrorAlert error={latest.error} /> : latest.data.items.length === 0 ? (
            <EmptyState text="Сè уште нема извештаи." />
          ) : (
            <div className="row g-3">
              {latest.data.items.map((r) => <div className="col-md-6" key={r._id}><ReportCard report={r} /></div>)}
            </div>
          )}
        </div>
        <div className="col-lg-4">
          <h2 className="h4">Топ стрелци</h2>
          {overview.loading ? <Loader /> : (
            <ol className="list-group list-group-numbered">
              {(overview.data?.topScorers || []).slice(0, 5).map((s) => (
                <li key={s._id} className="list-group-item d-flex justify-content-between align-items-center">
                  <Link to={`/players/${s._id}`} className="ms-2 me-auto text-decoration-none">{s.name}</Link>
                  <span className="badge bg-dark rounded-pill" title="голови">{s.goals} ⚽</span>
                </li>
              ))}
              {!overview.data?.topScorers?.length && <li className="list-group-item text-muted">Нема податоци</li>}
            </ol>
          )}
          <div className="card mt-4">
            <div className="card-body small">
              <h3 className="h6"><i className="bi bi-info-circle me-1" />Што може секој корисник?</h3>
              <ul className="mb-0 ps-3">
                <li><strong>Гостин</strong> – преглед на играчи, извештаи, статистики.</li>
                <li><strong>Скаут</strong> – додава играчи и извештаи, коментира, увезува од TheSportsDB.</li>
                <li><strong>Администратор</strong> – целосна контрола, корисници, клубови, натпревари.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
