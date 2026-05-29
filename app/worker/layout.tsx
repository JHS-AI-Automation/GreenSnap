import Link from "next/link";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
        <Link href="/worker" className="font-bold text-lg">
          🌿 GreenSnap
        </Link>
        <span className="text-sm text-green-100">Medewerker</span>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
