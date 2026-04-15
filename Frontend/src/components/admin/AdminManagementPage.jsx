import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowsRotate,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaTrash,
  FaTriangleExclamation,
} from "react-icons/fa6";
import Navbar from "../navbar/Navbar";
import api from "../../api/axios";
import AppModal from "../ui/AppModal";

const ROLE_OPTIONS = ["USER", "THERAPIST", "ADMIN"];
const BOOKING_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "CANCELLED"];
const EMAIL_VERIFIED_FILTER_OPTIONS = [
  { value: "ALL", label: "All email states" },
  { value: "VERIFIED", label: "Email verified" },
  { value: "NOT_VERIFIED", label: "Email not verified" },
];
const PAGE_SIZE = 10;

const TOAST_OPTIONS = {
  style: {
    borderRadius: "14px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 600,
  },
};

const SECTION_META = {
  users: {
    title: "User Management",
    subtitle: "Manage users and account permissions.",
  },
  bookings: {
    title: "Booking Management",
    subtitle: "Track bookings, statuses, and payment state.",
  },
  "therapist-reviews": {
    title: "Therapist Reviews Management",
    subtitle: "Review therapist feedback and rating records.",
  },
};

function toText(v) {
  if (v === 0) return "0";
  if (v === null || v === undefined) return "-";
  const s = String(v).trim();
  return s || "-";
}

