"use client";

import { useState } from "react";
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

const INITIAL_CLIENTS: ClientLocation[] = [
  { id: "ddd", name: "Fam. Smit", address: "Brinkstraat 15, Hengelo" },
  { id: "eee", name: "Kantoor De Brinck", address: "Marktstraat 8, Hengelo" },
  { id: "fff", name: "Fam. De Groot", address: "Deldenerstraat 42, Hengelo" },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [workers] = useState(INITIAL_WORKERS);
  const [clients] = useState(INITIAL_CLIENTS);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "clients" | "report">("profile");

  const updateProfile = (field: keyof CompanyProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // TODO: save to Supabase
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: "profile" as const, label: "Bedrijfsprofiel" },
    { id: "team" as const, label: "Medewerkers" },
    { id: "clients" as const, label: "Klantlocaties" },
    { id: "report" as const, label: "Rapportage" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          &larr; Terug
        </Link>
        <h1 className="text-2xl font-bold">Instellingen</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bedrijfsprofiel */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
          <SectionHeader
            title="Bedrijfsprofiel"
            description="Deze gegevens verschijnen op je rapportages en facturen."
          />

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {profile.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl text-gray-300">🏢</span>
                )}
              </div>
              <div>
                <button className="px-4 py-2 bg-gray-100 text-sm rounded-lg hover:bg-gray-200 transition">
                  Upload logo
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG of JPG, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Bedrijfsgegevens */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <InputField
                label="Bedrijfsnaam"
                value={profile.name}
                onChange={(v) => updateProfile("name", v)}
              />
            </div>
            <InputField
              label="Adres"
              value={profile.address}
              onChange={(v) => updateProfile("address", v)}
            />
            <InputField
              label="Postcode + Plaats"
              value={profile.postcode}
              onChange={(v) => updateProfile("postcode", v)}
            />
            <InputField
              label="Telefoon"
              value={profile.phone}
              onChange={(v) => updateProfile("phone", v)}
            />
            <InputField
              label="E-mail"
              value={profile.email}
              onChange={(v) => updateProfile("email", v)}
              type="email"
            />
          </div>

          {/* Zakelijke gegevens */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Zakelijke gegevens</h3>
            <div className="grid grid-cols-3 gap-4">
              <InputField
                label="KVK-nummer"
                value={profile.kvk}
                onChange={(v) => updateProfile("kvk", v)}
              />
              <InputField
                label="BTW-nummer"
                value={profile.btw}
                onChange={(v) => updateProfile("btw", v)}
              />
              <InputField
                label="IBAN"
                value={profile.iban}
                onChange={(v) => updateProfile("iban", v)}
              />
            </div>
          </div>

          {/* Huisstijl */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Huisstijl</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Hoofdkleur</label>
              <input
                type="color"
                value={profile.primaryColor}
                onChange={(e) => updateProfile("primaryColor", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <span className="text-sm text-gray-400">{profile.primaryColor}</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            {saved ? "✓ Opgeslagen" : "Opslaan"}
          </button>
        </div>
      )}

      {/* Medewerkers */}
      {activeTab === "team" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <SectionHeader
            title="Medewerkers"
            description="Beheer wie er foto's kan insturen via Telegram of de app."
          />

          <div className="space-y-2">
            {workers.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <span className="font-medium text-sm">{w.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{w.phone}</span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    w.role === "owner"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
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

      {/* Klantlocaties */}
      {activeTab === "clients" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <SectionHeader
            title="Klantlocaties"
            description="Locaties worden gebruikt voor automatische foto-matching op GPS."
          />

          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{c.address}</span>
                </div>
                <button className="text-xs text-gray-400 hover:text-red-500 transition">
                  Verwijder
                </button>
              </div>
            ))}
          </div>

          <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition">
            + Klantlocatie toevoegen
          </button>
        </div>
      )}

      {/* Rapportage-instellingen */}
      {activeTab === "report" && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
          <SectionHeader
            title="Rapportage-instellingen"
            description="Standaardinstellingen voor gegenereerde rapporten en facturen."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standaard rapportstijl
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => updateProfile("defaultReportStyle", "report")}
                className={`flex-1 p-4 rounded-xl border-2 text-left transition ${
                  profile.defaultReportStyle === "report"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-sm">Onderhoudsrapport</div>
                <div className="text-xs text-gray-500 mt-1">
                  Werkzaamheden-overzicht met fotografisch verslag
                </div>
              </button>
              <button
                onClick={() => updateProfile("defaultReportStyle", "invoice")}
                className={`flex-1 p-4 rounded-xl border-2 text-left transition ${
                  profile.defaultReportStyle === "invoice"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-sm">Factuur</div>
                <div className="text-xs text-gray-500 mt-1">
                  Factuur met regelitems, BTW en betaalgegevens
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail handtekening
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Wordt automatisch onder concept-mails geplaatst bij het versturen van rapporten.
            </p>
            <textarea
              value={profile.emailSignature}
              onChange={(e) => updateProfile("emailSignature", e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none h-28 text-sm font-mono"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            {saved ? "✓ Opgeslagen" : "Opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}
