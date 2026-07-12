# Supabase 数据库设计文档

本文档描述 Aoyi Web / Unity 项目共用的 Supabase 数据库 Schema、RLS 策略、触发器以及迁移管理规范。

## 1. 设计原则

- **Web 端与 Unity 端共用同一 Supabase 项目**：Web 负责账号注册/登录页面，Unity 负责游戏内用户名登录、房间列表、对战匹配。
- **不直接暴露 `auth.users`**：客户端（包括 Unity）使用 anon key，无法直接读取 `auth.users`。需要在 `public` schema 下建立可查询的扩展表。
- **迁移文件顺序执行**：所有 DDL 通过 `Web/supabase/migrations/` 下的 SQL 文件管理，按文件名前缀排序执行。

## 2. 表结构

### 2.1 profiles（用户资料表）

扩展 Supabase Auth 用户，存储 Web 展示与 Unity 用户名登录所需字段。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PRIMARY KEY | 与 `auth.users(id)` 一对一，级联删除 |
| `username` | text UNIQUE | 登录用户名，Unity 用其反向查找邮箱 |
| `email` | text | 邮箱副本，供 Unity 用户名登录使用 |
| `display_name` | text | 显示昵称，Web 端使用 |
| `avatar_url` | text | 头像 URL，Web 端使用 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |
| `last_login` | timestamptz | 最后登录时间，Unity 端使用 |

**RLS 策略**

- `允许读取所有用户资料`：SELECT 对所有人开放（Unity 需要按 username 查 email）。
- `允许用户更新自己的资料`：UPDATE 只能改自己的行。
- `允许用户插入自己的资料`：INSERT 只能插入 `auth.uid() = id` 的行。

**触发器**

`auth.users` 插入后自动创建 `public.profiles` 记录，写入 `username`、`email`、`display_name`、`avatar_url`（均来自 `raw_user_meta_data` 或 `email`）。

### 2.2 rooms（在线房间表）

供局域网外玩家发现并加入游戏房间。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PRIMARY KEY DEFAULT gen_random_uuid() | 房间唯一 ID |
| `room_code` | text UNIQUE NOT NULL | 6 位大写字母数字，显示用房间号 |
| `mode` | text NOT NULL | 游戏模式，如 `dantiao`、`paiwei` |
| `host_ip` | text NOT NULL | 主机 IP |
| `host_tcp_port` | integer NOT NULL | TCP 端口 |
| `host_udp_port` | integer NOT NULL | UDP 端口 |
| `max_players` | integer NOT NULL DEFAULT 2 | 最大玩家数 |
| `current_players` | integer NOT NULL DEFAULT 0 | 当前玩家数 |
| `status` | text NOT NULL DEFAULT 'Waiting' | 房间状态：`Waiting`、`Playing`、`Full`、`Closed` |
| `protocol_version` | integer NOT NULL DEFAULT 1 | 协议版本，用于过滤不兼容房间 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间，客户端心跳 PATCH 刷新 |

**RLS 策略**

- `允许读取所有房间`：SELECT 对所有人开放。
- `允许登录用户创建房间`：INSERT 要求 `auth.uid() IS NOT NULL`。
- `允许登录用户更新房间`：UPDATE 要求 `auth.uid() IS NOT NULL`。

### 2.3 matches（对战记录表）

记录玩家对战结果。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PRIMARY KEY DEFAULT gen_random_uuid() | 对战记录 ID |
| `user_id` | uuid REFERENCES auth.users(id) | 用户 ID |
| `match_type` | text CHECK | `casual`、`rank`、`friendly` |
| `result` | text CHECK | `win`、`lose`、`draw` |
| `score` | integer | 得分 |
| `opponent_id` | uuid | 对手 ID |
| `duration_seconds` | integer | 对战时长 |
| `created_at` | timestamptz | 创建时间 |

### 2.4 leaderboard（排行榜表）

汇总玩家胜负与积分。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PRIMARY KEY DEFAULT gen_random_uuid() | 记录 ID |
| `user_id` | uuid UNIQUE REFERENCES auth.users(id) | 用户 ID |
| `total_score` | integer DEFAULT 0 | 总积分 |
| `wins` | integer DEFAULT 0 | 胜场 |
| `losses` | integer DEFAULT 0 | 负场 |
| `rank_tier` | text DEFAULT 'bronze' | 段位 |
| `updated_at` | timestamptz | 更新时间 |

## 3. 客户端对应关系

| 服务端对象 | 客户端文件 |
| --- | --- |
| `profiles` 表 | `Assets/.../Supabase/SupabaseModels.cs` 中的 `SupabaseProfileDto` |
| `rooms` 表 | `Assets/.../Supabase/SupabaseModels.cs` 中的 `SupabaseRoomDto` |
| Auth API | `Assets/.../Supabase/SupabaseAuthClient.cs` |
| REST CRUD | `Assets/.../Supabase/SupabaseRestClient.cs` |
| 业务接口 | `Assets/.../Supabase/SupabaseBackendProvider.cs` |

## 4. 迁移文件

迁移文件位于 `Web/supabase/migrations/`，按文件名前缀顺序执行：

| 文件 | 作用 |
| --- | --- |
| `20260703000001_init_game_schema.sql` | 初始化 `profiles`、`matches`、`leaderboard` 表、RLS、触发器 |
| `20260703000002_backfill_existing_profiles.sql` | 为已存在但无 profile 的 `auth.users` 补建 profiles |
| `20260703000003_update_profiles_and_add_rooms.sql` | 扩展 profiles 增加 `username`/`email`/`last_login`，补充 rooms 表 |

### 4.1 应用迁移

**方式一：Supabase CLI（推荐）**

```bash
cd Web
pnpm supabase link --project-ref <your-project-ref>
pnpm supabase db push
```

**方式二：Supabase Dashboard SQL Editor**

按文件名顺序逐条复制执行 SQL 内容。

### 4.2 新增迁移规范

- 文件名格式：`YYYYMMDDHHMMSS_<short_description>.sql`
- 每个迁移只做一件事（新增表、修改字段、补数据）。
- 对已有表的修改使用 `IF NOT EXISTS` / `IF EXISTS`，确保可重复执行。
- **严禁直接修改已有的 `.sql` 迁移文件**（无论是否已经推送到远程）。
  - 如果发现旧迁移有问题，必须新建一个迁移文件来修正。
  - 使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`、`DROP TRIGGER IF EXISTS` 等幂等语法，确保新迁移在已执行和未执行旧迁移的环境都能安全运行。

## 5. Unity 用户名登录说明

Unity 端“用户名登录”流程：

1. Unity 调用 `GET /rest/v1/profiles?username=eq.{username}&select=email`。
2. 拿到 email 后，调用 `POST /auth/v1/token?grant_type=password` 用邮箱+密码登录。
3. 登录成功后进入游戏。

因此 `profiles.username` 必须唯一且非空，才能用于登录。Web 端注册时若传递 `username` 到 `raw_user_meta_data`，触发器会自动写入 `profiles`；否则需要在 Unity 端补充写入。

## 6. 安全注意事项

- **严禁在客户端使用 `service_role` key**。所有客户端查询必须通过 RLS 控制的 `public` 表进行。
- `profiles` 表的 SELECT 策略为公开可读，因此不要在该表存放敏感信息（如密码、手机号）。
- `rooms` 表的 INSERT/UPDATE 要求用户已登录，防止匿名用户创建/篡改房间。