function rolePillClass(role) {
  if (role === "ADMIN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (role === "THERAPIST") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function statusPillClass(status) {
  if (status === "CONFIRMED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function emailVerifiedPillClass(emailVerified) {
  if (emailVerified) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;
    if (data.status && data.path) return `${data.error || "Request failed"} (${data.status})`;
    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }
  return String(data);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function AdminManagementPage({ sectionKey }) {
  const meta = SECTION_META[sectionKey] || SECTION_META.users;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [savingId, setSavingId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "USER",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editMeta, setEditMeta] = useState({ type: null, id: null });

  const endpoint = `/api/admin/database/${sectionKey}`;

  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = useMemo(() => rows.slice(startIndex, startIndex + PAGE_SIZE), [rows, startIndex]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (sectionKey === "users" && roleFilter !== "ALL") params.role = roleFilter;
      if (sectionKey === "users" && emailVerifiedFilter !== "ALL") {
        params.emailVerified = emailVerifiedFilter === "VERIFIED" ? "true" : "false";
      }
      if (sectionKey === "bookings" && statusFilter !== "ALL") params.status = statusFilter;

      const res = await api.get(endpoint, { params });
      setRows(Array.isArray(res.data) ? res.data : []);
      setCurrentPage(1);
    } catch (err) {
      setRows([]);
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery("");
    setRoleFilter("ALL");
    setEmailVerifiedFilter("ALL");
    setStatusFilter("ALL");
    setShowFilters(false);
    setCurrentPage(1);
  }, [sectionKey]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey, roleFilter, emailVerifiedFilter, statusFilter]);

  const applySearch = async (e) => {
    e?.preventDefault?.();
    await loadData();
  };

  const updateUserRole = async (id, role) => {
    try {
      setSavingId(`user-role-${id}`);
      await api.put(`/api/admin/database/users/${id}/role`, { role });
      toast.success("User role updated.", TOAST_OPTIONS);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      setSavingId(`booking-status-${id}`);
      await api.put(`/api/admin/database/bookings/${id}/status`, { status });
      toast.success("Booking status updated.", TOAST_OPTIONS);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const updateUserEmailVerified = async (id, emailVerified) => {
    try {
      setSavingId(`user-email-verified-${id}`);
      await api.put(`/api/admin/database/users/${id}/email-verified`, { emailVerified });
      toast.success("Email verification status updated.", TOAST_OPTIONS);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const openDeleteConfirm = (type, row) => {
    setConfirmMeta({ type, row });
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (!savingId) {
      setConfirmOpen(false);
      setConfirmMeta(null);
    }
  };

  const confirmDelete = async () => {
    if (!confirmMeta?.row?.id || !confirmMeta?.type) return;

    const id = confirmMeta.row.id;
    const type = confirmMeta.type;

    try {
      setSavingId(`${type}-delete-${id}`);

      if (type === "user") {
        await api.delete(`/api/admin/database/users/${id}`);
        toast.success("User deleted.", TOAST_OPTIONS);
      }

      if (type === "booking") {
        await api.delete(`/api/admin/database/bookings/${id}`);
        toast.success("Booking deleted.", TOAST_OPTIONS);
      }

      if (type === "review") {
        await api.delete(`/api/admin/database/therapist-reviews/${id}`);
        toast.success("Therapist review deleted.", TOAST_OPTIONS);
      }

      closeDeleteConfirm();
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const createUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.username || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error("Please fill all required fields.", TOAST_OPTIONS);
      return;
    }

    try {
      setSavingId("create-user");
      await api.post("/api/admin/database/users", newUser);
      toast.success("User created successfully.", TOAST_OPTIONS);
      setAddUserOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        role: "USER",
      });
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const openEdit = (type, row) => {
    if (!row?.id) return;

    if (type === "user") {
      setEditForm({
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        username: row.username || "",
        email: row.email || "",
        emailVerified: Boolean(row.emailVerified),
        phone: row.phone || "",
        address: row.address || "",
        workplaceAddress: row.workplaceAddress || "",
        qualification: row.qualification || "",
        experienceYears: row.experienceYears ?? "",
        role: row.role || "USER",
        password: "",
      });
    }

    if (type === "booking") {
      setEditForm({
        userId: row.userId ?? "",
        therapistId: row.therapistId ?? "",
        date: row.date || "",
        time: row.time || "",
        status: row.status || "PENDING",
        paymentStatus: row.paymentStatus || "",
        amount: row.amount ?? "",
        therapistMessage: row.therapistMessage || "",
      });
    }

    if (type === "review") {
      setEditForm({
        bookingId: row.bookingId ?? "",
        userId: row.userId ?? "",
        therapistId: row.therapistId ?? "",
        rating: row.rating ?? "",
        comment: row.comment || "",
      });
    }

    setEditMeta({ type, id: row.id });
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (savingId?.startsWith("edit-")) return;
    setEditOpen(false);
    setEditMeta({ type: null, id: null });
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editMeta?.id || !editMeta?.type) return;

    try {
      setSavingId(`edit-${editMeta.type}-${editMeta.id}`);

      if (editMeta.type === "user") {
        await api.put(`/api/admin/database/users/${editMeta.id}`, {
          ...editForm,
          emailVerified: Boolean(editForm.emailVerified),
          experienceYears: editForm.experienceYears === "" ? null : Number(editForm.experienceYears),
        });
      }

      if (editMeta.type === "booking") {
        await api.put(`/api/admin/database/bookings/${editMeta.id}`, {
          ...editForm,
          userId: Number(editForm.userId),
          therapistId: Number(editForm.therapistId),
          amount: editForm.amount === "" ? null : Number(editForm.amount),
        });
      }

      if (editMeta.type === "review") {
        await api.put(`/api/admin/database/therapist-reviews/${editMeta.id}`, {
          ...editForm,
          bookingId: Number(editForm.bookingId),
          userId: Number(editForm.userId),
          therapistId: Number(editForm.therapistId),
          rating: Number(editForm.rating),
        });
      }

      toast.success("Record updated.", TOAST_OPTIONS);
      closeEdit();
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setSavingId(null);
    }
  };

  const renderTable = () => {
    if (loading) {
      return <EmptyState text="Loading records..." />;
    }

    if (!rows.length) {
      return <EmptyState text="No records found." />;
    }

    if (sectionKey === "users") {
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Access</th>
                <th className="px-3 py-3">Email status</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Reviews</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const role = toText(row.role);
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">{toText(row.username)}</div>
                      <div className="text-xs text-slate-500">{toText(row.email)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${rolePillClass(role)}`}>
                          {role}
                        </span>
                        <select
                          value={role}
                          disabled={savingId === `user-role-${row.id}`}
                          onChange={(e) => updateUserRole(row.id, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${emailVerifiedPillClass(Boolean(row.emailVerified))}`}
                        >
                          {row.emailVerified ? "Verified" : "Not verified"}
                        </span>
                        <select
                          value={row.emailVerified ? "true" : "false"}
                          disabled={savingId === `user-email-verified-${row.id}`}
                          onChange={(e) => updateUserEmailVerified(row.id, e.target.value === "true")}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          <option value="true">Verified</option>
                          <option value="false">Not verified</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.phone)}</td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.reviewCount)} ({toText(row.averageReview)})</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit("user", row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <FaPenToSquare />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm("user", row)}
                          disabled={savingId === `user-delete-${row.id}` || role === "ADMIN"}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white ${
                            savingId === `user-delete-${row.id}` || role === "ADMIN"
                              ? "cursor-not-allowed bg-red-300"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (sectionKey === "bookings") {
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Therapist</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const status = toText(row.status);
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-3 font-semibold text-slate-900">{toText(row.id)}</td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.userUsername)}</td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.therapistUsername)}</td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.date)}</td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.time)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(status)}`}>
                          {status}
                        </span>
                        <select
                          value={status}
                          disabled={savingId === `booking-status-${row.id}`}
                          onChange={(e) => updateBookingStatus(row.id, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {BOOKING_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{toText(row.paymentStatus)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit("booking", row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <FaPenToSquare />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm("booking", row)}
                          disabled={savingId === `booking-delete-${row.id}`}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white ${
                            savingId === `booking-delete-${row.id}`
                              ? "cursor-not-allowed bg-red-300"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Booking</th>
              <th className="px-3 py-3">Reviewer</th>
              <th className="px-3 py-3">Therapist</th>
              <th className="px-3 py-3">Rating</th>
              <th className="px-3 py-3">Comment</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                <td className="px-3 py-3 font-semibold text-slate-900">{toText(row.id)}</td>
                <td className="px-3 py-3 text-slate-700">{toText(row.bookingId)}</td>
                <td className="px-3 py-3 text-slate-700">{toText(row.userUsername)}</td>
                <td className="px-3 py-3 text-slate-700">{toText(row.therapistUsername)}</td>
                <td className="px-3 py-3 text-slate-700">{toText(row.rating)}</td>
                <td className="px-3 py-3 text-slate-700">{toText(row.comment)}</td>
                <td className="px-3 py-3 text-slate-700">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit("review", row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <FaPenToSquare />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm("review", row)}
                      disabled={savingId === `review-delete-${row.id}`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white ${
                        savingId === `review-delete-${row.id}`
                          ? "cursor-not-allowed bg-red-300"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-[1300px] space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Panel</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{meta.title}</h1>
                <p className="mt-1 text-sm text-slate-600">{meta.subtitle}</p>
              </div>

              {sectionKey === "users" ? (
                <button
                  type="button"
                  onClick={() => setAddUserOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4a6cf7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                >
                  <FaPlus />
                  Add user
                </button>
              ) : null}
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <form onSubmit={applySearch} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${meta.title.toLowerCase()}...`}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {(sectionKey === "users" || sectionKey === "bookings") ? (
                    <button
                      type="button"
                      onClick={() => setShowFilters((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <FaFilter />
                      Filters
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={loadData}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <FaArrowsRotate />
                    Refresh
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
                  >
                    Search
                  </button>
                </div>
              </div>

              {showFilters && sectionKey === "users" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">All roles</option>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

                  <select
                    value={emailVerifiedFilter}
                    onChange={(e) => setEmailVerifiedFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {EMAIL_VERIFIED_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {showFilters && sectionKey === "bookings" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">All statuses</option>
                    {BOOKING_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </form>

            <div className="mt-5">{renderTable()}</div>

            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 sm:flex-row sm:items-center">
              <div>
                Showing <span className="font-semibold text-slate-800">{pageRows.length}</span> of <span className="font-semibold text-slate-800">{totalCount}</span> records
              </div>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>

                <span className="px-2 text-xs font-semibold text-slate-600">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <AppModal
        open={confirmOpen}
        onClose={closeDeleteConfirm}
        title={
          confirmMeta?.type === "user"
            ? "Delete User"
            : confirmMeta?.type === "booking"
            ? "Delete Booking"
            : "Delete Therapist Review"
        }
        subtitle="This action is permanent and cannot be undone."
        badge="Danger Zone"
        icon={<FaTriangleExclamation />}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteConfirm}
              disabled={!!savingId}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={!!savingId}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                savingId ? "cursor-not-allowed bg-red-300" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {savingId ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        }
      >
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          {confirmMeta?.type === "user" ? (
            <>
              You are about to delete user <span className="font-semibold">{toText(confirmMeta?.row?.username)}</span>.
            </>
          ) : confirmMeta?.type === "booking" ? (
            <>
              You are about to delete booking ID <span className="font-semibold">{toText(confirmMeta?.row?.id)}</span>.
            </>
          ) : (
            <>
              You are about to delete therapist review ID <span className="font-semibold">{toText(confirmMeta?.row?.id)}</span>.
            </>
          )}
        </div>
      </AppModal>

      <AppModal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        title="Add New User"
        subtitle="Create a new account directly from admin user management."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddUserOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createUser}
              disabled={savingId === "create-user"}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                savingId === "create-user" ? "cursor-not-allowed bg-blue-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {savingId === "create-user" ? "Creating..." : "Create User"}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="First Name" value={newUser.firstName} onChange={(v) => setNewUser((p) => ({ ...p, firstName: v }))} />
          <InputField label="Last Name" value={newUser.lastName} onChange={(v) => setNewUser((p) => ({ ...p, lastName: v }))} />
          <InputField label="Username" value={newUser.username} onChange={(v) => setNewUser((p) => ({ ...p, username: v }))} />
          <InputField label="Email" type="email" value={newUser.email} onChange={(v) => setNewUser((p) => ({ ...p, email: v }))} />
          <InputField label="Phone" value={newUser.phone} onChange={(v) => setNewUser((p) => ({ ...p, phone: v }))} />
          <InputField label="Password" type="password" value={newUser.password} onChange={(v) => setNewUser((p) => ({ ...p, password: v }))} />

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={editOpen}
        onClose={closeEdit}
        title={
          editMeta.type === "user"
            ? "Edit User"
            : editMeta.type === "booking"
            ? "Edit Booking"
            : "Edit Review"
        }
        subtitle="Update all required details and save changes."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEdit}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={savingId?.startsWith("edit-")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                savingId?.startsWith("edit-") ? "cursor-not-allowed bg-blue-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {savingId?.startsWith("edit-") ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      >
        {editMeta.type === "user" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="First Name" value={editForm.firstName || ""} onChange={(v) => setEditForm((p) => ({ ...p, firstName: v }))} />
            <InputField label="Last Name" value={editForm.lastName || ""} onChange={(v) => setEditForm((p) => ({ ...p, lastName: v }))} />
            <InputField label="Username" value={editForm.username || ""} onChange={(v) => setEditForm((p) => ({ ...p, username: v }))} />
            <InputField label="Email" type="email" value={editForm.email || ""} onChange={(v) => setEditForm((p) => ({ ...p, email: v }))} />
            <InputField label="Phone" value={editForm.phone || ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email Verification</label>
              <select
                value={editForm.emailVerified ? "true" : "false"}
                onChange={(e) => setEditForm((p) => ({ ...p, emailVerified: e.target.value === "true" }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="true">Verified</option>
                <option value="false">Not verified</option>
              </select>
            </div>

            <InputField label="Qualification" value={editForm.qualification || ""} onChange={(v) => setEditForm((p) => ({ ...p, qualification: v }))} />
            <InputField label="Experience Years" type="number" value={editForm.experienceYears ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, experienceYears: v }))} />
            <InputField label="Address" value={editForm.address || ""} onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} />
            <InputField label="Workplace Address" value={editForm.workplaceAddress || ""} onChange={(v) => setEditForm((p) => ({ ...p, workplaceAddress: v }))} />
            <InputField label="New Password (optional)" type="password" value={editForm.password || ""} onChange={(v) => setEditForm((p) => ({ ...p, password: v }))} />

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
              <select
                value={editForm.role || "USER"}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {editMeta.type === "booking" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="User ID" type="number" value={editForm.userId ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, userId: v }))} />
            <InputField label="Therapist ID" type="number" value={editForm.therapistId ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, therapistId: v }))} />
            <InputField label="Date" type="date" value={editForm.date || ""} onChange={(v) => setEditForm((p) => ({ ...p, date: v }))} />
            <InputField label="Time" value={editForm.time || ""} onChange={(v) => setEditForm((p) => ({ ...p, time: v }))} />
            <InputField label="Payment Status" value={editForm.paymentStatus || ""} onChange={(v) => setEditForm((p) => ({ ...p, paymentStatus: v }))} />
            <InputField label="Amount" type="number" value={editForm.amount ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, amount: v }))} />

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Status</label>
              <select
                value={editForm.status || "PENDING"}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {BOOKING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Therapist Message</label>
              <textarea
                value={editForm.therapistMessage || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, therapistMessage: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>
        ) : null}

        {editMeta.type === "review" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Booking ID" type="number" value={editForm.bookingId ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, bookingId: v }))} />
            <InputField label="User ID" type="number" value={editForm.userId ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, userId: v }))} />
            <InputField label="Therapist ID" type="number" value={editForm.therapistId ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, therapistId: v }))} />
            <InputField label="Rating (1-5)" type="number" value={editForm.rating ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, rating: v }))} />

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Comment</label>
              <textarea
                value={editForm.comment || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, comment: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      {text}
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
    </div>
  );
}
