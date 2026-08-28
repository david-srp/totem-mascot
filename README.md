# 图腾 Totem · 吉祥物标志工作台

把一个主体压成一枚 32 像素下还认得出的方形 IP 吉祥物标志。
说一句你的产品是做什么的，它给三个方向和六张独立候选图，画完逐张回看核对，不合格的自己重画一次。

线上：<https://totem-mascot.vercel.app>
（旧域名 <https://agent-builder-test1.vercel.app> 仍然可用，对外材料里引用的是它）

## 这是什么

一个跑在 [ZooClaw Managed Agents](https://github.com/SerendipityOneInc/zoowork-sdk-skills) 上的托管 agent，
外加一个自己写的 Web 前端。设计规范直接复刻自开源技能
[s1dashu/ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill)（MIT，一个字未改）。

三个页面：

| 路径 | 内容 |
|---|---|
| `/` | 产品介绍 |
| `/app` | 工作台：建项目、多轮对话、成品抽屉 |
| `/guide` | 从零做一个这样的 agent 的教程，写给不写代码的人 |

全站支持中英切换（按浏览器语言自动适配）和亮/暗/跟随系统三态主题。

## 目录

```
api/            Vercel 无服务端函数（密钥只存在这一层）
  _zc.js          ZooClaw 客户端 + 统一错误处理
  _events.js      事件读取。按 seq 做增量，不要用游标（见下）
  projects.js     项目 = 一个 session；把用户输入包装成意图明确的首轮请求
  logo.js         投递消息 + 轮询增量
  history.js      还原多轮对话，并把 attachment 事件归到所在轮次
  artifacts.js    产出图片，返回可直接访问的 URL
  logo-image.js   沙箱取图兜底（exec + base64 分块）
public/         前端。tokens.css 是两页共用的设计令牌，i18n.js 是英文字典
ip-as-logo/     agent 的人设（AGENTS.md）与技能包（SKILL.md，逐字复刻上游）
scripts/        部署、本地开发、端到端测试
  probes/         开发时的一次性排查脚本，保留作参考
```

## 跑起来

```bash
npm install
cp .env.example .env          # 填入你的 ZOOCLAW_API_KEY

node --env-file=.env scripts/probe.mjs          # 验证密钥可用
node --env-file=.env scripts/build-ip-agent.mjs # 建 agent 并挂技能，打印 IP_AGENT_ID
node --env-file=.env scripts/dev-logo-server.mjs # 本地起前端 http://127.0.0.1:5290
```

部署：`vercel --prod`（需要在 Vercel 项目里配好 `ZOOCLAW_API_KEY` 和 `IP_AGENT_ID`）。

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
- **别拿预览链接的表现推断正式环境**。Vercel 的 SSO 保护只挡预览 URL，不挡生产域名。

更完整的版本在 `/guide` 页面上。

## 许可

设计规范来自 [ip-as-logo](https://github.com/s1dashu/ip-as-logo-skill)，MIT。
