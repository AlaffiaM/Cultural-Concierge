import { useState, useMemo } from "react";
import { pillarIcons, pillarColors, sourceLabels } from "./lib/data";
import "./HappeningsView.css";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HappeningsView({
  events,
  allVenues,
  selectedCity,
  activePillar,
  onPillarChange,
  countdownTo,
}) {
  const pillars = ["CULTURE", "WELLNESS", "SOCIAL"];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  const eventDates = useMemo(() => {
    const s = new Set();
    events.forEach(e => {
      const d = new Date(e.date);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [events]);

  function toDateKey(d) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function handleDayClick(day) {
    const clicked = new Date(calYear, calMonth, day);
    if (dateRange?.start && !dateRange?.end && !isSameDay(dateRange.start, clicked)) {
      if (clicked < dateRange.start) {
        setDateRange({ start: clicked, end: dateRange.start });
      } else {
        setDateRange({ start: dateRange.start, end: clicked });
      }
    } else if (dateRange?.start && isSameDay(dateRange.start, clicked)) {
      setDateRange(null);
    } else {
      setDateRange({ start: clicked, end: null });
    }
  }

  function isInRange(d) {
    if (!dateRange) return false;
    if (dateRange.end) {
      return d >= dateRange.start && d <= dateRange.end;
    }
    return isSameDay(d, dateRange.start);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function goToToday() {
    const t = new Date();
    setCalMonth(t.getMonth());
    setCalYear(t.getFullYear());
  }

  function formatRange() {
    if (!dateRange) return null;
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = dateRange.start.toLocaleDateString('en-US', opts);
    if (dateRange.end) {
      return `${start} — ${dateRange.end.toLocaleDateString('en-US', opts)}`;
    }
    return start;
  }

  function filteredEvents() {
    let list = events;
    if (activePillar) list = list.filter(e => e.pillar === activePillar);
    if (dateRange) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = dateRange.end ? new Date(dateRange.end) : new Date(start);
      end.setHours(23, 59, 59, 999);
      list = list.filter(e => {
        const ed = new Date(e.date);
        return ed >= start && ed <= end;
      });
    }
    return list;
  }

  const visible = filteredEvents();
  const dim = new Date(calYear, calMonth + 1, 0).getDate();
  const startDay = new Date(calYear, calMonth, 1).getDay();

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
        <button
          className={`pillar-filter-btn cal-filter-btn ${showCalendar ? "active" : ""}`}
          onClick={() => setShowCalendar(v => !v)}
        >
          {showCalendar ? 'Hide Calendar' : 'Filter by Date'}
        </button>
      </div>

      {dateRange && (
        <div className="cal-range-active">
          <span>{formatRange()}</span>
          <button onClick={() => { setDateRange(null); }} className="cal-range-clear">Clear</button>
        </div>
      )}

      {showCalendar && (
        <div className="happenings-calendar">
          <div className="cal-header">
            <button className="cal-nav" onClick={prevMonth}>&lsaquo;</button>
            <span className="cal-title">{MONTHS[calMonth]} {calYear}</span>
            <button className="cal-nav" onClick={nextMonth}>&rsaquo;</button>
            <button className="cal-today-btn" onClick={goToToday}>Today</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
            {Array.from({ length: startDay }, (_, i) => <div key={`pad-${i}`} className="cal-day cal-day-empty" />)}
            {Array.from({ length: dim }, (_, i) => {
              const day = i + 1;
              const d = new Date(calYear, calMonth, day);
              const key = toDateKey(d);
              const hasEvent = eventDates.has(key);
              const selected = isInRange(d);
              const today = isSameDay(d, new Date());
              return (
                <div
                  key={key}
                  className={`cal-day${selected ? " cal-day-selected" : ""}${hasEvent ? " cal-day-event" : ""}${today ? " cal-day-today" : ""}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                  {hasEvent && <span className="cal-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="events-list">
        {visible.length === 0
          ? events.length === 0 && allVenues.length === 0
            ? [1, 2, 3].map((i) => (
                <div key={i} className="skeleton-event">
                  <div className="skeleton" style={{ width: 40, height: 44, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-md" />
                    <div className="skeleton skeleton-sm" style={{ width: "50%" }} />
                  </div>
                </div>
              ))
            : <p className="empty-state">
                {dateRange ? "No events in this date range." : `No upcoming events in ${selectedCity}.`}
              </p>
          : visible.map((event) => {
              const d = new Date(event.date);
              const cd = countdownTo(event.date);
              return (
                <div
                  key={event._id}
                  className="event-strip"
                  style={{ borderLeftColor: pillarColors[event.pillar] || 'var(--copper)' }}
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.imageUrl && (
                    <img src={event.imageUrl} alt="" className="event-thumb" />
                  )}
                  <div className="event-date-box">
                    <span className="event-day">{DAYS[d.getDay()]}</span>
                    <span className="event-date-num">{d.getDate()}</span>
                    <span className="event-month">{MONTHS[d.getMonth()]}</span>
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

      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={e => e.stopPropagation()}>
            <button className="event-modal-close" onClick={() => setSelectedEvent(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            {(() => {
              const ev = selectedEvent;
              const d = new Date(ev.date);
              const cd = countdownTo(ev.date);
              return (
                <>
                  {ev.imageUrl && (
                    <div className="event-modal-media">
                      <img src={ev.imageUrl} alt={ev.name} />
                      <div className="event-modal-overlay-grad" />
                    </div>
                  )}
                  <div className="event-modal-body">
                    <div className="event-modal-date">
                      <span className="event-modal-day">{DAYS[d.getDay()]}</span>
                      <span className="event-modal-date-num">{d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}</span>
                      {ev.time && <span className="event-modal-time">{ev.time}</span>}
                    </div>
                    <h3 className="event-modal-name">{ev.name}</h3>
                    {ev.description && <p className="event-modal-desc">{ev.description}</p>}
                    <div className="event-modal-details">
                      {ev.venue && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Venue</span>
                          <span>{ev.venue}</span>
                        </div>
                      )}
                      {ev.price && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Price</span>
                          <span>{ev.price}</span>
                        </div>
                      )}
                      {ev.type && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Type</span>
                          <span>{ev.type}</span>
                        </div>
                      )}
                      {ev.pillar && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Category</span>
                          <span>{pillarIcons[ev.pillar]} {ev.pillar.charAt(0) + ev.pillar.slice(1).toLowerCase()}</span>
                        </div>
                      )}
                      {ev.linkedSpotId && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">At</span>
                          <span>{ev.linkedSpotId.name}</span>
                        </div>
                      )}
                      {ev.source && ev.source !== 'manual' && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Source</span>
                          <span>{sourceLabels[ev.source] || ev.source}</span>
                        </div>
                      )}
                      {ev.isGhostLocation && (
                        <div className="event-modal-detail">
                          <span className="event-modal-label">Type</span>
                          <span className="ghost-tag">Pop-up Event</span>
                        </div>
                      )}
                    </div>
                    {cd && <div className="event-modal-countdown">{cd} away</div>}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
