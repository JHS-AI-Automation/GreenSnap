"use client";

import { use, useState } from "react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: "Fam. De Groot",
            address: "Deldenerstraat 42, Hengelo",
          },
          worker: "Kees Jansen",
          jobDescription:
            "Tuinonderhoud: heg snoeien, borders bijwerken, gazon maaien",
          notes:
            "Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. " +
            "Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, " +
            "advies om deze door een boomverzorger te laten verwijderen voor de herfst.",
          beforeTime: "08:32",
          afterTime: "11:45",
        }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
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
            <h2 className="font-semibold text-lg">Fam. De Groot</h2>
            <p className="text-sm text-gray-500">
              Deldenerstraat 42, Hengelo
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Medewerker: Kees Jansen
            </p>
            <p className="text-sm text-gray-400">
              Datum: {new Date().toLocaleDateString("nl-NL")}
            </p>
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
          defaultValue="Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, advies om deze door een boomverzorger te laten verwijderen voor de herfst."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Rapport genereren..." : "Genereer rapport (PDF)"}
        </button>
        <a
          href="/api/report/generate"
          target="_blank"
          className="py-3 px-6 bg-white text-gray-600 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition text-center"
        >
          Demo PDF
        </a>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Opdracht ID: {id} (demo-data)
      </p>
    </div>
  );
}
