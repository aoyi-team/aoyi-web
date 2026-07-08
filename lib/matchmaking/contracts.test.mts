import assert from "node:assert/strict";
import test from "node:test";
import {
  extractBearerToken,
  parseCancelMatchBody,
  parseStartMatchBody,
  serializeMatchRpcResult,
} from "./contracts.ts";

test("extracts bearer token from Authorization header", () => {
  assert.equal(extractBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(extractBearerToken("bearer token"), "token");
  assert.equal(extractBearerToken(null), null);
  assert.equal(extractBearerToken("Basic abc"), null);
});

test("parses a valid random 1v1 match request", () => {
  const parsed = parseStartMatchBody({
    mode: " dantiao ",
    heroId: 101,
    skinId: 1,
    protocolVersion: 2,
  });

  assert.deepEqual(parsed, {
    mode: "dantiao",
    heroId: 101,
    skinId: 1,
    matchType: "random",
    protocolVersion: 2,
  });
});

test("rejects invalid match request values", () => {
  assert.throws(
    () => parseStartMatchBody({ mode: "", heroId: 101, skinId: 1 }),
    /mode is required/,
  );
  assert.throws(
    () => parseStartMatchBody({ mode: "dantiao", heroId: 0, skinId: 1 }),
    /heroId must be a positive integer/,
  );
  assert.throws(
    () => parseStartMatchBody({ mode: "dantiao", heroId: 101, skinId: 0 }),
    /skinId must be a positive integer/,
  );
});

test("parses cancel match request", () => {
  assert.deepEqual(parseCancelMatchBody({ ticketId: "abc" }), { ticketId: "abc" });
  assert.throws(() => parseCancelMatchBody({ ticketId: "" }), /ticketId is required/);
});

test("serializes RPC waiting and matched results for Unity", () => {
  assert.deepEqual(
    serializeMatchRpcResult({
      status: "waiting",
      ticket_id: "ticket-a",
      room_id: null,
      role: null,
    }),
    {
      status: "waiting",
      ticketId: "ticket-a",
      roomId: null,
      role: null,
      room: null,
    },
  );

  assert.deepEqual(
    serializeMatchRpcResult({
      status: "matched",
      ticket_id: "ticket-b",
      room_id: "room-1",
      role: "guest",
      room: {
        id: "room-1",
        mode: "dantiao",
        host_user_id: "host",
        guest_user_id: "guest",
      },
    }),
    {
      status: "matched",
      ticketId: "ticket-b",
      roomId: "room-1",
      role: "guest",
      room: {
        id: "room-1",
        mode: "dantiao",
        host_user_id: "host",
        guest_user_id: "guest",
      },
    },
  );
});
