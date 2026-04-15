import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBookOpen,
  FaSchool,
  FaRightFromBracket,
  FaUserGear,
  FaFileCircleCheck,
  FaCircleQuestion,
  FaBarsProgress,
  FaAnglesLeft,
  FaAnglesRight,
  FaComments,
  FaGamepad,
  FaChevronDown,
  FaBars,
  FaXmark,
  FaHouse,
  FaClipboardList,
  FaUserDoctor,
  FaPuzzlePiece,
  FaToolbox,
  FaDatabase,
} from "react-icons/fa6";
import api from "../../api/axios";

function getStoredMe() {
  try {
    const raw = localStorage.getItem("me");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getRoleFromMe(me) {
  return (me?.role || localStorage.getItem("role") || "USER")
    .toString()
    .toUpperCase();
}

function getInitials(name) {
  const safe = String(name || "User").trim();
  const parts = safe.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState(null);
  const [openMobileGroup, setOpenMobileGroup] = useState(null);

  const menuRef = useRef(null);
  const desktopNavRef = useRef(null);

  const [me, setMe] = useState(getStoredMe);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [openAdminGroups, setOpenAdminGroups] = useState({
    content: false,
    database: false,
  });

  const role = useMemo(() => getRoleFromMe(me), [me]);

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

  useEffect(() => {
    if (!isLoggedIn) return;

    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/api/users/me");
        if (!mounted) return;

        const user = res.data || null;
        setMe(user);
        localStorage.setItem("me", JSON.stringify(user || {}));

        if (user?.role) localStorage.setItem("role", user.role);

        if (user?.profilePictureUrl) {
          localStorage.setItem("profilePictureUrl", user.profilePictureUrl);
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

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target)) {
        setOpenDesktopDropdown(null);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setOpenMobileGroup(null);
    setOpenDesktopDropdown(null);
  }, [location.pathname]);

  const go = (path) => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    setOpenDesktopDropdown(null);
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const userMenuGroups = [
    {
      label: "Home",
      icon: FaHouse,
      type: "single",
      path: "/",
    },
    {
      label: "Assessments",
      icon: FaClipboardList,
      type: "group",
      items: [
        { label: "AI Questionnaire", path: "/questionnaire" },
        { label: "M-CHAT", path: "/mchat-questionnaire" },
        { label: "Analytics", path: "/analytics" },
      ],
    },
    {
      label: "Support",
      icon: FaUserDoctor,
      type: "group",
      items: [
        { label: "Resource Hub", path: "/resources" },
        { label: "Therapists", path: "/therapists" },
        { label: "Bookings", path: "/bookings" },
        { label: "Day Care Finder", path: "/daycares" },
      ],
    },
    {
      label: "Activities",
      icon: FaPuzzlePiece,
      type: "group",
      items: [
        { label: "Activities Hub", path: "/activities" },
        { label: "Matching & Sorting", path: "/activities/matching-sorting" },
      ],
    },
    {
      label: "Tools",
      icon: FaToolbox,
      type: "group",
      items: [
        { label: "AAC Board", path: "/aac-board" },
        { label: "Create First-Then Board", path: "/first-then" },
        { label: "My First-Then Boards", path: "/first-then/boards" },
      ],
    },
  ];

  const therapistLinks = [
    { label: "Home", path: "/" },
    { label: "Dashboard", path: "/therapist/dashboard" },
    { label: "Bookings", path: "/bookings" },
    { label: "Resource Hub", path: "/resources" },
    { label: "Activities", path: "/activities" },
    { label: "Day Care Finder", path: "/daycares" },
  ];

  const adminContentLinks = [
    { label: "Therapist Requests", path: "/admin/request", icon: FaFileCircleCheck },
    { label: "Manage Resources", path: "/admin/resources", icon: FaBookOpen },
    { label: "Manage M-CHAT", path: "/admin/mchat-questions", icon: FaCircleQuestion },
    { label: "Manage Day Cares", path: "/admin/daycares", icon: FaSchool },
    { label: "Manage AAC Cards", path: "/admin/aac-cards", icon: FaComments },
    { label: "Manage Match & Sort", path: "/admin/matching-sorting", icon: FaGamepad },
  ];

  const adminDatabaseLinks = [
    { label: "User Management", path: "/admin/user-management", icon: FaUserGear },
    { label: "Booking Management", path: "/admin/booking-management", icon: FaBookOpen },
    { label: "Therapist Reviews", path: "/admin/therapist-reviews", icon: FaComments },
  ];

  const desktopLinks =
    role === "THERAPIST"
      ? therapistLinks
      : role === "ADMIN" && isLoggedIn
      ? []
      : userMenuGroups;

  const sidebarWidth = adminCollapsed ? 96 : 288;

  const topBarClass =
    role === "ADMIN" && isLoggedIn
      ? "sticky top-0 z-[9997] h-16 border-b border-slate-200 bg-white"
      : "sticky top-0 z-[9999] w-full border-b border-slate-100 bg-white/95 backdrop-blur";

  const isGroupActive = (items = []) => items.some((item) => isActive(item.path));

  const toggleAdminGroup = (key) => {
    setOpenAdminGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {role === "ADMIN" && isLoggedIn && (
        <aside
          className={`fixed left-0 top-0 z-[9998] flex h-screen flex-col border-r border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 ${
            adminCollapsed ? "w-24" : "w-72"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <Link
              to="/admin/request"
              className={`flex items-center ${adminCollapsed ? "w-full justify-center" : "gap-3"}`}
            >
              <img
                src={
                  adminCollapsed
                    ? "/images/logo/asd-brain.png"
                    : "/images/logo/asd-logo.png"
                }
                alt="ASD"
                className={adminCollapsed ? "h-9" : "h-10"}
              />
            </Link>

            {!adminCollapsed && (
              <button
                type="button"
                onClick={() => setAdminCollapsed(true)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <FaAnglesLeft />
              </button>
            )}
          </div>

          {adminCollapsed && (
            <div className="flex justify-center border-b border-slate-100 py-3">
              <button
                type="button"
                onClick={() => setAdminCollapsed(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <FaAnglesRight />
              </button>
            </div>
          )}

          <div className={`border-b border-slate-100 py-5 ${adminCollapsed ? "px-2" : "px-4"}`}>
            <div
              className={`rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4 ring-1 ring-indigo-100 ${
                adminCollapsed ? "flex flex-col items-center" : ""
              }`}
            >
              <div className={`mb-2 flex items-center gap-3 ${adminCollapsed ? "flex-col" : ""}`}>
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
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
                    getInitials(me?.username || "Admin")
                  )}
                </div>

                {!adminCollapsed && (
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {me?.username || "Admin"}
                    </div>
                    <div className="text-xs uppercase text-indigo-600">Administrator</div>
                  </div>
                )}
              </div>

              {!adminCollapsed && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FaBarsProgress />
                  Admin control panel
                </div>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto py-5 ${adminCollapsed ? "px-2" : "px-4"}`}>
            <div className="space-y-6">
              <div>
                {!adminCollapsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleAdminGroup("content")}
                      className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        <FaClipboardList className="text-[11px]" />
                        Content Management
                      </span>
                      <FaChevronDown
                        className={`text-xs text-slate-500 transition-transform ${
                          openAdminGroups.content ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openAdminGroups.content && (
                      <div className="space-y-1.5">
                        {adminContentLinks.map((item) => (
                          <SidebarItem
                            key={item.path}
                            active={isActive(item.path)}
                            onClick={() => go(item.path)}
                            icon={item.icon}
                            collapsed={adminCollapsed}
                          >
                            {item.label}
                          </SidebarItem>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {adminContentLinks.map((item) => (
                      <SidebarItem
                        key={item.path}
                        active={isActive(item.path)}
                        onClick={() => go(item.path)}
                        icon={item.icon}
                        collapsed={adminCollapsed}
                      >
                        {item.label}
                      </SidebarItem>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {!adminCollapsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleAdminGroup("database")}
                      className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        <FaDatabase className="text-[11px]" />
                        Record Management
                      </span>
                      <FaChevronDown
                        className={`text-xs text-slate-500 transition-transform ${
                          openAdminGroups.database ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openAdminGroups.database && (
                      <div className="space-y-1.5">
                        {adminDatabaseLinks.map((item) => (
                          <SidebarItem
                            key={item.path}
                            active={isActive(item.path)}
                            onClick={() => go(item.path)}
                            icon={item.icon}
                            collapsed={adminCollapsed}
                          >
                            {item.label}
                          </SidebarItem>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {adminDatabaseLinks.map((item) => (
                      <SidebarItem
                        key={item.path}
                        active={isActive(item.path)}
                        onClick={() => go(item.path)}
                        icon={item.icon}
                        collapsed={adminCollapsed}
                      >
                        {item.label}
                      </SidebarItem>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`border-t border-slate-200 bg-white p-4 ${adminCollapsed ? "px-2" : ""}`}>
            <SidebarItem
              onClick={() => go("/profile")}
              icon={FaUserGear}
              collapsed={adminCollapsed}
            >
              Edit Profile
            </SidebarItem>

            <SidebarItem
              onClick={() => go("/logout")}
              danger
              icon={FaRightFromBracket}
              collapsed={adminCollapsed}
            >
              Logout
            </SidebarItem>
          </div>
        </aside>
      )}

      <header
        className={topBarClass}
        style={role === "ADMIN" && isLoggedIn ? { marginLeft: `${sidebarWidth}px` } : {}}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={role === "ADMIN" && isLoggedIn ? "/admin/request" : "/"}
              className="flex shrink-0 items-center"
            >
              {!(role === "ADMIN" && isLoggedIn) && (
                <img src="/images/logo/asd-logo.png" alt="ASD" className="h-10 md:h-11" />
              )}
            </Link>

            {!(role === "ADMIN" && isLoggedIn) && (
              <>
                {role === "USER" ? (
                  <nav
                    ref={desktopNavRef}
                    className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-2 py-2 shadow-sm md:flex"
                  >
                    {desktopLinks.map((item) => {
                      if (item.type === "single") {
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => go(item.path)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              isActive(item.path)
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      }

                      const active = isGroupActive(item.items);
                      const opened = openDesktopDropdown === item.label;

                      return (
                        <div key={item.label} className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDesktopDropdown((prev) =>
                                prev === item.label ? null : item.label
                              )
                            }
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              active || opened
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span>{item.label}</span>
                            <FaChevronDown
                              className={`text-xs transition-transform ${
                                opened ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {opened && (
                            <div className="absolute left-0 top-full z-[10000] mt-3 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                              <div className="mb-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {item.label}
                              </div>

                              {item.items.map((subItem) => (
                                <button
                                  key={subItem.path}
                                  type="button"
                                  onClick={() => go(subItem.path)}
                                  className={`flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                                    isActive(subItem.path)
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {subItem.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                ) : (
                  <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
                    {desktopLinks.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => go(item.path)}
                        className={`transition ${
                          isActive(item.path)
                            ? "font-semibold text-[#4a6cf7]"
                            : "hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </nav>
                )}
              </>
            )}

            {!(role === "ADMIN" && isLoggedIn) && (
              <div className="flex items-center gap-3">
                {role === "USER" && (
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen((s) => !s)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
                  >
                    {mobileNavOpen ? <FaXmark /> : <FaBars />}
                  </button>
                )}

                {!isLoggedIn ? (
                  <>
                    <Link to="/login" className="text-sm font-semibold text-slate-700">
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      className="rounded-xl bg-[#4a6cf7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f5ee0]"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((s) => !s)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
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
                          getInitials(me?.username || "User")
                        )}
                      </div>

                      <div className="hidden text-left sm:block">
                        <div className="max-w-[140px] truncate text-sm font-semibold text-slate-800">
                          {me?.username || "User"}
                        </div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {role}
                        </div>
                      </div>

                      <span className="hidden text-xs text-slate-400 sm:block">▾</span>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 z-[10000] mt-3 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
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
                                getInitials(me?.username || "User")
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {me?.username || "User"}
                              </div>
                              <div className="text-xs uppercase tracking-wide text-slate-400">
                                {role}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <ProfileMenuItem onClick={() => go("/profile")}>
                            Edit Profile
                          </ProfileMenuItem>

                          {role === "USER" && (
                            <>
                              <ProfileMenuItem onClick={() => go("/gameanalytics")}>
                                GameAnalytics
                              </ProfileMenuItem>
                            </>
                          )}

                          {role === "THERAPIST" && (
                            <>
                              <ProfileMenuItem onClick={() => go("/therapist/dashboard")}>
                                Therapist Dashboard
                              </ProfileMenuItem>
                              <ProfileMenuItem onClick={() => go("/gameanalytics")}>
                                GameAnalytics
                              </ProfileMenuItem>
                            </>
                          )}

                          <div className="my-2 h-px bg-slate-100" />

                          <ProfileMenuItem onClick={() => go("/logout")} danger>
                            Logout
                          </ProfileMenuItem>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!(role === "ADMIN" && isLoggedIn) && role === "USER" && mobileNavOpen && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
              <div className="space-y-2">
                {userMenuGroups.map((group) => {
                  if (group.type === "single") {
                    return (
                      <button
                        key={group.path}
                        type="button"
                        onClick={() => go(group.path)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                          isActive(group.path)
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <group.icon className="text-sm" />
                        <span>{group.label}</span>
                      </button>
                    );
                  }

                  const expanded = openMobileGroup === group.label;
                  const active = isGroupActive(group.items);

                  return (
                    <div
                      key={group.label}
                      className="overflow-hidden rounded-xl border border-slate-100"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMobileGroup((prev) =>
                            prev === group.label ? null : group.label
                          )
                        }
                        className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold transition ${
                          active || expanded
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <group.icon className="text-sm" />
                          {group.label}
                        </span>
                        <FaChevronDown
                          className={`text-xs transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-2">
                          {group.items.map((item) => (
                            <button
                              key={item.path}
                              type="button"
                              onClick={() => go(item.path)}
                              className={`flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                isActive(item.path)
                                  ? "bg-white font-semibold text-indigo-700"
                                  : "text-slate-700 hover:bg-white"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

function SidebarItem({
  children,
  onClick,
  active = false,
  danger = false,
  icon: Icon,
  collapsed = false,
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? children : ""}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        collapsed ? "justify-center px-2" : ""
      } ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : active
          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon />
        </span>
      )}

      {!collapsed && <span>{children}</span>}
    </button>
  );
}

function ProfileMenuItem({ children, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}