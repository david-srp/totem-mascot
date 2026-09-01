# Builder setup：部署自己的每用户 Agent 实例

这份文档用于把 Totem 部署成一个完全独立的 Builder 实例。部署完成后，Builder 可以验证两件事：

1. 每个登录用户得到一个独立 ZooClaw Agent；
2. Builder 发布 Skill 新版本后，已有用户下一次 turn 使用最新版。

每个 Builder 使用自己的 ZooClaw organization 和 Cloudflare account。仓库不提供共享的 API key、
Worker、D1、Access application、hostname 或 resource ID。

## 1. 需要准备的账号和资源名

准备 Node.js 22、一个 ZooClaw API key，以及一个有权管理 Workers、D1、custom domain 和 Access
application 的 Cloudflare API token。

先给当前实例选择一组不会和已有资源冲突的名称：

| 配置 | 例子 | 用途 |
|---|---|---|
| App Worker name | `alice-totem` | 静态页面和 `/api/*` |
| Identity Worker name | `alice-totem-identity` | D1 的窄接口 |
| D1 name | `alice-totem` | user identity 和 Agent binding |
| App hostname | `totem.example.com` | 用户访问地址 |
| Allowed email domain | `example.com` | 允许登录的邮箱域 |

名称只在 Builder 自己的 Cloudflare account 内有效。不要从其他部署复制 Worker name、D1 ID、Access
AUD 或 hostname。

## 2. 本地 credential 和配置文件

安装依赖并创建 ignored 文件：

```bash
npm install
npm --prefix web install
cp .env.example .env
cp wrangler.example.jsonc wrangler.jsonc
cp infra/identity-worker/wrangler.example.jsonc infra/identity-worker/wrangler.jsonc
```

在 `.env` 中填写当前 Builder 自己的：

- `ZOOCLAW_API_KEY`；
- `CLOUDFLARE_API_TOKEN`；
- `CLOUDFLARE_ACCOUNT_ID`；
- `TOTEM_IDENTITY_SERVICE_TOKEN`；
- `TOTEM_DEV_EMAIL`。

`TOTEM_IDENTITY_SERVICE_TOKEN` 是 App Worker 和 Identity Worker 之间的共享 secret。生成一个至少
32 字节的随机值，只保存在 `.env` 和两个 Worker secret 中。

注意：`.env` 和两个真实 `wrangler.jsonc` 都被 Git 忽略。tracked `*.example.jsonc` 不能写入真实
配置，更不能写入 secret。

## 3. 在自己的 ZooClaw organization 创建 Skill

先确认 API key 能访问模型和 Skill catalog：

```bash
node --env-file=.env scripts/probe.mjs
npm run skill:list
```

发布 Builder 本地的 Skill source：

```bash
npm run skill:publish
```

第一次执行时，`scripts/upload-skill.mjs` 在当前 API key 所属 organization 创建名为
`ip-as-logo` 的 org Skill。后续执行发布同一个 Skill 的新版本。脚本输出 `SKILL_ID` 和
`latest_version`，它们是 resource identifier，不是 secret。

这个步骤不会创建 User Agent。User Agent 在用户第一次创建项目时才由应用懒创建。

## 4. 在自己的 Cloudflare account 创建 D1

使用 `.env` 中的 Cloudflare token 创建一个新的 D1：

```bash
npm run cf -- d1 create YOUR_D1_NAME
```

把命令返回的 `database_name` 和 `database_id` 写入 ignored
`infra/identity-worker/wrangler.jsonc`。同时把 Identity Worker 的 `name` 改成第 1 节选择的名称。

检查这一段只有当前 Builder 的资源：

```json
{
  "binding": "DB",
  "database_name": "YOUR_D1_NAME",
  "database_id": "YOUR_D1_DATABASE_ID",
  "migrations_dir": "migrations"
}
```

执行 migrations：

```bash
npm run identity:migrate
```

## 5. 部署 Identity Worker

先创建 Identity Worker，再把 `.env` 中 `TOTEM_IDENTITY_SERVICE_TOKEN` 的同一个值写入它的
`TOTEM_SERVICE_TOKEN` secret：

```bash
npm run identity:deploy
npm run cf -- secret put TOTEM_SERVICE_TOKEN --config infra/identity-worker/wrangler.jsonc
```

`wrangler secret put` 会打开 secret 输入提示。输入值不会写进 `wrangler.jsonc`。

部署完成后记录当前 Builder 自己的 Identity Worker URL，例如：

```text
https://YOUR_IDENTITY_WORKER.YOUR_SUBDOMAIN.workers.dev
```

在根目录 ignored `wrangler.jsonc` 的 `TOTEM_IDENTITY_URL` 中填写这个 URL。为了本地开发，也在
ignored `.env.local` 中填写：

```dotenv
TOTEM_IDENTITY_URL=https://YOUR_IDENTITY_WORKER.YOUR_SUBDOMAIN.workers.dev
```

## 6. 创建 Cloudflare Access application

在当前 Builder 的 Cloudflare Zero Trust account 中创建一个 Self-hosted Access application。
application hostname 使用第 1 节选择的 App hostname，并创建允许测试用户登录的 policy。

创建后取得三个公开配置：

- Access team domain，例如 `YOUR_TEAM.cloudflareaccess.com`；
- application AUD；
- Builder 允许登录的邮箱域。

