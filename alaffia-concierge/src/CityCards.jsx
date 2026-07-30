import lagosImg from "./assets/lagos.jpg";
import abujaImg from "./assets/abuja.jpg";
import kigaliImg from "./assets/kigali.jpg";
import nairobiImg from "./assets/nairobi.jpg";
import { cities } from "./lib/data";
import "./CityCards.css";

const cityImages = {
  Lagos: lagosImg,
  Abuja: abujaImg,
  Kigali: kigaliImg,
  Nairobi: nairobiImg,
};

export default function CityCards({ allVenues, onSelectCity }) {
  const venues = Array.isArray(allVenues) ? allVenues : [];

  if (venues.length === 0) {
    return (
      <div className="city-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-city">
            <div className="skeleton skeleton-circle" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-md" />
              <div className="skeleton skeleton-sm" style={{ width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="city-grid">
      {cities.map((city) => {
        const count = venues.filter((s) => s.city === city.name).length;
        return (
          <div
            key={city.name}
            className="city-card"
            onClick={() => onSelectCity(city.name)}
          >
            <div
              className="city-card-bg"
              style={{ backgroundImage: `url(${cityImages[city.name]})` }}
            />
            <div className="city-card-overlay" />
            <div className="city-card-content">
              <h3 className="city-card-name">{city.name}</h3>
              <span className="city-card-country">{city.country}</span>
            </div>
            <div className="city-card-footer">
              <span className="city-card-count">
                {count} {count === 1 ? "venue" : "venues"}
              </span>
              <span className="city-card-arrow">&rarr;</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
