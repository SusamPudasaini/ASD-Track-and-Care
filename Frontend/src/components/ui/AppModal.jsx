import { FaXmark } from "react-icons/fa6";

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-4xl",
  "3xl": "max-w-5xl",
};

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  size = "lg",
  children,
  footer,
  bodyClassName = "",
  closeOnBackdrop = true,
}) {
  if (!open) return null;

  const cardSize = SIZE_CLASS[size] || SIZE_CLASS.lg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${cardSize} overflow-hidden rounded-3xl border border-white/40 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                {icon ? (
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    {icon}
                  </div>
                ) : null}
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
                  {subtitle ? <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p> : null}
                </div>
              </div>

              {badge ? (
                <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {badge}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close"
            >
              <FaXmark />
            </button>
          </div>
        </div>

        <div className={`max-h-[74vh] overflow-y-auto px-6 py-5 ${bodyClassName}`}>{children}</div>

        {footer ? <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
