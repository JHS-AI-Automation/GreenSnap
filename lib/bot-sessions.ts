interface BotSession {
  step: "idle" | "waiting_type" | "waiting_client" | "collecting_photos";
  photoFileIds: string[];
  photoType: "before" | "after" | null;
  clientId: string | null;
  clientName: string | null;
  timestamp: number;
}

const sessions = new Map<number, BotSession>();

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export function getSession(chatId: number): BotSession {
  const existing = sessions.get(chatId);
  if (existing && Date.now() - existing.timestamp < SESSION_TIMEOUT_MS) {
    return existing;
  }
  const fresh: BotSession = {
    step: "idle",
    photoFileIds: [],
    photoType: null,
    clientId: null,
    clientName: null,
    timestamp: Date.now(),
  };
  sessions.set(chatId, fresh);
  return fresh;
}

export function updateSession(chatId: number, update: Partial<BotSession>) {
  const session = getSession(chatId);
  Object.assign(session, update, { timestamp: Date.now() });
  sessions.set(chatId, session);
}

export function clearSession(chatId: number) {
  sessions.delete(chatId);
}
