// Status badge config shared between dashboard and job detail.

import type { JobStatus } from "./constants";

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  open: { label: "Wacht op foto's", bg: "bg-gray-100", text: "text-gray-700" },
  before_done: { label: "Voor-foto ontvangen", bg: "bg-yellow-50", text: "text-yellow-800" },
  photos_complete: { label: "Foto's compleet", bg: "bg-green-50", text: "text-green-800" },
  report_ready: { label: "Rapport klaar", bg: "bg-blue-50", text: "text-blue-800" },
  sent: { label: "Verstuurd", bg: "bg-gray-50", text: "text-gray-500" },
};

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status as JobStatus] ?? {
      label: status,
      bg: "bg-gray-100",
      text: "text-gray-700",
    }
  );
}
