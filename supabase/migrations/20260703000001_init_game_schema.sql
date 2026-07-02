-- 用户资料表，扩展 Supabase Auth 用户
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '用户资料表，扩展 Supabase Auth 用户';
COMMENT ON COLUMN public.profiles.display_name IS '显示昵称';
COMMENT ON COLUMN public.profiles.avatar_url IS '头像 URL';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许读取所有用户资料"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "允许用户更新自己的资料"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 对战记录表
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type text NOT NULL DEFAULT 'casual' CHECK (match_type IN ('casual', 'rank', 'friendly')),
  result text NOT NULL CHECK (result IN ('win', 'lose', 'draw')),
  score int NOT NULL DEFAULT 0,
  opponent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.matches IS '用户对战记录';

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许用户读取自己的对战记录"
  ON public.matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "允许用户创建自己的对战记录"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 排行榜表
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  rank_tier text DEFAULT 'bronze',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leaderboard IS '用户排行榜数据';

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许读取排行榜"
  ON public.leaderboard FOR SELECT
  USING (true);

-- 对战结束后自动更新排行榜
CREATE OR REPLACE FUNCTION public.update_leaderboard_after_match()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id, total_score, wins, losses)
  VALUES (
    new.user_id,
    new.score,
    CASE WHEN new.result = 'win' THEN 1 ELSE 0 END,
    CASE WHEN new.result = 'lose' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_score = public.leaderboard.total_score + new.score,
    wins = public.leaderboard.wins + CASE WHEN new.result = 'win' THEN 1 ELSE 0 END,
    losses = public.leaderboard.losses + CASE WHEN new.result = 'lose' THEN 1 ELSE 0 END,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_finished ON public.matches;
CREATE TRIGGER on_match_finished
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_leaderboard_after_match();
