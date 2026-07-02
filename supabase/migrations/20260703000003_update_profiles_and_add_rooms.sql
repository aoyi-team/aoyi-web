-- 扩展 profiles 表，支持 Unity 用户名登录和 Web 端展示
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.profiles.username IS '登录用户名，Unity 客户端用其反向查找邮箱';
COMMENT ON COLUMN public.profiles.email IS '登录邮箱副本，供 Unity 客户端用户名登录使用';

-- 允许用户插入自己的资料（Unity 端可能需要在注册后补充 username）
CREATE POLICY "允许用户插入自己的资料"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 更新注册触发器，同步写入 username/email/avatar_url
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 在线房间表，供局域网外玩家发现并加入
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  mode text NOT NULL,
  host_ip text NOT NULL,
  host_tcp_port integer NOT NULL,
  host_udp_port integer NOT NULL,
  max_players integer NOT NULL DEFAULT 2,
  current_players integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Waiting',
  protocol_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rooms IS '在线房间列表';

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许读取所有房间"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "允许登录用户创建房间"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "允许登录用户更新房间"
  ON public.rooms FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 补全老用户的 username/email/avatar_url
UPDATE public.profiles
SET
  username = COALESCE(public.profiles.username, auth.users.raw_user_meta_data->>'username'),
  email = COALESCE(public.profiles.email, auth.users.email),
  avatar_url = COALESCE(public.profiles.avatar_url, auth.users.raw_user_meta_data->>'avatar_url')
FROM auth.users
WHERE public.profiles.id = auth.users.id
  AND (public.profiles.username IS NULL OR public.profiles.email IS NULL OR public.profiles.avatar_url IS NULL);
