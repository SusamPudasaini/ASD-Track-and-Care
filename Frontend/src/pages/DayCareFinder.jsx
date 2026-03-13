import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaFilter } from "react-icons/fa";
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
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold mb-4">Day Care Finder</h1>

        <p className="text-gray-600 mb-8">
          Explore nearby day care centers that provide supportive environments for children.
        </p>

        {/* Search + Filter */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="md:col-span-2 relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-11 pr-4 py-3"
            />
          </div>

          <div className="relative">
            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-xl pl-11 pr-4 py-3 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={`/daycares/${item.id}`}
              className="border rounded-xl p-5 hover:shadow-md"
            >
              <img
                src={item.imageUrl || "https://via.placeholder.com/400x250"}
                className="w-full h-40 object-cover rounded mb-4"
              />

              <h2 className="font-semibold text-lg">{item.name}</h2>

              <p className="text-sm text-gray-600 mt-2">
                {item.description}
              </p>

              <p className="text-sm text-blue-600 mt-4">
                View Details →
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}