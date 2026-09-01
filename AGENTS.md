# Totem Builder instructions

Totem 是“每个应用用户一个 ZooWork Agent，并由 Builder 统一分发 Skill”的样板项目。
开始任何 ZooWork 或 Cloudflare 操作前，先阅读：

1. `docs/builder-setup.md`：从自己的账号部署独立实例；
2. `docs/agent-lifecycle-spec.md`：每用户 Agent、Skill latest 和 Identity lazy sync；
3. `.agents/skills/zoowork-managed-agents/SKILL.md`：ZooWork SDK 的准确调用方式。

## 每个 Builder 的资源必须隔离

每个 Builder 使用自己的 ZooWork API key、Cloudflare account、Workers、D1、Access application
和 hostname。不要复用文档、Git 历史或其他环境中的 resource ID、domain、token 或 URL。

真实配置只存在以下 ignored 文件：

- `.env` 以及可选的 `.env.local`、`.env.cloudflare`；
- `wrangler.jsonc`；
- `infra/identity-worker/wrangler.jsonc`。

tracked `*.example.jsonc` 只定义字段。不要把 Builder 的真实配置复制回 example，不要提交 ignored
文件，不要在终端输出或回复中复述 secret。

Cloudflare 变更只针对 `.env` 中 `CLOUDFLARE_ACCOUNT_ID` 对应的 account。创建或部署前，先列出将要
使用的 Worker name、D1 name 和 hostname，让 Builder 能检查目标。除非 Builder 明确要求，不删除或
覆盖已有 Cloudflare 资源。

## Builder-owned Agent Definition

当前 Agent Definition 只有两部分：

- Identity：`ip-as-logo/agents/AGENTS.md`；
- Skill：`ip-as-logo/skills/ip-as-logo/`。

不要把 MCP、model、labels 或 Cloudflare 配置加入 Agent Definition。出现实际产品需求后再扩展。

## 修改和发布 Skill

只修改 `ip-as-logo/skills/ip-as-logo/`。保持顶层目录名和 `SKILL.md` frontmatter 的 `name`
一致。修改完成后先 review diff；只有 Builder 明确要求发布时才执行：

```bash
npm run skill:publish
```

第一次执行会在当前 ZooWork key 所属 organization 创建 org Skill。后续执行发布同一 Skill 的新
版本。User Agent 都 unpinned 跟随 `latest`，不要遍历 Agent，不要重新调用 `putAgentSkill`。

## 修改 Identity

Identity 是稳定 Persona，不承载经常变化的产品工作流。修改
`ip-as-logo/agents/AGENTS.md` 后部署 App Worker。活跃用户下一次请求时，应用根据内容 hash
更新该用户 Agent 的 `persona.docs`。

## 验证顺序

从零部署和验收按 `docs/builder-setup.md` 执行。最低验收要求是：

1. 两个登录用户在 D1 中绑定两个不同的 `agent_id`；
2. 发布 Skill 新版本后，不改 binding，原用户下一次 turn 使用新版 Skill；
3. 修改 Identity 并部署后，原用户下一次请求更新 `identity_hash`。
