"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  address: string;
}

interface User {
  id: string;
  name: string;
  role: "worker" | "owner";
}

export default function NewJobPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([clientsData, usersData]) => {
      setClients(clientsData);
      // Default to workers only for assignment, but show all
      setUsers(usersData);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !userId || !scheduledDate) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, userId, scheduledDate, notes }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: "Opdracht aangemaakt!" });
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        setResult({ ok: false, message: data.error || "Aanmaken mislukt" });
      }
    } catch {
      setResult({ ok: false, message: "Netwerkfout" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          &larr; Terug
        </Link>
        <h1 className="text-2xl font-bold">Nieuwe opdracht</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 border border-gray-100 space-y-4"
      >
        {loading ? (
          <p className="text-gray-500 text-sm">Klanten en medewerkers laden...</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klant
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">Kies een klant...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.address}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Geen klanten gevonden. Voeg eerst klanten toe in{" "}
                  <Link href="/dashboard/settings" className="underline">
                    Instellingen
                  </Link>
                  .
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medewerker
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">Kies een medewerker...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role === "owner" ? "(eigenaar)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full p-3 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notities (optioneel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bijv. 'heg snoeien, gazon maaien'"
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
              />
            </div>

            {result && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {result.ok ? "✅" : "❌"} {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !clientId || !userId}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? "Bezig..." : "Opdracht aanmaken"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
