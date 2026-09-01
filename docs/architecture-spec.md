# Totem architecture spec

状态：Cloudflare-only 架构已部署。
更新时间：2026-09-01。

Agent Definition 和 Skill 分发设计见 [`agent-lifecycle-spec.md`](agent-lifecycle-spec.md)。

## 1. 目标和边界

当前产品先服务 `@srp.one` 同事。每个应用用户绑定一个 ZooWork Agent；一个项目对应这个
Agent 下的一个 Session。

当前不实现公开注册、计费、organization 和角色系统。

## 2. 已部署资源

| 资源 | 值 | 用途 |
|---|---|---|
| App Worker | `totem` | 直接运行静态站和 `/api/*` |
| 主域名 | `https://totem.impo.ai` | Worker custom domain |
| Access app | `Totem` / `a9699530-2759-4ecb-919c-9a0d436dd6af` | 保护整个 hostname |
| Access policy | `SRP team only` | 只允许邮箱域 `srp.one` |
| D1 | `totem` / `15a3f807-1b34-4c5a-a46f-b6f27b4b3e1a` | identity 和 Agent binding |
| Identity Worker | `totem-identity.cctools.workers.dev` | D1 的窄接口，只接受 service token |

项目只使用 Cloudflare hosting，不保留第二套 deployment。

## 3. 请求和身份流程

```text
Browser
  -> Cloudflare Access
       验证 @srp.one，注入 Cf-Access-Jwt-Assertion
  -> App Worker
       静态请求 -> ASSETS binding
       /api/*   -> worker/index.js -> 现有 api handlers
  -> Identity Worker -> D1
       Access identity -> stable user_id -> agent binding
  -> ZooWork
```

App Worker 仍会验证 Access JWT 的 signature、issuer、audience 和 expiry。浏览器不能提供
`user_id` 或 `agent_id` 作为授权依据。

本地开发只有 Host 是 `127.0.0.1` 或 `localhost` 且设置 `TOTEM_DEV_EMAIL` 时，才启用 dev
identity。这个分支不能在生产 hostname 生效。

## 4. App Worker

配置在根目录 `wrangler.jsonc`，入口是 `worker/index.js`。

Worker 使用 Static Assets binding 提供 `public/`。`worker/index.js` 只给现有 Node-style API
handler 提供最小 `req/res` adapter，因此业务逻辑仍然维护在 `api/`，没有第二套实现。

生产 secrets：

- `ZOOCLAW_API_KEY`；
- `TOTEM_IDENTITY_SERVICE_TOKEN`。

Access team、AUD、允许邮箱域和 Identity Worker URL 是非 secret vars，保存在 `wrangler.jsonc`。
`workers_dev` 关闭，避免有人绕过 Access 访问 `*.workers.dev`。

## 5. D1 schema

`agent_bindings` 保存：

```text
user_id
zooclaw_agent_id
identity_hash
created_at
updated_at
```

`identity_hash` 根据 `AGENTS.md` 的真实内容计算，用于 Persona lazy sync。ZooWork Session、事件
和 artifact 仍以 ZooWork 为权威来源，不复制到 D1。

## 6. Agent provisioning 和更新

Agent Definition 只包含两个 Builder-owned 部分：

- Identity：`ip-as-logo/agents/AGENTS.md`；
- Skill：共享 org Skill `ip-as-logo`。

新用户第一次建项目时，`api/_agent.js` 幂等创建 User Agent，同时写入 Identity 并 unpinned
安装共享 Skill。D1 保存 binding。

修改 Skill 后执行：

```bash
node --env-file=.env scripts/upload-skill.mjs
```

脚本调用 `uploadSkillVersion`。已有 User Agent 自动跟随 latest，不执行批量 Agent 更新。

Identity 修改后随 App Worker 部署。活跃用户下一次请求时，根据内容 hash lazy sync Persona。

## 7. 部署

Identity schema 或 Worker 有改动时：

```bash
npm run identity:migrate
npm run identity:deploy
```

应用部署：

```bash
npm run deploy
```

首次创建 App Worker 后，通过 `wrangler secret put` 写入两个生产 secrets。`totem.impo.ai` 使用
Workers custom domain API 绑定到 `totem` service；这个绑定独立于后续 deploy，会一直保留。

## 8. 已验证事项

- App Worker production bundle 构建和部署通过；
- `totem.impo.ai` custom domain 指向 Worker `totem`；
- 未登录访问 `/`、`/app` 和 `/api/projects` 都进入 Cloudflare Access；
- 本地 Worker adapter 的 `/app` 返回工作台 HTML；
- 本地 Worker adapter 的 `/api/projects` 通过真实 Identity Worker、D1 和 ZooWork 返回现有项目；
- D1 migrations 已执行，旧 `definition_version` 已删除；
- Identity Worker health 检查通过；
- 旧 hosting project、deployments、aliases 和 DNS CNAME 已删除。

## 9. 下一步验收

1. 用 `@srp.one` 登录 `https://totem.impo.ai/app`。
2. 确认能看到已有“冷萃咖啡吉祥物”项目。
3. 新建一个项目，确认不会创建第二个 User Agent。
4. 检查 D1 binding 写入 64 位 `identity_hash`。
5. 发布 Skill 新版本，确认已有 Agent 下一次 turn 使用新版 Skill。

## 10. 当前限制

- 现在是 Cloudflare One-time PIN，不是 Google button。
- `email` 被用作 identity 恢复键；公开发布前需要定义 account linking policy。
- D1 只保存 identity 和 binding。项目改名、配额、订阅和 Stripe 尚未实现。
