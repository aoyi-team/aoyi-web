-- 好友关系表
-- 双向记录：requester_id（发起方）+ addressee_id（接收方）
-- 状态机：pending -> accepted / declined / blocked

CREATE TABLE IF NOT EXISTS public.friendships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id)
);

-- 联合唯一约束：防止同一对用户重复申请
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
  ON public.friendships (requester_id, addressee_id);

-- 按 status 过滤的索引，加速查询好友列表 / 待处理申请
CREATE INDEX IF NOT EXISTS friendships_addressee_status_idx
  ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_status_idx
  ON public.friendships (requester_id, status);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS friendships_set_updated_at ON public.friendships;
CREATE TRIGGER friendships_set_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== RLS 策略 ==========
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 只能查看自己参与的关系
DROP POLICY IF EXISTS friendships_select_own ON public.friendships;
CREATE POLICY friendships_select_own ON public.friendships
  FOR SELECT USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- 只能以自己为发起方创建申请
DROP POLICY IF EXISTS friendships_insert_own ON public.friendships;
CREATE POLICY friendships_insert_own ON public.friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

-- 只有接收方能修改状态（接受 / 拒绝 / 拉黑）
DROP POLICY IF EXISTS friendships_update_addressee ON public.friendships;
CREATE POLICY friendships_update_addressee ON public.friendships
  FOR UPDATE USING (addressee_id = auth.uid());

-- 双方均可删除好友关系
DROP POLICY IF EXISTS friendships_delete_own ON public.friendships;
CREATE POLICY friendships_delete_own ON public.friendships
  FOR DELETE USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );
