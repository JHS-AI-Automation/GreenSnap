"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    // Supabase redirect bevat tokens in URL hash (#access_token=...)
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const errorDesc = params.get("error_description");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hash.includes("access_token")) setTokenReady(true);
    else if (errorDesc) setError(decodeURIComponent(errorDesc));
    else setError("Geen geldige reset-link. Vraag een nieuwe reset-link aan via 'Wachtwoord vergeten'.");
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);

    try {
      // Parse access_token uit URL hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken) {
        setError("Geen geldige token. Vraag opnieuw aan.");
        return;
      }

      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, refreshToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Wachtwoord wijzigen mislukt.");
        return;
      }

      // Success, redirect to login
      router.push("/login?reset=success");
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  if (!tokenReady && !error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-gray-500">Link controleren...</p>
      </main>
    );
  }

  if (error && !tokenReady) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold">Reset-link niet geldig</h1>
          <p className="text-sm text-gray-600">{error}</p>
          <Link
            href="/reset-password"
            className="inline-block py-3 px-6 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            Vraag nieuwe reset-link aan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Nieuw wachtwoord</h1>
          <p className="text-sm text-gray-500">Kies een nieuw wachtwoord voor je account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nieuw wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimaal 8 tekens"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bevestig wachtwoord
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Nogmaals"
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
            {loading ? "Bezig..." : "Wachtwoord wijzigen"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ConfirmResetPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-500">Laden...</p>}>
      <ConfirmContent />
    </Suspense>
  );
}
