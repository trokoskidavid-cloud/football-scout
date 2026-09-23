import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, StatCard } from '../components/common';
import { BarChart, DoughnutChart, LineChart, COLORS } from '../components/Charts';
import { recommendationLabel, statusLabel, positionName, RECOMMENDATION, STATUS } from '../pipes';

const bsColor = { success: COLORS.green, warning: COLORS.yellow, danger: COLORS.red, primary: COLORS.blue };

/** Additional presentation of data with charts. */
export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.getOverview(), []);
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const { counts, byRecommendation, byPosition, byStatus, topScorers, topScouts, monthly } = data;

  const Card = ({ title, children }) => (
    <div className="col-lg-6"><div className="card h-100"><div className="card-header">{title}</div><div className="card-body">{children}</div></div></div>
  );

  return (
    <>
      <PageHeader title="Статистика" icon="bi-bar-chart" subtitle="Агрегирани податоци од извештаите и натпреварите" />
      <div className="row g-3 mb-4">
        {[['players', 'Играчи'], ['reports', 'Извештаи'], ['matches', 'Натпревари'], ['scouts', 'Корисници']].map(([k, l]) => (
          <div className="col-6 col-md-3" key={k}><StatCard value={counts[k]} label={l} /></div>
        ))}
      </div>
      <div className="row g-3">
        <Card title="Извештаи по препорака">
          <DoughnutChart
            labels={byRecommendation.map((r) => recommendationLabel(r._id))}
            values={byRecommendation.map((r) => r.count)}
            colors={byRecommendation.map((r) => bsColor[RECOMMENDATION[r._id]?.color] || COLORS.gray)}
          />
        </Card>
        <Card title="Играчи по статус на следење">
          <DoughnutChart
            labels={byStatus.map((s) => statusLabel(s._id))}
            values={byStatus.map((s) => s.count)}
            colors={byStatus.map((s) => bsColor[STATUS[s._id]?.color] || COLORS.gray)}
          />
        </Card>
        <Card title="Топ стрелци">
          <BarChart labels={topScorers.map((s) => s.name)} values={topScorers.map((s) => s.goals)} label="Голови" horizontal />
        </Card>
        <Card title="Просечна оценка по позиција">
          <BarChart labels={byPosition.map((p) => positionName(p._id))} values={byPosition.map((p) => p.avg)} label="Просек" color={COLORS.blue} max={10} />
        </Card>
        <Card title="Најактивни скаути">
          <BarChart labels={topScouts.map((s) => s.username)} values={topScouts.map((s) => s.reports)} label="Извештаи" color={COLORS.teal} />
        </Card>
        <Card title="Извештаи по месец">
          <LineChart labels={monthly.map((m) => m._id)} datasets={[{ label: 'Извештаи', data: monthly.map((m) => m.count) }]} />
        </Card>
      </div>
    </>
  );
}
