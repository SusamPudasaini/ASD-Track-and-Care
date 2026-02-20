import Navbar from "../../components/navbar/Navbar";

export default function ActivityShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4">
          <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {children}
        </div>

        {footer ? (
          <div className="mt-4 text-sm text-gray-600">{footer}</div>
        ) : null}
      </main>
    </div>
  );
}