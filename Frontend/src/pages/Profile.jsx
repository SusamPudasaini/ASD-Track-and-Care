import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock3,
  KeyRound,
  Mail,
  Save,
  Shield,
  Stethoscope,
  UserCircle2,
  Wallet,
  X,
} from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

// ✅ Backend endpoints
const USER_AVATAR_ENDPOINT = "/api/users/me/avatar";
const THERAPIST_UPDATE_ENDPOINT = "/api/users/me/therapist-settings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ✅ Build backend base (strip /api if present)
function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

// ✅ Resolve image URLs correctly everywhere
function resolveImageUrl(raw) {
  if (!raw) return "";
  const s = String(raw);

  if (s.startsWith("blob:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${backendBase()}${s}`;

  return `${backendBase()}/${s}`;
}

// 09:00 -> 18:00, every 30 mins
function buildTimeSlots() {
  const slots = [];
  for (let h = 9; h <= 18; h++) {
    for (let m of [0, 30]) {
      if (h === 18 && m !== 0) continue;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

function isValidSlotTime(time) {
  try {
    const [hh, mm] = String(time).split(":");
    const h = Number(hh);
    const m = Number(mm);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
    if (!(m === 0 || m === 30)) return false;
    if (h < 9) return false;
    if (h > 18) return false;
    if (h === 18 && m !== 0) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeAvailability(inMap) {
  if (!inMap || typeof inMap !== "object") return {};
  const out = {};
  for (const [day, times] of Object.entries(inMap)) {
    if (!day || !Array.isArray(times)) continue;
    const clean = times
      .filter((t) => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter(isValidSlotTime)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
    if (clean.length) out[day] = clean;
  }
  return out;
}

const cardBase =
  "rounded-3xl border border-white/60 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur";

function SectionCard({ icon, title, description, children, action }) {
  const Icon = icon;
  return (
    <section className={`${cardBase} p-6 md:p-7`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 shadow-sm">
            <Icon size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const [me, setMe] = useState(null);

  const [form, setForm] = useState({
    username: "",
    userEmail: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [therapistSaving, setTherapistSaving] = useState(false);

  const [therapistForm, setTherapistForm] = useState({
    pricePerSession: "",
    availability: {},
  });

  const [selectedDay, setSelectedDay] = useState("Sunday");
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const isTherapist = useMemo(() => {
    const role = (me?.role || me?.userRole || me?.accountType || "").toString().toUpperCase();
    return role.includes("THERAPIST");
  }, [me]);

  const avatarToShow = useMemo(() => {
    const raw = avatarPreview || me?.profilePictureUrl || me?.avatarUrl || me?.profilePicture || "";
    return resolveImageUrl(raw);
  }, [avatarPreview, me]);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setLoading(true);

        const res = await api.get("/api/users/me");
        if (!mounted) return;

        const u = res.data || {};
        setMe(u);

        setForm({
          username: u.username || "",
          userEmail: u.userEmail || "",
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phoneNumber: u.phoneNumber || "",
        });

        const avail = normalizeAvailability(u.availability);
        setTherapistForm({
          pricePerSession:
            u.pricePerSession === null || u.pricePerSession === undefined
              ? ""
              : String(u.pricePerSession),
          availability: avail,
        });

        const firstDayWithSlots = DAYS.find((d) => (avail?.[d] || []).length > 0);
        setSelectedDay(firstDayWithSlots || "Sunday");
      } catch (err) {
        console.error("LOAD PROFILE ERROR:", err?.response?.status, err?.response?.data);
        toast.error(err?.response?.data?.message || "Could not load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim()) return toast.error("First name is required.");
    if (!form.lastName.trim()) return toast.error("Last name is required.");
    if (!form.phoneNumber.trim()) return toast.error("Phone number is required.");

    try {
      setSaving(true);

      await api.put("/api/users/me", {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });

      toast.success("Profile updated.");

      const res = await api.get("/api/users/me");
      setMe(res.data || {});
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatar = (file) => {
    if (!file) return;

    const isImage = file.type?.startsWith("image/");
    if (!isImage) return toast.error("Please select an image file.");

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be under 5 MB.");
    }

    setAvatarFile(file);

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return toast.error("Choose an image first.");

    try {
      setAvatarUploading(true);

      const fd = new FormData();
      fd.append("file", avatarFile);

      const res = await api.post(USER_AVATAR_ENDPOINT, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res?.data || {};
      setMe(updated);

      toast.success("Profile picture updated.");

      localStorage.setItem("me", JSON.stringify(updated));
      if (updated?.profilePictureUrl) localStorage.setItem("profilePictureUrl", updated.profilePictureUrl);

      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview("");
      }
    } catch (err) {
      console.error("UPLOAD AVATAR ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const daySelectedCount = useMemo(() => {
    const a = therapistForm.availability || {};
    return Object.keys(a).filter((d) => (a[d] || []).length > 0).length;
  }, [therapistForm.availability]);

  const totalSlotsSelected = useMemo(() => {
    const a = therapistForm.availability || {};
    return Object.values(a).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  }, [therapistForm.availability]);

  const selectedTimesForDay = useMemo(() => {
    return therapistForm.availability?.[selectedDay] || [];
  }, [therapistForm.availability, selectedDay]);

  const toggleSlot = (day, time) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      const set = new Set(next[day] || []);
      if (set.has(time)) set.delete(time);
      else set.add(time);
      const arr = Array.from(set).sort();
      if (arr.length) next[day] = arr;
      else delete next[day];
      return { ...p, availability: next };
    });
  };

  const clearDay = (day) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      delete next[day];
      return { ...p, availability: next };
    });
  };

  const selectDayAll = (day) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      next[day] = [...TIME_SLOTS];
      return { ...p, availability: next };
    });
  };

  const saveTherapistProfile = async () => {
    if (therapistSaving) return;

    const price = therapistForm.pricePerSession?.toString().trim();
    if (!price) return toast.error("Price per session is required.");

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) return toast.error("Enter a valid price.");

    const availability = therapistForm.availability || {};
    const totalSlots = Object.values(availability).reduce((acc, arr) => acc + (arr?.length || 0), 0);

    try {
      setTherapistSaving(true);

      const res = await api.put(THERAPIST_UPDATE_ENDPOINT, {
        pricePerSession: priceNum,
        availability,
      });

      toast.success(
        totalSlots === 0 ? "Saved. You are marked as not available." : "Therapist settings updated."
      );

      const updated = res?.data || {};
      setMe(updated);

      localStorage.setItem("me", JSON.stringify(updated));
      if (updated?.role) localStorage.setItem("role", updated.role);
      if (updated?.profilePictureUrl) localStorage.setItem("profilePictureUrl", updated.profilePictureUrl);

      const avail = normalizeAvailability(updated.availability);
      setTherapistForm({
        pricePerSession:
          updated.pricePerSession === null || updated.pricePerSession === undefined
            ? ""
            : String(updated.pricePerSession),
        availability: avail,
      });

      const firstDayWithSlots = DAYS.find((d) => (avail?.[d] || []).length > 0);
      setSelectedDay(firstDayWithSlots || selectedDay);
    } catch (err) {
      console.error("UPDATE THERAPIST ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Therapist update failed.");
    } finally {
      setTherapistSaving(false);
    }
  };

  const sendResetPasswordLink = async () => {
    if (!form.userEmail?.trim()) {
      toast.error("Email not found on your profile.");
      return;
    }

    try {
      setResetSending(true);

      await api.post("/auth/forgot-password", {
        email: form.userEmail.trim(),
      });

      toast.success("Password reset link sent to your email.");
      setResetOpen(false);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Failed to send reset link.");
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_35%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`${cardBase} overflow-hidden`}>
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Account settings
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                  <UserCircle2 size={30} />
                  My Profile
                </h1>
                <p className="mt-3 text-sm leading-6 text-blue-50 md:text-base">
                  View and manage your account details, profile picture, and therapist availability in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <KeyRound size={16} />
                  Reset Password
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/therapist/apply")}
                  className="rounded-2xl border border-white/25 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
                >
                  Become a Therapist
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 bg-white px-6 py-5 md:grid-cols-3 md:px-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {form.firstName || form.username || "User"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{isTherapist ? "Therapist" : "User"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
              <div className="mt-2 truncate text-lg font-bold text-slate-900">{form.userEmail || "—"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <SectionCard
            icon={Camera}
            title="Profile Picture"
            description="Upload a new profile photo. PNG and JPG are supported up to 5 MB."
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                  {avatarToShow ? (
                    <img src={avatarToShow} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900">Change profile photo</div>
                  <div className="mt-1 text-sm text-slate-500">
                    This image may be shown across your account and therapist profile.
                  </div>
                  {avatarFile && (
                    <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      New image selected
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Camera size={16} />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickAvatar(e.target.files?.[0])}
                  />
                </label>

                <button
                  type="button"
                  onClick={uploadAvatar}
                  disabled={avatarUploading || !avatarFile}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                    avatarUploading || !avatarFile
                      ? "cursor-not-allowed bg-blue-300"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <Save size={16} />
                  {avatarUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={UserCircle2}
            title="Basic Information"
            description="Review your account details and update the editable fields below."
          >
            {loading ? (
              <div className="text-sm text-slate-600">Loading profile...</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Username"
                    value={form.username}
                    disabled
                    hint="Username cannot be changed."
                  />
                  <Field
                    label="Email"
                    value={form.userEmail}
                    disabled
                    hint="Email cannot be changed."
                    icon={Mail}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="First Name"
                    value={form.firstName}
                    onChange={(v) => onChange("firstName", v)}
                    placeholder="e.g., John"
                  />
                  <Field
                    label="Last Name"
                    value={form.lastName}
                    onChange={(v) => onChange("lastName", v)}
                    placeholder="e.g., Doe"
                  />
                </div>

                <Field
                  label="Phone Number"
                  value={form.phoneNumber}
                  onChange={(v) => onChange("phoneNumber", v)}
                  placeholder="e.g., +97798XXXXXXXX"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
                      saving
                        ? "cursor-not-allowed bg-blue-300"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          {!loading && isTherapist && (
            <SectionCard
              icon={Stethoscope}
              title="Therapist Settings"
              description="Manage your pricing and weekly availability. Saved slots remain visible for each selected day."
              action={
                totalSlotsSelected === 0 ? (
                  <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                    Not available
                  </span>
                ) : null
              }
            >
              <div className="grid gap-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Price per session
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative w-full">
                        <Wallet
                          size={16}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={therapistForm.pricePerSession}
                          onChange={(e) =>
                            setTherapistForm((p) => ({ ...p, pricePerSession: e.target.value }))
                          }
                          placeholder="e.g., 20"
                          inputMode="decimal"
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-500">/ session</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:w-[280px]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Active days
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{daySelectedCount}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total slots
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{totalSlotsSelected}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Availability</label>
                      <div className="mt-1 text-xs text-slate-500">
                        Choose a day, then edit the available 30-minute time slots.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setSlotsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <CalendarDays size={16} />
                        Edit times
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Clock3 size={16} className="text-blue-600" />
                        {selectedDay}
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {selectedTimesForDay.length} selected
                      </div>
                    </div>

                    {selectedTimesForDay.length === 0 ? (
                      <div className="mt-3 text-sm text-slate-600">No times selected for this day.</div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTimesForDay.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Slots are available in 30-minute steps from 09:00 to 18:00.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveTherapistProfile}
                    disabled={therapistSaving}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
                      therapistSaving
                        ? "cursor-not-allowed bg-blue-300"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <Save size={16} />
                    {therapistSaving ? "Saving..." : "Save Therapist Settings"}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </main>

      {slotsModalOpen && (
        <SlotsModal
          day={selectedDay}
          selectedTimes={new Set(therapistForm.availability?.[selectedDay] || [])}
          onClose={() => setSlotsModalOpen(false)}
          onToggle={(time) => toggleSlot(selectedDay, time)}
          onSelectAll={() => selectDayAll(selectedDay)}
          onClear={() => clearDay(selectedDay)}
        />
      )}

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <KeyRound size={20} />
                    Reset Password
                  </h2>
                  <p className="mt-2 text-sm text-blue-50">
                    We will send a password reset link to:
                    <span className="ml-1 font-semibold">{form.userEmail || "-"}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                Check your email for the <span className="font-semibold">reset link</span> and follow the instructions after pressing the button below.
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={sendResetPasswordLink}
                  disabled={resetSending}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                    resetSending
                      ? "cursor-not-allowed bg-blue-300"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  {resetSending ? "Sending..." : "Send Reset Link"}
                </button>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                If you do not see the email, check spam or junk folders.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotsModal({ day, selectedTimes, onClose, onToggle, onSelectAll, onClear }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarDays size={20} />
                Edit Availability
              </h2>
              <p className="mt-2 text-sm text-blue-50">
                Day: <span className="font-semibold">{day}</span> ·{" "}
                <span className="font-semibold">{selectedTimes.size}</span> selected
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
            <div className="ml-auto text-xs text-slate-500">
              Click a time to toggle it. Green means selected.
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {TIME_SLOTS.map((t) => {
              const active = selectedTimes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToggle(t)}
                  className={`rounded-2xl border px-3 py-2.5 text-center text-xs font-semibold transition ${
                    active
                      ? "border-green-200 bg-green-50 text-green-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled, hint, icon: Icon }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800">{label}</label>

      <div className="relative mt-2">
        {Icon ? (
          <Icon
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        ) : null}

        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition ${
            Icon ? "pl-11" : ""
          } ${
            disabled
              ? "border border-slate-200 bg-slate-50 text-slate-500"
              : "border border-slate-200 bg-white text-slate-800 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          }`}
        />
      </div>

      {!!hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}