import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAllCachedMatchStatuses,
  clearCachedMatchStatus,
  getCachedMatchStatus,
  setCachedMatchStatus,
} from "./status-cache.ts";

test("caches waiting status briefly per user and ticket", () => {
  clearAllCachedMatchStatuses();

  const response = {
    status: "waiting" as const,
    ticketId: "ticket-a",
    roomId: null,
    role: null,
    room: null,
  };

  setCachedMatchStatus("user-a", "ticket-a", response, 1000);

  assert.equal(getCachedMatchStatus("user-a", "ticket-a", 2000), response);
  assert.equal(getCachedMatchStatus("user-b", "ticket-a", 2000), null);
  assert.equal(getCachedMatchStatus("user-a", "ticket-a", 2600), null);
});

test("caches matched status long enough for duplicate completion polls", () => {
  clearAllCachedMatchStatuses();

  const response = {
    status: "matched" as const,
    ticketId: "ticket-b",
    roomId: "room-b",
    role: "host" as const,
    room: { id: "room-b" },
  };

  setCachedMatchStatus("user-a", "ticket-b", response, 1000);

  assert.equal(getCachedMatchStatus("user-a", "ticket-b", 9000), response);
  assert.equal(getCachedMatchStatus("user-a", "ticket-b", 12000), null);
});

test("clears cached match status on demand", () => {
  clearAllCachedMatchStatuses();

  const response = {
    status: "waiting" as const,
    ticketId: "ticket-c",
    roomId: null,
    role: null,
    room: null,
  };

  setCachedMatchStatus("user-a", "ticket-c", response, 1000);
  clearCachedMatchStatus("user-a", "ticket-c");

  assert.equal(getCachedMatchStatus("user-a", "ticket-c", 1001), null);
});
