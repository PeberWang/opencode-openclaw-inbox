import assert from "node:assert/strict"
import { test } from "node:test"
import { loadTasks, readOptions, status, type Session, type Task } from "../src/shared.ts"

const HOUR = 3_600_000
const now = Date.now()

const session = (id: string, title: string, time: Partial<Session["time"]>, extra: Partial<Session> = {}): Session => ({
  id,
  title,
  time: { created: now - 40 * HOUR, updated: now, ...time },
  location: { directory: "/work/project" },
  ...extra,
})

const client = (sessions: Session[]) => ({
  session: { list: async () => ({ data: sessions }), view: async () => {} },
})

test("status follows busy, idle and viewed", () => {
  const task = (time: Partial<Task>) => ({ id: "t", title: "🦞 t", directory: "", archived: true, updated: now, ...time })
  assert.equal(status(task({ busy: 2, idle: 1 })), "running")
  assert.equal(status(task({ busy: 1 })), "running")
  assert.equal(status(task({ busy: 1, idle: 2 })), "unread")
  assert.equal(status(task({ busy: 1, idle: 2, outcome: "failed" })), "failed")
  assert.equal(status(task({ busy: 1, idle: 2, viewed: 2 })), "read")
})

test("defaults to a one-day window", () => {
  assert.equal(readOptions(undefined).days, 1)
  assert.equal(readOptions({ days: 3 }).days, 3)
})

test("the window drops old read tasks and keeps anything not yet seen", async () => {
  const old = now - 30 * HOUR
  const tasks = await loadTasks(
    client([
      session("old-read", "🦞 old read", { updated: old, busy: old - HOUR, idle: old, viewed: old }),
      session("old-unread", "🦞 old unread", { updated: old, busy: old - HOUR, idle: old }),
      session("old-failed", "🦞 old failed", { updated: old, busy: old - HOUR, idle: old }, { outcome: "failed" }),
      session("recent-read", "🦞 recent read", { updated: now - HOUR, busy: now - 2 * HOUR, idle: now - HOUR, viewed: now }),
      session("running", "🦞 running", { updated: now, busy: now - HOUR }),
      session("plain", "a regular session", { updated: now }),
      session("child", "🦞 child", { updated: now }, { parentID: "parent" }),
    ]),
    readOptions({}),
  )
  assert.deepEqual(tasks.map((task) => task.id).sort(), ["old-failed", "old-unread", "recent-read", "running"])
})
