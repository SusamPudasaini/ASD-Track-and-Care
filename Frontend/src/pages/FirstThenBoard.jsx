import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaArrowRight,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaCloudArrowUp,
  FaFileArrowDown,
  FaImage,
  FaListUl,
  FaRotateLeft,
} from "react-icons/fa6";

function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

function resolveAssetUrl(raw) {
  if (!raw) return "";
  const value = String(raw);
  if (value.startsWith("blob:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
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

function emptyForm() {
  return {
    firstTitle: "",
    firstImageUrl: "",
    thenTitle: "",
    thenImageUrl: "",
  };
}

function UploadTile({ label, imageUrl, uploading, onPick }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
      <div className="text-sm font-semibold text-slate-800">{label}</div>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        <FaCloudArrowUp />
        {uploading ? "Uploading..." : "Upload Image"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="aspect-[4/3] w-full bg-slate-100">
          {imageUrl ? (
            <img src={resolveAssetUrl(imageUrl)} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <FaImage className="text-3xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardPanel({ title, imageUrl, tag, tone = "blue" }) {
  const toneClass =
    tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] w-full bg-slate-100">
        {imageUrl ? (
          <img src={resolveAssetUrl(imageUrl)} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <FaImage className="text-4xl" />
          </div>
        )}
      </div>

      <div className="p-5">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{tag}</span>
        <div className="mt-3 text-xl font-bold text-slate-900">{title || "Untitled task"}</div>
      </div>
    </div>
  );
}

export default function FirstThenBoard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewRef = useRef(null);

  const editIdRaw = searchParams.get("edit") || "";
  const parsedEditId = Number(editIdRaw);
  const editId = Number.isFinite(parsedEditId) && parsedEditId > 0 ? parsedEditId : null;

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingFirst, setUploadingFirst] = useState(false);
  const [uploadingThen, setUploadingThen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedBoard, setSavedBoard] = useState(null);
  const [editingBoard, setEditingBoard] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const isEditing = !!editingBoard?.id;
  const totalSteps = 4;
  const progressPercent = useMemo(() => Math.round((step / totalSteps) * 100), [step]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoardForEdit() {
      if (!editId) {
        setEditingBoard(null);
        return;
      }

      try {
        setLoadingEdit(true);
        const res = await api.get(`/api/first-then/${editId}`);
        const board = res?.data;
        if (!board || cancelled) return;

        setEditingBoard(board);
        setForm({
          firstTitle: board.firstTitle || "",
          firstImageUrl: board.firstImageUrl || "",
          thenTitle: board.thenTitle || "",
          thenImageUrl: board.thenImageUrl || "",
        });
      } catch (err) {
        if (cancelled) return;
        toast.error(getErrorMessage(err) || "Could not load board for edit.");
        navigate("/first-then/boards", { replace: true });
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    }

    loadBoardForEdit();
    return () => {
      cancelled = true;
    };
  }, [editId, navigate]);

  const canGoStep2 = useMemo(
    () => form.firstTitle.trim().length > 0 && form.firstImageUrl,
    [form.firstTitle, form.firstImageUrl]
  );

  const canGoStep3 = useMemo(
    () => form.thenTitle.trim().length > 0 && form.thenImageUrl,
    [form.thenTitle, form.thenImageUrl]
  );

  function goToStep(nextStep) {
    const clamped = Math.min(totalSteps, Math.max(1, nextStep));
    setDirection(clamped >= step ? 1 : -1);
    setStep(clamped);
  }

  async function uploadImage(slot, file) {
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    try {
      if (slot === "first") setUploadingFirst(true);
      if (slot === "then") setUploadingThen(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(`/api/first-then/upload-image?slot=${slot}`, formData);
      const uploadedUrl = res?.data?.imageUrl || "";

      if (!uploadedUrl) {
        throw new Error("Image upload did not return a URL.");
      }

      if (slot === "first") {
        setForm((prev) => ({ ...prev, firstImageUrl: uploadedUrl }));
      } else {
        setForm((prev) => ({ ...prev, thenImageUrl: uploadedUrl }));
      }

      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (slot === "first") setUploadingFirst(false);
      if (slot === "then") setUploadingThen(false);
    }
  }

  async function confirmAndSave() {
    if (!canGoStep2 || !canGoStep3) {
      toast.error("Please complete all steps before confirming.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        firstTitle: form.firstTitle.trim(),
        firstImageUrl: form.firstImageUrl,
        thenTitle: form.thenTitle.trim(),
        thenImageUrl: form.thenImageUrl,
        active: editingBoard?.active ?? true,
        completed: editingBoard?.completed ?? false,
      };

      const res = isEditing
        ? await api.put(`/api/first-then/${editingBoard.id}`, payload)
        : await api.post("/api/first-then", payload);
      setSavedBoard(res.data || payload);
      setDirection(1);
      setStep(4);
      toast.success(isEditing ? "First-Then board updated." : "First-Then board created.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (!previewRef.current) return;

    try {
      setDownloading(true);

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const targetW = pageWidth - margin * 2;
      const targetH = (canvas.height * targetW) / canvas.width;
      const finalH = Math.min(targetH, pageHeight - margin * 2);

      pdf.setFontSize(16);
      pdf.text("First-Then Board", margin, 10);
      pdf.addImage(imgData, "PNG", margin, 14, targetW, finalH);

      const fileName = `${(form.firstTitle || "first").replace(/[^a-z0-9]+/gi, "_")}_then_board.pdf`;
      pdf.save(fileName.toLowerCase());
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function resetWizard() {
    setDirection(-1);
    setStep(1);
    setSavedBoard(null);
    setEditingBoard(null);
    setForm(emptyForm());
    navigate("/first-then", { replace: true });
  }

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading board for editing...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">First-Then Board Wizard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Build a visual routine step by step: first task title and image, then activity title and
            image, preview, confirm, and download as PDF.
          </p>

          {isEditing ? (
            <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              Editing board #{editingBoard.id}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{step === 4 ? "Complete" : `Step ${step} of ${totalSteps}`}</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-[#4a6cf7] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;

              return (
                <div
                  key={idx}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-[#4a6cf7] text-white"
                      : done
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {idx}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`wizard-step-${step}`}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {step === 1 ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold text-slate-900">Step 1: Add First task</h2>
                  <p className="text-sm text-slate-600">
                    Write what the child should do first, then upload a supporting image.
                  </p>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">First task title</label>
                      <input
                        value={form.firstTitle}
                        onChange={(e) => setForm((prev) => ({ ...prev, firstTitle: e.target.value }))}
                        placeholder="Example: Brush your teeth"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <UploadTile
                      label="First task image"
                      imageUrl={form.firstImageUrl}
                      uploading={uploadingFirst}
                      onPick={(file) => uploadImage("first", file)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canGoStep2) {
                          toast.error("Add first task title and image before continuing.");
                          return;
                        }
                        goToStep(2);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#4a6cf7] px-5 py-3 font-semibold text-white hover:bg-[#3f5ee0]"
                    >
                      Next
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold text-slate-900">Step 2: Add Then task</h2>
                  <p className="text-sm text-slate-600">
                    Write the reward or follow-up activity, then upload an image for it.
                  </p>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Then task title</label>
                      <input
                        value={form.thenTitle}
                        onChange={(e) => setForm((prev) => ({ ...prev, thenTitle: e.target.value }))}
                        placeholder="Example: Play with toy"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <UploadTile
                      label="Then task image"
                      imageUrl={form.thenImageUrl}
                      uploading={uploadingThen}
                      onPick={(file) => uploadImage("then", file)}
                    />
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FaChevronLeft />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!canGoStep3) {
                          toast.error("Add then task title and image before continuing.");
                          return;
                        }
                        goToStep(3);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#4a6cf7] px-5 py-3 font-semibold text-white hover:bg-[#3f5ee0]"
                    >
                      Next
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              ) : null}

              {(step === 3 || step === 4) ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {step === 3 ? "Step 3: Preview and confirm" : "Board preview"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {step === 3
                        ? "Check your board, then confirm to save it."
                        : "Your board is ready. Download a PDF or create another."}
                    </p>
                  </div>

                  <div ref={previewRef} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 text-center text-xl font-extrabold text-slate-900">FIRST THEN</div>

                    <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <BoardPanel title={form.firstTitle} imageUrl={form.firstImageUrl} tag="FIRST" tone="blue" />

                      <div className="flex justify-center">
                        <div className="rounded-full bg-blue-100 p-4 text-blue-600">
                          <FaArrowRight className="text-xl" />
                        </div>
                      </div>

                      <BoardPanel title={form.thenTitle} imageUrl={form.thenImageUrl} tag="THEN" tone="amber" />
                    </div>
                  </div>

                  {step === 3 ? (
                    <div className="flex flex-wrap justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FaChevronLeft />
                        Back
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={confirmAndSave}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white ${
                          saving ? "cursor-not-allowed bg-blue-300" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <FaCheck />
                        {saving ? "Saving..." : isEditing ? "Save Changes" : "Confirm and Save"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={downloadPdf}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white ${
                          downloading ? "cursor-not-allowed bg-blue-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                        }`}
                      >
                        <FaFileArrowDown />
                        {downloading ? "Preparing PDF..." : "Download PDF"}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/first-then/boards")}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FaListUl />
                        View My Boards
                      </button>

                      <button
                        type="button"
                        onClick={resetWizard}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FaRotateLeft />
                        Create Another
                      </button>
                    </div>
                  )}

                  {step === 4 && savedBoard ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      Board #{savedBoard.id || "new"} has been saved successfully.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}