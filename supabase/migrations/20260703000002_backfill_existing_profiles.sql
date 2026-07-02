-- 为已存在但没有 profile 的老用户补建 profiles
INSERT INTO public.profiles (id, display_name)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'display_name',
    split_part(email, '@', 1),
    '用户' || substr(id::text, 1, 8)
  ) AS display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
