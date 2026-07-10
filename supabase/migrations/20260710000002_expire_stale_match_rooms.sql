-- Stale matched tickets can keep returning the same old relay room forever.
-- Expire connecting rooms that were not consumed quickly so another match
-- attempt creates a fresh Edgegap relay session.

CREATE OR REPLACE FUNCTION public.join_random_match(
  p_user_id uuid,
  p_mode text,
  p_hero_id integer,
  p_skin_id integer,
  p_match_type text DEFAULT 'random',
  p_room_code text DEFAULT NULL,
  p_protocol_version integer DEFAULT 1,
  p_ip_address text DEFAULT NULL
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
  v_ip_address text;
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
  v_ip_address := NULLIF(btrim(COALESCE(p_ip_address, '')), '');

  UPDATE public.match_queue q
  SET status = 'expired', updated_at = now()
  WHERE q.status = 'waiting'
    AND q.updated_at < now() - interval '90 seconds';

  UPDATE public.match_rooms r
  SET status = 'closed', updated_at = now()
  WHERE r.status = 'connecting'
    AND r.updated_at < now() - interval '2 minutes';

  UPDATE public.match_queue q
  SET status = 'expired', updated_at = now()
  WHERE q.status = 'matched'
    AND EXISTS (
      SELECT 1
      FROM public.match_rooms r
      WHERE r.id = q.room_id
        AND r.status = 'closed'
    );

  SELECT q.*
  INTO v_existing
  FROM public.match_queue q
  WHERE q.user_id = p_user_id
    AND q.status IN ('waiting', 'matched')
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_ip_address IS NOT NULL AND v_existing.ip_address IS DISTINCT FROM v_ip_address THEN
      UPDATE public.match_queue q
      SET ip_address = v_ip_address, updated_at = now()
      WHERE q.id = v_existing.id;
      v_existing.ip_address := v_ip_address;
    END IF;

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
      WHERE r.id = v_existing.room_id
        AND r.status <> 'closed';
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
      protocol_version,
      ip_address
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
      p_protocol_version,
      v_ip_address
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
    protocol_version,
    ip_address
  )
  VALUES (
    p_user_id,
    btrim(p_mode),
    p_hero_id,
    p_skin_id,
    p_match_type,
    v_room_code,
    'waiting',
    p_protocol_version,
    v_ip_address
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
  UPDATE public.match_rooms r
  SET status = 'closed', updated_at = now()
  WHERE r.status = 'connecting'
    AND r.updated_at < now() - interval '2 minutes';

  UPDATE public.match_queue q
  SET status = 'expired', updated_at = now()
  WHERE q.status = 'matched'
    AND EXISTS (
      SELECT 1
      FROM public.match_rooms r
      WHERE r.id = q.room_id
        AND r.status = 'closed'
    );

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
    WHERE r.id = v_ticket.room_id
      AND r.status <> 'closed';
    RETURN;
  END IF;

  RETURN QUERY SELECT v_ticket.status, v_ticket.id, NULL::uuid, NULL::text, NULL::jsonb;
END;
$$;
