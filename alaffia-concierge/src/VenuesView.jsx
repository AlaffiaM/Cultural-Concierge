import { useState } from 'react'
import { VibeFilter } from "./VibeSearch";
import { pillarIcons, pillarColors, vibeMeta } from "./lib/data";
import "./VenuesView.css";

function VenueImage({ venue, pillarColors, pillarIcons }) {
  const [loaded, setLoaded] = useState(false)
  const src = venue.imageUrl || (venue.images && venue.images[0]) || ''
  const hasSrc = Boolean(src)

  if (!hasSrc) {
    return (
      <div
        className="venue-card-placeholder"
        style={{
          background: `linear-gradient(135deg, ${pillarColors[venue.pillar] || 'var(--copper)'}, ${pillarColors[venue.pillar] || 'var(--copper-hover)'})`
        }}
      >
        <span className="venue-card-placeholder-icon">{pillarIcons[venue.pillar]}</span>
      </div>
    )
  }

  return (
    <>
      {!loaded && <div className="venue-card-img-skeleton" />}
      <div className="venue-card-img-wrap">
        <img
          src={src}
          alt={venue.name}
          className={`venue-card-img${loaded ? ' loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={e => { e.target.style.display = 'none'; setLoaded(true) }}
        />
      </div>
    </>
  )
}

export default function VenuesView({
  selectedCity,
  todayEvents,
  events,
  searchQuery,
  onSearchChange,
  activeVibes,
  onToggleVibe,
  activePillar,
  onPillarChange,
  filteredVenues,
  allVenues,
  venuesError,
  onVenueClick,
  todayVenueIds,
  countdownTo,
}) {
  const pillars = ["CULTURE", "WELLNESS", "SOCIAL"];

  return (
    <>
      {todayEvents.length > 0 && (
        <div className="today-picks">
          <div className="today-picks-header">
            <span className="today-picks-dot" />
            <span className="today-picks-title">Live Now &mdash; Today&rsquo;s Picks</span>
          </div>
          <div className="today-picks-list">
            {todayEvents.slice(0, 3).map((ev) => (
              <div key={ev._id} className="today-pick-item">
                <span className="today-picks-dot" style={{ width: 6, height: 6 }} />
                <div className="today-pick-col">
                  <span className="today-pick-name">{ev.name}</span>
                  <span className="today-pick-meta">
                    {ev.time} {ev.linkedSpotId?.name ? `@ ${ev.linkedSpotId.name}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="search-bar">
        <span className="search-icon">&#x1F50D;</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search venues..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <VibeFilter activeVibes={activeVibes} onToggleVibe={onToggleVibe} />

      {activeVibes.length > 0 && (
        <p className="vibe-match-msg">
          Showing {filteredVenues.length} venue{filteredVenues.length !== 1 ? "s" : ""} matching your vibe
        </p>
      )}

      <div className="pillar-filters">
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

      {venuesError ? (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <p>{venuesError}</p>
        </div>
      ) : allVenues.length === 0 ? (
        [1, 2, 3].map((i) => (
          <div key={i} className="pillar-section">
            <div className="skeleton skeleton-sm" style={{ width: "30%", marginBottom: 14 }} />
            <div className="venues-list">
              {[1, 2].map((j) => (
                <div key={j} className="skeleton-venue">
                  <div className="skeleton skeleton-md" />
                  <div className="skeleton skeleton-sm" style={{ width: "100%" }} />
                  <div className="skeleton skeleton-sm" style={{ width: "60%" }} />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : filteredVenues.length === 0 ? (
        <p className="empty-state">No venues match your search or vibe.</p>
      ) : pillars.map((pillar) => {
          const pillarVenues = filteredVenues.filter((s) => s.pillar === pillar);
          if (pillarVenues.length === 0) return null;
          return (
            <div key={pillar} className="pillar-section">
              <h3 className="pillar-title">
                <span>{pillarIcons[pillar]}</span>
                {pillar.charAt(0) + pillar.slice(1).toLowerCase()}
              </h3>
              <div className="venues-list">
                {pillarVenues.map((venue) => {
                  const venueEvents = events.filter(
                    e => e.linkedSpotId?._id === venue._id || e.linkedSpotId === venue._id
                  )
                  return (
                  <div
                    key={venue._id}
                    className="venue-card"
                    onClick={() => onVenueClick(venue)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onVenueClick(venue)}
                  >
                    <div className="venue-card-media">
                      <VenueImage venue={venue} pillarColors={pillarColors} pillarIcons={pillarIcons} />
                      <div className="venue-card-overlay" />
                      <h4 className="venue-card-title">{venue.name}</h4>
                      {venue.pillar && (
                        <span className="venue-card-pillar-tag">{pillarIcons[venue.pillar]} {venue.pillar.charAt(0) + venue.pillar.slice(1).toLowerCase()}</span>
                      )}
                      {todayVenueIds.has(venue._id) && <span className="live-badge">Live Tonight</span>}
                    </div>
                    <div className="venue-card-body">
                      <div className="venue-card-meta">
                        {venue.type && <span className="venue-type">{venue.type}</span>}
                        {venue.vibeScore > 0 && (
                          <span className="vibe-score">Match {venue.vibeScore}</span>
                        )}
                      </div>
                      <p className="venue-details">{venue.details}</p>
                      <div className="venue-tags">
                        {venue.vibeTags.map((tag) => {
                          const meta = vibeMeta[tag];
                          return (
                            <span
                              key={tag}
                              className="vibe-tag"
                              style={meta ? { color: meta.color, background: meta.bg } : {}}
                            >
                              {meta?.icon && `${meta.icon} `}{tag}
                            </span>
                          );
                        })}
                      </div>
                      {venue.tip && (
                        <div className="venue-tip">
                          <span className="tip-icon">Tip</span>
                          {venue.tip}
                        </div>
                      )}
                      {venueEvents.length > 0 && (
                        <div className="venue-card-events">
                          <div className="venue-card-events-title">Events at this venue</div>
                          {venueEvents.slice(0, 2).map((ev) => {
                              const d = new Date(ev.date);
                              const cd = countdownTo(ev.date);
                              return (
                                <div key={ev._id} className="venue-card-event-item">
                                  <span className="venue-card-event-date">{d.getDate()}/{d.getMonth() + 1}</span>
                                  <span className="venue-card-event-name">{ev.name}</span>
                                  {cd && <span className="countdown">{cd}</span>}
                                </div>
                              );
                            })}
                          {venueEvents.length > 2 && (
                            <div className="venue-card-event-more">
                              +{venueEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )})}
              </div>
            </div>
          );
        })}
    </>
  );
}
