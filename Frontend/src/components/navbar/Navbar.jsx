import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";

/**
 * We read cached user info from localStorage for instant UI:
 * - role
 * - profilePictureUrl
 *
 * On mount, we also try to refresh from /api/users/me (safe).
 * If that call fails, navbar still works using cached values.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  const [menuOpen, setMenuOpen] = useState(false);
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
    const r = (me?.role || localStorage.getItem("role") || "").toString().toUpperCase();
    return r;
  }, [me]);

  const avatarUrl = useMemo(() => {
    // backend ProfileResponse uses profilePictureUrl
    return (
      me?.profilePictureUrl ||
      me?.avatarUrl ||
      localStorage.getItem("profilePictureUrl") ||
      ""
    );
  }, [me]);

  // refresh user info (optional, but nice)
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
        if (res?.data?.profilePictureUrl)
          localStorage.setItem("profilePictureUrl", res.data.profilePictureUrl);
      } catch {
        // ignore: navbar still uses cached values
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  // click outside to close dropdown
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="w-full">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between">
          {/* logo */}
          <Link to="/" className="flex items-center">
            <img src="/images/logo/asd-logo.png" alt="ASD" className="h-10" />
          </Link>

          {/* center nav */}
          <nav className="hidden md:flex items-center gap-10 text-base font-medium text-gray-700">
            <Link to="/">Home</Link>
            <Link to="/questionnaire">Questionnaire</Link>
            <Link to="/therapists">Therapists</Link>
            <Link to="/bookings">Bookings</Link>
          </nav>

          {/* auth / avatar */}
          <div className="flex items-center gap-6">
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
                      <img src={avatarUrl} alt="Me" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                        ME
                      </div>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700">
                    {role || "USER"}
                  </span>
                  <span className="hidden sm:block text-gray-400">▾</span>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-100 bg-white shadow-lg">
                    <button
                      onClick={() => go("/profile")}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit Profile
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
    </header>
  );
}
