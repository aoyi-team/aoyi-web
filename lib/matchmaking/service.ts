import {
  extractBearerToken,
  parseCloseMatchBody,
  parseCancelMatchBody,
  parseStartMatchBody,
  parseStatusSearchParams,
  serializeMatchRpcResult,
  type MatchResponse,
  type MatchRpcResult,
} from "./contracts";
import { createEdgegapRelaySession, isEdgegapRelaySessionUsable, type EdgegapRelayConnectionInfo } from "./edgegap-relay";
import { clearCachedMatchStatus, getCachedMatchStatus, setCachedMatchStatus } from "./status-cache";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../supabase/server";

type AuthenticatedUser = {
  id: string;
};

type MatchRoomRecord = {
  id: string;
  relay_provider: string;
  relay_session_id: string | null;
  host_user_id: string;
  guest_user_id: string;
};

type MatchTicketIpRecord = {
  user_id: string;
  ip_address: string | null;
};

type RelaySessionRecord = {
  provider: "edgegap";
  provider_session_id: string;
  host_connection_info: EdgegapRelayConnectionInfo;
  guest_connection_info: EdgegapRelayConnectionInfo;
  expires_at: string;
};

type RelaySessionPayload = {
  provider: "edgegap";
  provider_session_id: string;
  host_connection_info: EdgegapRelayConnectionInfo;
  guest_connection_info: EdgegapRelayConnectionInfo;
  expires_at: string;
};

const relayProvisionPromises = new Map<string, Promise<MatchResponse>>();

export async function startMatchFromRequest(request: Request): Promise<MatchResponse> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const input = parseStartMatchBody(await request.json());
  const admin = createSupabaseAdminClient();
  const clientIp = getClientIp(request);

  const { data, error } = await admin.rpc("join_random_match", {
    p_user_id: user.id,
    p_mode: input.mode,
    p_hero_id: input.heroId,
    p_skin_id: input.skinId,
    p_match_type: input.matchType,
    p_room_code: input.roomCode ?? null,
    p_protocol_version: input.protocolVersion,
    p_ip_address: clientIp,
  });

  if (error) {
    throw new Error(error.message);
  }

  const response = serializeMatchRpcResult(firstRpcResult(data));
  return ensureEdgegapRelaySession(admin, response, clientIp);
}

export async function getMatchStatusFromRequest(request: Request): Promise<MatchResponse> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const { ticketId } = parseStatusSearchParams(new URL(request.url).searchParams);
  const admin = createSupabaseAdminClient();
  await refreshWaitingMatchTicket(admin, user.id, ticketId);

  const cached = getCachedMatchStatus(user.id, ticketId);
  if (cached) {
    return cached;
  }

  const { data, error } = await admin.rpc("get_match_status", {
    p_user_id: user.id,
    p_ticket_id: ticketId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const response = await ensureEdgegapRelaySession(
    admin,
    serializeMatchRpcResult(firstRpcResult(data)),
    getClientIp(request),
  );
  setCachedMatchStatus(user.id, ticketId, response);
  return response;
}

async function refreshWaitingMatchTicket(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ticketId: string,
): Promise<void> {
  const { error } = await admin
    .from("match_queue")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("user_id", userId)
    .eq("status", "waiting");

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelMatchFromRequest(request: Request): Promise<{ canceled: boolean; ticketId: string }> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const { ticketId } = parseCancelMatchBody(await request.json());
  const admin = createSupabaseAdminClient();
  clearCachedMatchStatus(user.id, ticketId);

  const { data, error } = await admin.rpc("cancel_random_match", {
    p_user_id: user.id,
    p_ticket_id: ticketId,
  });

  if (error) {
    throw new Error(error.message);
  }

  clearCachedMatchStatus(user.id, ticketId);
  return { canceled: Boolean(data), ticketId };
}

export async function closeMatchFromRequest(request: Request): Promise<{ closed: boolean; roomId: string }> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const { roomId } = parseCloseMatchBody(await request.json());
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("close_match_room", {
    p_user_id: user.id,
    p_room_id: roomId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { closed: Boolean(data), roomId };
}

function requireBearerToken(request: Request): string {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    throw new AuthError("Missing bearer token.");
  }

  return token;
}

async function authenticateBearerToken(accessToken: string): Promise<AuthenticatedUser> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new AuthError(error?.message ?? "Invalid bearer token.");
  }

  return { id: data.user.id };
}

function firstRpcResult(data: unknown): MatchRpcResult {
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as MatchRpcResult;
  }

  if (data && typeof data === "object") {
    return data as MatchRpcResult;
  }

  throw new Error("Match RPC returned no result.");
}

export class AuthError extends Error {}

