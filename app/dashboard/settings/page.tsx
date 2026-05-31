"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface CompanyProfile {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  kvk: string;
  btw: string;
  iban: string;
  logoUrl: string;
  primaryColor: string;
  defaultReportStyle: "report" | "invoice";
  emailSignature: string;
}

interface Worker {
  id: string;
  name: string;
  phone: string;
  role: "worker" | "owner";
}

interface ClientLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
}

interface ImportResult {
  row: number;
  name: string;
  address: string;
  status: "success" | "geocode_failed" | "duplicate" | "error";
  error?: string;
}

const INITIAL_PROFILE: CompanyProfile = {
  name: "GroenWerk Hengelo",
  address: "Industrieweg 12",
  postcode: "7553 CA Hengelo",
  phone: "+31 (0)74 123 4567",
  email: "info@groenwerk-hengelo.nl",
  kvk: "12345678",
  btw: "NL123456789B01",
  iban: "NL91 ABNA 0417 1643 00",
  logoUrl: "",
  primaryColor: "#16a34a",
  defaultReportStyle: "invoice",
  emailSignature: "Met vriendelijke groet,\n\nJan de Vries\nGroenWerk Hengelo\n+31 (0)74 123 4567",
};

const INITIAL_WORKERS: Worker[] = [
  { id: "aaa", name: "Jan de Vries", phone: "+31612345678", role: "owner" },
  { id: "bbb", name: "Piet Bakker", phone: "+31687654321", role: "worker" },
  { id: "ccc", name: "Kees Jansen", phone: "+31611223344", role: "worker" },
];

