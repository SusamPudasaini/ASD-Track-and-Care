import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";

/**
 * Desktop: unchanged (same links + avatar dropdown)
 * Mobile: ONE hamburger that toggles a single compiled menu:
 *   Home
 *   Questionnaire
 *   Therapists
 *   Bookings
 *   Activities
 *   ----
 *   (profile row with avatar + username)
 *   Edit Profile
 *   Activities Hub
 *   Analytics
 *   Admin Panel / Therapist Dashboard (role-based)
 *   ----
 *   Logout
 *
 * No "Close" button. Hamburger toggles open/close with animation.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  const [menuOpen, setMenuOpen] = useState(false); // desktop avatar dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // mobile compiled menu
  const menuRef = useRef(null);

  const [me, setMe] = useState(() => {
    try {
      const raw = localStorage.getItem("me");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const role = useMemo(() => {
    const r = (me?.role || localStorage.getItem("role") || "")
      .toString()
      .toUpperCase();
    return r;
  }, [me]);

  // ✅ Backend base (strip trailing "/api" if present)
  const backendBase = useMemo(() => {
    const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();
    if (!raw) return "http://localhost:8081";
    return raw.replace(/\/api\/?$/i, "");
  }, []);

  const avatarUrl = useMemo(() => {
    const raw =
      me?.profilePictureUrl ||
      me?.avatarUrl ||
      localStorage.getItem("profilePictureUrl") ||
      "";

    if (!raw) return "";
    if (raw.startsWith("blob:")) return raw;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return `${backendBase}${raw}`;
    return `${backendBase}/${raw}`;
  }, [me, backendBase]);

  // refresh user info
  useEffect(() => {
    if (!isLoggedIn) return;

    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/users/me");
        if (!mounted) return;

        setMe(res.data || null);
        localStorage.setItem("me", JSON.stringify(res.data || {}));

        if (res?.data?.role) localStorage.setItem("role", res.data.role);

        if (res?.data?.profilePictureUrl) {
          localStorage.setItem("profilePictureUrl", res.data.profilePictureUrl);
        } else {
          localStorage.removeItem("profilePictureUrl");
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  // close desktop dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // close mobile on route change (optional safety)
  // also close on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (path) => {
    setMenuOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  const toggleMobile = () => setMobileOpen((s) => !s);

  return (
    <header className="sticky top-0 z-[9999] w-full bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* logo */}
          <Link
            to="/"
            className="flex items-center"
            onClick={() => setMobileOpen(false)}
          >
            <img src="/images/logo/asd-logo.png" alt="ASD" className="h-10" />
          </Link>

          {/* center nav (DESKTOP ONLY - unchanged) */}
          <nav className="hidden md:flex items-center gap-10 text-base font-medium text-gray-700">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <Link to="/questionnaire" className="hover:text-gray-900">
              Questionnaire
            </Link>
            <Link to="/therapists" className="hover:text-gray-900">
              Therapists
            </Link>
            <Link to="/bookings" className="hover:text-gray-900">
              Bookings
            </Link>
            <Link to="/activities" className="hover:text-gray-900">
              Activities
            </Link>
          </nav>

          {/* right side */}
          <div className="flex items-center gap-4">
            {/* ✅ MOBILE: hamburger toggles the compiled menu */}
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={toggleMobile}
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
            >
              {/* animated hamburger -> X */}
              <div className="flex h-5 w-6 flex-col justify-between">
                <span
                  className={[
                    "block h-0.5 w-full bg-gray-800 transition duration-200",
                    mobileOpen ? "translate-y-[9px] rotate-45" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "block h-0.5 w-full bg-gray-800 transition duration-200",
                    mobileOpen ? "opacity-0" : "opacity-100",
                  ].join(" ")}
                />
                <span
                  className={[
                    "block h-0.5 w-full bg-gray-800 transition duration-200",
                    mobileOpen ? "-translate-y-[9px] -rotate-45" : "",
                  ].join(" ")}
                />
              </div>
            </button>

            {/* DESKTOP auth / avatar (unchanged) */}
            <div className="hidden md:flex items-center gap-6">
              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="text-sm font-semibold">
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <div className="relative" ref={menuRef}>
                  {/* Avatar button */}
                  <button
                    type="button"
                    onClick={() => setMenuOpen((s) => !s)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 hover:bg-gray-50"
                  >
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-100">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Me"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                          ME
                        </div>
                      )}
                    </div>

                    <span className="hidden sm:block text-sm font-semibold text-gray-700">
                      {me?.username || "User"}
                    </span>

                    <span className="hidden sm:block text-gray-400">▾</span>
                  </button>

                  {/* Desktop dropdown (unchanged) */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-100 bg-white shadow-lg z-[10000]">
                      <button
                        onClick={() => go("/profile")}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit Profile
                      </button>

                      <button
                        onClick={() => go("/activities")}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Activities Hub
                      </button>

                      <button
                        onClick={() => go("/analytics")}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Analytics
                      </button>

                      {role === "ADMIN" && (
                        <button
                          onClick={() => go("/admin/request")}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Admin Panel
                        </button>
                      )}

                      {role === "THERAPIST" && (
                        <button
                          onClick={() => go("/therapist/dashboard")}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Therapist Dashboard
                        </button>
                      )}

                      <div className="h-px bg-gray-100" />

                      <button
                        onClick={() => go("/logout")}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ MOBILE COMPILED MENU (animated open/close, no close button) */}
        <div
          className={[
            "md:hidden overflow-hidden transition-all duration-300 ease-out",
            mobileOpen ? "max-h-[520px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0",
          ].join(" ")}
        >
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            {/* Normal menu links */}
            <div className="p-2">
              <MobileItem onClick={() => go("/")}>Home</MobileItem>
              <MobileItem onClick={() => go("/questionnaire")}>
                Questionnaire
              </MobileItem>
              <MobileItem onClick={() => go("/therapists")}>Therapists</MobileItem>
              <MobileItem onClick={() => go("/bookings")}>Bookings</MobileItem>
              <MobileItem onClick={() => go("/activities")}>Activities</MobileItem>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* Profile section (only when logged in) */}
            {isLoggedIn ? (
              <>
                {/* profile row */}
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Me"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                        ME
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {me?.username || "User"}
                    </div>
                    <div className="text-xs text-gray-500">{role || "USER"}</div>
                  </div>
                </div>

                {/* dropdown actions compiled */}
                <div className="px-2 pb-2">
                  <MobileItem onClick={() => go("/profile")}>
                    Edit Profile
                  </MobileItem>

                  {role === "THERAPIST" && (
                    <MobileItem onClick={() => go("/therapist/dashboard")}>
                      Therapist Dashboard
                    </MobileItem>
                  )}

                  {role === "ADMIN" && (
                    <MobileItem onClick={() => go("/admin/request")}>
                      Admin Panel
                    </MobileItem>
                  )}

                  <MobileItem onClick={() => go("/analytics")}>
                    Analytics
                  </MobileItem>

                  <div className="h-px bg-gray-100 my-2" />

                  <button
                    onClick={() => go("/logout")}
                    className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              /* logged out actions */
              <div className="p-2">
                <MobileItem onClick={() => go("/login")}>Sign in</MobileItem>
                <button
                  onClick={() => go("/signup")}
                  className="w-full rounded-lg bg-[#4a6cf7] px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileItem({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}