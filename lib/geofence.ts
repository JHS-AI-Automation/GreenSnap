import { haversineDistance } from "./matching";
import { GEOFENCE_ENTER_METERS, GEOFENCE_EXIT_METERS } from "./constants";

export interface GeofenceJob {
  jobId: string;
  clientId: string;
  clientName: string;
  lat: number;
  lng: number;
}

export interface GeofenceState {
  nearClientId: string | null;
  promptedJobId: string | null;
}

export interface RunningClock {
  jobId: string;
  entryId: string;
}

export type GeofenceAction = "none" | "prompt_start" | "prompt_stop";

export interface GeofenceResult {
  action: GeofenceAction;
  // bij prompt_start: de te starten job; bij prompt_stop: de job van de lopende klok
  job: GeofenceJob | null;
  state: GeofenceState;
}

// Pure statemachine: vorige geofence-state + nieuwe positie + jobs van vandaag
// + lopende klok -> actie en nieuwe state. Enter op 150m, exit op 300m (hysterese
// voorkomt prompt-spam op de zonegrens). Stuurt alleen prompts, start/stopt nooit zelf.
export function evaluateGeofence(
  prev: GeofenceState,
  pos: { lat: number; lng: number },
  todaysJobs: GeofenceJob[],
  running: RunningClock | null
): GeofenceResult {
  // Binnen een zone: pas bij overschrijden van de EXIT-drempel is er vertrek
  if (prev.nearClientId) {
    const current = todaysJobs.find((j) => j.clientId === prev.nearClientId);
    const dist = current
      ? haversineDistance(pos.lat, pos.lng, current.lat, current.lng)
      : Infinity;

    if (dist <= GEOFENCE_EXIT_METERS) {
      return { action: "none", job: null, state: prev };
    }

    const left: GeofenceState = { nearClientId: null, promptedJobId: prev.promptedJobId };
    if (running && current && running.jobId === current.jobId) {
      return { action: "prompt_stop", job: current, state: left };
    }
    return { action: "none", job: null, state: left };
  }

  // Buiten alle zones: check binnenkomst met ENTER-drempel, dichtstbijzijnde wint
  let nearest: GeofenceJob | null = null;
  let minDist = Infinity;
  for (const j of todaysJobs) {
    const d = haversineDistance(pos.lat, pos.lng, j.lat, j.lng);
    if (d <= GEOFENCE_ENTER_METERS && d < minDist) {
      minDist = d;
      nearest = j;
    }
  }
  if (!nearest) return { action: "none", job: null, state: prev };

  const state: GeofenceState = {
    nearClientId: nearest.clientId,
    promptedJobId: nearest.jobId,
  };
  const alreadyRunning = running?.jobId === nearest.jobId;
  const alreadyPrompted = prev.promptedJobId === nearest.jobId;
  if (alreadyRunning || alreadyPrompted) {
    return { action: "none", job: null, state };
  }
  return { action: "prompt_start", job: nearest, state };
}
