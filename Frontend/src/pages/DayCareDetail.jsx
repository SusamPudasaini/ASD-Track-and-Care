import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaLocationDot,
  FaPhone,
  FaGlobe,
  FaEnvelope,
  FaStar,
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

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(value) {
  try {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value || "-");
  }
}

function Stars({ value = 0, size = "text-sm" }) {
  const n = Number(value) || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <FaStar
          key={i}
          className={`${size} ${i <= Math.round(n) ? "text-yellow-500" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

export default function DayCareDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [googleReviews, setGoogleReviews] = useState([]);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    try {
      const [detailRes, userReviewRes, googleReviewRes] = await Promise.all([
        api.get(`/api/daycares/${id}`),
        api.get(`/api/daycares/${id}/reviews`),
        api.get(`/api/daycares/${id}/google-reviews`),
      ]);

      const detail = detailRes.data || null;
      const parents = Array.isArray(userReviewRes.data) ? userReviewRes.data : [];
      const google = Array.isArray(googleReviewRes.data) ? googleReviewRes.data : [];

      setItem(detail);
      setUserReviews(parents);
      setGoogleReviews(google);

      const mine = parents.find((r) => r.mine);
      if (mine) {
        setReviewRating(mine.rating || 0);
        setReviewComment(mine.comment || "");
      } else {
        setReviewRating(0);
        setReviewComment("");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error("Please login to submit a review.");
      return;
    }

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      toast.error("Please select a rating.");
      return;
    }

    if (!reviewComment.trim()) {
      toast.error("Please write a comment.");
      return;
    }

    try {
      setSubmittingReview(true);

      await api.post(`/api/daycares/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      toast.success("Review submitted successfully.");
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  }

  const canEmbedMap = item?.latitude != null && item?.longitude != null;

  const myReview = useMemo(
    () => userReviews.find((r) => r.mine) || null,
    [userReviews]
  );

  if (!item) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-gray-600">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={() => navigate("/daycares")}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <FaArrowLeft />
          Back to Day Care Finder
        </button>

        <div className="mt-6 overflow-hidden rounded-3xl border shadow-sm">
          <div className="h-72 w-full bg-gray-100">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {prettyLabel(item.category)}
              </span>

              {item.averageRating > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                  <Stars value={item.averageRating} />
                  Parent {item.averageRating} ({item.totalReviews || 0})
                </span>
              ) : null}

              {item.googleRating > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  <Stars value={item.googleRating} />
                  Google {item.googleRating} ({item.googleReviewCount || 0})
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-semibold">{item.name}</h1>

            <p className="mt-4 leading-7 text-gray-600">{item.description}</p>

            <div className="mt-6 space-y-3 text-sm text-gray-700">
              <p className="flex items-start gap-2">
                <FaLocationDot className="mt-0.5 text-gray-500" />
                <span>{item.address}</span>
              </p>

              {item.phone ? (
                <p className="flex items-start gap-2">
                  <FaPhone className="mt-0.5 text-gray-500" />
                  <span>{item.phone}</span>
                </p>
              ) : null}

              {item.email ? (
                <p className="flex items-start gap-2">
                  <FaEnvelope className="mt-0.5 text-gray-500" />
                  <span>{item.email}</span>
                </p>
              ) : null}

              {item.websiteUrl ? (
                <p className="flex items-start gap-2">
                  <FaGlobe className="mt-0.5 text-gray-500" />
                  <a
                    href={item.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {item.googleMapsUrl ? (
                <a
                  href={item.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open in Google Maps
                </a>
              ) : null}

              {item.websiteUrl ? (
                <a
                  href={item.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Visit Website
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {canEmbedMap ? (
          <div className="mt-6 rounded-3xl border p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Map View</h2>
            <iframe
              title="Day Care Map"
              className="h-80 w-full rounded-xl"
              src={`https://maps.google.com/maps?q=${item.latitude},${item.longitude}&z=15&output=embed`}
            />
          </div>
        ) : null}

        {/* Review form */}
        <div className="mt-6 rounded-3xl border p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {myReview ? "Update Your Review" : "Write a Parent Review"}
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Share your experience to help other parents make informed decisions.
          </p>

          {!isLoggedIn ? (
            <p className="mt-4 text-sm text-gray-500">Please login to submit a review.</p>
          ) : (
            <form onSubmit={submitReview} className="mt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      className="rounded-lg p-1"
                    >
                      <FaStar
                        className={`text-2xl ${
                          n <= reviewRating ? "text-yellow-500" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Write your experience here..."
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className={`mt-4 rounded-xl px-6 py-3 text-sm font-semibold text-white ${
                  submittingReview
                    ? "cursor-not-allowed bg-blue-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submittingReview ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
              </button>
            </form>
          )}
        </div>

        {/* Google reviews */}
        <div className="mt-6 rounded-3xl border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Google Reviews</h2>
            <div className="text-sm text-gray-500">
              {item.googleRating > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <Stars value={item.googleRating} />
                  {item.googleRating} ({item.googleReviewCount || 0})
                </span>
              ) : (
                "No Google rating available"
              )}
            </div>
          </div>

          {googleReviews.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No Google review snapshots added yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {googleReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">{r.authorName}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <Stars value={r.rating} />
                      <span>{r.relativeTimeText || fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parent reviews */}
        <div className="mt-6 rounded-3xl border p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Parent Reviews</h2>

          {userReviews.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No parent reviews yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {userReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">
                      {r.username} {r.mine ? <span className="text-xs text-blue-600">(You)</span> : null}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <Stars value={r.rating} />
                      <span>{fmtDate(r.updatedAt || r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}