import { useState } from "react";
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
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState(null);

  const eventDates = new Set(
    events.map(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

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
      const end = dateRange.end.toLocaleDateString('en-US', opts);
      return `${start} — ${end}`;
    }
    return start;
  }

  function filteredEvents() {
    let list = events.filter(e => !activePillar || e.pillar === activePillar);
    if (dateRange) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = dateRange.end ? new Date(dateRange.end) : new Date(start);
      if (dateRange.end) end.setHours(23, 59, 59, 999);
      else end.setHours(23, 59, 59, 999);
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
      </div>

      <div className="happenings-calendar">
        <div className="cal-header">
          <button className="cal-nav" onClick={prevMonth}>&lsaquo;</button>
          <span className="cal-title">{MONTHS[calMonth]} {calYear}</span>
          <button className="cal-nav" onClick={nextMonth}>&rsaquo;</button>
          <button className="cal-today-btn" onClick={goToToday}>Today</button>
        </div>
        {dateRange && (
          <div className="cal-range-display">
            <span>{formatRange()}</span>
            <button className="cal-clear" onClick={() => setDateRange(null)}>Clear</button>
          </div>
        )}
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
    </>
  );
}