async function ensureEdgegapRelaySession(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  response: MatchResponse,
  requestIp: string,
): Promise<MatchResponse> {
  if (response.status !== "matched" || !response.roomId) {
    return response;
  }

  const existing = relayProvisionPromises.get(response.roomId);
  if (existing) {
    return existing;
  }

  const provision = provisionEdgegapRelaySession(admin, response, requestIp)
    .finally(() => relayProvisionPromises.delete(response.roomId!));
  relayProvisionPromises.set(response.roomId, provision);
  return provision;
}

async function provisionEdgegapRelaySession(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  response: MatchResponse,
  requestIp: string,
): Promise<MatchResponse> {
  if (!response.roomId) {
    return response;
  }

  const { data: roomData, error: roomError } = await admin
    .from("match_rooms")
    .select("id, relay_provider, relay_session_id, host_user_id, guest_user_id")
    .eq("id", response.roomId)
    .single();

  if (roomError) {
    throw new Error(roomError.message);
  }

  const room = roomData as MatchRoomRecord;
  if (room.relay_provider === "edgegap" && room.relay_session_id) {
    const relaySession = await getExistingRelaySession(admin, room.relay_session_id);
    if (relaySession) {
      return {
        ...response,
        room: withEdgegapRelayPayload(response.room, room.relay_session_id, relaySession),
      };
    }
  }

  const playerIps = await getRoomPlayerIps(admin, room, requestIp);
  const relay = await createEdgegapRelaySession({
    hostIp: playerIps.hostIp,
    guestIp: playerIps.guestIp,
  });

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  let relaySessionId = room.relay_session_id;
  const relayUpdate = {
    provider: "edgegap",
    provider_session_id: relay.providerSessionId,
    host_connection_info: relay.hostConnectionInfo,
    guest_connection_info: relay.guestConnectionInfo,
    expires_at: expiresAt,
  };

  if (relaySessionId) {
    const { error } = await admin
      .from("relay_sessions")
      .update(relayUpdate)
      .eq("id", relaySessionId);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await admin
      .from("relay_sessions")
      .insert(relayUpdate)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    relaySessionId = (data as { id: string }).id;
  }

  const { error: updateRoomError } = await admin
    .from("match_rooms")
    .update({
      relay_provider: "edgegap",
      relay_session_id: relaySessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", response.roomId);

  if (updateRoomError) {
    throw new Error(updateRoomError.message);
  }

  return {
    ...response,
    room: withEdgegapRelayPayload(response.room, relaySessionId, {
      provider: "edgegap",
      provider_session_id: relay.providerSessionId,
      host_connection_info: relay.hostConnectionInfo,
      guest_connection_info: relay.guestConnectionInfo,
      expires_at: expiresAt,
    }),
  };
}

async function getExistingRelaySession(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  relaySessionId: string,
): Promise<RelaySessionPayload | null> {
  const { data, error } = await admin
    .from("relay_sessions")
    .select("provider, provider_session_id, host_connection_info, guest_connection_info, expires_at")
    .eq("id", relaySessionId)
    .single();

  if (error || !data) {
    return null;
  }

  const relay = data as RelaySessionRecord;
  if (relay.provider !== "edgegap") {
    return null;
  }

  if (relay.expires_at && Date.parse(relay.expires_at) <= Date.now()) {
    return null;
  }

  if (!relay.provider_session_id || !(await isEdgegapRelaySessionUsable(relay.provider_session_id))) {
    return null;
  }

  return {
    provider: "edgegap",
    provider_session_id: relay.provider_session_id,
    host_connection_info: relay.host_connection_info,
    guest_connection_info: relay.guest_connection_info,
    expires_at: relay.expires_at,
  };
}

async function getRoomPlayerIps(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  room: MatchRoomRecord,
  fallbackIp: string,
): Promise<{ hostIp: string; guestIp: string }> {
  const { data, error } = await admin
    .from("match_queue")
    .select("user_id, ip_address")
    .eq("room_id", room.id);

  if (error) {
    throw new Error(error.message);
  }

  const tickets = (data ?? []) as MatchTicketIpRecord[];
  const hostIp = tickets.find((ticket) => ticket.user_id === room.host_user_id)?.ip_address;
  const guestIp = tickets.find((ticket) => ticket.user_id === room.guest_user_id)?.ip_address;

  return {
    hostIp: normalizeIp(hostIp ?? fallbackIp),
    guestIp: normalizeIp(guestIp ?? fallbackIp),
  };
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return normalizeIp(forwardedFor || realIp || cfIp || "1.1.1.1");
}

function normalizeIp(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "1.1.1.1";
  }

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice("::ffff:".length);
  }

  return trimmed;
}

function withEdgegapRelayPayload(
  room: unknown,
  relaySessionId: string | null,
  relaySession: RelaySessionPayload,
): Record<string, unknown> {
  const base = isRecord(room) ? room : {};
  return {
    ...base,
    relay_provider: "edgegap",
    relay_session_id: relaySessionId,
    relay_session: relaySession,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
