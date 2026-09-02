# Totem architecture spec

Totem 是一个 Cloudflare-hosted ZooWork Managed Agents 样板。每个应用用户绑定一个 ZooWork
Agent；一个项目对应这个 Agent 下的一个 Session。

从零部署步骤见 [`builder-setup.md`](builder-setup.md)。Agent Definition 和 Skill 分发机制见
[`agent-lifecycle-spec.md`](agent-lifecycle-spec.md)。

## 1. 架构边界

每个 Builder 部署一套独立实例。实例包含：

| 资源 | 作用 |
|---|---|
| ZooWork org Skill | 所有 User Agent 共同跟随的 Skill |
| App Worker | 静态站和 `/api/*` |
| Identity Worker | identity 与 binding 的窄接口 |
| D1 | `user_id → agent_id` 和 Identity hash |
| Cloudflare Access application | 登录和 hostname 保护 |
| Custom domain | 用户访问地址 |

这些资源都属于当前 Builder 的 ZooWork organization 或 Cloudflare account。仓库不提供共享资源，
也不提交任何实例的真实 resource ID、domain 或 credential。

当前不实现公开注册、计费、organization 和角色系统。

## 2. 请求和身份流程

```text
Browser
  → Cloudflare Access
      验证当前 Builder 的登录策略，注入 Cf-Access-Jwt-Assertion
  → App Worker
      静态请求 → ASSETS binding
      /api/*   → worker/index.js → api handlers
  → Identity Worker → D1
      Access identity → stable user_id → agent binding
  → ZooWork
```

App Worker 验证 Access JWT 的 signature、issuer、audience 和 expiry。浏览器不能提供 `user_id` 或
`agent_id` 作为授权依据。

本地开发只有 Host 是 `127.0.0.1` 或 `localhost` 且设置 `TOTEM_DEV_EMAIL` 时，才启用 dev
identity。这个分支不能在生产 hostname 生效。

## 3. Builder-specific Cloudflare 配置

App Worker 的 tracked 模板是根目录 `wrangler.example.jsonc`。Identity Worker 的 tracked 模板是
`infra/identity-worker/wrangler.example.jsonc`。

每个 Builder 复制并填写两个 ignored 文件：

```text
wrangler.jsonc
infra/identity-worker/wrangler.jsonc
```

App Worker 配置包含：

- Builder 自己的 Worker name 和 custom domain；
- Builder 自己的 Access team domain、AUD 和允许邮箱域；
- Builder 自己的 Identity Worker URL。

Identity Worker 配置包含：

- Builder 自己的 Worker name；
- Builder 自己的 D1 name 和 database ID。

这些值不是 credential，但它们属于具体部署，因此不提交到样板仓库。

## 4. Secret 边界

本地 credential 保存在 ignored `.env`。生产环境使用 Cloudflare Worker secrets：

App Worker：

- `ZOOWORK_API_KEY`；
- `TOTEM_IDENTITY_SERVICE_TOKEN`。

Identity Worker：

- `TOTEM_SERVICE_TOKEN`。

两个 service token 名称不同，但值相同。App Worker 使用它调用 Identity Worker。secret 不进入
Worker vars、Skill、Persona、浏览器 bundle 或 Git。

`npm run builder:check` 检查配置是否仍有 placeholder，并拒绝在 `wrangler.jsonc` 中出现 secret
字段。它只输出资源名，不输出 credential。

## 5. D1 schema

`agent_bindings` 保存：

```text
user_id
zooclaw_agent_id
identity_hash
created_at
updated_at
```

`identity_hash` 根据 `AGENTS.md` 的真实内容计算，用于 Persona lazy sync。ZooWork Session、事件和
artifact 仍以 ZooWork 为 source of truth，不复制到 D1。

## 6. 每用户 Agent provisioning

用户第一次创建项目时，`api/_agent.js` 执行：

1. 根据 Access identity 从 D1 查找 binding；
2. 没有 binding 时，按稳定 labels 查找可恢复 Agent；
3. 仍不存在时，幂等创建一个新 Agent；
4. 写入 Identity，并安装当前 Builder 的共享 org Skill；
5. 启动 Agent 并验证 Skill eligible；
6. 保存 `user_id → agent_id + identity_hash`。

不同用户使用不同 idempotency key，因此得到不同 Agent。浏览器不能指定 Agent ID。

## 7. Skill 更新

Builder-owned Skill source 是 `ip-as-logo/skills/ip-as-logo/`。发布命令是：

```bash
npm run skill:publish
```

第一次执行在当前 ZooWork key 所属 organization 创建 Skill。以后调用 `uploadSkillVersion` 发布
新版本。

所有 User Agent unpinned 安装同一个 org Skill。发布后不遍历 Agent、不修改 D1、不重建 Session，
也不重复调用 `putAgentSkill`。已有用户下一次 turn 使用 `latest`。

## 8. Identity 更新

Builder-owned Identity source 是 `ip-as-logo/agents/AGENTS.md`。Identity 修改后部署 App Worker。

活跃用户下一次请求经过 `syncIdentity()`：

1. 读取当前 Identity 并计算内容 hash；
2. hash 与 D1 相同，不调用 ZooWork；
3. hash 不同，执行 `updateAgent({ persona })`；
4. ZooWork 成功后更新 D1 hash。

不活跃用户不会被批量更新，下次回来时再同步。

## 9. 部署顺序

首次部署：

```text
创建 ZooWork Skill
→ 创建 D1 并执行 migrations
→ 部署 Identity Worker
→ 创建 Cloudflare Access application
→ 填写 Builder 自己的两个 wrangler.jsonc
→ 部署 App Worker 和 custom domain
→ 写入两个 Worker 的 secrets
→ 用两个用户验证两个 Agent
```

日常 Skill 更新不需要部署 Cloudflare。日常 Identity 更新只需要重新部署 App Worker。

## 10. 当前限制

- 登录方式由每个 Builder 的 Cloudflare Access identity provider 和 policy 决定；
- `email` 被用作 identity 恢复键，公开产品需要额外定义 account linking policy；
- D1 只保存 identity 和 binding；
- 项目改名、配额、订阅和计费尚未实现；
- 当前 Agent Definition 只包含 Identity 和 Skill，不包含 MCP。

## 11. 检查你的理解

<details>
<summary>Cloudflare API token 会进入 Worker 吗？</summary>

不会。它只供 Wrangler 操作当前 Builder 的 Cloudflare account。Worker 运行时只接收自己需要的
vars 和 Worker secrets。
</details>

<details>
<summary>为什么 D1 不保存 Skill version？</summary>

User Agent unpinned 跟随 org Skill 的 `latest`。版本分发由 ZooWork Engine 负责，D1 只保存 user
与 Agent 的 binding。
</details>

<details>
<summary>为什么每个 Builder 都要创建自己的 D1？</summary>

D1 保存该实例用户的 identity 和 Agent binding。不同 Builder 的用户和 ZooWork organization 相互
独立，不能共享这张表。
</details>
