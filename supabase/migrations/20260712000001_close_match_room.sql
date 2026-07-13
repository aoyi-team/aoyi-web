-- Explicitly close a matched room when both clients finish the battle.
-- This prevents the next join_random_match call from reusing the old tickets.

CREATE OR REPLACE FUNCTION public.close_match_room(
  p_user_id uuid,
  p_room_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_room_id uuid;
BEGIN
  UPDATE public.match_rooms r
  SET status = 'closed', updated_at = now()
  WHERE r.id = p_room_id
    AND (r.host_user_id = p_user_id OR r.guest_user_id = p_user_id)
  RETURNING r.id INTO v_closed_room_id;

  IF v_closed_room_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.match_queue q
  SET status = 'expired', updated_at = now()
  WHERE q.room_id = p_room_id
    AND q.status = 'matched';

  UPDATE public.relay_sessions s
  SET expires_at = LEAST(COALESCE(s.expires_at, now()), now())
  WHERE s.id = (
    SELECT r.relay_session_id
    FROM public.match_rooms r
    WHERE r.id = p_room_id
  );

  RETURN true;
END;
$$;
