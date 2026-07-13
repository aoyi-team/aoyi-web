export type MatchType = "random" | "friend";
export type MatchStatus = "waiting" | "matched" | "canceled" | "expired" | "closed";
export type MatchRole = "host" | "guest" | null;

export type StartMatchInput = {
  mode: string;
  heroId: number;
  skinId: number;
  matchType: MatchType;
  protocolVersion: number;
  roomCode?: string;
};

export type CloseMatchInput = {
  roomId: string;
};

export type MatchRpcResult = {
  status: MatchStatus;
  ticket_id: string;
  room_id: string | null;
  role: MatchRole;
  room?: unknown;
};

export type MatchResponse = {
  status: MatchStatus;
  ticketId: string;
  roomId: string | null;
  role: MatchRole;
  room: unknown | null;
};

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export function parseStartMatchBody(body: unknown): StartMatchInput {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }

  const mode = typeof body.mode === "string" ? body.mode.trim() : "";
  if (!mode) {
    throw new Error("mode is required");
  }

  const heroId = toPositiveInteger(body.heroId, "heroId");
  const skinId = toPositiveInteger(body.skinId, "skinId");
  const protocolVersion =
    body.protocolVersion === undefined ? 1 : toPositiveInteger(body.protocolVersion, "protocolVersion");

  const matchType = body.matchType === undefined ? "random" : body.matchType;
  if (matchType !== "random" && matchType !== "friend") {
    throw new Error("matchType must be random or friend");
  }

  const input: StartMatchInput = {
    mode,
    heroId,
    skinId,
    matchType,
    protocolVersion,
  };

  if (typeof body.roomCode === "string" && body.roomCode.trim()) {
    input.roomCode = body.roomCode.trim().toUpperCase();
  }

  return input;
}

export function parseCancelMatchBody(body: unknown): { ticketId: string } {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }

  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  if (!ticketId) {
    throw new Error("ticketId is required");
  }

  return { ticketId };
}

export function parseCloseMatchBody(body: unknown): CloseMatchInput {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }

  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
  if (!roomId) {
    throw new Error("roomId is required");
  }

  return { roomId };
}

export function parseStatusSearchParams(searchParams: URLSearchParams): { ticketId: string } {
  const ticketId = searchParams.get("ticketId")?.trim() ?? "";
  if (!ticketId) {
    throw new Error("ticketId is required");
  }

  return { ticketId };
}

export function serializeMatchRpcResult(result: MatchRpcResult): MatchResponse {
  return {
    status: result.status,
    ticketId: result.ticket_id,
    roomId: result.room_id,
    role: result.role,
    room: result.room ?? null,
  };
}

function toPositiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }

  return value as number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
