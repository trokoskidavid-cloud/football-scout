/** Small reusable UI building blocks used across all pages. */
import { Link } from 'react-router-dom';
import { ratingColor, STATUS, RECOMMENDATION, initials } from '../pipes';

export function PageHeader({ title, icon, subtitle, children, breadcrumbs }) {
  return (
    <>
      {breadcrumbs && (
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            {breadcrumbs.map(([label, to]) => (
              <li key={label} className={`breadcrumb-item${to ? '' : ' active'}`}>{to ? <Link to={to}>{label}</Link> : label}</li>
            ))}
          </ol>
        </nav>
      )}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h3 mb-0">{icon && <i className={`bi ${icon} me-2`} />}{title}</h1>
          {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
        </div>
        {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
      </div>
    </>
  );
}

export function Loader({ text = 'Се вчитува...' }) {
  return (
    <div className="text-center py-5 text-muted">
      <div className="spinner-border text-success mb-2" role="status" />
      <div>{text}</div>
    </div>
  );
}

export function ErrorAlert({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span><i className="bi bi-exclamation-triangle me-2" />{error.message || String(error)}</span>
      {onRetry && <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>Обиди се повторно</button>}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', text, children }) {
  return (
    <div className="text-center text-muted py-5">
      <i className={`bi ${icon} display-5 d-block mb-2`} />
      <p>{text}</p>
      {children}
    </div>
  );
}

export function RatingBadge({ value, size = '' }) {
  return <span className={`badge rating-badge bg-${ratingColor(value)} ${size}`}>{value ?? '–'}</span>;
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, color: 'secondary' };
  return <span className={`badge text-bg-${s.color}`}>{s.label}</span>;
}

export function RecommendationBadge({ value }) {
  const r = RECOMMENDATION[value] || { label: value, color: 'secondary', icon: '' };
  return <span className={`badge text-bg-${r.color}`}><i className={`bi ${r.icon} me-1`} />{r.label}</span>;
}

export function Avatar({ name, admin = false }) {
  return <span className={`avatar${admin ? ' bg-danger' : ''}`} title={name}>{initials(name)}</span>;
}

export function StatCard({ value, label, icon }) {
  return (
    <div className="card stat-card h-100">
      <div className="card-body text-center p-3">
        {icon && <i className={`bi ${icon} text-success fs-4`} />}
        <div className="fs-3 fw-bold">{value ?? '–'}</div>
        <small className="text-muted">{label}</small>
      </div>
    </div>
  );
}

/** Pagination that works with ?page= in the URL */
export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav aria-label="Страници">
      <ul className="pagination justify-content-center">
        <li className={`page-item${page <= 1 ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page - 1)}>«</button></li>
        {nums.map((n, i) => (
          <li key={n} className={`page-item${n === page ? ' active' : ''}`}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="page-link disabled d-inline-block">…</span>}
            <button type="button" className="page-link d-inline-block" onClick={() => onChange(n)}>{n}</button>
          </li>
        ))}
        <li className={`page-item${page >= pages ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page + 1)}>»</button></li>
      </ul>
    </nav>
  );
}
