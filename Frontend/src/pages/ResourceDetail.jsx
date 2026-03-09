import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaArrowLeft,
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

function getYouTubeEmbedUrl(url) {
  if (!url) return "";

  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : "";
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    return "";
  } catch {
    return "";
  }
}

export default function ResourceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/api/resources/${id}`);
        if (!mounted) return;
        setItem(res.data || null);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const embedUrl = getYouTubeEmbedUrl(item?.videoUrl);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={() => navigate("/resources")}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <FaArrowLeft />
          Back to Resource Hub
        </button>

        {loading ? (
          <div className="mt-6 text-sm text-gray-600">Loading resource...</div>
        ) : !item ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Resource not found.
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="aspect-[16/8] w-full bg-gray-100">
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
                  <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
                    {typeIcon(item.contentType)}
                  </div>
                )}
              </div>

              <div className="p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {prettyLabel(item.category)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                    {typeIcon(item.contentType)}
                    {prettyLabel(item.contentType)}
                  </span>
                </div>

                <h1 className="text-3xl font-semibold text-gray-900">{item.title}</h1>
                <p className="mt-3 text-base leading-7 text-gray-600">{item.description}</p>
              </div>
            </div>

            {/* Video */}
            {item.contentType === "VIDEO" && item.videoUrl ? (
              <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Video</h2>

                {embedUrl ? (
                  <div className="mt-4 aspect-video overflow-hidden rounded-2xl">
                    <iframe
                      src={embedUrl}
                      title={item.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Open Video
                  </a>
                )}
              </div>
            ) : null}

            {/* Article body */}
            {item.contentBody ? (
              <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Content</h2>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {item.contentBody}
                </div>
              </div>
            ) : null}

            {/* Links */}
            {(item.fileUrl || item.externalUrl) ? (
              <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Useful Links</h2>

                <div className="mt-4 flex flex-wrap gap-3">
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaFilePdf />
                      Open File
                    </a>
                  ) : null}

                  {item.externalUrl ? (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaLink />
                      Visit Link
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}