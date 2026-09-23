import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { Report } from '../models';
import FormField from '../components/FormField';
import { PageHeader, Loader, ErrorAlert, RatingBadge } from '../components/common';
import { RatingsRadar } from '../components/Charts';
import { validate, reportSchema } from '../utils/validators';
import { RECOMMENDATION, formatDate } from '../pipes';

/** Add (/reports/new?player=) or edit (/reports/:id/edit) a scouting report. */
export default function ReportFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const players = useAsync(() => api.getPlayers({ limit: 100, sort: 'name' }), []);
  const matches = useAsync(() => api.getMatches({ limit: 50 }), []);
  const existing = useAsync(() => (editing ? api.getReport(id) : Promise.resolve(new Report({ player: search.get('player') || '' }))), [id]);

  const [report, setReport] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (existing.data) setReport(existing.data); }, [existing.data]);

  if (existing.error) return <ErrorAlert error={existing.error} />;
  if (!report) return <Loader />;

  const change = (name, value) => {
    setReport((r) => Object.assign(new Report(), r, { [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const changeRating = (k, v) => setReport((r) => Object.assign(new Report(), r, { ratings: { ...r.ratings, [k]: Number(v) } }));

  // only matches in which the selected player's club played
  const selectedPlayer = players.data?.items.find((p) => p._id === report.playerId);
  const matchOptions = (matches.data?.items || []).filter((m) => !selectedPlayer?.club
    || [m.homeClub?._id, m.awayClub?._id].includes(selectedPlayer.club._id));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(report, reportSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const saved = await api.saveReport(report);
      navigate(`/reports/${saved._id}`, { replace: editing });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={editing ? 'Уреди извештај' : 'Нов scouting извештај'} icon="bi-clipboard-plus"
        breadcrumbs={[['Извештаи', '/reports'], [editing ? 'Уреди' : 'Нов']]} />
      <form className="row g-4" onSubmit={submit} noValidate>
        <div className="col-lg-8">
          <div className="card shadow-sm"><div className="card-body row g-3">
            {serverError && <div className="col-12"><div className="alert alert-danger mb-0">{serverError}</div></div>}
            <FormField className="col-md-6" label="Играч" name="playerId" type="select" value={report.playerId} onChange={change} error={errors.playerId || errors.player} required disabled={editing}
              options={[['', players.loading ? 'Се вчитува...' : '– избери играч –'], ...(players.data?.items || []).map((p) => [p._id, `${p.fullName} (${p.position}${p.club ? `, ${p.club.name}` : ''})`])]} />
            <FormField className="col-md-6" label="Натпревар (опционално)" name="matchId" type="select" value={report.matchId} onChange={change} error={errors.match}
              options={[['', '– без натпревар –'], ...matchOptions.map((m) => [m._id, `${formatDate(m.date)} ${m.title}`])]} />

            <div className="col-12"><h2 className="h6 mt-2 mb-0">Оценки (1–10)</h2></div>
            {Report.RATING_KEYS.map((k) => (
              <div className="col-md-6 col-xl-4" key={k}>
                <label htmlFor={`r-${k}`} className="form-label d-flex justify-content-between">
                  <span>{Report.RATING_LABELS[k]}</span><RatingBadge value={report.ratings[k]} />
                </label>
                <input id={`r-${k}`} type="range" className="form-range" min="1" max="10" step="1" value={report.ratings[k]} onChange={(e) => changeRating(k, e.target.value)} />
                {errors[`ratings.${k}`] && <div className="invalid-feedback d-block">{errors[`ratings.${k}`]}</div>}
              </div>
            ))}

            <FormField className="col-md-6" label="Силни страни" name="strengths" type="textarea" value={report.strengths} onChange={change} error={errors.strengths} maxLength={500} />
            <FormField className="col-md-6" label="Слаби страни" name="weaknesses" type="textarea" value={report.weaknesses} onChange={change} error={errors.weaknesses} maxLength={500} />
            <FormField label="Резиме" name="summary" type="textarea" value={report.summary} onChange={change} error={errors.summary} required help={`${report.summary.length}/2000 (мин. 10 знаци)`} />

            <div className="col-12">
              <span className="form-label d-block">Препорака <span className="text-danger">*</span></span>
              <div className="btn-group" role="group" aria-label="Препорака">
                {Object.entries(RECOMMENDATION).map(([k, v]) => (
                  <span key={k}>
                    <input type="radio" className="btn-check" name="recommendation" id={`rec-${k}`} checked={report.recommendation === k} onChange={() => change('recommendation', k)} />
                    <label className={`btn btn-outline-${v.color} me-1`} htmlFor={`rec-${k}`}><i className={`bi ${v.icon} me-1`} />{v.label}</label>
                  </span>
                ))}
              </div>
              {errors.recommendation && <div className="invalid-feedback d-block">{errors.recommendation}</div>}
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}Зачувај извештај
              </button>
              <Link to={editing ? `/reports/${id}` : '/reports'} className="btn btn-outline-secondary">Откажи</Link>
            </div>
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card sticky-lg-top" style={{ top: '1rem' }}>
            <div className="card-header d-flex justify-content-between">Преглед <RatingBadge value={report.computedOverall} /></div>
            <div className="card-body"><RatingsRadar datasets={[{ label: 'Оценки', ratings: report.ratings }]} height={260} /></div>
          </div>
        </div>
      </form>
    </>
  );
}