function InputField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [workers] = useState(INITIAL_WORKERS);
  const [clients, setClients] = useState<ClientLocation[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "clients" | "report">("clients");

  // Add client form
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ ok: boolean; message: string } | null>(null);

  // CSV import
  const [csvData, setCsvData] = useState<{ name: string; address: string; notes?: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  const updateProfile = (field: keyof CompanyProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Fetch clients from Supabase
  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } finally {
      setLoadingClients(false);
    }
  }

  // Add client
  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newAddress) return;
    setAdding(true);
    setAddResult(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, address: newAddress, notes: newNotes }),
      });
      const data = await res.json();

      if (res.ok) {
        setAddResult({
          ok: true,
          message: `${data.client.name} toegevoegd (${data.geocoded.lat.toFixed(4)}, ${data.geocoded.lng.toFixed(4)})`,
        });
        setNewName("");
        setNewAddress("");
        setNewNotes("");
        fetchClients();
      } else {
        setAddResult({ ok: false, message: data.error });
      }
    } catch {
      setAddResult({ ok: false, message: "Netwerkfout" });
    } finally {
      setAdding(false);
    }
  }

  // Delete client
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((c) => c.filter((cl) => cl.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  }

  // CSV parsing
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const rows: { name: string; address: string; notes?: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          rows.push({ name: cols[0], address: cols[1], notes: cols[2] || undefined });
        }
      }
      setCsvData(rows);
    };
    reader.readAsText(file);
  }

  // CSV import
  async function handleImport(dryRun: boolean) {
    setImporting(true);
    setImportResults(null);
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvData, dryRun }),
      });
      const data = await res.json();
      setImportResults(data.results);
      if (!dryRun) {
        fetchClients();
      }
    } finally {
      setImporting(false);
    }
  }

  const tabs = [
    { id: "clients" as const, label: "Klantlocaties" },
    { id: "profile" as const, label: "Bedrijfsprofiel" },
    { id: "team" as const, label: "Medewerkers" },
    { id: "report" as const, label: "Rapportage" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">&larr; Terug</Link>
        <h1 className="text-2xl font-bold">Instellingen</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
              activeTab === tab.id ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === KLANTLOCATIES === */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          {/* Add client form */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-lg font-bold mb-1">Klant toevoegen</h2>
            <p className="text-sm text-gray-500 mb-4">Het adres wordt automatisch omgezet naar GPS-coordinaten voor locatie-matching.</p>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Klantnaam" value={newName} onChange={setNewName} placeholder="Fam. Jansen" />
                <InputField label="Adres" value={newAddress} onChange={setNewAddress} placeholder="Straatnaam 12, Stad" />
              </div>
              <InputField label="Notities (optioneel)" value={newNotes} onChange={setNewNotes} placeholder="Bv. sleutel onder bloempot" />

              <button type="submit" disabled={adding || !newName || !newAddress}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {adding ? "Adres zoeken en opslaan..." : "Toevoegen"}
              </button>

              {addResult && (
                <div className={`p-3 rounded-lg text-sm ${addResult.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  {addResult.ok ? "✓" : "✗"} {addResult.message}
                </div>
              )}
            </form>
          </div>

          {/* CSV Import */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-lg font-bold mb-1">Bulk import (CSV)</h2>
            <p className="text-sm text-gray-500 mb-3">
              Upload een CSV met kolommen: <code className="text-xs bg-gray-100 px-1 rounded">naam, adres, notities</code> (scheidingsteken: komma, puntkomma of tab).
            </p>

            <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCsvFile} className="hidden" />

            {csvData.length === 0 ? (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition flex flex-col items-center gap-1"
              >
                <span className="text-2xl">📄</span>
                <span className="text-sm text-gray-500">Klik om CSV te uploaden</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  {csvData.length} klanten gevonden in CSV
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Naam</th>
                        <th className="text-left p-2">Adres</th>
                        {importResults && <th className="text-left p-2">Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, i) => {
                        const result = importResults?.[i];
                        return (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="p-2 text-gray-400">{i + 1}</td>
                            <td className="p-2">{row.name}</td>
                            <td className="p-2 text-gray-500">{row.address}</td>
                            {result && (
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  result.status === "success" ? "bg-green-100 text-green-700" :
                                  result.status === "duplicate" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {result.status === "success" ? "OK" :
                                   result.status === "duplicate" ? "Dubbel" :
                                   result.status === "geocode_failed" ? "Niet gevonden" : "Fout"}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleImport(true)} disabled={importing}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    {importing ? "Controleren..." : "Controleer eerst (dry run)"}
                  </button>
                  <button onClick={() => handleImport(false)} disabled={importing}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {importing ? "Importeren..." : "Importeer alles"}
                  </button>
                  <button onClick={() => { setCsvData([]); setImportResults(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="py-2 px-4 bg-white border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Annuleer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Client list */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-lg font-bold mb-3">
              Klantlocaties {!loadingClients && <span className="text-sm font-normal text-gray-400">({clients.length})</span>}
            </h2>

            {loadingClients ? (
              <p className="text-sm text-gray-400 py-4 text-center">Laden...</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nog geen klanten. Voeg er een toe hierboven.</p>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.name}</span>
                        <span className="text-xs text-gray-400">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{c.address}</span>
                      {c.notes && <span className="text-xs text-gray-400 block">{c.notes}</span>}
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="text-xs text-gray-400 hover:text-red-500 transition ml-2 disabled:opacity-50"
                    >
                      {deleting === c.id ? "..." : "Verwijder"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === BEDRIJFSPROFIEL === */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Bedrijfsprofiel</h2>
            <p className="text-sm text-gray-500">Deze gegevens verschijnen op je rapportages en facturen.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                {profile.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl text-gray-300">🏢</span>
                )}
              </div>
              <div>
                <button className="px-4 py-2 bg-gray-100 text-sm rounded-lg hover:bg-gray-200 transition">Upload logo</button>
                <p className="text-xs text-gray-400 mt-1">PNG of JPG, max 2MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <InputField label="Bedrijfsnaam" value={profile.name} onChange={(v) => updateProfile("name", v)} />
            </div>
            <InputField label="Adres" value={profile.address} onChange={(v) => updateProfile("address", v)} />
            <InputField label="Postcode + Plaats" value={profile.postcode} onChange={(v) => updateProfile("postcode", v)} />
            <InputField label="Telefoon" value={profile.phone} onChange={(v) => updateProfile("phone", v)} />
            <InputField label="E-mail" value={profile.email} onChange={(v) => updateProfile("email", v)} type="email" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Zakelijke gegevens</h3>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="KVK-nummer" value={profile.kvk} onChange={(v) => updateProfile("kvk", v)} />
              <InputField label="BTW-nummer" value={profile.btw} onChange={(v) => updateProfile("btw", v)} />
              <InputField label="IBAN" value={profile.iban} onChange={(v) => updateProfile("iban", v)} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Huisstijl</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Hoofdkleur</label>
              <input type="color" value={profile.primaryColor} onChange={(e) => updateProfile("primaryColor", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
              <span className="text-sm text-gray-400">{profile.primaryColor}</span>
            </div>
          </div>

          <button onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            {saved ? "✓ Opgeslagen" : "Opslaan"}
          </button>
        </div>
      )}

      {/* === MEDEWERKERS === */}
      {activeTab === "team" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Medewerkers</h2>
            <p className="text-sm text-gray-500">Beheer wie er foto's kan insturen via Telegram.</p>
          </div>
          <div className="space-y-2">
            {workers.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <span className="font-medium text-sm">{w.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{w.phone}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  w.role === "owner" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                }`}>
                  {w.role === "owner" ? "Eigenaar" : "Medewerker"}
                </span>
              </div>
            ))}
          </div>
          <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition">
            + Medewerker toevoegen
          </button>
        </div>
      )}

      {/* === RAPPORTAGE === */}
      {activeTab === "report" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Rapportage-instellingen</h2>
            <p className="text-sm text-gray-500">Standaardinstellingen voor rapporten en facturen.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Standaard rapportstijl</label>
            <div className="flex gap-3">
              {(["report", "invoice"] as const).map((style) => (
                <button key={style}
                  onClick={() => updateProfile("defaultReportStyle", style)}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition ${
                    profile.defaultReportStyle === style ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-sm">{style === "report" ? "Onderhoudsrapport" : "Factuur"}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {style === "report" ? "Werkzaamheden-overzicht met fotografisch verslag" : "Factuur met regelitems, BTW en betaalgegevens"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail handtekening</label>
            <textarea value={profile.emailSignature} onChange={(e) => updateProfile("emailSignature", e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none h-28 text-sm font-mono" />
          </div>

          <button onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            {saved ? "✓ Opgeslagen" : "Opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}
