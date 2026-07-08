-- 1v1 online matchmaking state.
-- Relay integration is intentionally mocked at this phase; real provider data can
-- replace relay_sessions rows without changing Unity's match API contract.

CREATE TABLE IF NOT EXISTS public.relay_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mock' CHECK (provider IN ('mock', 'edgegap', 'unity', 'eos')),
  provider_session_id text,
  host_connection_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  guest_connection_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.relay_sessions IS 'Relay session records for online 1v1 rooms';

CREATE TABLE IF NOT EXISTS public.match_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  match_type text NOT NULL DEFAULT 'random' CHECK (match_type IN ('random', 'friend')),
  room_code text,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_hero_id integer NOT NULL CHECK (host_hero_id > 0),
  guest_hero_id integer NOT NULL CHECK (guest_hero_id > 0),
  host_skin_id integer NOT NULL CHECK (host_skin_id > 0),
  guest_skin_id integer NOT NULL CHECK (guest_skin_id > 0),
  status text NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'playing', 'closed', 'canceled')),
  relay_provider text NOT NULL DEFAULT 'mock' CHECK (relay_provider IN ('mock', 'edgegap', 'unity', 'eos')),
  relay_session_id uuid REFERENCES public.relay_sessions(id) ON DELETE SET NULL,
  protocol_version integer NOT NULL DEFAULT 1 CHECK (protocol_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.match_rooms IS 'Matched online 1v1 rooms';

CREATE TABLE IF NOT EXISTS public.match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  hero_id integer NOT NULL CHECK (hero_id > 0),
  skin_id integer NOT NULL CHECK (skin_id > 0),
  match_type text NOT NULL DEFAULT 'random' CHECK (match_type IN ('random', 'friend')),
  room_code text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'canceled', 'expired')),
  room_id uuid REFERENCES public.match_rooms(id) ON DELETE SET NULL,
  protocol_version integer NOT NULL DEFAULT 1 CHECK (protocol_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.match_queue IS 'Online 1v1 matchmaking tickets';

CREATE UNIQUE INDEX IF NOT EXISTS match_queue_one_active_ticket_per_user
  ON public.match_queue(user_id)
  WHERE status IN ('waiting', 'matched');

CREATE INDEX IF NOT EXISTS match_queue_waiting_lookup
  ON public.match_queue(mode, match_type, protocol_version, status, created_at);

CREATE INDEX IF NOT EXISTS match_rooms_player_lookup
  ON public.match_rooms(host_user_id, guest_user_id, status);

ALTER TABLE public.relay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own match tickets"
  ON public.match_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own match rooms"
  ON public.match_rooms FOR SELECT
  USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Users can read own relay sessions"
  ON public.relay_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.match_rooms r
      WHERE r.relay_session_id = relay_sessions.id
        AND (r.host_user_id = auth.uid() OR r.guest_user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.match_room_payload(p_room_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'mode', r.mode,
    'match_type', r.match_type,
    'room_code', r.room_code,
    'host_user_id', r.host_user_id,
    'guest_user_id', r.guest_user_id,
    'host_hero_id', r.host_hero_id,
    'guest_hero_id', r.guest_hero_id,
    'host_skin_id', r.host_skin_id,
    'guest_skin_id', r.guest_skin_id,
    'status', r.status,
    'relay_provider', r.relay_provider,
    'relay_session_id', r.relay_session_id,
    'relay_session', CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'provider', s.provider,
        'provider_session_id', s.provider_session_id,
        'host_connection_info', s.host_connection_info,
        'guest_connection_info', s.guest_connection_info,
        'expires_at', s.expires_at
      )
    END,
    'protocol_version', r.protocol_version,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  )
  FROM public.match_rooms r
  LEFT JOIN public.relay_sessions s ON s.id = r.relay_session_id
  WHERE r.id = p_room_id;
$$;

CREATE OR REPLACE FUNCTION public.join_random_match(
  p_user_id uuid,
  p_mode text,
  p_hero_id integer,
  p_skin_id integer,
  p_match_type text DEFAULT 'random',
  p_room_code text DEFAULT NULL,
  p_protocol_version integer DEFAULT 1
)
RETURNS TABLE(status text, ticket_id uuid, room_id uuid, role text, room jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.match_queue%ROWTYPE;
  v_opponent public.match_queue%ROWTYPE;
  v_ticket_id uuid;
  v_relay_session_id uuid;
  v_room_id uuid;
  v_room_code text;
BEGIN
  IF p_mode IS NULL OR btrim(p_mode) = '' THEN
    RAISE EXCEPTION 'mode is required';
  END IF;

  IF p_hero_id <= 0 OR p_skin_id <= 0 OR p_protocol_version <= 0 THEN
    RAISE EXCEPTION 'heroId, skinId and protocolVersion must be positive';
  END IF;

  IF p_match_type NOT IN ('random', 'friend') THEN
    RAISE EXCEPTION 'matchType must be random or friend';
  END IF;

  v_room_code := NULLIF(upper(btrim(COALESCE(p_room_code, ''))), '');

  UPDATE public.match_queue q
  SET status = 'expired', updated_at = now()
  WHERE q.status = 'waiting'
    AND q.updated_at < now() - interval '90 seconds';

  SELECT q.*
  INTO v_existing
  FROM public.match_queue q
  WHERE q.user_id = p_user_id
    AND q.status IN ('waiting', 'matched')
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.status = 'matched' AND v_existing.room_id IS NOT NULL THEN
      RETURN QUERY
      SELECT
        'matched'::text,
        v_existing.id,
        v_existing.room_id,
        CASE
          WHEN r.host_user_id = p_user_id THEN 'host'
          WHEN r.guest_user_id = p_user_id THEN 'guest'
          ELSE NULL
        END::text,
        public.match_room_payload(v_existing.room_id)
      FROM public.match_rooms r
      WHERE r.id = v_existing.room_id;
      RETURN;
    END IF;

    RETURN QUERY SELECT 'waiting'::text, v_existing.id, NULL::uuid, NULL::text, NULL::jsonb;
    RETURN;
  END IF;

  SELECT q.*
  INTO v_opponent
  FROM public.match_queue q
  WHERE q.status = 'waiting'
    AND q.user_id <> p_user_id
    AND q.mode = btrim(p_mode)
    AND q.match_type = p_match_type
    AND q.protocol_version = p_protocol_version
    AND (
      p_match_type = 'random'
      OR (v_room_code IS NOT NULL AND q.room_code = v_room_code)
    )
  ORDER BY q.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.relay_sessions (provider)
    VALUES ('mock')
    RETURNING id INTO v_relay_session_id;

    INSERT INTO public.match_rooms (
      mode,
      match_type,
      room_code,
      host_user_id,
      guest_user_id,
      host_hero_id,
      guest_hero_id,
      host_skin_id,
      guest_skin_id,
      relay_provider,
      relay_session_id,
      protocol_version
    )
    VALUES (
      btrim(p_mode),
      p_match_type,
      COALESCE(v_opponent.room_code, v_room_code),
      v_opponent.user_id,
      p_user_id,
      v_opponent.hero_id,
      p_hero_id,
      v_opponent.skin_id,
      p_skin_id,
      'mock',
      v_relay_session_id,
      p_protocol_version
    )
    RETURNING id INTO v_room_id;

    INSERT INTO public.match_queue (
      user_id,
      mode,
      hero_id,
      skin_id,
      match_type,
      room_code,
      status,
      room_id,
      protocol_version
    )
    VALUES (
      p_user_id,
      btrim(p_mode),
      p_hero_id,
      p_skin_id,
      p_match_type,
      v_room_code,
      'matched',
      v_room_id,
      p_protocol_version
    )
    RETURNING id INTO v_ticket_id;

    UPDATE public.match_queue q
    SET status = 'matched', room_id = v_room_id, updated_at = now()
    WHERE q.id = v_opponent.id;

    RETURN QUERY
    SELECT
      'matched'::text,
      v_ticket_id,
      v_room_id,
      'guest'::text,
      public.match_room_payload(v_room_id);
    RETURN;
  END IF;

  INSERT INTO public.match_queue (
    user_id,
    mode,
    hero_id,
    skin_id,
    match_type,
    room_code,
    status,
    protocol_version
  )
  VALUES (
    p_user_id,
    btrim(p_mode),
    p_hero_id,
    p_skin_id,
    p_match_type,
    v_room_code,
    'waiting',
    p_protocol_version
  )
  RETURNING id INTO v_ticket_id;

  RETURN QUERY SELECT 'waiting'::text, v_ticket_id, NULL::uuid, NULL::text, NULL::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_match_status(
  p_user_id uuid,
  p_ticket_id uuid
)
RETURNS TABLE(status text, ticket_id uuid, room_id uuid, role text, room jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.match_queue%ROWTYPE;
BEGIN
  SELECT q.*
  INTO v_ticket
  FROM public.match_queue q
  WHERE q.id = p_ticket_id
    AND q.user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'match ticket not found';
  END IF;

  IF v_ticket.status = 'matched' AND v_ticket.room_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'matched'::text,
      v_ticket.id,
      v_ticket.room_id,
      CASE
        WHEN r.host_user_id = p_user_id THEN 'host'
        WHEN r.guest_user_id = p_user_id THEN 'guest'
        ELSE NULL
      END::text,
      public.match_room_payload(v_ticket.room_id)
    FROM public.match_rooms r
    WHERE r.id = v_ticket.room_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_ticket.status, v_ticket.id, NULL::uuid, NULL::text, NULL::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_random_match(
  p_user_id uuid,
  p_ticket_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE public.match_queue q
  SET status = 'canceled', updated_at = now()
  WHERE q.id = p_ticket_id
    AND q.user_id = p_user_id
    AND q.status = 'waiting';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count > 0;
END;
$$;
