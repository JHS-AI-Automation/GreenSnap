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

  // Mode toggle
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing client
  const [clientId, setClientId] = useState("");

  // New client fields
  const [newName, setNewName] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newHouseNumber, setNewHouseNumber] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  // Job fields
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
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLoading(false);
    });
  }, []);

  async function refreshClients() {
    const res = await fetch("/api/clients");
    if (res.ok) {
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !scheduledDate) return;

    setSubmitting(true);
    setResult(null);

    try {
      let finalClientId = clientId;

      // Eerst nieuwe klant aanmaken indien mode = new
      if (mode === "new") {
        if (!newName || !newStreet || !newHouseNumber || !newCity) {
          setResult({ ok: false, message: "Vul naam, straat, huisnummer en plaats in" });
          setSubmitting(false);
          return;
        }

        const address = `${newStreet} ${newHouseNumber}, ${newCity}`;
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            address,
            notes: newClientNotes,
          }),
        });

        const clientData = await clientRes.json();

        if (!clientRes.ok) {
          setResult({
            ok: false,
            message: clientData.error || "Klant aanmaken mislukt",
          });
          setSubmitting(false);
          return;
        }

        finalClientId = clientData.client.id;
        await refreshClients();
      }

      if (!finalClientId) {
        setResult({ ok: false, message: "Kies een klant of vul nieuwe klant in" });
        setSubmitting(false);
        return;
      }

      // Job aanmaken
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: finalClientId,
          userId,
          scheduledDate,
          notes,
        }),
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
        className="bg-white rounded-xl p-6 border border-gray-100 space-y-5"
      >
        {loading ? (
          <p className="text-gray-500 text-sm">Klanten en medewerkers laden...</p>
        ) : (
          <>
            {/* Mode toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type opdracht</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                    mode === "new"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Nieuwe klant + opdracht
                </button>
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                    mode === "existing"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Vervolgafspraak (bestaande klant)
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {mode === "new"
                  ? "💡 Voer hieronder klantgegevens in. Het adres wordt automatisch op kaart geplaatst."
                  : "🔁 Kies een klant uit je lijst voor een vervolgafspraak of regulier onderhoud."}
              </p>
            </div>

            {/* Existing client selector */}
            {mode === "existing" && (
              <div>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required={mode === "existing"}
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
                    Geen klanten gevonden. Wissel naar &quot;Nieuwe klant&quot; om er een toe te voegen.
                  </p>
                )}
              </div>
            )}

            {/* New client fields */}
            {mode === "new" && (
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Klantnaam
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Bijv. Fam. De Vries"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Straat
                    </label>
                    <input
                      type="text"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="Graven"
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Huisnummer
                    </label>
                    <input
                      type="text"
                      value={newHouseNumber}
                      onChange={(e) => setNewHouseNumber(e.target.value)}
                      placeholder="26"
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plaats
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Deventer"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notities bij klant (optioneel)
                  </label>
                  <input
                    type="text"
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    placeholder="Bijv. sleutel onder mat"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  💡 Adres wordt automatisch op kaart geplaatst via geocoding
                </p>
              </div>
            )}

            {/* Worker */}
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

            {/* Date */}
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

            {/* Job notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notities bij opdracht (optioneel)
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
              disabled={submitting || !userId}
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
