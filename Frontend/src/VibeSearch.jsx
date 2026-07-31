import { useState, useRef, useEffect } from "react";
import { vibeMeta, moodPresets } from "./lib/data";
import "./VibeSearch.css";

const VIBE_ORDER = ["Premium", "Chic", "Serene", "Intimate", "Vibrant", "Curated"];

export function VibeFilter({ activeVibes, onToggleVibe }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeCount = activeVibes.length;

  return (
    <div className="vibe-filter" ref={ref}>
      <button
        className={`vibe-trigger ${isOpen ? "open" : ""} ${activeCount > 0 ? "has-active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="vibe-trigger-label">Mood</span>
        {activeCount > 0 && <span className="vibe-trigger-badge">{activeCount}</span>}
        <span className={`vibe-trigger-arrow ${isOpen ? "up" : ""}`}>▾</span>
      </button>

      {isOpen && (
        <div className="vibe-dropdown">
          <div className="vibe-chips">
            {VIBE_ORDER.map((vibe) => (
              <Chip key={vibe} vibe={vibe} isActive={activeVibes.includes(vibe)} onToggle={onToggleVibe} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ vibe, isActive, onToggle }) {
  const meta = vibeMeta[vibe];
  return (
    <button
      className={`vibe-chip ${isActive ? "active" : ""}`}
      style={{ "--vibe-color": meta.color, "--vibe-bg": meta.bg }}
      onClick={() => onToggle(vibe)}
    >
      <span className="vibe-chip-icon">{meta.icon}</span>
      {vibe}
    </button>
  );
}
