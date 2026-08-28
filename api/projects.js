// 项目 = 一个 ZooClaw session。项目名写在 session metadata（写入即固定，正好当标题用）。
import { zc, AGENT_ID, readJson, send, route } from './_zc.js'

export const config = { maxDuration: 30 }


/**
 * 把「项目名 + 一句产品描述」包成一个意图明确的首轮请求。
 *
 * 不包装的话，用户填的那句话会被原样当成指令。实测有人填「督促我坚持运动，激励」，
 * agent 就真去当健身教练了，完全没意识到这是在给产品做 Logo，用户当场流失。
 * 项目名也别浪费，它往往就是品牌名，是很重要的上下文。
 */
function framedBrief(title, brief) {
  const name = String(title || '').trim()
  const what = String(brief || '').trim()
  if (!what) {
    return [
      `我要做一枚 IP 吉祥物 Logo，品牌／项目名是「${name}」。`,
      '',
      '我还没写产品介绍。你先一次性把需要知道的都问清楚（它做什么、给谁用、想要什么气质），',
      '我答完你再给三个方向，不要分好几轮问我，也不要在信息不全的情况下直接开画。',
    ].join('\n')
  }
  return [
    '我要给下面这个产品做一枚 IP 吉祥物 Logo。',
    '',
    `品牌／项目名：${name}`,
    `它是做什么的：${what}`,
    '',
    '请先按规范给我三个设计方向，每个方向一行，说清楚主体、和产品的关联、定义性剪影，',
    '然后提议生成六张候选图，等我点头再动笔。',
    '如果上面这些信息还不足以判断产品定位和气质，就一次性把要问的都问完，不要分好几轮问我。',
  ].join('\n')
}

export default route(async (req, res) => {
  if (req.method === 'GET') {
    // listSessions 每页 50、按 updated_at 倒序、无游标；取前两页够用
    const rows = []
    for (const page of [1, 2]) {
      const r = await zc.listSessions(AGENT_ID, { page })
      rows.push(...r)
      if (r.length < 50) break
    }
    const projects = rows
      .filter((s) => !s.archived && s.metadata?.app === 'ip-as-logo')
      .map((s) => ({
        id: s.session_id,
        title: s.metadata?.title || '未命名项目',
        brief: s.metadata?.brief || '',
        updatedAt: s.updated_at,
        runStatus: s.run_status,
      }))
    return send(res, 200, { projects })
  }

  if (req.method === 'POST') {
    const { title, message } = await readJson(req)
    if (!title || typeof title !== 'string') return send(res, 400, { error: 'title required' })
    const s = await zc.createSession(AGENT_ID, {
      // metadata 是写入即固定的（没有 patchSession），所以标题在建项目时就定下来
      metadata: {
        app: 'ip-as-logo',
        title: title.slice(0, 80),
        brief: (message || '').slice(0, 200),
      },
      initial_events: [{ type: 'user.message', content: framedBrief(title, message) }],
    })
    return send(res, 200, { id: s.session_id, title, started: true, opener: framedBrief(title, message) })
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url, 'http://x').searchParams.get('session')
    if (!id) return send(res, 400, { error: 'session required' })
    // 有在跑的 run 时 archiveSession 是 409 session_running：先打断，再重试到真正停下
    try { await zc.postEvents(AGENT_ID, id, [{ type: 'user.interrupt' }]) } catch {}
    let archived = false
    for (let i = 0; i < 8 && !archived; i++) {
      try { await zc.archiveSession(AGENT_ID, id); archived = true }
      catch (e) {
        if (e?.type !== 'session_running') throw e
        await new Promise((r) => setTimeout(r, 1500))
      }
    }
    if (!archived) return send(res, 409, { error: '会话仍在运行，稍后再归档' })
    return send(res, 200, { archived: true })
  }

  send(res, 405, { error: 'method not allowed' })
})
