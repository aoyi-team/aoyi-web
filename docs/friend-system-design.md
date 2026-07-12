# 好友系统设计文档

## 1. 概述

基于现有 Supabase 数据库架构，为奥义传说 Web 端实现好友系统，支持好友申请、在线状态、实时通知等功能。

### 设计决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 表结构 | 双向记录 | requester_id + addressee_id，联合唯一约束防重复申请 |
| 状态机 | 四态 | pending / accepted / declined / blocked |
| 实时能力 | Supabase Realtime | 在线状态推送 + 好友申请即时通知 |

---

## 2. 数据库设计

### 2.1 friendships 表（好友关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid PK | 记录 ID |
| `requester_id` | uuid → profiles(id) | 发起方 |
| `addressee_id` | uuid → profiles(id) | 接收方 |
| `status` | text CHECK | `pending` / `accepted` / `declined` / `blocked` |
| `created_at` | timestamptz | 申请时间 |
| `updated_at` | timestamptz | 状态变更时间 |

**约束**：
- `(requester_id, addressee_id)` 联合唯一约束，防止重复申请
- `requester_id <> addressee_id` CHECK 约束，防止自己加自己

**状态流转**：

```
pending ──accept──→ accepted
  │
  ├──decline──→ declined
  │
  └──block────→ blocked
```

- `pending → accepted`：接收方同意
- `pending → declined`：接收方拒绝
- `pending → blocked`：接收方拉黑发起方
- `accepted → blocked`：已好友也可拉黑

### 2.2 profiles 表扩展

| 新增字段 | 类型 | 说明 |
|---------|------|------|
| `is_online` | boolean DEFAULT false | 在线状态 |
| `last_seen` | timestamptz DEFAULT now() | 最后在线时间 |

### 2.3 RLS 策略

| 操作 | 规则 | 说明 |
|------|------|------|
| SELECT | `requester_id = auth.uid() OR addressee_id = auth.uid()` | 只能看自己参与的关系 |
| INSERT | `requester_id = auth.uid()` | 只能以自己为发起方 |
| UPDATE | `addressee_id = auth.uid()` | 只有接收方能改状态 |
| DELETE | `requester_id = auth.uid() OR addressee_id = auth.uid()` | 双方均可删除 |

---

## 3. API 设计

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/friends` | GET | 好友列表（status=accepted） |
| `/api/friends/request` | POST | 发起好友申请 |
| `/api/friends/requests` | GET | 待处理申请列表（status=pending） |
| `/api/friends/accept` | POST | 接受申请 |
| `/api/friends/decline` | POST | 拒绝申请 |
| `/api/friends/block` | POST | 拉黑 |
| `/api/friends/[id]` | DELETE | 删除好友 |

所有 API 通过 Bearer token 认证当前用户，使用 `createSupabaseUserClient` 执行查询（受 RLS 保护）。

---

## 4. Supabase Realtime

### 4.1 在线状态

- 登录时：`profiles.is_online = true`，`last_seen = now()`
- 退出时：`profiles.is_online = false`，`last_seen = now()`
- 心跳机制：每 30 秒更新 `last_seen`，超时判定离线
- 客户端订阅：`supabase.channel('profiles').on('postgres_changes', ...)`

### 4.2 好友申请通知

- 客户端订阅 `friendships` 表 INSERT 事件
- 过滤条件：`addressee_id = auth.uid()`
- 收到新申请时，导航栏铃铛图标红点提示

---

## 5. 页面规划

### 5.1 好友列表页 `/friends`

- 在线好友分组（按 is_online 排序）
- 好友卡片：头像、昵称、在线状态、最后在线时间
- 搜索框：按用户名搜索
- 发起申请按钮

### 5.2 导航栏通知

- 铃铛图标 + 未读红点
- 点击展开申请列表
- 接受/拒绝操作

---

## 6. 迁移文件

| 文件 | 作用 |
|------|------|
| `20260711000001_add_friendships.sql` | 创建 friendships 表、RLS、约束 |
| `20260711000002_extend_profiles_online.sql` | profiles 增加 is_online、last_seen 字段 |

遵循现有迁移规范：
- 文件名格式 `YYYYMMDDHHMMSS_<description>.sql`
- 使用 `IF NOT EXISTS` 幂等语法
- 不修改已有迁移文件

---

## 7. 实现顺序

1. 创建迁移 SQL（friendships 表 + profiles 扩展 + RLS）
2. 推送迁移到 Supabase
3. 创建 API 路由
4. 实现好友列表页
5. 接入 Realtime 在线状态和申请通知
