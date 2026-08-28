import { allEvents, eventsAfter } from '../api/_events.js'
const SID = process.env.SID
const all = await allEvents(SID)
console.log('全量:', all.length, '条, seq 范围', all[0]?.seq, '→', all[all.length-1]?.seq)
const a = await eventsAfter(SID, -1)
console.log('afterSeq=-1 :', a.events.length, '条, lastSeq =', a.lastSeq)
const b = await eventsAfter(SID, a.lastSeq)
console.log('afterSeq=' + a.lastSeq + ' :', b.events.length, '条 (应为 0), lastSeq =', b.lastSeq)
const c = await eventsAfter(SID, Math.floor(a.lastSeq/2))
console.log('afterSeq=' + Math.floor(a.lastSeq/2) + ' :', c.events.length, '条 (应为部分)')
