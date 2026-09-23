import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination, RatingBadge, StatusBadge } from '../components/common';
import { PlayerCard } from '../components/Cards';
import { marketValue, positionName, STATUS } from '../pipes';
import { POSITIONS } from '../utils/validators';

/**
 * Printout of the list of players. All filters live in the URL (?q=&position=&status=&sort=&page=)
 * so browser back / forward restores the previous view.
 */
export default function PlayersPage() {
  const { isLoggedIn } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;

  const { data, loading, error, reload } = useAsync(() => api.getPlayers({ limit: 12, sort: 'name', ...query }), [params.toString()]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Играчи" icon="bi-people" subtitle={data ? (['q', 'position', 'status'].some((k) => query[k]) ? `Пронајдени ${data.total} играчи` : `${data.total} играчи во базата`) : ' '}>
        {isLoggedIn && (
          <>
            <Link to="/external" className="btn btn-outline-primary"><i className="bi bi-cloud-download me-1" />Увези од TheSportsDB</Link>
            <Link to="/players/new" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Нов играч</Link>
          </>
        )}
      </PageHeader>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input key={query.q || ''} className="form-control" placeholder="Филтрирај по име, клуб или националност..." defaultValue={query.q || ''}
            onKeyDown={(e) => e.key === 'Enter' && update('q', e.target.value.trim())}
            onBlur={(e) => e.target.value.trim() !== (query.q || '') && update('q', e.target.value.trim())} aria-label="Филтер" />
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={query.position || ''} onChange={(e) => update('position', e.target.value)} aria-label="Позиција">
            <option value="">Сите позиции</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{positionName(p, true)}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={query.status || ''} onChange={(e) => update('status', e.target.value)} aria-label="Статус">
            <option value="">Сите статуси</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={query.sort || 'name'} onChange={(e) => update('sort', e.target.value)} aria-label="Подредување">
            <option value="name">Подреди: име</option>
            <option value="rating">Подреди: оценка</option>
            <option value="age">Подреди: најмлади</option>
            <option value="value">Подреди: вредност</option>
            <option value="newest">Подреди: најнови</option>
          </select>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.items.length === 0 ? (
        <EmptyState icon="bi-person-x" text="Нема играчи што одговараат на филтрите." />
      ) : data && (
        <>
          {/* desktop / tablet: table */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle bg-white shadow-sm rounded">
              <thead className="table-light">
                <tr><th>Играч</th><th>Поз.</th><th>Клуб</th><th>Нац.</th><th>Год.</th><th>Вредност</th><th>Просек</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td><img src={p.photo} alt="" className="rounded-circle me-2 table-thumb" loading="lazy" /><Link to={`/players/${p._id}`}>{p.fullName}</Link></td>
                    <td><span className="badge text-bg-dark" title={positionName(p.position)}>{p.position}</span></td>
                    <td>{p.club?.name || <span className="text-muted">слободен</span>}</td>
                    <td>{p.nationality}</td>
                    <td>{p.age}</td>
                    <td>{marketValue(p.marketValue)}</td>
                    <td><RatingBadge value={p.avgRating} /> <small className="text-muted">({p.reportCount})</small></td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* mobile: cards */}
          <div className="row g-2 d-md-none">
            {data.items.map((p) => <div className="col-12" key={p._id}><PlayerCard player={p} /></div>)}
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => update('page', String(n))} />
        </>
      )}
    </>
  );
}
