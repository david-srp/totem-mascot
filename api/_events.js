// 读事件的正确姿势，两个坑：
//  1) listEventsPage 的【事件不带 cursor】，只有页级 nextCursor（streamEvents 才带，别照搬）；
//  2) 最后一页的 nextCursor 是 null，所以 cursor 无法用来「从历史末尾续传」。
// 因此：cursor 只用于翻页，增量判断一律靠单调递增的 seq。
import { messageText } from '@zooclaw-agents/sdk'
import { zc } from './_zc.js'

const MAX_PAGES = 40

/** 抽干整个会话的事件（按 seq 升序、去重） */
export async function allEvents(agentId, sessionId, { limit = 500 } = {}) {
  const seen = new Set()
  const out = []
  let cursor
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await zc.listEventsPage(agentId, sessionId, cursor ? { cursor, limit } : { limit })
    for (const ev of page.events ?? []) {
      if (seen.has(ev.seq)) continue
      seen.add(ev.seq)
      out.push(ev)
    }
    if (!page.hasMore || !page.nextCursor) break
    cursor = page.nextCursor
  }
  out.sort((a, b) => a.seq - b.seq)
  return out
}

/** seq 大于 afterSeq 的增量 */
export async function eventsAfter(agentId, sessionId, afterSeq) {
  const all = await allEvents(agentId, sessionId)
  const n = Number.isFinite(afterSeq) ? afterSeq : -1
  return { events: all.filter((e) => e.seq > n), lastSeq: all.length ? all[all.length - 1].seq : n }
}

/**
 * 取出用户消息的纯文本。
 * 坑：user.message 的 payload.content 是【内容块数组】 [{type:'text',text:'…'}]，
 * 而 SDK 的 messageText() 对这类事件返回空串。直接把 content 当字符串用，
 * 会被 String() 成 "[object Object]" 显示到界面上。
 */
export function userText(ev) {
  // 官方 helper 收的是【消息对象】不是事件，传 ev 会静默返回空串
  const viaSdk = messageText(ev?.payload)
  if (viaSdk) return viaSdk
  const c = ev?.payload?.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .map((b) => (typeof b === 'string' ? b : typeof b?.text === 'string' ? b.text : ''))
      .filter(Boolean)
      .join('')
  }
  if (c && typeof c.text === 'string') return c.text
  if (typeof ev?.payload?.text === 'string') return ev.payload.text
  return ''
}
