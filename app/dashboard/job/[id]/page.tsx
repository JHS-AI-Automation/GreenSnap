"use client";

import { use, useState } from "react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CLIENT_NAME = "Fam. De Groot";
const CLIENT_ADDRESS = "Deldenerstraat 42, Hengelo";
const WORKER = "Kees Jansen";
const NOTES =
  "Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. " +
  "Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, " +
  "advies om deze door een boomverzorger te laten verwijderen voor de herfst.";

function generateEmailDraft(clientName: string, notes: string, date: string) {
  return `Beste ${clientName},

Hierbij stuur ik u het onderhoudsrapport van de werkzaamheden die op ${date} zijn uitgevoerd.

Uitgevoerde werkzaamheden:
${notes}

Het rapport met fotografisch verslag (voor/na) vindt u als bijlage bij deze e-mail.

Heeft u vragen of wilt u een vervolgafspraak inplannen? Neem gerust contact met ons op.

Met vriendelijke groet,

Jan de Vries
GroenWerk Hengelo
+31 (0)74 123 4567
info@groenwerk-hengelo.nl`;
}

export default function JobDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const dateStr = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [emailDraft, setEmailDraft] = useState(
    generateEmailDraft(CLIENT_NAME, NOTES, dateStr)
  );
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState(
    `Onderhoudsrapport ${CLIENT_NAME} - ${dateStr}`
  );

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: "invoice",
          client: { name: CLIENT_NAME, address: CLIENT_ADDRESS, postcode: "7551 AB Hengelo" },
          worker: WORKER,
          notes: NOTES,
          beforeTime: "08:32",
          afterTime: "11:45",
        }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setReportGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-gray-600 transition"
        >
          &larr; Terug
        </Link>
        <h1 className="text-2xl font-bold">Opdracht detail</h1>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-lg">{CLIENT_NAME}</h2>
            <p className="text-sm text-gray-500">{CLIENT_ADDRESS}</p>
            <p className="text-sm text-gray-400 mt-1">Medewerker: {WORKER}</p>
            <p className="text-sm text-gray-400">Datum: {dateStr}</p>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-800">
            Foto&apos;s compleet
          </span>
        </div>
      </div>

      {/* Before / After comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-medium text-orange-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            VOOR
            <span className="text-xs text-gray-400 font-normal">08:32</span>
          </h3>
          <div className="aspect-[4/3] bg-orange-50 rounded-xl flex items-center justify-center border-2 border-dashed border-orange-200">
            <div className="text-center text-orange-400">
              <div className="text-4xl mb-2">🏡</div>
              <div className="text-sm">Demo: voor-foto</div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-green-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            NA
            <span className="text-xs text-gray-400 font-normal">11:45</span>
          </h3>
          <div className="aspect-[4/3] bg-green-50 rounded-xl flex items-center justify-center border-2 border-dashed border-green-200">
            <div className="text-center text-green-400">
              <div className="text-4xl mb-2">🌳</div>
              <div className="text-sm">Demo: na-foto</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <h3 className="font-medium mb-2">Opmerkingen</h3>
        <textarea
          placeholder="Voeg opmerkingen toe voor de klant..."
          className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24 text-sm"
          defaultValue={NOTES}
        />
      </div>

      {/* Generate report */}
      <button
        onClick={handleGenerateReport}
        disabled={generating}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? "Rapport genereren..." : "Genereer rapport (PDF)"}
      </button>

      {/* Concept e-mail */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-sm">Concept e-mail naar klant</h3>
          {reportGenerated && (
            <span className="text-xs text-green-600 font-medium">PDF bijlage klaar</span>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Aan</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="klant@email.nl"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Onderwerp</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bericht</label>
            <textarea
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none text-sm font-mono leading-relaxed"
              rows={14}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!emailTo}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verstuur e-mail {reportGenerated ? "+ PDF bijlage" : "(genereer eerst rapport)"}
            </button>
            <button className="py-2.5 px-4 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              Kopieer tekst
            </button>
          </div>

          <p className="text-xs text-gray-400">
            De e-mail handtekening kun je aanpassen in Instellingen &gt; Rapportage.
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Opdracht ID: {id} (demo-data)
      </p>
    </div>
  );
}
