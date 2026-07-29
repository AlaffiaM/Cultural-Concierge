import { useState, useEffect, useRef } from "react";
import { useUser, useAuth, useSignIn, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import alaffiaLogo from "./assets/Alaffia Logo New.png";
import { cities } from "./data";
import { setTokenProvider } from "./clerk";
import CityCards from "./CityCards";
import SpotsView from "./SpotsView";
import HappeningsView from "./HappeningsView";
import TravelBrief from "./TravelBrief";


import SpotDetailModal from "./SpotDetailModal";
import AdminDashboard from "./admin/AdminDashboard";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "";


function countdownTo(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m`;
}

function gtag(...args) {
  if (typeof window !== "undefined" && window.gtag) window.gtag(...args);
}

function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
  const { signIn } = useSignIn();
  const hasNavigatedFromHome = useRef(false);
  const [view, setView] = useState("home");
  const [selectedCity, setSelectedCity] = useState(null);
  const [interests, setInterests] = useState("");
  const [allSpots, setAllSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePillar, setActivePillar] = useState(null);
  const [activeVibes, setActiveVibes] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [viewMode, setViewMode] = useState("places");
  const [advisory, setAdvisory] = useState(null);
  const [spotsError, setSpotsError] = useState(null);

  const isCallback = window.location.pathname === '/sso-callback'

  useEffect(() => {
    if (getToken) setTokenProvider(getToken)
  }, [getToken])

  async function handleGoogleSignIn() {
    if (!signIn) return
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: window.location.origin,
      })
    } catch (e) {
      console.error('[signIn] Google auth failed:', e.message)
    }
  }

  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
  const isAdmin = isSignedIn && ADMIN_EMAILS.includes(user?.primaryEmailAddress?.emailAddress?.toLowerCase())

  useEffect(() => {
    if (isSignedIn && user) {
      gtag("event", "sign_in");
      if (!hasNavigatedFromHome.current) setView("cities");
      hasNavigatedFromHome.current = false;
    }
  }, [isSignedIn, user]);

  async function handleSignOut() {
    await signOut();
    setView("home");
    hasNavigatedFromHome.current = true;
    gtag("event", "sign_out");
  }

  useEffect(() => {
    const cached = sessionStorage.getItem('alaffia_spots')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setAllSpots(Array.isArray(parsed) ? parsed : (parsed.spots || []))
      } catch {}
    }

    fetch(API_BASE + "/api/spots")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.spots || [])
        setAllSpots(list)
        setSpotsError(null)
        sessionStorage.setItem('alaffia_spots', JSON.stringify(list))
      })
      .catch((err) => {
        console.error('[spots] Fetch failed:', err.name, err.message, err.cause || '')
        setSpotsError(`Could not load spots. Try again. (${err.name}: ${err.message})`)
      })
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    setViewMode("places");
    setActiveVibes([]);
    setAdvisory(null);
    fetch(`${API_BASE}/api/events/upcoming?city=${selectedCity}`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {});
    fetch(`${API_BASE}/api/events/today?city=${selectedCity}`)
      .then((res) => res.json())
      .then((data) => setTodayEvents(data))
      .catch(() => {});
    const city = cities.find(c => c.name === selectedCity)
    if (city) {
      fetch(`${API_BASE}/api/advisories/${city.name}`)
        .then((res) => { if (res.ok) return res.json(); throw new Error() })
        .then((data) => setAdvisory(data))
        .catch(() => {})
    }
  }, [selectedCity]);

  useEffect(() => {
    if (!selectedCity) return;
    const citySpots = allSpots.filter((s) => s.city && s.city.toLowerCase() === selectedCity.toLowerCase());

    let spots = citySpots;

    if (activeVibes.length > 0) {
      const lowerVibes = activeVibes.map((v) => v.toLowerCase());
      spots = spots
        .map((s) => {
          const matchCount = (s.vibeTags || []).filter((t) =>
            lowerVibes.includes(t.toLowerCase())
          ).length;
          return { ...s, vibeScore: matchCount };
        })
        .filter((s) => s.vibeScore > 0)
        .sort((a, b) => b.vibeScore - a.vibeScore);
    }

    if (searchQuery && searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      spots = spots.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.details && s.details.toLowerCase().includes(q)) ||
          (s.vibeTags && s.vibeTags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (activePillar) {
      spots = spots.filter((s) => s.pillar === activePillar);
    }

    setFilteredSpots(spots);
  }, [selectedCity, allSpots, activeVibes, searchQuery, activePillar]);

  useEffect(() => {
    if (!selectedCity || activeVibes.length === 0) return;
    gtag("event", "vibe_search", { city: selectedCity, vibes: activeVibes.join(",") });
  }, [activeVibes, selectedCity]);

  function handleSelectCity(city) {
    setSelectedCity(city);
    setView("spots");
    setInterests("");
    setActiveVibes([]);
    setSearchQuery("");
    gtag("event", "select_city", { city });
  }

  function handleBack() {
    setView("cities");
    setSelectedCity(null);
    setInterests("");
    setActiveVibes([]);
    gtag("event", "back_to_cities");
  }

  function handleToggleVibe(vibe) {
    setActiveVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  }

  function handleSpotClick(spot) {
    setSelectedSpot(spot);
  }

  const todaySpotIds = new Set(
    todayEvents.filter((e) => e.linkedSpotId).map((e) => e.linkedSpotId._id)
  );

  if (isCallback) {
    return <AuthenticateWithRedirectCallback />
  }

  if (!isLoaded) {
    return (
      <div className="app-loading-screen">
        <img src={alaffiaLogo} alt="Alaffia" className="app-loading-logo" />
        <div className="app-loading-spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      {view !== "home" && view !== "admin" && (
        <header className="header">
          {view !== "cities" && (
            <button
              className="back-btn"
              onClick={handleBack}
              aria-label="Go back"
            >
              Back
            </button>
          )}
          <div className="logo">
            <img src={alaffiaLogo} alt="Alaffia" className="logo-img" />
          </div>
          <div className="user-area">
            {isSignedIn ? (
              <>
                {user?.imageUrl && <img src={user.imageUrl} alt="" className="user-avatar" />}
                <span className="user-name">{user?.fullName || "User"}</span>
                {isAdmin && view !== "admin" && (
                  <button className="btn-text" onClick={() => setView("admin")} style={{ borderColor: "var(--sage)" }}>Admin</button>
                )}
                {isAdmin && view === "admin" && (
                  <button className="btn-text" onClick={handleBack}>App</button>
                )}
                <button className="btn-text" onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <button className="btn-text" onClick={handleGoogleSignIn}>Sign in</button>
            )}
          </div>

        </header>
      )}

      {view !== "admin" && (
        <main className="main">
          <div key={view + (selectedCity || "")} className="view-enter">
          {view === "home" && (
            <div className="home-page">
              <div className="home-hero">
                <img src={alaffiaLogo} alt="Alaffia" className="home-logo" />
                <h1 className="home-title">Cultural Concierge</h1>
                <p className="home-tagline">
                  Discover wellness, creativity, and elevated experiences across Africa&rsquo;s most dynamic cities.
                </p>
              </div>
              <div className="home-actions">
                <button className="btn btn-primary btn-full" onClick={handleGoogleSignIn}>
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

          {view === "cities" && (
            <>
              <div className="cities-hero">
                <div className="cities-hero-brand">
                  <div className="cities-hero-rule" />
                  <p className="cities-hero-label">Explore</p>
                </div>
                <h2 className="cities-heading">Cultural Concierge</h2>
                <p className="cities-tagline">
                  Discover wellness, creativity, and elevated experiences across Africa&rsquo;s most dynamic cities &mdash; Lagos, Kigali, Nairobi and Abuja.
                </p>
              </div>
              <div className="cities-picker">
                <h2 className="section-title">Choose your city</h2>
                <div className="section-underline" />
              </div>
              <CityCards allSpots={allSpots} onSelectCity={handleSelectCity} />
            </>
          )}

          {view === "spots" && (
            <>
              <div className="city-hero">
                <h2 className="city-hero-name">{selectedCity}</h2>
                <span className="city-hero-country">
                  {cities.find((c) => c.name === selectedCity)?.country}
                </span>
              </div>

              <div className="spots-header">
                <div className="segmented-control">
                  <button className={viewMode === "travelbrief" ? "active" : ""} onClick={() => setViewMode("travelbrief")}>&#x1F6F0;&#xFE0F; Travel Brief</button>
                  <button className={viewMode === "places" ? "active" : ""} onClick={() => setViewMode("places")}>&#x1F5FA;&#xFE0F; Places</button>
                  <button className={viewMode === "happenings" ? "active" : ""} onClick={() => setViewMode("happenings")}>
                    &#x1F4C5; Happenings{events.length > 0 ? ` (${events.length})` : ""}
                  </button>
                </div>
              </div>

              {viewMode === "places" && (
                <SpotsView
                  selectedCity={selectedCity}
                  todayEvents={todayEvents}
                  events={events}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeVibes={activeVibes}
                  onToggleVibe={handleToggleVibe}
                  activePillar={activePillar}
                  onPillarChange={setActivePillar}
                  filteredSpots={filteredSpots}
                  allSpots={allSpots}
                  spotsError={spotsError}
                  onSpotClick={handleSpotClick}
                  todaySpotIds={todaySpotIds}
                  countdownTo={countdownTo}
                />
              )}

              {viewMode === "happenings" && (
                <HappeningsView
                  events={events}
                  allSpots={allSpots}
                  selectedCity={selectedCity}
                  activePillar={activePillar}
                  onPillarChange={setActivePillar}
                  countdownTo={countdownTo}
                />
              )}

              {viewMode === "travelbrief" && (
                <TravelBrief
                  advisory={advisory}
                  selectedCity={selectedCity}
                />
              )}
            </>
          )}

        </div>
        </main>
      )}

      {view === "admin" && <AdminDashboard onBackToApp={handleBack} user={user} />}

      {view !== "admin" && selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          events={events}
          onClose={() => setSelectedSpot(null)}
        />
      )}

      {view !== "admin" && (
        <footer className="footer">Alaffia Cultural Concierge &copy; 2026</footer>
      )}
    </div>
  );
}

export default App;
