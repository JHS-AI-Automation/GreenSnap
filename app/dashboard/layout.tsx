import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Company profile / logo area */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
              GW
            </div>
            <div>
              <Link href="/dashboard" className="font-bold text-sm text-gray-900 hover:text-green-700 transition">
                GroenWerk Hengelo
              </Link>
              <p className="text-xs text-gray-400">Eigenaar: Jan de Vries</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-green-700 transition"
            >
              Overzicht
            </Link>
            <Link
              href="/dashboard/upload"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-green-700 transition"
            >
              Upload
            </Link>
            <Link
              href="/dashboard/settings"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-green-700 transition"
            >
              Instellingen
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
