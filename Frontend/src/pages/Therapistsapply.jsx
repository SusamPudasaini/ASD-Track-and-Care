import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default function TherapistApply() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingApp, setLoadingApp] = useState(true);

  const token = useMemo(() => localStorage.getItem("token"), []);

  // latest application info (for blocking + status display)
  const [myApp, setMyApp] = useState(null); // { hasApplication, application, documents }
  const pendingLocked = myApp?.hasApplication && myApp?.application?.status === "PENDING";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    qualification: "",
    licenseNumber: "",
    yearsExperience: "",
    specialization: "",
    workplace: "",
    city: "",
    message: "",
  });

  const [documents, setDocuments] = useState([]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Prefill profile from /api/users/me
  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setLoadingMe(true);

        if (!token) {
          toast.error("Please login first.");
          navigate("/login", { replace: true });
          return;
        }

        const res = await api.get("/api/users/me");
        if (!mounted) return;

        const u = res.data || {};
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();

        setForm((prev) => ({
          ...prev,
          fullName: fullName || prev.fullName,
          email: u.userEmail || prev.email,
          phone: u.phoneNumber || prev.phone,
        }));
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401) {
          toast.error("Session expired. Please login again.");
          navigate("/logout", { replace: true });
          return;
        }
        if (status === 403) {
          toast.error("Access denied.");
          navigate("/", { replace: true });
          return;
        }

        console.error("LOAD ME ERROR:", status, err?.response?.data);
        toast.error(err?.response?.data?.message || "Could not load your profile details.");
      } finally {
        if (mounted) setLoadingMe(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [navigate, token]);

  // Load latest application status
  useEffect(() => {
    let mounted = true;

    async function loadMyApplication() {
      try {
        setLoadingApp(true);
        const res = await api.get("/api/therapists/my-application");
        if (!mounted) return;

        setMyApp(res.data || null);

        // If pending, lock the form and clear docs to prevent confusion
        if (res.data?.hasApplication && res.data?.application?.status === "PENDING") {
          setDocuments([]);
        }
      } catch (err) {
        const status = err?.response?.status;

        // If not logged in, handled by other guard
        if (status === 401) return;

        console.error("LOAD MY APP ERROR:", status, err?.response?.data);
        // not fatal - page can still show form
      } finally {
        if (mounted) setLoadingApp(false);
      }
    }

    if (token) loadMyApplication();

    return () => {
      mounted = false;
    };
  }, [token]);

  // Documents helpers
  const addDocumentRow = () => {
    setDocuments((prev) => [...prev, { id: crypto.randomUUID(), title: "", file: null }]);
  };

  const removeDocumentRow = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDocTitle = (id, title) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
  };

  const updateDocFile = (id, file) => {
    if (!file) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, file: null } : d)));
      return;
    }

    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      toast.error("Only PDF or image files are allowed (pdf, png, jpg, webp).");
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("File too large. Please upload files under 10 MB.");
      return;
    }

    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, file } : d)));
  };

  const validateDocuments = () => {
    for (const d of documents) {
      const hasTitle = !!d.title?.trim();
      const hasFile = !!d.file;
      if (hasTitle && !hasFile) {
        toast.error(`Please upload a file for "${d.title}".`);
        return false;
      }
      if (!hasTitle && hasFile) {
        toast.error("Please enter a document title for the uploaded file.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pendingLocked) {
      toast.error("You already have a pending application. Please wait for review.");
      return;
    }

    if (!form.fullName.trim()) return toast.error("Full name is required.");
    if (!form.email.trim()) return toast.error("Email is required.");
    if (!form.phone.trim()) return toast.error("Phone is required.");
    if (!form.qualification.trim()) return toast.error("Qualification is required.");

    if (form.yearsExperience && Number.isNaN(Number(form.yearsExperience))) {
      return toast.error("Years of Experience must be a number.");
    }

    if (!validateDocuments()) return;

    try {
      setSaving(true);

      const fd = new FormData();

      const payload = {
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      };

      fd.append("application", new Blob([JSON.stringify(payload)], { type: "application/json" }));

      const cleanDocs = documents.filter((d) => d.title?.trim() && d.file);
      cleanDocs.forEach((d) => {
        // ✅ MUST match backend keys:
        fd.append("documentTitles", d.title.trim());
        fd.append("documentFiles", d.file);
      });

      await api.post("/api/therapists/apply", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Application submitted!");

      // reload application status and lock if pending
      const res = await api.get("/api/therapists/my-application");
      setMyApp(res.data || null);

      navigate("/profile");
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }

      // If backend throws IllegalStateException you should map it to 409 later,
      // but for now we just show the message.
      toast.error(err?.response?.data?.message || err?.response?.data || "Failed to submit application.");
      console.error("APPLY ERROR:", status, err?.response?.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Therapist Application</h1>
              <p className="mt-2 text-sm text-gray-600">
                Submit your professional details for review. If approved, your account will be upgraded to therapist access.
              </p>

              {(loadingMe || loadingApp) && (
                <p className="mt-3 text-sm text-gray-500">Loading...</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>

          {/* Status card */}
          {myApp?.hasApplication && (
            <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  Application Status:{" "}
                  <span className="font-bold">{myApp.application?.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Submitted: {myApp.application?.createdAt ? new Date(myApp.application.createdAt).toLocaleString() : "-"}
                </div>
              </div>

              {myApp.application?.adminMessage ? (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Admin message:</span> {myApp.application.adminMessage}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  {myApp.application?.status === "PENDING"
                    ? "Your application is under review. You can’t submit another application until a decision is made."
                    : "You can view this decision anytime on your profile."}
                </p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Section title="Contact Information" subtitle="These details help us reach you quickly.">
            <TwoCol>
              <Field label="Full Name" value={form.fullName} onChange={(v) => onChange("fullName", v)} disabled={loadingMe || pendingLocked} />
              <Field label="Email" value={form.email} onChange={(v) => onChange("email", v)} disabled={loadingMe || pendingLocked} />
              <Field label="Phone" value={form.phone} onChange={(v) => onChange("phone", v)} disabled={loadingMe || pendingLocked} />
              <Field label="City" value={form.city} onChange={(v) => onChange("city", v)} disabled={pendingLocked} placeholder="e.g., Kathmandu" />
            </TwoCol>
          </Section>

          <Section title="Professional Details" subtitle="Tell us about your qualifications and work background.">
            <TwoCol>
              <Field label="Qualification" value={form.qualification} onChange={(v) => onChange("qualification", v)} disabled={pendingLocked} />
              <Field label="Workplace / Clinic" value={form.workplace} onChange={(v) => onChange("workplace", v)} disabled={pendingLocked} />
              <Field label="License Number (optional)" value={form.licenseNumber} onChange={(v) => onChange("licenseNumber", v)} disabled={pendingLocked} />
              <Field label="Years of Experience" type="number" value={form.yearsExperience} onChange={(v) => onChange("yearsExperience", v)} disabled={pendingLocked} />
              <Field label="Specialization (optional)" value={form.specialization} onChange={(v) => onChange("specialization", v)} disabled={pendingLocked} />
            </TwoCol>
          </Section>

          <Section
            title="Documents"
            subtitle="Upload supporting documents (PDF or images). Examples: license, certificates, ID, resume."
            right={
              <button
                type="button"
                onClick={addDocumentRow}
                disabled={pendingLocked}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                  pendingLocked ? "bg-gray-300 cursor-not-allowed" : "bg-gray-900 hover:bg-black"
                }`}
              >
                <span className="text-base leading-none">+</span> Add Document
              </button>
            }
          >
            {pendingLocked ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                Document uploads are disabled while your application is pending.
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                No documents added yet. Click <span className="font-semibold">Add Document</span> to upload.
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((d, idx) => (
                  <div key={d.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">Document {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeDocumentRow(d.id)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Document Title</label>
                        <input
                          value={d.title}
                          onChange={(e) => updateDocTitle(d.id, e.target.value)}
                          placeholder="e.g., License Certificate"
                          className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Upload File (PDF or image)</label>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => updateDocFile(d.id, e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {d.file ? (
                            <>
                              Selected: <span className="font-semibold">{d.file.name}</span>
                            </>
                          ) : (
                            "No file selected"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Message" subtitle="Optional details that may help our review.">
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={form.message}
                onChange={(e) => onChange("message", e.target.value)}
                rows={5}
                disabled={pendingLocked}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Availability, certifications, languages, preferred age group, etc."
              />
            </div>
          </Section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingMe || pendingLocked}
              className={`rounded-lg px-6 py-2 text-sm font-semibold text-white ${
                saving || loadingMe || pendingLocked
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {pendingLocked ? "Pending Review" : saving ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Section({ title, subtitle, right, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || ""}
        className={`mt-2 w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-1 ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : "border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-500"
        }`}
      />
    </div>
  );
}
