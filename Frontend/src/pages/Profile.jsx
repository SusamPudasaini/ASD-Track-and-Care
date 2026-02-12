import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: "",
    userEmail: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setLoading(true);

        // ✅ IMPORTANT: your controller is /api/users/me
        const res = await api.get("/api/users/me");
        if (!mounted) return;

        const u = res.data || {};
        setForm({
          username: u.username || "",
          userEmail: u.userEmail || "",
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phoneNumber: u.phoneNumber || "",
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim()) return toast.error("First name is required.");
    if (!form.lastName.trim()) return toast.error("Last name is required.");
    if (!form.phoneNumber.trim()) return toast.error("Phone number is required.");

    try {
      setSaving(true);

      // ✅ IMPORTANT: PUT is also /api/users/me
      await api.put("/api/users/me", {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });

      toast.success("Profile updated.");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

            <button
              type="button"
              onClick={() => navigate("/therapist/apply")}
              className="rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Become a Therapist
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            View and edit your account details.
          </p>
        </div>

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
      </main>
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
