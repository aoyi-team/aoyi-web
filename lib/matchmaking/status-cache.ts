import type { MatchResponse } from "./contracts";

const WAITING_STATUS_TTL_MS = 1500;
const TERMINAL_STATUS_TTL_MS = 10000;
const MAX_CACHE_ENTRIES = 256;

type CacheEntry = {
  expiresAt: number;
  value: MatchResponse;
};

const statusCache = new Map<string, CacheEntry>();

export function getCachedMatchStatus(userId: string, ticketId: string, now = Date.now()): MatchResponse | null {
  const key = makeStatusCacheKey(userId, ticketId);
  const entry = statusCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    statusCache.delete(key);
    return null;
  }

  return entry.value;
}

export function setCachedMatchStatus(userId: string, ticketId: string, value: MatchResponse, now = Date.now()): void {
  pruneExpiredEntries(now);
  if (statusCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = statusCache.keys().next().value;
    if (oldestKey) {
      statusCache.delete(oldestKey);
    }
  }

  statusCache.set(makeStatusCacheKey(userId, ticketId), {
    expiresAt: now + getStatusTtl(value.status),
    value,
  });
}

export function clearCachedMatchStatus(userId: string, ticketId: string): void {
  statusCache.delete(makeStatusCacheKey(userId, ticketId));
}

export function clearAllCachedMatchStatuses(): void {
  statusCache.clear();
}

function makeStatusCacheKey(userId: string, ticketId: string): string {
  return `${userId}:${ticketId}`;
}

function getStatusTtl(status: MatchResponse["status"]): number {
  return status === "waiting" ? WAITING_STATUS_TTL_MS : TERMINAL_STATUS_TTL_MS;
}

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of statusCache) {
    if (entry.expiresAt <= now) {
      statusCache.delete(key);
    }
  }
}
