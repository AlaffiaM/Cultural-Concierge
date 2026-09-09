import { useState } from "react";
import { cities, cityGradients } from "./lib/data";
import "./TravelBrief.css";

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 2.8v5.4c0 4.7-3 8.3-7 9.8-4-1.5-7-5.1-7-9.8V5.8L12 3z" />
    <path d="M12 8v4M12 15.5v.1" />
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const PlaneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 13.5L3 11l1-1.5 6-.5 5-5a1.2 1.2 0 0 1 1.9 1.8l-5 5 .5 6 1.6-1 2.5-6.5 1.5-.2-2.5 7.5-2 2-3.5-2z" transform="rotate(45 12 12)" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);

export default function TravelBrief({ advisory, selectedCity }) {
  const [advisoryTab, setAdvisoryTab] = useState("security");

  if (!advisory) {
    return (
      <div className="travel-brief">
        <div className="empty-state">
          <span className="empty-state-icon"><GlobeIcon /></span>
          <p>No travel advisory available for {selectedCity}.</p>
        </div>
      </div>
    );
  }

  const cityMeta = cities.find((c) => c.name === selectedCity);
  const gradient = cityGradients[cityMeta?.iconClass || "culture"];

  const airportTip = advisory.security?.operational_guidelines?.find(
    g => g.category === "Airport Transit"
  );

  return (
    <div className="travel-brief">
      <div className="tb-hero" style={{ background: gradient }}>
        <div className="tb-hero-content">
          <div className="tb-hero-top">
            <span className="tb-badge tb-badge-static">
              {advisoryTab === "security"
                ? advisory.security?.security_level_badge
                : advisory.health?.health_status_level}
            </span>
            <span className="tb-hero-updated">{advisory.last_updated}</span>
          </div>
          <h2 className="tb-hero-name">{selectedCity}</h2>
          <span className="tb-hero-country">{cityMeta?.country}</span>
        </div>
      </div>

      {advisory.city_overview && (
        <p className="tb-overview">{advisory.city_overview}</p>
      )}

      {airportTip && (
        <div className="tb-airport-tip">
          <span className="tb-airport-icon"><PlaneIcon /></span>
          <div className="tb-airport-text">
            <strong>{airportTip.category}:</strong> {airportTip.instruction}
          </div>
        </div>
      )}

      <div className="tb-tabs">
        <button
          className={`tb-tab ${advisoryTab === "security" ? "active" : ""}`}
          onClick={() => setAdvisoryTab("security")}
        >
          <span className="tb-tab-icon"><ShieldIcon /></span>
          Security
        </button>
        <button
          className={`tb-tab ${advisoryTab === "health" ? "active" : ""}`}
          onClick={() => setAdvisoryTab("health")}
        >
          <span className="tb-tab-icon"><CrossIcon /></span>
          Health
        </button>
      </div>

      {advisoryTab === "security" && (
        <div className="tb-section">
          <div className="tb-badge-row">
            <span className={`tb-badge ${advisory.security?.security_level_badge?.toLowerCase().includes("normal") ? "tb-badge-green" : "tb-badge-amber"}`}>
              <ShieldIcon /> {advisory.security?.security_level_badge}
            </span>
            <span className="tb-crime">{advisory.security?.crime_rating}</span>
          </div>
          <div className="tb-accordion">
            {advisory.security?.operational_guidelines?.map((g, i) => (
              <details key={i} className="tb-details" open={i === 0}>
                <summary className="tb-summary">{g.category}</summary>
                <p className="tb-instruction">{g.instruction}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {advisoryTab === "health" && (
        <div className="tb-section">
          <div className="tb-badge-row">
            <span className={`tb-badge ${advisory.health?.health_status_level?.toLowerCase().includes("standard") ? "tb-badge-green" : "tb-badge-amber"}`}>
              <CrossIcon /> {advisory.health?.health_status_level}
            </span>
          </div>

          {advisory.health?.active_outbreaks?.length > 0 && (
            <div className="tb-accordion">
              <h4 className="tb-outbreaks-title">Active Outbreaks</h4>
              {advisory.health.active_outbreaks.map((o, i) => (
                <details key={i} className="tb-details" open={i === 0}>
                  <summary className="tb-summary">
                    <span>{o.disease}</span>
                    <span className="tb-risk">{o.risk_level}</span>
                  </summary>
                  <p className="tb-instruction">{o.advisory_text}</p>
                </details>
              ))}
            </div>
          )}

          <div className="tb-entry">
            <h4 className="tb-subtitle">Entry Requirements</h4>
            {advisory.health?.entry_requirements?.mandatory_vaccinations?.length > 0 && (
              <div className="tb-entry-block">
                <span className="tb-entry-label">Required Vaccinations</span>
                <div className="tb-entry-items">
                  {advisory.health.entry_requirements.mandatory_vaccinations.map((v, i) => (
                    <span key={i} className="tb-entry-item">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {advisory.health?.entry_requirements?.documentation?.length > 0 && (
              <div className="tb-entry-block">
                <span className="tb-entry-label">Required Documentation</span>
                <div className="tb-entry-items">
                  {advisory.health.entry_requirements.documentation.map((d, i) => (
                    <span key={i} className="tb-entry-item">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
