-- profiles 表扩展：在线状态 + 最后在线时间

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();

-- 在线状态索引，加速好友列表排序
CREATE INDEX IF NOT EXISTS profiles_is_online_idx
  ON public.profiles (is_online);
