# Per-user Agent Skill distribution spec

状态：Implemented and deployed
适用项目：Totem，以及未来 `demos/` 下需要“每用户一个 Agent”的官方样板项目

## 1. 目标

Totem 是 ZooWork Managed Agents 的官方样板项目。它只回答一个问题：

> Builder 如何维护一个 Skill，并把它提供给每个用户自己的 Agent？

这个模式解决两件事：

1. 新用户第一次使用时，幂等创建一个符合 Builder 预期的 Agent。
2. Builder 修改 Skill 后，已有 User Agent 自动使用新版本。

除此之外的能力不在当前样板范围内，等产品出现实际需求后再扩展。

## 2. 两个 Builder-owned 部分

Agent Definition 是项目代码中的本地 source of truth，不是新的 ZooWork API 资源。

它只有两个部分：

```text
Agent Definition
├── Identity
└── Skill
```

### Identity

Identity 是 `ip-as-logo/agents/AGENTS.md`。它是一份简短、稳定的 Persona，说明 Agent 是谁，
以及承担什么基本职责。

Identity 被复制到每个 User Agent 的 `persona.docs`。它不保存动态用户状态，也不承载经常变化的
产品工作流。

### Skill

Skill 是 `ip-as-logo/skills/ip-as-logo/`。它包含产品工作流、设计规范、脚本和参考资料。

所有 User Agent 安装同一个 org Skill ID，并且不 pin 版本。Builder 发布新版本后，Engine 自动
更新所有跟随 `latest` 的 Agent。

模型、labels 和 `sandbox.scope` 是应用运行时配置。它们不是当前分发模型中的第三个 Builder
对象。

## 3. User Agent 和 binding

每个应用用户对应一个 ZooWork Agent：

```text
user_id → agent_id
```

D1 的 `agent_bindings` 保存：

```text
user_id
zooclaw_agent_id
identity_hash
```

`identity_hash` 是 Identity 文档名和正文的 SHA-256。它用于判断复制到 User Agent 的 Persona
是否需要更新。

## 4. 新用户初始化

`api/_agent.js` 暴露一个入口：

```js
ensureAgent(identity)
```

执行顺序：

1. 从 D1 binding 查找 `agent_id`。
2. 没有 binding 时，用 `{app, user}` labels 查找已经存在的 Agent，作为恢复路径。
3. 仍不存在时，使用稳定的 `app + userId` idempotency key 创建 Agent。
4. 创建请求同时写入 Identity，并以 unpinned latest 安装共享 Skill。
5. 启动 Agent，并等待 `desired_state === 'running'`。
6. 用 `listAgentSkills()` 验证 Skill 已安装且 eligible。
7. 把 `user_id → agent_id + identity_hash` 写入 D1。

浏览器不能提交 `user_id` 或 `agent_id`。App Worker 验证 Cloudflare Access identity 后，再从 D1
解析 binding。

## 5. Skill 更新和分发

`scripts/upload-skill.mjs` 同时处理首次创建和后续更新：

```text
不存在同名自有 Skill
→ uploadSkill()

已经存在同名自有 Skill
→ uploadSkillVersion(existingSkillId)
```

脚本根据 zip 内容计算 idempotency key。Builder 不维护手工版本号。

发布新版本后不执行以下操作：

- 不遍历 User Agent；
- 不重新调用 `putAgentSkill`；
- 不修改 D1；
- 不重启 Agent 或 Session。

Engine 会 bump 跟随 `latest` 的 Agent 配置。已有 Session 在下一次 turn 读取当前配置，并在需要
Sandbox 时同步新版 Skill 文件。

## 6. Identity 更新

Identity 被复制到每个 User Agent，因此使用 lazy sync：

1. `identityDefinition()` 读取 `AGENTS.md` 并计算内容 hash。
2. 每次创建项目、发送消息或读取项目时，`findAgent()` 都会经过 `syncIdentity()`。
3. D1 中的 hash 相同，不调用 ZooWork。
4. hash 不同，只执行 `updateAgent({persona})`。
5. ZooWork 更新成功后，才把新 hash 写入 D1。

已有 Session 在下一次 turn 使用新 Identity，不需要重建。

这条路径保证活跃用户自动收敛。不活跃 Agent 不会仅为了更新版本计数而被全量重写。

## 7. Builder 工作流

修改 Skill：

```bash
# 修改 ip-as-logo/skills/ip-as-logo/
node --env-file=.env scripts/upload-skill.mjs
```

修改 Identity：

```text
修改 ip-as-logo/agents/AGENTS.md
→ 部署应用
→ 活跃用户下次请求时自动同步
```

没有 `DEF_VERSION`，也没有 `update-user-agents.mjs`。

## 8. 数据 migration

现有 D1 依次执行：

```text
0001_identity.sql
0002_identity_hash.sql
0003_drop_definition_version.sql
```

部署顺序必须是：

```bash
npm run identity:migrate
npm run identity:deploy
npm run deploy
```

先 migration，再部署读取 `identity_hash` 的 Worker，避免新代码查询不存在的列。

## 9. 验收标准

1. 同一用户并发或重复初始化只得到一个 Agent。
2. 两个用户得到不同 Agent 和不同 Sandbox。
3. 新 Agent 创建时已经安装共享 Skill，并且安装关系是 unpinned。
4. 重复执行未变化的请求不会调用 `updateAgent`。
5. 修改 Identity 后，用户下一次请求更新 Persona 和 D1 hash。
6. 发布 Skill 新版本后，不运行批量脚本，已有 User Agent 的下一次 turn 使用新版 Skill。

## 10. 检查你的理解

<details>
<summary>为什么 Skill 更新不需要遍历所有 Agent？</summary>

所有 User Agent 都 unpinned 安装同一个 org Skill。`uploadSkillVersion` 更新共享内容，Engine
负责让 follower Agent 跟随最新版本。
</details>

<details>
<summary>为什么 Identity 还需要 hash？</summary>

Identity 是复制到每个 Agent 的 Persona，没有共享版本关系。内容 hash 用来避免手工版本号和
无变化的 `updateAgent`。
</details>

<details>
<summary>Agent Definition 是 ZooWork 资源吗？</summary>

不是。它只是样板项目代码中由 Builder 维护的 Identity + Skill source of truth。
</details>
