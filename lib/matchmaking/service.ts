import {
  extractBearerToken,
  parseCancelMatchBody,
  parseStartMatchBody,
  parseStatusSearchParams,
  serializeMatchRpcResult,
  type MatchResponse,
  type MatchRpcResult,
} from "./contracts";
import { clearCachedMatchStatus, getCachedMatchStatus, setCachedMatchStatus } from "./status-cache";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../supabase/server";

type AuthenticatedUser = {
  id: string;
};

export async function startMatchFromRequest(request: Request): Promise<MatchResponse> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const input = parseStartMatchBody(await request.json());
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("join_random_match", {
    p_user_id: user.id,
    p_mode: input.mode,
    p_hero_id: input.heroId,
    p_skin_id: input.skinId,
    p_match_type: input.matchType,
    p_room_code: input.roomCode ?? null,
    p_protocol_version: input.protocolVersion,
  });

  if (error) {
    throw new Error(error.message);
  }

  return serializeMatchRpcResult(firstRpcResult(data));
}

export async function getMatchStatusFromRequest(request: Request): Promise<MatchResponse> {
  const token = requireBearerToken(request);
  const user = await authenticateBearerToken(token);
  const { ticketId } = parseStatusSearchParams(new URL(request.url).searchParams);
  const cached = getCachedMatchStatus(user.id, ticketId);
  if (cached) {
    return cached;
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("get_match_status", {
    p_user_id: user.id,
    p_ticket_id: ticketId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const response = serializeMatchRpcResult(firstRpcResult(data));
  setCachedMatchStatus(user.id, ticketId, response);
  return response;
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
