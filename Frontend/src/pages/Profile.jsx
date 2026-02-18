import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

// ✅ Backend endpoints (match the Java controller we made)
const USER_AVATAR_ENDPOINT = "/api/users/me/avatar"; // POST multipart/form-data { file }
const THERAPIST_UPDATE_ENDPOINT = "/api/users/me/therapist-settings"; // PUT { pricePerSession, availableDays }

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset password modal
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

  // Avatar (everyone)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Therapist-only
  const [therapistSaving, setTherapistSaving] = useState(false);
  const [therapistForm, setTherapistForm] = useState({
    pricePerSession: "",
    availableDays: [],
  });

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const onTherapistChange = (key, value) => setTherapistForm((p) => ({ ...p, [key]: value }));

  const isTherapist = useMemo(() => {
    const role = (me?.role || me?.userRole || me?.accountType || "").toString().toUpperCase();
    return role.includes("THERAPIST");
  }, [me]);

  // ✅ choose avatar shown:
  // preview if selected, else backend url from profile
  const avatarToShow = avatarPreview || me?.profilePictureUrl || me?.avatarUrl || me?.profilePicture || "";

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

        // therapist info comes from the same /me now (if therapist)
        setTherapistForm({
          pricePerSession:
            u.pricePerSession === null || u.pricePerSession === undefined ? "" : String(u.pricePerSession),
          availableDays: Array.isArray(u.availableDays) ? u.availableDays : [],
        });
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

  // cleanup preview url
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

      // optional: refresh user data to show any updated fields
      const res = await api.get("/api/users/me");
      setMe(res.data || {});
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  // -------- Avatar (everyone) --------
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

      // ✅ Everyone uses /api/users/me/avatar
      const res = await api.post(USER_AVATAR_ENDPOINT, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // backend returns ProfileResponse
      const updated = res?.data || {};
      setMe(updated);

      toast.success("Profile picture updated.");

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

  // -------- Therapist-only --------
  const toggleDay = (day) => {
    setTherapistForm((p) => {
      const set = new Set(p.availableDays || []);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...p, availableDays: Array.from(set) };
    });
  };

  const saveTherapistProfile = async () => {
    const price = therapistForm.pricePerSession?.toString().trim();

    if (!price) return toast.error("Price per session is required.");
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) return toast.error("Enter a valid price.");
    if (!therapistForm.availableDays?.length) return toast.error("Select at least one available day.");

    try {
      setTherapistSaving(true);

      const res = await api.put(THERAPIST_UPDATE_ENDPOINT, {
        pricePerSession: priceNum,
        availableDays: therapistForm.availableDays,
      });

      toast.success("Therapist settings updated.");

      // backend returns ProfileResponse
      const updated = res?.data || {};
      setMe(updated);
    } catch (err) {
      console.error("UPDATE THERAPIST ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Therapist update failed.");
    } finally {
      setTherapistSaving(false);
    }
  };

  // Reset password (unchanged)
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
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Reset Password
              </button>

              <button
                type="button"
                onClick={() => navigate("/therapist/apply")}
                className="rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
              >
                Become a Therapist
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-600">View and edit your account details.</p>
        </div>

        {/* ✅ Avatar section (everyone) */}
        <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
            <p className="text-sm text-gray-600">Upload a new profile photo (PNG/JPG up to 5MB).</p>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-white">
                {avatarToShow ? (
                  <img src={avatarToShow} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    No photo
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-800">Change photo</div>
                <div className="text-xs text-gray-500">This is visible on your account.</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
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
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  avatarUploading || !avatarFile
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                }`}
              >
                {avatarUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>

        {/* Basic profile */}
        <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-600">Loading profile...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <Field label="Username" value={form.username} disabled hint="Username cannot be changed." />
              <Field label="Email" value={form.userEmail} disabled hint="Email cannot be changed." />

              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded px-5 py-2 text-sm font-semibold text-white ${
                    saving ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                  }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Therapist-only settings */}
        {!loading && isTherapist && (
          <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-gray-900">Therapist Settings</h2>
              <p className="text-sm text-gray-600">Set your pricing and available days.</p>
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Price per session</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={therapistForm.pricePerSession}
                    onChange={(e) => onTherapistChange("pricePerSession", e.target.value)}
                    placeholder="e.g., 20"
                    inputMode="decimal"
                    className="w-full rounded border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-500">/ session</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Available days</label>
                  <span className="text-xs text-gray-500">{therapistForm.availableDays.length} selected</span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DAYS.map((d) => {
                    const checked = therapistForm.availableDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                          checked
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="mr-2 inline-block align-middle">{checked ? "✅" : "⬜"}</span>
                        <span className="align-middle">{d}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveTherapistProfile}
                  disabled={therapistSaving}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                    therapistSaving ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                  }`}
                >
                  {therapistSaving ? "Saving..." : "Save Therapist Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reset Password Modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Reset Password</h2>
                <p className="mt-1 text-sm text-gray-600">
                  We will send a password reset link to:
                  <span className="ml-1 font-semibold">{form.userEmail || "-"}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
              Check your email for the <span className="font-semibold">reset link</span> and follow the instructions
              after pressing the button below.
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={sendResetPasswordLink}
                disabled={resetSending}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                  resetSending ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                }`}
              >
                {resetSending ? "Sending..." : "Send Reset Link"}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">If you don’t see the email, check spam/junk.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1 ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : "border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-500"
        }`}
      />
      {!!hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
