"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PhotoData {
  id: string;
  type: "before" | "after";
  storage_path: string;
  taken_at: string;
  caption: string | null;
  source: string;
  url: string | null;
}

interface JobDetail {
  id: string;
  status: string;
  scheduled_date: string;
  notes: string | null;
  client: { id: string; name: string; address: string } | null;
  user: { id: string; name: string } | null;
  photos: PhotoData[];
}

type EmailStyle = "kort" | "standaard" | "uitgebreid";

const EMAIL_TEMPLATES: Record<
  EmailStyle,
  {
    label: string;
    description: string;
    generate: (client: string, notes: string, date: string) => string;
  }
> = {
  kort: {
    label: "Kort",
    description: "Alleen rapport als bijlage",
    generate: (client, _notes, date) =>
      `Beste ${client},\n\nBijgaand het onderhoudsrapport van ${date}.\n\nMet vriendelijke groet,\nJan de Vries\nGroenWerk Hengelo`,
  },
  standaard: {
    label: "Standaard",
    description: "Samenvatting werkzaamheden + rapport",
    generate: (client, notes, date) =>
      `Beste ${client},\n\nHierbij stuur ik u het onderhoudsrapport van de werkzaamheden die op ${date} zijn uitgevoerd.\n\nUitgevoerde werkzaamheden:\n${notes || "(geen notities)"}\n\nHet rapport met fotografisch verslag (voor/na) vindt u als bijlage.\n\nHeeft u vragen? Neem gerust contact op.\n\nMet vriendelijke groet,\nJan de Vries\nGroenWerk Hengelo`,
  },
  uitgebreid: {
    label: "Uitgebreid",
    description: "Persoonlijk, met advies",
    generate: (client, notes, date) =>
      `Beste ${client},\n\nVandaag (${date}) hebben wij het tuinonderhoud bij u uitgevoerd.\n\nUitgevoerde werkzaamheden:\n${notes || "(geen notities)"}\n\nIn de bijlage vindt u het rapport met voor/na foto's.\n\nMochten er nog extra werkzaamheden gewenst zijn, denk ik graag mee. Zullen we een vervolgafspraak inplannen?\n\nMet vriendelijke groet,\nJan de Vries\nGroenWerk Hengelo`,
  },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: "Wacht op foto's", color: "bg-gray-100 text-gray-700" },
  before_done: { label: "Voor-foto ontvangen", color: "bg-yellow-50 text-yellow-800" },
  photos_complete: { label: "Foto's compleet", color: "bg-green-50 text-green-800" },
  report_ready: { label: "Rapport klaar", color: "bg-blue-50 text-blue-800" },
  sent: { label: "Verstuurd", color: "bg-gray-50 text-gray-500" },
};

export default function JobDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [emailStyle, setEmailStyle] = useState<EmailStyle>("standaard");
  const [emailTo, setEmailTo] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data: JobDetail | null) => {
        if (data) {
          setJob(data);
          setNotesDraft(data.notes ?? "");
          const dateStr = new Date(data.scheduled_date).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const clientName = data.client?.name ?? "klant";
          setEmailDraft(
            EMAIL_TEMPLATES.standaard.generate(clientName, data.notes ?? "", dateStr)
          );
          setEmailSubject(`Onderhoudsrapport ${clientName} - ${dateStr}`);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function switchEmailStyle(style: EmailStyle) {
    if (!job) return;
    setEmailStyle(style);
    const dateStr = new Date(job.scheduled_date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setEmailDraft(
      EMAIL_TEMPLATES[style].generate(job.client?.name ?? "klant", notesDraft, dateStr)
    );
  }

  async function handleGenerateReport() {
    if (!job) return;
    setGenerating(true);
    try {
      const dateStr = new Date(job.scheduled_date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const beforePhoto = job.photos.find((p) => p.type === "before");
      const afterPhoto = job.photos.find((p) => p.type === "after");

      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: "invoice",
          date: dateStr,
          client: {
            name: job.client?.name ?? "Onbekend",
            address: job.client?.address ?? "",
            postcode: "",
          },
          worker: job.user?.name ?? "Onbekend",
          notes: notesDraft,
          beforePhoto: beforePhoto?.url ?? undefined,
          afterPhoto: afterPhoto?.url ?? undefined,
          beforeTime: beforePhoto
            ? new Date(beforePhoto.taken_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
            : undefined,
          afterTime: afterPhoto
            ? new Date(afterPhoto.taken_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
            : undefined,
        }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setReportGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 text-gray-500">
        Opdracht laden...
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 text-center py-12">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold">Opdracht niet gevonden</h1>
        <Link href="/dashboard" className="inline-block text-green-700 hover:underline">
          Terug naar overzicht
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_LABEL[job.status] ?? {
    label: job.status,
    color: "bg-gray-100 text-gray-700",
  };
  const beforePhoto = job.photos.find((p) => p.type === "before");
  const afterPhoto = job.photos.find((p) => p.type === "after");
  const dateStr = new Date(job.scheduled_date).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          &larr; Terug
        </Link>
        <h1 className="text-2xl font-bold">Opdracht detail</h1>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">{job.client?.name ?? "Onbekende klant"}</h2>
            <p className="text-sm text-gray-500">{job.client?.address ?? ""}</p>
            <p className="text-sm text-gray-400 mt-1">
              Medewerker: {job.user?.name ?? "Onbekend"}
            </p>
            <p className="text-sm text-gray-400">Datum: {dateStr}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-medium text-orange-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            VOOR
            {beforePhoto && (
              <span className="text-xs text-gray-400 font-normal">
                {new Date(beforePhoto.taken_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </h3>
          {beforePhoto?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={beforePhoto.url} alt="Voor-foto" className="w-full aspect-[4/3] object-cover rounded-xl" />
          ) : (
            <div className="aspect-[4/3] bg-orange-50 rounded-xl flex items-center justify-center border-2 border-dashed border-orange-200 text-orange-400 text-sm">
              Nog geen voor-foto
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-green-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            NA
            {afterPhoto && (
              <span className="text-xs text-gray-400 font-normal">
                {new Date(afterPhoto.taken_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </h3>
          {afterPhoto?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={afterPhoto.url} alt="Na-foto" className="w-full aspect-[4/3] object-cover rounded-xl" />
          ) : (
            <div className="aspect-[4/3] bg-green-50 rounded-xl flex items-center justify-center border-2 border-dashed border-green-200 text-green-400 text-sm">
              Nog geen na-foto
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <h3 className="font-medium mb-2">Notities</h3>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Voeg opmerkingen toe..."
          className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24 text-sm"
        />
      </div>

      <button
        onClick={handleGenerateReport}
        disabled={generating}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
      >
        {generating ? "Rapport genereren..." : "Genereer rapport (PDF)"}
      </button>

      {/* Concept email */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-sm">Concept e-mail naar klant</h3>
          {reportGenerated && <span className="text-xs text-green-600 font-medium">PDF bijlage klaar</span>}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Mailtoon</label>
            <div className="flex gap-2">
              {(Object.entries(EMAIL_TEMPLATES) as [EmailStyle, typeof EMAIL_TEMPLATES.kort][]).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => switchEmailStyle(key)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                    emailStyle === key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <div>{tmpl.label}</div>
                  <div className={`mt-0.5 font-normal ${emailStyle === key ? "text-green-100" : "text-gray-400"}`}>
                    {tmpl.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

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
              rows={12}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!emailTo}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
            >
              Verstuur e-mail {reportGenerated ? "+ PDF bijlage" : "(genereer eerst rapport)"}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Opdracht ID: {job.id}</p>
    </div>
  );
}
