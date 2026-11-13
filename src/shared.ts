// Logic shared by the window and the main process. Nothing here may touch the DOM or Electron.

// The desktop app's own server: the background service that `opencode run` also talks to.
export const SERVER = "sidecar"
export const MINUTE = 60_000

export type Session = {
  id: string
  title?: string
  parentID?: string
  outcome?: string
  time: { created: number; updated: number; busy?: number; idle?: number; viewed?: number; archived?: number }
  location?: { directory?: string }
}

export type Task = {
  id: string
  title: string
  directory: string
  // Still owned by the dispatcher. An unarchived task is one the user took over.
  archived: boolean
  updated: number
  busy?: number
  idle?: number
  viewed?: number
  outcome?: string
}

export type Status = "running" | "failed" | "unread" | "read"

export type Options = { prefix: string; days: number; max: number; locale?: string }

// Structural, so the window's and main's clients both fit.
export type Client = {
  session: {
    list(input: { search?: string; limit?: number; order?: "asc" | "desc" }): Promise<{ data: readonly unknown[] }>
    view(input: { sessionID: string; idle: number }): Promise<void>
  }
}

export function readOptions(raw: unknown): Options {
  const options = (raw ?? {}) as Record<string, unknown>
  return {
    prefix: typeof options.prefix === "string" && options.prefix ? options.prefix : "🦞",
    days: typeof options.days === "number" ? options.days : 1,
    max: typeof options.max === "number" ? options.max : 15,
    locale: typeof options.locale === "string" ? options.locale : undefined,
  }
}

const EN = {
  title: "OpenClaw tasks",
  palette: "Open OpenClaw inbox",
  running: "running",
  unread: "unread",
  failed: "failed",
  done: "done",
  stopped: "stopped",
  taken: "taken over",
  finished: "Task finished",
  broke: "Task failed",
  open: "Open",
  converted: "Now a regular session",
  convertedHint: "Find it on Home under All projects, or in {project}",
  empty: "No OpenClaw tasks yet",
  quiet: "Nothing running or unread",
  readAll: "Mark all read",
  openApp: "Open OpenCode",
  keep: "Unread tasks stay; read ones for {window}",
  hours: "24 hours",
  days: "{n} days",
  now: "just now",
  ago: " ago",
  min: "{n}m",
  hour: "{n}h",
  day: "{n}d",
}

export type Copy = typeof EN

const ZH: Copy = {
  title: "OpenClaw 任务",
  palette: "打开 OpenClaw 收件箱",
  running: "运行中",
  unread: "未读",
  failed: "失败",
  done: "已完成",
  stopped: "已中断",
  taken: "已接手",
  finished: "任务完成",
  broke: "任务失败",
  open: "打开",
  converted: "已转为普通会话",
  convertedHint: "主页选「所有项目」或项目「{project}」可以找到",
  empty: "还没有 OpenClaw 任务",
  quiet: "没有运行中或未读的任务",
  readAll: "全部标为已读",
  openApp: "打开 OpenCode",
  keep: "未读的一直保留，已读的保留 {window}",
  hours: "24 小时",
  days: "{n} 天",
  now: "刚刚",
  ago: "前",
  min: "{n} 分钟",
  hour: "{n} 小时",
  day: "{n} 天",
}

export function pickCopy(locale?: string): Copy {
  return locale?.toLowerCase().startsWith("zh") ? ZH : EN
}

export const DOT: Record<Status, string> = { running: "🟡", failed: "🔴", unread: "🟢", read: "⚪" }
const RANK: Record<Status, number> = { running: 0, failed: 1, unread: 2, read: 3 }

// Running wins; a finished task stays unread until its last idle point has been viewed.
export function status(task: Task): Status {
  if (task.busy && (!task.idle || task.busy > task.idle)) return "running"
  const unseen = !!task.idle && (!task.viewed || task.viewed < task.idle)
  if (!unseen) return "read"
  return task.outcome === "failed" ? "failed" : "unread"
}

export function tally(tasks: readonly Task[]) {
  const counts: Record<Status, number> = { running: 0, failed: 0, unread: 0, read: 0 }
  for (const task of tasks) counts[status(task)]++
  return counts
}

export function sortTasks(tasks: readonly Task[]) {
  return [...tasks].sort((a, b) => RANK[status(a)] - RANK[status(b)] || b.updated - a.updated)
}

export function summary(text: Copy, counts: Record<Status, number>) {
  return [
    counts.running && `${counts.running} ${text.running}`,
    counts.unread && `${counts.unread} ${text.unread}`,
    counts.failed && `${counts.failed} ${text.failed}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function project(directory: string) {
  return directory.split("/").filter(Boolean).pop() ?? directory
}

export function clean(title: string, prefix: string) {
  return title.slice(prefix.length).trim() || title
}

function duration(text: Copy, since?: number) {
  if (!since) return ""
  const minutes = Math.floor((Date.now() - since) / MINUTE)
  if (minutes < 1) return text.now
  if (minutes < 60) return text.min.replace("{n}", String(minutes))
  if (minutes < 24 * 60) return text.hour.replace("{n}", String(Math.floor(minutes / 60)))
  return text.day.replace("{n}", String(Math.floor(minutes / (24 * 60))))
}

export function detail(text: Copy, task: Task) {
  const state = status(task)
  const taken = task.archived ? "" : ` · ${text.taken}`
  if (state === "running") return `${project(task.directory)} · ${text.running} ${duration(text, task.busy)}${taken}`
  const label =
    state === "failed"
      ? text.failed
      : task.outcome === "interrupted"
        ? text.stopped
        : state === "unread"
          ? `${text.done} · ${text.unread}`
          : text.done
  const since = duration(text, task.idle ?? task.updated)
  return `${project(task.directory)} · ${label} · ${since === text.now ? since : since + text.ago}${taken}`
}

export function keep(text: Copy, days: number) {
  return text.keep.replace("{window}", days === 1 ? text.hours : text.days.replace("{n}", String(days)))
}

export function toTask(session: Session, prefix: string): Task | undefined {
  const title = session.title ?? ""
  if (!title.startsWith(prefix) || session.parentID) return undefined
  return {
    id: session.id,
    title,
    directory: session.location?.directory ?? "",
    archived: !!session.time.archived,
    updated: session.time.updated,
    busy: session.time.busy,
    idle: session.time.idle,
    viewed: session.time.viewed,
    outcome: session.outcome,
  }
}

// Search narrows the list server-side; fall back to recent sessions if the server's search skips the prefix.
// The day window drops only read tasks: anything running, unread or failed stays until it has been seen.
export async function loadTasks(client: Client, options: Options) {
  const list = async (search?: string) =>
    (await client.session.list({ search, limit: 100, order: "desc" })).data as Session[]
  let sessions = await list(options.prefix)
  if (!sessions.some((session) => (session.title ?? "").startsWith(options.prefix))) sessions = await list()
  const cutoff = Date.now() - options.days * 24 * 60 * MINUTE
  return sessions
    .map((session) => toTask(session, options.prefix))
    .filter((task): task is Task => !!task && (task.updated >= cutoff || status(task) !== "read"))
}

export async function markRead(client: Client, tasks: readonly Task[]) {
  await Promise.allSettled(
    tasks
      .filter((task) => task.idle && (status(task) === "unread" || status(task) === "failed"))
      .map((task) => client.session.view({ sessionID: task.id, idle: task.idle! })),
  )
}
