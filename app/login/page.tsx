"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center">Laden...</main>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const resetSuccess = params.get("reset") === "success";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Inloggen mislukt");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🌿</div>
          <h1 className="text-2xl font-bold text-gray-900">Inloggen</h1>
          <p className="text-sm text-gray-500">Eigenaar dashboard</p>
        </div>

        {resetSuccess && (
          <div className="p-3 bg-green-50 text-green-800 text-sm rounded-xl text-center">
            ✅ Wachtwoord gewijzigd. Je kunt nu inloggen.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jan@groenwerk.nl"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Wachtwoord"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Bezig..." : "Inloggen"}
          </button>

          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-xs text-green-700 hover:underline"
            >
              Wachtwoord vergeten?
            </Link>
          </div>
        </form>

        <p className="text-xs text-gray-400 text-center">
          Nog geen account? Neem contact op met de beheerder.
        </p>
      </div>
    </main>
  );
}
