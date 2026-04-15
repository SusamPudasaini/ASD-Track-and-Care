import Navbar from "../../components/navbar/Navbar";
import { motion } from "framer-motion";
import { FaPuzzlePiece } from "react-icons/fa6";

export default function ActivityShell({ title, subtitle, children, footer, headerIcon }) {
  const HeaderIcon = headerIcon || FaPuzzlePiece;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                Therapy Module
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              ) : null}
            </div>

            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-[#4a6cf7] shadow-sm">
              <HeaderIcon />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_8px_26px_rgba(15,23,42,0.06)]"
        >
          {children}
        </motion.section>

        {footer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900"
          >
            {footer}
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}