将它们写入 ignored `wrangler.jsonc`：

```json
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "YOUR_TEAM.cloudflareaccess.com",
  "CF_ACCESS_AUD": "YOUR_ACCESS_APPLICATION_AUD",
  "TOTEM_ALLOWED_EMAIL_DOMAIN": "YOUR_ALLOWED_EMAIL_DOMAIN",
  "TOTEM_IDENTITY_URL": "https://YOUR_IDENTITY_WORKER.YOUR_SUBDOMAIN.workers.dev"
}
```

同时填写 App Worker `name` 和 custom domain route：

```json
"name": "YOUR_APP_WORKER_NAME",
"routes": [
  { "pattern": "YOUR_APP_HOSTNAME", "custom_domain": true }
]
```

Access team domain、AUD、邮箱域、Worker URL 和 D1 ID 都是当前部署的公开配置，不是 secret。
它们仍然只保存在 ignored 配置中，因为每个 Builder 的实例不同。

## 7. 检查并部署 App Worker

先运行本地检查。它只输出资源名，不输出 credential：

```bash
npm run builder:check
```

首次执行 `npm run deploy` 创建 App Worker 和 custom domain。然后把 ZooClaw key 和 Identity
service token 写入当前 Builder 的 App Worker：

```bash
npm run deploy
npm run cf -- secret put ZOOCLAW_API_KEY --config wrangler.jsonc
npm run cf -- secret put TOTEM_IDENTITY_SERVICE_TOKEN --config wrangler.jsonc
```

`wrangler secret put` 会为当前 Worker 发布包含新 secret 的版本，不需要再次把 secret 写进配置。

使用真实 App hostname 打开 `/app`。未登录请求应该先进入当前 Builder 自己的 Cloudflare Access
页面，不能绕过 Access 直接调用 `/api/*`。

## 8. 验证每个用户一个 Agent

准备两个都符合 Access policy 和允许邮箱域的测试用户。

1. 用户 A 登录并创建一个项目；
2. 用户 B 使用独立浏览器 profile 登录并创建一个项目；
3. 查询当前 Builder 的 D1：

```bash
npm run cf -- d1 execute DB --remote \
  --config infra/identity-worker/wrangler.jsonc \
  --command "SELECT user_id, zooclaw_agent_id, identity_hash FROM agent_bindings ORDER BY created_at"
```

验收结果应该是两行不同的 `user_id`，对应两个不同的 `zooclaw_agent_id`。浏览器不能提交或覆盖
这两个字段；它们由 Access identity、Identity Worker 和 `api/_agent.js` 决定。

## 9. 验证 Skill 更新自动分发

在 `ip-as-logo/skills/ip-as-logo/` 做一个可以通过对话观察到的真实修改，然后 review diff 并发布：

```bash
npm run skill:publish
```

再次运行 `npm run skill:list`，确认 `latest_version` 增加。不要修改 D1，不要调用
`putAgentSkill`，也不要重建 User Agent 或 Session。

回到用户 A 已有的项目中发送下一条消息。该 turn 会读取 Agent 当前配置，并在需要 Sandbox 时同步
最新版 Skill。用户 B 的 Agent 也会跟随同一个 latest。

这里的关键验证是：D1 中两个 `zooclaw_agent_id` 都不变，但两个用户都能使用新版 Skill。

## 10. 验证 Identity lazy sync

Identity source 是 `ip-as-logo/agents/AGENTS.md`。修改后部署 App Worker：

```bash
npm run deploy
```

用户下一次创建项目、读取项目或发送消息时，`api/_agent.js` 比较当前 Identity 内容 hash 和 D1 的
`identity_hash`。hash 不同才调用 `updateAgent({ persona })`，成功后更新 D1。

Identity 不需要手工版本号，也不需要批量更新所有 Agent。不活跃用户会在下次回来时同步。

## 11. Builder 的日常工作流

修改 Skill：

```text
修改 ip-as-logo/skills/ip-as-logo/
→ review diff
→ npm run skill:publish
→ 已有 User Agent 自动跟随 latest
```

修改 Identity：

```text
修改 ip-as-logo/agents/AGENTS.md
→ npm run deploy
→ 活跃用户下一次请求 lazy sync Persona
```

当前样板只定义 Identity 和 Skill。MCP、model、labels 和其他配置不属于当前 Builder
Definition，出现实际产品需求后再增加。

## 12. 检查你的理解

<details>
<summary>为什么两个 Builder 可以都创建名为 ip-as-logo 的 Skill？</summary>

Skill 属于 ZooClaw organization。两个 Builder 使用不同 organization 和 API key，资源相互隔离。
</details>

<details>
<summary>为什么发布 Skill 后不用更新 D1？</summary>

D1 只保存 `user_id → agent_id` 和 Identity hash。User Agent unpinned 安装 org Skill，Engine 负责
让它跟随 `latest`。
</details>

<details>
<summary>为什么真实 wrangler.jsonc 不提交？</summary>

它包含当前 Builder 的 Worker name、D1 ID、Access AUD 和 hostname。它们不是 credential，但属于
一个具体部署，不应该成为下一个 Builder 的默认值。
</details>

<details>
<summary>更新 Skill 会给每个用户创建新 Agent 吗？</summary>

不会。Agent binding 不变，Session 也不需要重建。变化的是所有 unpinned Agent 共同跟随的 Skill
latest version。
</details>
