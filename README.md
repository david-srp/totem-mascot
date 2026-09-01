# 图腾 Totem · 吉祥物标志工作台

把一个主体压成一枚 32 像素下还认得出的方形 IP 吉祥物标志。
说一句你的产品是做什么的，它给三个方向和六张独立候选图，画完逐张回看核对，不合格的自己重画一次。

这个仓库是一个可独立部署的 Builder 样板。每个 Builder 使用自己的 ZooClaw organization、
Cloudflare account、D1、Access application 和 domain，不共享部署配置。

## 这是什么

一个跑在 [ZooClaw Managed Agents](https://github.com/SerendipityOneInc/zoowork-sdk-skills) 上的托管 agent，
外加一个自己写的 Web 前端。初始设计规范来自开源技能
[s1dashu/ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill)（MIT）。Builder 可以在自己的
分支持续修改并发布新版 Skill。

三个页面：

| 路径 | 内容 |
|---|---|
| `/` | 产品介绍 |
| `/app` | 工作台：建项目、多轮对话、成品抽屉 |
| `/guide` | 从零做一个这样的 agent 的教程，写给不写代码的人 |

全站支持中英切换（按浏览器语言自动适配）和亮/暗/跟随系统三态主题。

## 目录

```
api/            服务端 API handlers（密钥只存在这一层）
  _identity.js    验证 Cloudflare Access JWT，通过 identity Worker 解析应用 user
  _agent.js       每用户 Agent 的查找、创建和 Identity hash lazy sync
  _zc.js          ZooClaw 客户端 + 统一错误处理
  _events.js      事件读取。按 seq 做增量，不要用游标（见下）
  projects.js     项目 = 一个 session；把用户输入包装成意图明确的首轮请求
  logo.js         投递消息 + 轮询增量
  history.js      还原多轮对话，并把 attachment 事件归到所在轮次
  artifacts.js    产出图片，返回可直接访问的 URL
  logo-image.js   沙箱取图兜底（exec + base64 分块）
public/         静态页（首页 / 教程）与共享资源。tokens.css 是全站设计令牌，i18n.js 是静态页英文字典
web/            工作台（/app）的源码，Vite + React + TypeScript；构建产物落到 public/
infra/identity-worker/  Cloudflare Worker + D1 migrations，只存 identity 和 agent binding
worker/         Cloudflare App Worker 入口，提供静态 assets 和 /api/* adapter
ip-as-logo/     agent 的 Identity（AGENTS.md）与 Builder 持续维护的技能包（SKILL.md）
scripts/        部署、本地开发、端到端测试
  probes/         开发时的一次性排查脚本，保留作参考
```

## 跑起来

从自己的 ZooClaw 和 Cloudflare account 部署完整实例，请先按
[`docs/builder-setup.md`](docs/builder-setup.md) 操作。仓库中的 `*.example.jsonc` 只定义字段，
真实 `.env` 和 `wrangler.jsonc` 都在本地生成并被 Git 忽略。

```bash
npm install && npm --prefix web install
cp .env.example .env          # 填入你的 ZOOCLAW_API_KEY 和本地开发邮箱
cp wrangler.example.jsonc wrangler.jsonc
cp infra/identity-worker/wrangler.example.jsonc infra/identity-worker/wrangler.jsonc
# 按 builder-setup.md 创建自己的 D1、Workers、Access app 和 custom domain

node --env-file=.env scripts/probe.mjs          # 验证密钥可用
npm run skill:publish                           # 首次创建 Skill；之后发布新版本

npm run dev:api               # API + 静态页 http://127.0.0.1:5290
npm run dev:web               # 工作台热更新 http://127.0.0.1:5173/app.html（/api 代理到 5290）
```

只想看构建后的完整站点：`npm run build` 之后直接访问 5290 的 `/app` 即可
（`/app` 的页面是构建产物，不进版本库；改工作台代码在 `web/src/` 下改）。

部署：`npm run deploy`。Cloudflare Access、D1、Workers 和生产 secrets 的创建顺序见
[`docs/builder-setup.md`](docs/builder-setup.md)，架构边界见
[`docs/architecture-spec.md`](docs/architecture-spec.md)。

## Agent 和 Skill 怎么管

目标架构和后续迭代计划见
[`docs/agent-lifecycle-spec.md`](docs/agent-lifecycle-spec.md)。

没有固定的 agent id。Cloudflare Access 验证当前 Builder 允许的邮箱域，D1 把 Access identity
解析成稳定的应用 user id。用户第一次建项目时，服务端为这个 user 懒创建专属 agent，
并把 binding 写入 D1。浏览器不保存、也不能提交 user id。

Agent Definition 集中在 `ip-as-logo/agent-def.mjs`，只包含两个 Builder-owned 部分：

- Identity：简短、稳定的 `ip-as-logo/agents/AGENTS.md`；
- Skill：持续迭代的 `ip-as-logo/skills/ip-as-logo/`。

所有用户 Agent unpinned 安装同一个 org Skill。修改 Skill 后只发布现有 Skill 的新版本：

```bash
# 修改 ip-as-logo/skills/ip-as-logo/ 后执行
npm run skill:publish
```

Engine 会让已有 User Agent 自动跟随 `latest`，不用遍历 Agent，也不用重新挂 Skill。

Identity 修改后随应用部署。D1 保存内容 hash，活跃用户下一次请求时只在 hash 变化的情况下
更新 Persona。项目不使用 `DEF_VERSION` 或手工定义版本号。

## 踩过的坑

做这个项目时撞上的、值得写下来的几条：

- **画图只能用同步的命令行**。运行时那个 `image_generate` 工具是异步的，完成事件晚于本轮 run 结束，
  实测空转 118 秒、run 报成功、一张图没交出来。要用 `/skills/designer/scripts/image_generation_cli.py`。
- **人设里不能留退路**。写「如果有 X 工具就用，没有就跳过」，模型就真的跳过。所有必做的事写成命令句。
- **事件增量按 `seq` 不按游标**。`listEventsPage` 返回的事件不带 cursor（`streamEvents` 的才带），
  而且末页 `nextCursor` 是 `null`，照搬流式写法会导致每次轮询重放全部历史。
- **`messageText()` 收的是消息对象不是事件**。传 `messageText(ev)` 会静默返回空串，
  要传 `messageText(ev.payload)`。
- **图片交付有两套机制，各缺一半**：`artifact_publish` 有 URL 但不知道属于哪一轮，
  `attachment_publish` 有轮次但只有 R2 key 没有 URL。前端按文件名 join，再加时间窗兜底。
- **用户输入要包装**。直接把「产品是做什么的」那句话透传给 agent，它可能完全误解意图
  （有人填「督促我坚持运动」，agent 直接去当健身教练了）。见 `api/projects.js` 的 `framedBrief()`。
- **认证只认正式域名**。`workers_dev` 已关闭，所有生产请求统一从 Access 保护的 custom domain 进入。

更完整的版本在 `/guide` 页面上。

## 许可

设计规范来自 [ip-as-logo](https://github.com/s1dashu/ip-as-logo-skill)，MIT。
