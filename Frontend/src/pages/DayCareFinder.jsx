import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaFilter, FaLocationDot, FaMagnifyingGlass, FaSchool } from "react-icons/fa6";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function DayCareFinder() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/api/daycares");
      setItems(res.data || []);
    } catch (error) {
      console.error("Failed to load daycares:", error);
      setItems([]);
    }
  }

  const categories = useMemo(() => {
    const unique = items
      .map((item) => item.category)
      .filter(Boolean);
    return ["all", ...Array.from(new Set(unique))];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q);

      const matchesCategory =
        category === "all" || item.category?.toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex items-center gap-2">
            <FaSchool className="text-[#4a6cf7]" />
            <h1 className="text-3xl font-semibold text-gray-900">Day Care Finder</h1>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Explore nearby day care centers that provide supportive environments for children.
          </p>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, description, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <FaFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/70 bg-white/90 p-6 text-sm text-gray-600 shadow-sm">
              No day care centers found for the current filters.
            </div>
          ) : (
            filteredItems.map((item) => (
              <Link
                key={item.id}
                to={`/daycares/${item.id}`}
                className="group overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
              >
                <img
                  src={item.imageUrl || "https://via.placeholder.com/400x250"}
                  alt={item.name || "Day care center"}
                  className="h-44 w-full rounded-xl object-cover"
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.category ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.category}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-[#4a6cf7]">{item.name}</h2>

                <p className="mt-2 line-clamp-3 text-sm text-gray-600">{item.description}</p>

                {item.location ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <FaLocationDot className="text-[#4a6cf7]" />
                    {item.location}
                  </p>
                ) : null}

                <p className="mt-4 text-sm font-semibold text-blue-600">View Details →</p>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}