import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { ReportCard } from '../components/Cards';

const TABS = [
  ['', 'Сите'],
  ['sign', 'Потпиши'],
  ['monitor', 'Следи'],
  ['reject', 'Одбиј'],
];

export default function ReportsPage() {
  const { isLoggedIn } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const { data, loading, error, reload } = useAsync(() => api.getReports({ limit: 12, ...query }), [params.toString()]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await api.downloadReportsCsv({ recommendation: query.recommendation, mine: query.mine });
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Scouting извештаи" icon="bi-clipboard-data" subtitle={data ? `${data.total} извештаи` : ' '}>
        {isLoggedIn && (
          <>
            <button type="button" className="btn btn-outline-success" onClick={exportCsv} disabled={exporting}>
              <i className="bi bi-filetype-csv me-1" />{exporting ? 'Се генерира...' : 'Извези CSV'}
            </button>
            <Link to="/reports/new" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Нов извештај</Link>
          </>
        )}
      </PageHeader>
      <ErrorAlert error={exportError} />

      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <ul className="nav nav-pills">
          {TABS.map(([value, label]) => (
            <li className="nav-item" key={label}>
              <button type="button" className={`nav-link${(query.recommendation || '') === value ? ' active' : ''}`} onClick={() => update({ recommendation: value })}>{label}</button>
            </li>
          ))}
        </ul>
        <div className="d-flex gap-2 align-items-center">
          {isLoggedIn && (
            <div className="form-check form-switch mb-0">
              <input className="form-check-input" type="checkbox" id="mine" checked={query.mine === 'true'} onChange={(e) => update({ mine: e.target.checked ? 'true' : '' })} />
              <label className="form-check-label" htmlFor="mine">Само мои</label>
            </div>
          )}
          <select className="form-select form-select-sm w-auto" value={query.sort || 'newest'} onChange={(e) => update({ sort: e.target.value })} aria-label="Подредување">
            <option value="newest">Најнови</option>
            <option value="rating">Највисока оценка</option>
          </select>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && (data.items.length === 0 ? <EmptyState text="Нема извештаи." /> : (
        <>
          <div className="row g-3 mb-3">
            {data.items.map((r) => <div className="col-md-6 col-xl-4" key={r._id}><ReportCard report={r} /></div>)}
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => update({ page: String(n) })} />
        </>
      ))}
    </>
  );
}
