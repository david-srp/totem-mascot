# 一次性排查脚本

这些是开发过程中为了搞清楚某个具体问题临时写的，不属于主流程，
但记录了几个关键结论是怎么验证出来的，保留作参考：

- `probe-attach*.mjs` / `probe-join.mjs` — 搞清 `attachment.created` 事件和 artifact 怎么按文件名关联
- `probe-drain.mjs` — 验证事件分页要按 `seq` 而不是游标做增量
- `probe-msgtext.mjs` — 验证 `messageText()` 收的是消息对象不是事件
- `imagegen-*.mjs` — 验证 designer 的同步 CLI 与 gpt-image-2 参数
- `check-credentials.mjs` — 确认沙箱里内置技能的凭证注入是否完整

跑法和主线一样：`node --env-file=.env scripts/probes/xxx.mjs`
