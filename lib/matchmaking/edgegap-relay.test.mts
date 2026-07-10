import assert from "node:assert/strict";
import test from "node:test";
import { createEdgegapRelaySession } from "./edgegap-relay.ts";

test("creates an Edgegap relay session and maps host and guest credentials", async () => {
  const originalToken = process.env.EDGEGAP_RELAY_TOKEN;
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  process.env.EDGEGAP_RELAY_TOKEN = "test-relay-token";
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({ url, init });

    if (init?.method === "POST") {
      assert.deepEqual(JSON.parse(String(init.body)), {
        users: [{ ip: "203.0.113.10" }, { ip: "203.0.113.11" }],
      });

      return jsonResponse({
        session_id: "relay-session-a",
        authorization_token: null,
        status: "Creating",
        ready: false,
        linked: false,
        error: null,
        session_users: [],
        relay: null,
      });
    }

    return jsonResponse({
      session_id: "relay-session-a",
      authorization_token: 22222222,
      status: "Ready",
      ready: true,
      linked: true,
      error: null,
      session_users: [
        { ip_address: "203.0.113.11", authorization_token: 33333333 },
        { ip_address: "203.0.113.10", authorization_token: 11111111 },
      ],
      relay: {
        ip: "198.51.100.7",
        host: "relay.example.edgegap.net",
        ports: {
          server: { port: 30000, protocol: "UDP", link: "server" },
          client: { port: 30001, protocol: "UDP", link: "client" },
        },
      },
    });
  };

  try {
    const relay = await createEdgegapRelaySession({
      hostIp: "203.0.113.10",
      guestIp: "203.0.113.11",
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "https://api.edgegap.com/v1/relays/sessions");
    assert.equal(requests[1].url, "https://api.edgegap.com/v1/relays/sessions/relay-session-a");
    assert.equal((requests[0].init?.headers as Record<string, string>).Authorization, "token test-relay-token");
    assert.equal(relay.providerSessionId, "relay-session-a");
    assert.equal(relay.hostConnectionInfo.session_token, 22222222);
    assert.equal(relay.hostConnectionInfo.user_token, 11111111);
    assert.equal(relay.guestConnectionInfo.user_token, 33333333);
    assert.equal(relay.hostConnectionInfo.relay_server_port, 30000);
    assert.equal(relay.guestConnectionInfo.relay_client_port, 30001);
  } finally {
    if (originalToken === undefined) {
      delete process.env.EDGEGAP_RELAY_TOKEN;
    } else {
      process.env.EDGEGAP_RELAY_TOKEN = originalToken;
    }
    globalThis.fetch = originalFetch;
  }
});

test("uses the active authorization token when players share one public IP", async () => {
  const originalToken = process.env.EDGEGAP_RELAY_TOKEN;
  const originalFetch = globalThis.fetch;

  process.env.EDGEGAP_RELAY_TOKEN = "test-relay-token";
  globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (init?.method === "POST") {
      return jsonResponse({
        session_id: "relay-session-same-ip",
        authorization_token: null,
        status: "Creating",
        ready: false,
        linked: false,
        error: null,
        session_users: [],
        relay: null,
      });
    }

    return jsonResponse({
      session_id: "relay-session-same-ip",
      authorization_token: 22222222,
      status: "Ready",
      ready: true,
      linked: true,
      error: null,
      session_users: [
        { ip_address: "203.0.113.10", authorization_token: 11111111 },
        { ip_address: "203.0.113.10", authorization_token: 33333333 },
      ],
      relay: {
        ip: "198.51.100.7",
        host: "relay.example.edgegap.net",
        ports: {
          server: { port: 30000, protocol: "UDP", link: "server" },
          client: { port: 30001, protocol: "UDP", link: "client" },
        },
      },
    });
  };

  try {
    const relay = await createEdgegapRelaySession({
      hostIp: "203.0.113.10",
      guestIp: "203.0.113.10",
    });

    assert.equal(relay.hostConnectionInfo.user_token, 33333333);
    assert.equal(relay.guestConnectionInfo.user_token, 33333333);
  } finally {
    if (originalToken === undefined) {
      delete process.env.EDGEGAP_RELAY_TOKEN;
    } else {
      process.env.EDGEGAP_RELAY_TOKEN = originalToken;
    }
    globalThis.fetch = originalFetch;
  }
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
