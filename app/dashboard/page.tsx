"use client";

import { useState } from "react";
import Link from "next/link";

interface DemoJob {
  id: string;
  clientName: string;
  address: string;
  worker: string;
  status: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
  scheduledDate: string;
}

const DEMO_JOBS: DemoJob[] = [
  {
    id: "aaa11111",
    clientName: "Fam. Smit",
    address: "Brinkstraat 15, Hengelo",
    worker: "Piet Bakker",
    status: "open",
    beforePhoto: null,
    afterPhoto: null,
    scheduledDate: new Date().toISOString().split("T")[0],
  },
  {
    id: "bbb22222",
    clientName: "Kantoor De Brinck",
    address: "Marktstraat 8, Hengelo",
    worker: "Piet Bakker",
    status: "before_done",
    beforePhoto: "/demo-before.jpg",
    afterPhoto: null,
    scheduledDate: new Date().toISOString().split("T")[0],
  },
  {
    id: "ccc33333",
    clientName: "Fam. De Groot",
    address: "Deldenerstraat 42, Hengelo",
    worker: "Kees Jansen",
    status: "photos_complete",
    beforePhoto: "/demo-before.jpg",
    afterPhoto: "/demo-after.jpg",
    scheduledDate: new Date().toISOString().split("T")[0],
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  open: {
    label: "Wacht op foto's",
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  before_done: {
    label: "Voor-foto ontvangen",
    color: "text-yellow-800",
    bg: "bg-yellow-50",
  },
  photos_complete: {
    label: "Foto's compleet",
    color: "text-green-800",
    bg: "bg-green-50",
  },
  report_ready: {
    label: "Rapport klaar",
    color: "text-blue-800",
    bg: "bg-blue-50",
  },
  sent: {
    label: "Verstuurd",
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
};

export default function DashboardPage() {
  const [jobs] = useState(DEMO_JOBS);

  const stats = {
    total: jobs.length,
    waiting: jobs.filter((j) => j.status === "open").length,
    inProgress: jobs.filter(
      (j) => j.status === "before_done" || j.status === "photos_complete"
    ).length,
    done: jobs.filter(
      (j) => j.status === "report_ready" || j.status === "sent"
    ).length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overzicht</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-gray-400">
            {stats.waiting}
          </div>
          <div className="text-sm text-gray-500 mt-1">Wachtend</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {stats.inProgress}
          </div>
          <div className="text-sm text-gray-500 mt-1">Bezig</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
          <div className="text-sm text-gray-500 mt-1">Klaar</div>
        </div>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const statusConfig = STATUS_CONFIG[job.status];
          return (
            <Link
              key={job.id}
              href={`/dashboard/job/${job.id}`}
              className="block bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{job.clientName}</h2>
                  <p className="text-sm text-gray-500">{job.address}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Medewerker: {job.worker}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              {/* Photo thumbnails */}
              <div className="mt-3 flex gap-3">
                <div
                  className={`w-20 h-20 rounded-lg flex items-center justify-center text-xs ${
                    job.beforePhoto
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {job.beforePhoto ? "VOOR ✓" : "VOOR -"}
                </div>
                <div
                  className={`w-20 h-20 rounded-lg flex items-center justify-center text-xs ${
                    job.afterPhoto
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {job.afterPhoto ? "NA ✓" : "NA -"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
