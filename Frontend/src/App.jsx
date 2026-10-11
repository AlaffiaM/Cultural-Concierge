import { useState, useEffect, useRef } from "react";
import { useUser, useAuth, useSignIn, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import alaffiaLogo from "./assets/Alaffia Logo New.png";
import { cities } from "./lib/data";
import { setTokenProvider } from "./lib/clerk";
import CityCards from "./CityCards";
import VenuesView from "./VenuesView";
import HappeningsView from "./HappeningsView";
import TravelBrief from "./TravelBrief";
import EventSubmissionForm from "./EventSubmissionForm";


import VenueDetailModal from "./VenueDetailModal";
import AdminDashboard from "./admin/AdminDashboard";
import "./App.css";

import { API_BASE } from "./lib/api";


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
  // view = 'home' | 'cities' | 'venues' | 'submit-event' | 'admin' (simple state machine, no router).
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
  const { signIn } = useSignIn();
  const hasNavigatedFromHome = useRef(false);
  const submissionReturnView = useRef("home");
  const [view, setView] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [allVenues, setAllVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePillar, setActivePillar] = useState(null);
  const [activeVibes, setActiveVibes] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [viewMode, setViewMode] = useState("places");
  const [advisory, setAdvisory] = useState(null);
  const [venuesError, setVenuesError] = useState(null);

  const isCallback = window.location.pathname === '/sso-callback'

  useEffect(() => {
    if (getToken) setTokenProvider(getToken)
  }, [getToken])

  async function handleGoogleSignIn() {
    setMobileMenuOpen(false);
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
      const email = user.primaryEmailAddress?.emailAddress
      if (email) {
        fetch(API_BASE + "/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name: user.fullName || "", source: "signin" }),
        }).catch(() => {})
      }
    }
  }, [isSignedIn, user]);

  async function handleSignOut() {
    await signOut();
    setMobileMenuOpen(false);
    setView("home");
    hasNavigatedFromHome.current = true;
    gtag("event", "sign_out");
  }

  useEffect(() => {
    const cached = sessionStorage.getItem('alaffia_venues')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setAllVenues(Array.isArray(parsed) ? parsed : (parsed.venues || []))
      } catch {}
    }

    fetch(API_BASE + "/api/venues")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.venues || [])
        setAllVenues(list)
        setVenuesError(null)
        sessionStorage.setItem('alaffia_venues', JSON.stringify(list))
      })
      .catch((err) => {
        console.error('[venues] Fetch failed:', err.name, err.message, err.cause || '')
        setVenuesError(`Could not load venues. Try again. (${err.name}: ${err.message})`)
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
    const cityVenues = allVenues.filter((s) => s.city && s.city.toLowerCase() === selectedCity.toLowerCase());

    let venues = cityVenues;

    if (activeVibes.length > 0) {
      const lowerVibes = activeVibes.map((v) => v.toLowerCase());
      venues = venues
        .map((s) => {
          const matchCount = (s.vibeTags || []).filter((t) =>
            lowerVibes.includes(t.toLowerCase())
          ).length;
          return { ...s, vibeScore: matchCount };
        })
        .filter((s) => s.vibeScore > 0)
        .sort((a, b) => b.vibeScore - a.vibeScore);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      venues = venues.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.details && s.details.toLowerCase().includes(q)) ||
          (s.vibeTags && s.vibeTags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (activePillar) {
      venues = venues.filter((s) => s.pillar === activePillar);
    }

    setFilteredVenues(venues);
  }, [selectedCity, allVenues, activeVibes, searchQuery, activePillar]);

  useEffect(() => {
    if (!selectedCity || activeVibes.length === 0) return;
    gtag("event", "vibe_search", { city: selectedCity, vibes: activeVibes.join(",") });
  }, [activeVibes, selectedCity]);

  function handleSelectCity(city) {
    setMobileMenuOpen(false);
    setSelectedCity(city);
    setView("venues");
    setActiveVibes([]);
    setSearchQuery("");
    gtag("event", "select_city", { city });
  }

  function handleSubmitEvent() {
    setMobileMenuOpen(false);
    submissionReturnView.current = view;
    setView("submit-event");
    gtag("event", "open_event_submission");
  }

  function handleSubmissionBack() {
    setMobileMenuOpen(false);
    setView(submissionReturnView.current);
  }

  function handleBack() {
    setMobileMenuOpen(false);
    setView("cities");
    setSelectedCity(null);
    setActiveVibes([]);
    gtag("event", "back_to_cities");
  }

  function handleToggleVibe(vibe) {
    setActiveVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  }

  function handleVenueClick(venue) {
    setSelectedVenue(venue);
  }

  const todayVenueIds = new Set(
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
        <header className={`header${mobileMenuOpen ? " mobile-menu-open" : ""}`}>
          {view !== "cities" && (
            <button
              className="back-btn"
              onClick={view === "submit-event" ? handleSubmissionBack : handleBack}
              aria-label="Go back"
            >
              Back
            </button>
          )}
          <div className="logo">
            <img src={alaffiaLogo} alt="Alaffia" className="logo-img" />
          </div>
          <div className="user-area">
            {view !== "submit-event" && (
              <button className="btn-text submit-event-nav" onClick={handleSubmitEvent}>Share an event</button>
            )}
            <button
              className="mobile-menu-toggle"
              type="button"
              aria-label={mobileMenuOpen ? "Close profile menu" : "Open profile menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(open => !open)}
            >
              <span /><span /><span />
            </button>
            <div className="user-menu">
              {isSignedIn ? (
                <>
                  <div className="user-menu-profile">
                    {user?.imageUrl && <img src={user.imageUrl} alt="" className="user-avatar" />}
                    <span className="user-name">{user?.fullName || "User"}</span>
                  </div>
                  {isAdmin && (
                    <button className="btn-text" onClick={() => { setMobileMenuOpen(false); setView("admin") }} style={{ borderColor: "var(--sage)" }}>Admin</button>
                  )}
                  <button className="btn-text" onClick={handleSignOut}>Sign out</button>
                </>
              ) : (
                <>
                  <button className="btn-text" onClick={handleGoogleSignIn} disabled>Sign in</button>
                  <span className="header-newsletter-note">Subscribe</span>
                </>
              )}
            </div>
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
                <button className="btn btn-primary btn-full" onClick={handleGoogleSignIn} disabled>    
                  {/* hmmm */}
                  Sign in with Google
                </button>
                <p className="home-newsletter-note">Logging in subscribes you to our monthly newsletter</p>
                <button className="home-submit-event" onClick={handleSubmitEvent}>Know an event? Share it with us</button>
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
              <CityCards allVenues={allVenues} onSelectCity={handleSelectCity} />
            </>
          )}

          {view === "submit-event" && (
            <EventSubmissionForm city={selectedCity} onBack={handleSubmissionBack} />
          )}

          {view === "venues" && (
            <>
              {viewMode !== "travelbrief" && (
                <div className="city-hero">
                  <h2 className="city-hero-name">{selectedCity}</h2>
                  <span className="city-hero-country">
                    {cities.find((c) => c.name === selectedCity)?.country}
                  </span>
                </div>
              )}

              <div className="venues-header">
                <div className="segmented-control">
                  <button className={viewMode === "travelbrief" ? "active" : ""} onClick={() => setViewMode("travelbrief")}>
                    <span className="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg></span>
                    Travel Brief
                  </button>
                  <button className={viewMode === "places" ? "active" : ""} onClick={() => setViewMode("places")}>
                    <span className="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg></span>
                    Venues
                  </button>
                  <button className={viewMode === "happenings" ? "active" : ""} onClick={() => setViewMode("happenings")}>
                    <span className="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M3 9h18M8 2v4M16 2v4" /></svg></span>
                    Happenings{events.length > 0 ? ` (${events.length})` : ""}
                  </button>
                </div>
              </div>

              {viewMode === "places" && (
                <VenuesView
                  selectedCity={selectedCity}
                  todayEvents={todayEvents}
                  events={events}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeVibes={activeVibes}
                  onToggleVibe={handleToggleVibe}
                  activePillar={activePillar}
                  onPillarChange={setActivePillar}
                  filteredVenues={filteredVenues}
                  allVenues={allVenues}
                  venuesError={venuesError}
                  onVenueClick={handleVenueClick}
                  todayVenueIds={todayVenueIds}
                  countdownTo={countdownTo}
                />
              )}

              {viewMode === "happenings" && (
                <HappeningsView
                  events={events}
                  allVenues={allVenues}
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

      {view !== "admin" && selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          events={events}
          onClose={() => setSelectedVenue(null)}
        />
      )}

      {view !== "admin" && (
        <footer className="footer">Alaffia Cultural Concierge &copy; 2026</footer>
      )}
    </div>
  );
}

export default App;
