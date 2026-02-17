import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function AdminTherapistApplications() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [actionId, setActionId] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const role = useMemo(() => localStorage.getItem("role"), []);

  const loadPending = async (signal) => {
    try {
      setLoading(true);

      const res = await api.get("/api/admin/therapist-applications/pending", {
        signal,
      });

      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // axios v1 supports AbortController via `signal`
      if (err?.name === "CanceledError") return;

      const status = err?.response?.status;

      // 401 = not logged in / token invalid
      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }

      // 403 = logged in but not admin
      if (status === 403) {
        toast.error("Access denied. Admins only.");
        navigate("/", { replace: true });
        return;
      }

      console.error("LOAD PENDING ERROR:", status, err?.response?.data);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to load applications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Frontend guard (fast UX). Backend MUST also enforce this.
    if (!token) {
      toast.error("Please login first.");
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "ADMIN") {
      toast.error("Access denied. Admins only.");
      navigate("/", { replace: true });
      return;
    }

    const controller = new AbortController();
    loadPending(controller.signal);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const refresh = async () => {
    const controller = new AbortController();
    await loadPending(controller.signal);
  };

  const approve = async (id) => {
    try {
      setActionId(id);
      await api.put(`/api/admin/therapist-applications/${id}/approve`);
      toast.success("Application approved.");
      await refresh();
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (status === 403) {
        toast.error("Access denied. Admins only.");
        navigate("/", { replace: true });
        return;
      }

      console.error("APPROVE ERROR:", status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Approve failed.");
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id) => {
    try {
      setActionId(id);
      await api.put(`/api/admin/therapist-applications/${id}/reject`);
      toast.success("Application rejected.");
      await refresh();
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (status === 403) {
        toast.error("Access denied. Admins only.");
        navigate("/", { replace: true });
        return;
      }

      console.error("REJECT ERROR:", status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Reject failed.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin — Therapist Applications
            </h1>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={refresh}
                className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Review pending therapist applications and approve or reject them.
          </p>
        </div>

        <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-600">Loading applications...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No pending applications.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Applicant
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Full Name
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Email
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Phone
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Qualification
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Experience
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      Specialization
                    </th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">
                      City
                    </th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-3 text-sm text-gray-900">
                        {a.applicantUsername ?? "-"}
                      </td>
                      <td className="py-3 text-sm text-gray-900">
                        {a.fullName ?? "-"}
                      </td>
                      <td className="py-3 text-sm text-gray-700">{a.email ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-700">{a.phone ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-700">
                        {a.qualification ?? "-"}
                      </td>
                      <td className="py-3 text-sm text-gray-700">
                        {a.yearsExperience ?? "-"}
                      </td>
                      <td className="py-3 text-sm text-gray-700">
                        {a.specialization || "-"}
                      </td>
                      <td className="py-3 text-sm text-gray-700">{a.city || "-"}</td>

                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => approve(a.id)}
                            disabled={actionId === a.id}
                            className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                              actionId === a.id
                                ? "bg-green-300 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {actionId === a.id ? "Working..." : "Approve"}
                          </button>

                          <button
                            type="button"
                            onClick={() => reject(a.id)}
                            disabled={actionId === a.id}
                            className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                              actionId === a.id
                                ? "bg-red-300 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                          >
                            {actionId === a.id ? "Working..." : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 text-xs text-gray-500">
                Note: Approving an application will promote the user role to{" "}
                <span className="font-semibold">THERAPIST</span>.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
