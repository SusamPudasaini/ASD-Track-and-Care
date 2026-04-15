import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaBookOpen,
  FaMagnifyingGlass,
  FaVideo,
  FaFilePdf,
  FaLink,
  FaNewspaper,
} from "react-icons/fa6";

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

const CATEGORY_OPTIONS = [
  "ALL",
  "COMMUNICATION",
  "SOCIAL_INTERACTION",
  "ATTENTION",
  "PLAY",
  "SENSORY",
  "BEHAVIOR",
];

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeIcon(type) {
  switch (type) {
    case "VIDEO":
      return <FaVideo />;
    case "PDF":
      return <FaFilePdf />;
    case "LINK":
      return <FaLink />;
    default:
      return <FaNewspaper />;
  }
}

export default function ResourceHub() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

  const load = async (selectedCategory = category) => {
    try {
      setLoading(true);

      const res = await api.get("/api/resources", {
        params: {
          category: selectedCategory === "ALL" ? undefined : selectedCategory,
        },
      });

      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const hay = [
        item.title,
        item.description,
        item.category,
        item.contentType,
        item.contentBody,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, query]);

  const handleCategory = async (nextCategory) => {
    setCategory(nextCategory);
    await load(nextCategory);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex items-center gap-2">
            <FaBookOpen className="text-[#4a6cf7]" />
            <h1 className="text-3xl font-semibold text-gray-900">Resource Hub</h1>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Explore supportive tutorials, articles, and guidance materials to help parents better support children with ASD at home.
          </p>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FaMagnifyingGlass />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleCategory(opt)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                    category === opt
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {prettyLabel(opt)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/70 bg-white/90 p-6 text-sm text-gray-600 shadow-sm">Loading resources...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/70 bg-white/90 p-6 text-sm text-gray-600 shadow-sm">
            No resources found for the selected filter.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Link
                key={item.id}
                to={`/resources/${item.id}`}
                className="group overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_8px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
              >
                <div className="aspect-[16/9] w-full bg-gray-100">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                      {typeIcon(item.contentType)}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {prettyLabel(item.category)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      {typeIcon(item.contentType)}
                      {prettyLabel(item.contentType)}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#4a6cf7]">
                    {item.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {item.description}
                  </p>

                  <div className="mt-4 text-sm font-semibold text-[#4a6cf7]">
                    View Resource →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}