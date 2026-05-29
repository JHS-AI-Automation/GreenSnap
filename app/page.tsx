import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="text-6xl">🌿</div>
          <h1 className="text-3xl font-bold text-green-700">GreenSnap</h1>
          <p className="text-gray-600">
            Before/after foto-rapportage voor groenbedrijven
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/worker"
            className="block w-full py-3 px-6 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            Medewerker login
          </Link>
          <Link
            href="/dashboard"
            className="block w-full py-3 px-6 bg-white text-green-700 border-2 border-green-600 rounded-xl font-medium hover:bg-green-50 transition"
          >
            Eigenaar dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-400">PoC v0.1</p>
      </div>
    </main>
  );
}
