import { describe, it, expect } from "vitest";
import { evaluateGeofence, type GeofenceJob, type GeofenceState } from "./geofence";

const klant = { clientId: "c1", clientName: "Bakker", lat: 52.26, lng: 6.79 };
const job = (over: Partial<GeofenceJob> = {}): GeofenceJob => ({
  jobId: "j1",
  ...klant,
  ...over,
});
const idle: GeofenceState = { nearClientId: null, promptedJobId: null };

describe("evaluateGeofence", () => {
  it("prompt_start bij binnenkomen 150m-zone van geplande klant", () => {
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.7901 }, [job()], null);
    expect(r.action).toBe("prompt_start");
    expect(r.job?.jobId).toBe("j1");
    expect(r.state).toEqual({ nearClientId: "c1", promptedJobId: "j1" });
  });

  it("geen dubbele prompt bij blijven binnen de zone", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.2601, lng: 6.7901 }, [job()], null);
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBe("c1");
  });

  it("geen start-prompt als klok al loopt op die job", () => {
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.7901 }, [job()], {
      jobId: "j1",
      entryId: "t1",
    });
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBe("c1");
  });

  it("prompt_stop bij vertrek (>300m) met lopende klok op die klant", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.27, lng: 6.81 }, [job()], {
      jobId: "j1",
      entryId: "t1",
    });
    expect(r.action).toBe("prompt_stop");
    expect(r.job?.jobId).toBe("j1");
    expect(r.state.nearClientId).toBeNull();
  });

  it("hysterese: tussen 150 en 300m verandert er niets", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    // ~200m noordelijk: 0.0018 graden latitude
    const r = evaluateGeofence(inside, { lat: 52.2618, lng: 6.79 }, [job()], {
      jobId: "j1",
      entryId: "t1",
    });
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBe("c1");
  });

  it("vertrek zonder lopende klok: state gewist, geen prompt", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.27, lng: 6.81 }, [job()], null);
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBeNull();
  });

  it("geen prompt als er geen jobs vandaag zijn", () => {
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.7901 }, [], null);
    expect(r.action).toBe("none");
  });

  it("kiest dichtstbijzijnde klant als meerdere zones overlappen", () => {
    const ver = job({ jobId: "j2", clientId: "c2", clientName: "Verre", lat: 52.2612, lng: 6.79 });
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.79 }, [ver, job()], null);
    expect(r.action).toBe("prompt_start");
    expect(r.job?.clientId).toBe("c1");
  });
});
