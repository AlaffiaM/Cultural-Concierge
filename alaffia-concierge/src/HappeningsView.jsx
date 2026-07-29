import { pillarIcons, pillarColors, sourceLabels } from "./data";
import "./HappeningsView.css";

export default function HappeningsView({
  events,
  allSpots,
  selectedCity,
  activePillar,
  onPillarChange,
  countdownTo,
}) {
  const pillars = ["CULTURE", "WELLNESS", "SOCIAL"];

  return (
    <>
      <div className="pillar-filters" style={{ marginBottom: 12 }}>
        <button
          className={`pillar-filter-btn ${!activePillar ? "active" : ""}`}
          onClick={() => onPillarChange(null)}
        >All</button>
        {pillars.map((p) => (
          <button
            key={p}
            className={`pillar-filter-btn ${activePillar === p ? "active" : ""}`}
            onClick={() => onPillarChange(activePillar === p ? null : p)}
          >
            {pillarIcons[p]} {p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="events-list">
        {events.length === 0
          ? allSpots.length === 0
            ? [1, 2, 3].map((i) => (
                <div key={i} className="skeleton-event">
                  <div className="skeleton" style={{ width: 40, height: 44, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-md" />
                    <div className="skeleton skeleton-sm" style={{ width: "50%" }} />
                  </div>
                </div>
              ))
            : <p className="empty-state">No upcoming events in {selectedCity}.</p>
          : events
              .filter(e => !activePillar || e.pillar === activePillar)
              .map((event) => {
              const d = new Date(event.date);
              const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
              const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const cd = countdownTo(event.date);
              return (
                <div
                  key={event._id}
                  className="event-strip"
                  style={{ borderLeftColor: pillarColors[event.pillar] || 'var(--copper)' }}
                >
                  {event.imageUrl && (
                    <img src={event.imageUrl} alt="" className="event-thumb" />
                  )}
                  <div className="event-date-box">
                    <span className="event-day">{dayNames[d.getDay()]}</span>
                    <span className="event-date-num">{d.getDate()}</span>
                    <span className="event-month">{monthNames[d.getMonth()]}</span>
                  </div>
                  <div className="event-info">
                    <div className="event-name-row">
                      <span className="event-name">{event.name}</span>
                      {event.isGhostLocation && <span className="ghost-tag">Pop-up</span>}
                    </div>
                    <div className="event-meta">
                      {event.time && <span>{event.time}</span>}
                      {event.time && event.type && <span className="event-dot">·</span>}
                      {event.type && <span>{event.type}</span>}
                      {event.linkedSpotId && (
                        <><span className="event-dot">·</span><span>{event.linkedSpotId.name}</span></>
                      )}
                    </div>
                    <div className="event-tags-row">
                      {event.vibe && (
                        <span className={`event-vibe vibe-${event.vibe.toLowerCase()}`}>{event.vibe}</span>
                      )}
                      {event.source && event.source !== 'manual' && (
                        <span className="event-source">{sourceLabels[event.source] || event.source}</span>
                      )}
                      {cd && <span className="countdown">{cd}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>


    </>
  );
}
