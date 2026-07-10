export type EdgegapRelayConnectionInfo = {
  provider: "edgegap";
  session_id: string;
  session_token: number;
  user_token: number;
  relay_host: string;
  relay_ip: string;
  relay_server_port: number;
  relay_client_port: number;
};

type EdgegapRelaySessionResponse = {
  session_id: string;
  authorization_token: number | null;
  status: string;
  ready: boolean;
  linked: boolean;
  error: string | null;
  session_users: Array<{
    ip_address: string;
    authorization_token: number | null;
  }>;
  relay: null | {
    ip: string;
    host: string;
    ports: {
      server: {
        port: number;
        protocol: string;
        link: string;
      };
      client: {
        port: number;
        protocol: string;
        link: string;
      };
    };
  };
};

export type CreateRelaySessionInput = {
  hostIp: string;
  guestIp: string;
};

export type CreatedRelaySession = {
  providerSessionId: string;
  hostConnectionInfo: EdgegapRelayConnectionInfo;
  guestConnectionInfo: EdgegapRelayConnectionInfo;
};

const EDGEGAP_RELAY_API_BASE_URL = "https://api.edgegap.com/v1";
const RELAY_READY_POLL_ATTEMPTS = 8;
const RELAY_READY_POLL_DELAY_MS = 1000;

export async function createEdgegapRelaySession(input: CreateRelaySessionInput): Promise<CreatedRelaySession> {
  const token = process.env.EDGEGAP_RELAY_TOKEN;
  if (!token) {
    throw new Error("Missing EDGEGAP_RELAY_TOKEN environment variable.");
  }

  const created = await edgegapRequest<EdgegapRelaySessionResponse>("/relays/sessions", token, {
    method: "POST",
    body: JSON.stringify({
      users: [
        { ip: input.hostIp },
        { ip: input.guestIp },
      ],
    }),
  });

  const ready = await waitForRelayReady(created.session_id, token);
  return mapReadyRelaySession(ready);
}

export async function isEdgegapRelaySessionUsable(sessionId: string): Promise<boolean> {
  const token = process.env.EDGEGAP_RELAY_TOKEN;
  if (!token) {
    throw new Error("Missing EDGEGAP_RELAY_TOKEN environment variable.");
  }

  try {
    const session = await edgegapRequest<EdgegapRelaySessionResponse>(`/relays/sessions/${sessionId}`, token);
    return Boolean(session.ready && session.linked && session.relay && !session.error);
  } catch {
    return false;
  }
}

async function waitForRelayReady(sessionId: string, token: string): Promise<EdgegapRelaySessionResponse> {
  for (let attempt = 0; attempt < RELAY_READY_POLL_ATTEMPTS; attempt += 1) {
    const session = await edgegapRequest<EdgegapRelaySessionResponse>(`/relays/sessions/${sessionId}`, token);

    if (session.ready && session.linked && session.relay && session.authorization_token !== null) {
      return session;
    }

    if (session.error) {
      throw new Error(`Edgegap relay session failed: ${session.error}`);
    }

    await delay(RELAY_READY_POLL_DELAY_MS);
  }

  throw new Error("Timed out waiting for Edgegap relay session.");
}

async function edgegapRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${EDGEGAP_RELAY_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `token ${token.trim()}`,
      ...init.headers,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Edgegap relay API failed (${response.status}): ${text}`);
  }

  return JSON.parse(text) as T;
}

function mapReadyRelaySession(session: EdgegapRelaySessionResponse): CreatedRelaySession {
  if (!session.relay || session.authorization_token === null) {
    throw new Error("Edgegap relay session is not ready.");
  }

  const hostUser = session.session_users[0];
  const guestUser = session.session_users[1];
  if (!hostUser?.authorization_token || !guestUser?.authorization_token) {
    throw new Error("Edgegap relay session did not return player authorization tokens.");
  }

  const base = {
    provider: "edgegap" as const,
    session_id: session.session_id,
    session_token: session.authorization_token,
    relay_host: session.relay.host,
    relay_ip: session.relay.ip,
    relay_server_port: session.relay.ports.server.port,
    relay_client_port: session.relay.ports.client.port,
  };

  return {
    providerSessionId: session.session_id,
    hostConnectionInfo: {
      ...base,
      user_token: hostUser.authorization_token,
    },
    guestConnectionInfo: {
      ...base,
      user_token: guestUser.authorization_token,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
