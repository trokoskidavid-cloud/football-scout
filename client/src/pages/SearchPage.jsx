import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { PlayerCard } from '../components/Cards';
import { positionName, marketValue } from '../pipes';
import { POSITIONS, COUNTRIES } from '../utils/validators';

const DEFAULTS = { q: '', position: [], nationality: '', minAge: 15, maxAge: 40, minRating: 0, maxValue: '' };

/** Advanced multi-criteria search. The criteria are stored in the URL. */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const fromUrl = {
    ...DEFAULTS,
    ...Object.fromEntries(params.entries()),
    position: params.get('position') ? params.get('position').split(',') : [],
  };
  const [form, setForm] = useState(fromUrl);
  const [error, setError] = useState(null);
  const searched = params.toString().length > 0;

  // keep the form in sync when the user navigates back / forward
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(fromUrl), [params.toString()]);

  const result = useAsync(
    () => (searched ? api.getPlayers({ ...Object.fromEntries([...params.entries()].filter(([k]) => k !== 'all')), limit: 12, sort: 'rating' }) : Promise.resolve(null)),
    [params.toString()],
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (form.q && !/^[\p{L}\s.'-]{0,50}$/u.test(form.q)) return setError('Клучниот збор смее да содржи само букви.');
    if (Number(form.minAge) > Number(form.maxAge)) return setError('Минималната возраст е поголема од максималната.');
    if (form.maxValue !== '' && !/^\d{1,9}$/.test(String(form.maxValue))) return setError('Вредноста мора да е цел позитивен број.');
    setError(null);
    const next = {
      q: form.q.trim(),
      position: form.position.join(','),
      nationality: form.nationality,
      minAge: Number(form.minAge) !== DEFAULTS.minAge ? form.minAge : '',
      maxAge: Number(form.maxAge) !== DEFAULTS.maxAge ? form.maxAge : '',
      minRating: Number(form.minRating) > 0 ? form.minRating : '',
      maxValue: form.maxValue,
    };
    const filled = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v != null));
    // no criteria -> show all players
    setParams(Object.keys(filled).length ? filled : { all: '1' });
  };

  const reset = () => { setForm(DEFAULTS); setParams({}); };
  const page = Number(params.get('page')) || 1;

  return (
    <>
      <PageHeader title="Напредно пребарување" icon="bi-search" />
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <form className="row g-3" onSubmit={submit} noValidate>
            <div className="col-md-6">
              <label className="form-label" htmlFor="s-q">Клучен збор</label>
              <input id="s-q" className="form-control" value={form.q} onChange={(e) => set('q', e.target.value)} placeholder="Име, презиме, клуб или националност..." />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="s-pos">Позиции <small className="text-muted">(Ctrl за повеќе)</small></label>
              <select id="s-pos" className="form-select" multiple size={3} value={form.position}
                onChange={(e) => set('position', Array.from(e.target.selectedOptions, (o) => o.value))}>
                {POSITIONS.map((p) => <option key={p} value={p}>{positionName(p, true)}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="s-nat">Националност</label>
              <select id="s-nat" className="form-select" value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
                <option value="">Сите</option>
                {COUNTRIES.filter((c) => c !== 'Other').map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="s-mina">Возраст: {form.minAge} – {form.maxAge}</label>
              <input id="s-mina" type="range" className="form-range" min="14" max="45" value={form.minAge} onChange={(e) => set('minAge', e.target.value)} aria-label="Минимална возраст" />
              <input type="range" className="form-range" min="14" max="45" value={form.maxAge} onChange={(e) => set('maxAge', e.target.value)} aria-label="Максимална возраст" />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="s-rating">Мин. просечна оценка: {Number(form.minRating) || 'сите'}</label>
              <input id="s-rating" type="range" className="form-range" min="0" max="10" step="0.5" value={form.minRating} onChange={(e) => set('minRating', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="s-val">Макс. вредност (€) {form.maxValue && `– ${marketValue(form.maxValue)}`}</label>
              <input id="s-val" type="number" min="0" step="50000" className="form-control" value={form.maxValue} onChange={(e) => set('maxValue', e.target.value)} />
            </div>
            {error && <div className="col-12"><div className="alert alert-warning mb-0">{error}</div></div>}
            <div className="col-12">
              <button type="submit" className="btn btn-primary"><i className="bi bi-search me-1" />Пребарај</button>
              <button type="button" className="btn btn-link" onClick={reset}>Исчисти</button>
            </div>
          </form>
        </div>
      </div>

      {!searched ? (
        <EmptyState icon="bi-funnel" text="Внесете критериуми и притиснете „Пребарај“." />
      ) : result.error ? <ErrorAlert error={result.error} onRetry={result.reload} /> : (result.loading || !result.data) ? <Loader /> : (
        <>
          <p className="text-muted">Пронајдени <strong>{result.data.total}</strong> играчи (подредени по оценка)</p>
          {result.data.items.length === 0 ? <EmptyState icon="bi-person-x" text="Нема резултати." /> : (
            <div className="row g-3">
              {result.data.items.map((p) => <div className="col-md-6 col-xl-4" key={p._id}><PlayerCard player={p} /></div>)}
            </div>
          )}
          <Pagination page={page} pages={result.data.pages} onChange={(n) => { const next = new URLSearchParams(params); next.set('page', n); setParams(next); }} />
        </>
      )}
    </>
  );
}
