import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg text-green-700">
          🌿 GreenSnap
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-green-700 transition"
          >
            Overzicht
          </Link>
          <Link
            href="/dashboard/upload"
            className="text-gray-600 hover:text-green-700 transition"
          >
            Foto uploaden
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-gray-600 hover:text-green-700 transition"
          >
            Instellingen
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
