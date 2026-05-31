"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis. Probeer opnieuw.");
        return;
      }

      setSent(true);
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h1 className="text-2xl font-bold">Mail verstuurd</h1>
          <p className="text-sm text-gray-600">
            Als <strong>{email}</strong> in ons systeem staat, hebben we een reset-link gestuurd.
            Check je inbox (en spam-folder).
          </p>
          <p className="text-xs text-gray-400">
            De link is 1 uur geldig.
          </p>
          <Link
            href="/login"
            className="block py-3 px-6 bg-white text-green-700 border-2 border-green-600 rounded-xl font-medium hover:bg-green-50 transition"
          >
            Terug naar login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900">Wachtwoord vergeten?</h1>
          <p className="text-sm text-gray-500">
            Vul je e-mailadres in en we sturen je een reset-link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "Bezig..." : "Stuur reset-link"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          <Link href="/login" className="text-green-700 hover:underline">
            Terug naar login
          </Link>
        </p>
      </div>
    </main>
  );
}
