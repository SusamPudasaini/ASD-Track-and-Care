import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MapPin,
  Camera,
  KeyRound,
  Mail,
  Save,
  Shield,
  UserCircle2,
} from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import MapLocationPicker from "../components/map/MapLocationPicker";
import AppModal from "../components/ui/AppModal";

// ✅ Backend endpoints
const USER_AVATAR_ENDPOINT = "/api/users/me/avatar";

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

function toNumberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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
    address: "",
    latitude: null,
    longitude: null,
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [aiStatus, setAiStatus] = useState({ loading: false, completed: false });

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
          address: u.address || "",
          latitude: toNumberOrNull(u.latitude),
          longitude: toNumberOrNull(u.longitude),
        });

        const role = (u.role || "").toString().toUpperCase();
        if (role.includes("USER")) {
          try {
            setAiStatus({ loading: true, completed: false });
            const aiRes = await api.get("/api/ml/last");
            setAiStatus({ loading: false, completed: Boolean(aiRes?.data?.hasHistory) });
          } catch {
            setAiStatus({ loading: false, completed: false });
          }
        }
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
    if (!form.address.trim()) return toast.error("Address is required.");
    if (typeof form.latitude !== "number" || typeof form.longitude !== "number") {
      return toast.error("Please select your location on the map.");
    }

    try {
      setSaving(true);

      const updateRes = await api.put("/api/users/me", {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });

      toast.success("Profile updated.");
      const updated = updateRes?.data || {};
      const returnedLat = toNumberOrNull(updated.latitude);
      const returnedLng = toNumberOrNull(updated.longitude);

      setMe((prev) => ({
        ...(prev || {}),
        ...updated,
        latitude: returnedLat ?? prev?.latitude ?? form.latitude,
        longitude: returnedLng ?? prev?.longitude ?? form.longitude,
      }));
      setForm((prev) => ({
        ...prev,
        firstName: updated.firstName || prev.firstName,
        lastName: updated.lastName || prev.lastName,
        phoneNumber: updated.phoneNumber || prev.phoneNumber,
        address: updated.address || prev.address,
        latitude: returnedLat ?? prev.latitude,
        longitude: returnedLng ?? prev.longitude,
      }));
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
                  View and manage your account details and profile picture in one place.
                </p>
                {!isTherapist && !aiStatus.loading && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold text-white">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${aiStatus.completed ? "bg-emerald-300" : "bg-amber-300"}`} />
                      AI Questionnaire: {aiStatus.completed ? "Completed" : "Pending"}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/questionnaire")}
                      className="rounded-full border border-white/35 bg-white/15 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
                    >
                      {aiStatus.completed ? "View AI History" : "Open Questionnaire"}
                    </button>
                  </div>
                )}
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

                {!isTherapist && (
                  <button
                    type="button"
                    onClick={() => navigate("/therapist/apply")}
                    className="rounded-2xl border border-white/25 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
                  >
                    Become a Therapist
                  </button>
                )}
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

                <Field
                  label="Address"
                  value={form.address}
                  onChange={(v) => onChange("address", v)}
                  placeholder="e.g., Kathmandu, Bagmati"
                  icon={MapPin}
                />

                <MapLocationPicker
                  label="Profile location"
                  hint="Click your location on the map. This is used for distance-based recommendations."
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(lat, lng) => {
                    onChange("latitude", lat);
                    onChange("longitude", lng);
                  }}
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
        </div>
      </main>

      <AppModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password"
        subtitle={`We will send a password reset link to: ${form.userEmail || "-"}`}
        icon={<KeyRound size={18} />}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={sendResetPasswordLink}
              disabled={resetSending}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                resetSending
                  ? "cursor-not-allowed bg-blue-300"
                  : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {resetSending ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          Check your email for the <span className="font-semibold">reset link</span> and follow the instructions after pressing the button below.
        </div>

        <div className="mt-3 text-xs text-slate-500">
          If you do not see the email, check spam or junk folders.
        </div>
      </AppModal>
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