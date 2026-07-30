import { useState } from "react";
import { cities, cityGradients } from "./lib/data";
import "./TravelBrief.css";

export default function TravelBrief({ advisory, selectedCity }) {
  const [advisoryTab, setAdvisoryTab] = useState("security");

  if (!advisory) {
    return (
      <div className="travel-brief">
        <div className="empty-state">
          <span className="empty-state-icon">&#x1F6F0;&#xFE0F;</span>
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
          <span className="tb-airport-icon">&#x2708;&#xFE0F;</span>
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
          <span className="tb-tab-icon">&#x1F6E1;&#xFE0F;</span>
          Security
        </button>
        <button
          className={`tb-tab ${advisoryTab === "health" ? "active" : ""}`}
          onClick={() => setAdvisoryTab("health")}
        >
          <span className="tb-tab-icon">&#x1F3E5;&#xFE0F;</span>
          Health
        </button>
      </div>

      {advisoryTab === "security" && (
        <div className="tb-section">
          <div className="tb-badge-row">
            <span className={`tb-badge ${advisory.security?.security_level_badge?.toLowerCase().includes("normal") ? "tb-badge-green" : "tb-badge-amber"}`}>
              &#x1F6E1;&#xFE0F; {advisory.security?.security_level_badge}
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
              &#x1F3E5;&#xFE0F; {advisory.health?.health_status_level}
            </span>
          </div>

          {advisory.health?.active_outbreaks?.length > 0 && (
            <div className="tb-accordion">
              <h4 className="tb-outbreaks-title">&#x1F6AB; Active Outbreaks</h4>
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
            <h4 className="tb-subtitle">&#x1F39F;&#xFE0F; Entry Requirements</h4>
            {advisory.health?.entry_requirements?.mandatory_vaccinations?.length > 0 && (
              <div className="tb-entry-block">
                <span className="tb-entry-label">&#x1F489; Required Vaccinations</span>
                <div className="tb-entry-items">
                  {advisory.health.entry_requirements.mandatory_vaccinations.map((v, i) => (
                    <span key={i} className="tb-entry-item">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {advisory.health?.entry_requirements?.documentation?.length > 0 && (
              <div className="tb-entry-block">
                <span className="tb-entry-label">&#x1F4C4; Required Documentation</span>
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
