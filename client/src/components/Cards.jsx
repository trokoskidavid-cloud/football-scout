/** Data-driven cards reused on several pages (list, search, home, club details...). */
import { Link } from 'react-router-dom';
import { RatingBadge, StatusBadge, RecommendationBadge } from './common';
import { marketValue, formatDate, pipe, truncate, positionName } from '../pipes';

export function PlayerCard({ player, compact = false }) {
  return (
    <div className="card player-card h-100">
      <div className="card-body d-flex gap-3 align-items-center">
        <img src={player.photo} alt={player.fullName} className="player-thumb rounded" loading="lazy" />
        <div className="flex-grow-1 min-w-0">
          <Link to={`/players/${player._id}`} className="fw-bold stretched-link text-decoration-none">{player.fullName}</Link>
          <div className="small text-muted text-truncate">
            <span title={positionName(player.position)}>{player.position}</span>
            {player.club && ` · ${player.club.name}`} · {player.age} год.
            {!compact && ` · ${marketValue(player.marketValue)}`}
          </div>
          {!compact && <StatusBadge status={player.status} />}
        </div>
        <RatingBadge value={player.avgRating} size="fs-6" />
      </div>
    </div>
  );
}

export function ReportCard({ report, showPlayer = true }) {
  return (
    <div className="card h-100 report-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h2 className="h6 card-title mb-1">
            <Link to={`/reports/${report._id}`} className="stretched-link text-decoration-none">
              {showPlayer ? report.player?.fullName || 'Избришан играч' : formatDate(report.createdAt)}
            </Link>
          </h2>
          <RatingBadge value={report.overall} />
        </div>
        <p className="small text-muted mb-2">
          {report.player?.position}{report.player?.club?.name && ` · ${report.player.club.name}`}
          {report.match && ` · ${report.match.title}`}
        </p>
        <p className="card-text small mb-0">{pipe(report.summary, truncate(110))}</p>
      </div>
      <div className="card-footer small d-flex justify-content-between align-items-center">
        <span><i className="bi bi-person me-1" />{report.scout?.username} · {formatDate(report.createdAt)}</span>
        <span>
          {report.commentCount > 0 && <span className="me-2 text-muted"><i className="bi bi-chat" /> {report.commentCount}</span>}
          <RecommendationBadge value={report.recommendation} />
        </span>
      </div>
    </div>
  );
}
