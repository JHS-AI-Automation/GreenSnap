import { getServerClient } from "./supabase";
import type { TimeEntry, TimeEntrySource } from "@/types/database";

const supabase = getServerClient();

export interface TodayJob {
  id: string;
  sort_order: number;
  status: string;
  client: { id: string; name: string; address: string; lat: number; lng: number };
}

export async function getTodaysJobs(userId: string, tenantId: string): Promise<TodayJob[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("jobs")
    .select("id, sort_order, status, client:clients(id, name, address, lat, lng)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("scheduled_date", today)
    .order("sort_order");
  if (error) {
    console.error("[clock-db] getTodaysJobs:", error);
    return [];
  }
  return (data ?? []) as unknown as TodayJob[];
}

export async function getRunningEntry(userId: string): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .is("stopped_at", null)
    .maybeSingle();
  if (error) {
    console.error("[clock-db] getRunningEntry:", error);
    return null;
  }
  return data as TimeEntry | null;
}

// Start klok; stopt automatisch een eventueel lopende entry.
// Idempotent: nogmaals starten op dezelfde job geeft 'already_running'.
export async function startClock(
  userId: string,
  tenantId: string,
  jobId: string,
  source: TimeEntrySource
): Promise<{ entry: TimeEntry; stopped: TimeEntry | null } | { error: string }> {
  const running = await getRunningEntry(userId);
  if (running?.job_id === jobId) return { error: "already_running" };

  let stopped: TimeEntry | null = null;
  if (running) {
    const result = await stopClock(running.id);
    if ("error" in result) return result;
    stopped = result.entry;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({ user_id: userId, tenant_id: tenantId, job_id: jobId, source })
    .select()
    .single();
  if (error) {
    console.error("[clock-db] startClock:", error);
    return { error: error.message };
  }
  return { entry: data as TimeEntry, stopped };
}

export async function stopClock(entryId: string): Promise<{ entry: TimeEntry } | { error: string }> {
  const { data, error } = await supabase
    .from("time_entries")
    .update({ stopped_at: new Date().toISOString() })
    .eq("id", entryId)
    .is("stopped_at", null)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[clock-db] stopClock:", error);
    return { error: error.message };
  }
  if (!data) return { error: "not_running" };
  return { entry: data as TimeEntry };
}
