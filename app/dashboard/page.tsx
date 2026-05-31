"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface JobRow {
  id: string;
  status: string;
  scheduled_date: string;
  notes: string | null;
  client: { id: string; name: string; address: string } | null;
  user: { id: string; name: string } | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  open: { label: "Wacht op foto's", color: "text-gray-700", bg: "bg-gray-100" },
  before_done: { label: "Voor-foto ontvangen", color: "text-yellow-800", bg: "bg-yellow-50" },
  photos_complete: { label: "Foto's compleet", color: "text-green-800", bg: "bg-green-50" },
  report_ready: { label: "Rapport klaar", color: "text-blue-800", bg: "bg-blue-50" },
  sent: { label: "Verstuurd", color: "text-gray-500", bg: "bg-gray-50" },
};

type Filter = "all" | "waiting" | "in_progress" | "done";

const FILTERS: { id: Filter; label: string; statuses: string[] }[] = [
  { id: "all", label: "Alles", statuses: ["open", "before_done", "photos_complete", "report_ready", "sent"] },
  { id: "waiting", label: "Wachtend", statuses: ["open"] },
  { id: "in_progress", label: "Bezig", statuses: ["before_done", "photos_complete"] },
  { id: "done", label: "Klaar", statuses: ["report_ready", "sent"] },
];

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    waiting: jobs.filter((j) => j.status === "open").length,
    inProgress: jobs.filter(
      (j) => j.status === "before_done" || j.status === "photos_complete"
    ).length,
    done: jobs.filter(
      (j) => j.status === "report_ready" || j.status === "sent"
    ).length,
  };

  const activeStatuses = FILTERS.find((f) => f.id === filter)?.statuses ?? [];
  const filteredJobs = jobs.filter((j) => activeStatuses.includes(j.status));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overzicht</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <Link
            href="/dashboard/jobs/new"
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            + Nieuwe opdracht
          </Link>
        </div>
      </div>

      {/* Stats cards = klikbare filters */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`bg-white rounded-xl p-4 border text-center transition ${
            filter === "all" ? "border-green-500 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="text-3xl font-bold text-gray-900">{jobs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Alles</div>
        </button>
        <button
          onClick={() => setFilter("waiting")}
          className={`bg-white rounded-xl p-4 border text-center transition ${
            filter === "waiting" ? "border-gray-500 ring-2 ring-gray-100" : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="text-3xl font-bold text-gray-500">{stats.waiting}</div>
          <div className="text-sm text-gray-500 mt-1">Wachtend</div>
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`bg-white rounded-xl p-4 border text-center transition ${
            filter === "in_progress" ? "border-yellow-500 ring-2 ring-yellow-100" : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-sm text-gray-500 mt-1">Bezig</div>
        </button>
        <button
          onClick={() => setFilter("done")}
          className={`bg-white rounded-xl p-4 border text-center transition ${
            filter === "done" ? "border-green-500 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
          <div className="text-sm text-gray-500 mt-1">Klaar</div>
        </button>
      </div>

      {/* Filter info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filteredJobs.length} {filter === "all" ? "opdracht(en)" : "opdracht(en) in deze filter"}
        </span>
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="text-green-700 hover:underline"
          >
            Toon alles
          </button>
        )}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Opdrachten laden...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">
            {jobs.length === 0
              ? "Nog geen opdrachten. Klik op '+ Nieuwe opdracht' om er een aan te maken."
              : "Geen opdrachten in deze filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const statusConfig = STATUS_CONFIG[job.status] ?? {
              label: job.status,
              color: "text-gray-700",
              bg: "bg-gray-100",
            };
            return (
              <Link
                key={job.id}
                href={`/dashboard/job/${job.id}`}
                className="block bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg truncate">
                      {job.client?.name ?? "Onbekende klant"}
                    </h2>
                    <p className="text-sm text-gray-500 truncate">
                      {job.client?.address ?? "Geen adres"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Medewerker: {job.user?.name ?? "Onbekend"} · {job.scheduled_date}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
