# 提交规范

本文档约定 Web 端（及关联 Unity 网络模块）的 Git 分支、提交信息、Pull Request 和代码审查规范。

## 1. 分支策略

- **`main`**：主分支，始终保持可部署状态。
- **`feature/<描述>`**：新功能分支，例如 `feature/room-list`。
- **`fix/<描述>`**：Bug 修复分支，例如 `fix/login-404`。
- **`docs/<描述>`**：文档更新分支，例如 `docs/supabase-schema`。
- **`chore/<描述>`**：构建、依赖、配置等杂项，例如 `chore/update-deps`。

**规则**

- 所有修改必须通过 Pull Request 合并到 `main`，**禁止直接 push 到 `main`**。
- 分支从最新的 `main` 切出，开发前执行 `git pull origin main`。
- 分支命名使用小写英文，单词间用连字符 `-` 分隔。

## 2. 提交信息（Conventional Commits）

提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.1 type（必填）

| 类型 | 说明 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 重构（既不修复 bug 也不添加功能） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建、依赖、配置等杂项 |
| `ci` | CI/CD 配置 |

### 2.2 scope（建议填写）

| scope | 说明 |
| --- | --- |
| `web` | Web 端通用 |
| `auth` | 登录/注册相关 |
| `supabase` | 数据库、迁移、RLS |
| `unity` | Unity 端网络/登录相关代码 |
| `ui` | 组件、页面样式 |
| `docs` | 文档 |
| `ci` | 工作流 |

### 2.3 subject（必填）

- 使用简洁的中文或英文，首字母不大写，末尾不加句号。
- 描述“做了什么”而非“怎么做的”。

### 2.4 body（可选）

- 说明修改动机、实现细节或影响范围。
- 多条使用项目符号分点。

### 2.5 footer（可选）

- 关联 Issue：`Closes #123`
- 破坏性变更：`BREAKING CHANGE: <描述>`

### 2.6 示例

```
feat(supabase): 添加 rooms 表及 RLS 策略

- 创建 public.rooms 表存储在线房间
- 添加 SELECT/INSERT/UPDATE 策略
- 支持 Unity 端房间发现

Closes #45
```

```
fix(unity): 修复 Async_Load 中文日志乱码

将 GBK 编码的 Async_Load.cs 重新保存为 UTF-8，
使 Unity Console 中的中文日志正常显示。
```

```
docs(web): 补充 Supabase 数据库设计文档
```

## 3. Pull Request 规范

### 3.1 PR 标题

PR 标题使用 Conventional Commits 风格，例如：

- `feat(supabase): 添加 rooms 表及 RLS 策略`
- `fix(unity): 修复用户名登录 404 错误`

### 3.2 PR 描述模板

```markdown
## 变更内容
简要描述本次 PR 做了什么。

## 关联 Issue
Closes #<issue-number>

## 检查清单
- [ ] 本地 `pnpm build` 通过
- [ ] 新增/修改的 Supabase 迁移已在本地或远程测试环境执行
- [ ] 文档已同步更新
- [ ] 自测通过

## 截图（如适用）
```

### 3.3 合并要求

- 至少 1 人 Code Review 通过。
- CI 检查全部通过。
- 使用 **Squash and Merge** 合并到 `main`，合并信息保持 Conventional Commits 格式。

## 4. 数据库迁移提交规范

- 每个迁移文件对应一次独立的 schema 变更。
- 迁移文件名：`YYYYMMDDHHMMSS_<short_description>.sql`。
- 提交信息示例：
  - `feat(supabase): 添加 profiles 用户名/邮箱字段`
  - `feat(supabase): 创建 rooms 表支持在线房间发现`
- **严禁直接修改已有的 `.sql` 迁移文件**（无论是否已经推送到远程）。
  - 如果发现旧迁移有问题，必须新建一个迁移文件来修正。
  - 使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`、`DROP TRIGGER IF EXISTS` 等幂等语法，确保新迁移在已执行和未执行旧迁移的环境都能安全运行。
- 新增迁移前先在本地或测试环境执行验证，确认不会破坏已有数据。

## 5. 代码审查 checklist

审查者至少检查以下项目：

- [ ] 功能是否符合预期
- [ ] 是否引入新的安全漏洞（如暴露 secret key、RLS 策略过宽）
- [ ] Supabase 迁移是否幂等（可重复执行不报错）
- [ ] 文档是否同步更新
- [ ] 提交信息是否符合 Conventional Commits

## 6. 本地提交前检查

```bash
cd Web

# 代码格式
pnpm lint

# 类型检查
pnpm type-check

# 构建
pnpm build
```

> 如果项目没有 `type-check` 脚本，使用 `pnpm build` 代替。
