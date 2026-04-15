import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { FaCheck, FaEye, FaEyeSlash, FaImage, FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";

function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

function resolveAssetUrl(raw) {
  if (!raw) return "";
  const value = String(raw);
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  if (value.startsWith("/")) return `${backendBase()}${value}`;
  return `${backendBase()}/${value}`;
}

function getErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }
  return String(data);
}

function StatusChip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-rose-100 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function BoardCard({ row, onToggleCompleted, onToggleActive, onDelete, onEdit }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            FIRST
          </div>
          <div className="text-lg font-bold text-slate-900">{row.firstTitle}</div>
          <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {row.firstImageUrl ? (
              <img
                src={resolveAssetUrl(row.firstImageUrl)}
                alt={row.firstTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <FaImage className="text-3xl" />
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            THEN
          </div>
          <div className="text-lg font-bold text-slate-900">{row.thenTitle}</div>
          <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {row.thenImageUrl ? (
              <img
                src={resolveAssetUrl(row.thenImageUrl)}
                alt={row.thenTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <FaImage className="text-3xl" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {row.active ? <StatusChip tone="green">Active</StatusChip> : <StatusChip tone="red">Hidden</StatusChip>}
          {row.completed ? <StatusChip tone="yellow">Completed</StatusChip> : <StatusChip tone="blue">In Progress</StatusChip>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FaPenToSquare />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onToggleCompleted(row)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FaCheck />
            {row.completed ? "Mark Incomplete" : "Mark Complete"}
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(row)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {row.active ? <FaEyeSlash /> : <FaEye />}
            {row.active ? "Hide" : "Show"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(row)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <FaTrash />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FirstThenBoards() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      setLoading(true);
      const res = await api.get("/api/first-then");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompleted(row) {
    try {
      await api.put(`/api/first-then/${row.id}/completed`, null, {
        params: { completed: !row.completed },
      });
      await loadBoards();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleActive(row) {
    try {
      await api.put(`/api/first-then/${row.id}/active`, null, {
        params: { active: !row.active },
      });
      await loadBoards();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeBoard(row) {
    try {
      await api.delete(`/api/first-then/${row.id}`);
      await loadBoards();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function editBoard(row) {
    navigate(`/first-then?edit=${row.id}`);
  }

  const completedCount = useMemo(() => items.filter((x) => x.completed).length, [items]);
  const activeCount = useMemo(() => items.filter((x) => x.active).length, [items]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My First-Then Boards</h1>
              <p className="mt-2 text-sm text-slate-600">
                View and manage all your previously created boards.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/first-then")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <FaPlus />
              Create New Board
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
            <StatusChip tone="blue">{items.length} Total</StatusChip>
            <StatusChip tone="green">{activeCount} Active</StatusChip>
            <StatusChip tone="yellow">{completedCount} Completed</StatusChip>
          </div>
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading boards...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-lg font-semibold text-slate-900">No boards yet</div>
              <p className="mt-1 text-sm text-slate-600">Create your first First-Then board to get started.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((row) => (
                <BoardCard
                  key={row.id}
                  row={row}
                  onToggleCompleted={toggleCompleted}
                  onToggleActive={toggleActive}
                  onDelete={removeBoard}
                  onEdit={editBoard}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
