"use client";

import { useState } from "react";
import Link from "next/link";
interface DemoJob {
  id: string;
  status: string;
  client: { name: string; address: string };
}

const DEMO_JOBS: DemoJob[] = [
  {
    id: "aaa11111",
    status: "open",
    client: { name: "Fam. Smit", address: "Brinkstraat 15, Hengelo" },
  },
  {
    id: "bbb22222",
    status: "before_done",
    client: { name: "Kantoor De Brinck", address: "Marktstraat 8, Hengelo" },
  },
  {
    id: "ccc33333",
    status: "photos_complete",
    client: { name: "Fam. De Groot", address: "Deldenerstraat 42, Hengelo" },
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Nieuw", color: "bg-gray-200 text-gray-700" },
  before_done: { label: "Voor-foto", color: "bg-yellow-100 text-yellow-800" },
  photos_complete: { label: "Compleet", color: "bg-green-100 text-green-800" },
  report_ready: { label: "Rapport", color: "bg-blue-100 text-blue-800" },
  sent: { label: "Verstuurd", color: "bg-gray-100 text-gray-500" },
};

export default function WorkerJobsPage() {
  const [jobs] = useState(DEMO_JOBS);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Opdrachten vandaag</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const status = STATUS_LABELS[job.status];
          return (
            <Link
              key={job.id}
              href={`/worker/capture?jobId=${job.id}&client=${encodeURIComponent(job.client.name)}&type=${job.status === "open" ? "before" : "after"}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{job.client.name}</h2>
                  <p className="text-sm text-gray-500">{job.client.address}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                <span>
                  {job.status === "open"
                    ? "📸 Maak voor-foto"
                    : job.status === "before_done"
                      ? "📸 Maak na-foto"
                      : "✅ Foto's compleet"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
