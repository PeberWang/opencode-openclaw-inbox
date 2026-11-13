import { createSignal, onCleanup } from "solid-js"
import { Command, ComposerPill, Plugin, createKeyed, type IconName } from "@opencode/plugin/gui"

// The desktop app's own server: the background service that `opencode run` also talks to.
const SERVER = "sidecar"
const MINUTE = 60_000
const POLL = 20_000

type Task = {
  id: string
  title: string
  directory: string
  archived: boolean
  updated: number
  busy?: number
  idle?: number
  viewed?: number
  outcome?: string
}

type SessionLike = {
  id: string
  title?: string
  parentID?: string
  outcome?: string
  time: { created: number; updated: number; busy?: number; idle?: number; viewed?: number; archived?: number }
  location?: { directory?: string }
}

type Status = "running" | "failed" | "unread" | "read"

const COPY = {
  en: {
    title: "OpenClaw tasks",
    palette: "Open OpenClaw inbox",
    running: "running",
    unread: "unread",
    failed: "failed",
    done: "done",
    stopped: "stopped",
    quiet: "OpenClaw",
    finished: "Task finished",
    broke: "Task failed",
    open: "Open",
    restored: "Moved back to the sidebar",
    empty: "No OpenClaw tasks yet",
    now: "just now",
    ago: " ago",
    min: "{n}m",
    hour: "{n}h",
    day: "{n}d",
  },
  zh: {
    title: "OpenClaw 任务",
    palette: "打开 OpenClaw 收件箱",
    running: "运行中",
    unread: "未读",
    failed: "失败",
    done: "已完成",
    stopped: "已中断",
    quiet: "OpenClaw",
    finished: "任务完成",
    broke: "任务失败",
    open: "打开",
    restored: "已移回侧栏",
    empty: "还没有 OpenClaw 任务",
    now: "刚刚",
    ago: "前",
    min: "{n} 分钟",
    hour: "{n} 小时",
    day: "{n} 天",
  },
}

type Copy = (typeof COPY)["en"]

const RANK: Record<Status, number> = { running: 0, failed: 1, unread: 2, read: 3 }
const ICON: Record<Status, IconName> = {
  running: "status-active",
  failed: "circle-x",
  unread: "circle-check",
  read: "check",
}
const TONE = { running: "warning", failed: "danger", unread: "success", read: undefined } as const
const DOT: Record<Status, string> = { running: "🟡", failed: "🔴", unread: "🟢", read: "⚪" }

// Running wins; a finished task stays unread until its last idle point has been viewed.
function status(task: Task): Status {
  if (task.busy && (!task.idle || task.busy > task.idle)) return "running"
  const unseen = !!task.idle && (!task.viewed || task.viewed < task.idle)
  if (!unseen) return "read"
  return task.outcome === "failed" ? "failed" : "unread"
}

function duration(text: Copy, since?: number) {
  if (!since) return ""
  const minutes = Math.floor((Date.now() - since) / MINUTE)
  if (minutes < 1) return text.now
  if (minutes < 60) return text.min.replace("{n}", String(minutes))
  if (minutes < 24 * 60) return text.hour.replace("{n}", String(Math.floor(minutes / 60)))
  return text.day.replace("{n}", String(Math.floor(minutes / (24 * 60))))
}

export default Plugin.define({
  setup(ctx) {
    const options = (ctx.options ?? {}) as Record<string, unknown>
    const prefix = typeof options.prefix === "string" && options.prefix ? options.prefix : "🦞"
    const days = typeof options.days === "number" ? options.days : 7
    const max = typeof options.max === "number" ? options.max : 12
    const copy = (): Copy => {
      const locale = typeof options.locale === "string" ? options.locale : ctx.locale.locale()
      return locale.toLowerCase().startsWith("zh") ? COPY.zh : COPY.en
    }

    const [tasks, setTasks] = createSignal<Task[]>([])
    const client = () => ctx.servers.get(SERVER)?.client ?? ctx.client
    const clean = (title: string) => title.slice(prefix.length).trim() || title
    const project = (directory: string) => directory.split("/").filter(Boolean).pop() ?? directory

    const toTask = (session: SessionLike): Task | undefined => {
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

    const sorted = () =>
      [...tasks()].sort((a, b) => RANK[status(a)] - RANK[status(b)] || b.updated - a.updated)

    const detail = (task: Task) => {
      const text = copy()
      const state = status(task)
      if (state === "running") return `${project(task.directory)} · ${text.running} ${duration(text, task.busy)}`
      const label =
        state === "failed"
          ? text.failed
          : task.outcome === "interrupted"
            ? text.stopped
            : state === "unread"
              ? `${text.done} · ${text.unread}`
              : text.done
      const since = duration(text, task.idle ?? task.updated)
      return `${project(task.directory)} · ${label} · ${since === text.now ? since : since + text.ago}`
    }

    // Search narrows the list server-side; fall back to recent sessions if the server's search skips the prefix.
    let busy = false
    let again = false
    const refresh = async () => {
      if (busy) {
        again = true
        return
      }
      busy = true
      try {
        const list = async (search?: string) =>
          (await client().session.list({ search, limit: 100, order: "desc" })).data as SessionLike[]
        let sessions = await list(prefix)
        if (!sessions.some((session) => (session.title ?? "").startsWith(prefix))) sessions = await list()
        const cutoff = Date.now() - days * 24 * 60 * MINUTE
        setTasks(sessions.map(toTask).filter((task): task is Task => !!task && task.updated >= cutoff))
      } catch (error) {
        console.warn("[openclaw-inbox] refresh failed", error)
      } finally {
        busy = false
        if (again) {
          again = false
          void refresh()
        }
      }
    }

    let pending: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(pending)
      pending = setTimeout(() => void refresh(), 250)
    }

    const open = (task: Task) => {
      ctx.tabs.open({ server: SERVER, id: task.id }, { focus: true })
      const state = status(task)
      if (task.idle && (state === "unread" || state === "failed"))
        void client()
          .session.view({ sessionID: task.id, idle: task.idle })
          .then(schedule)
          .catch(() => {})
    }

    // A prompt typed by the user into an archived task means they are taking it over: put it back in the sidebar.
    const takeOver = async (sessionID: string) => {
      const info = (await client()
        .session.get({ sessionID })
        .catch(() => undefined)) as SessionLike | undefined
      if (!info?.time.archived || !(info.title ?? "").startsWith(prefix)) return
      await client().session.update({ sessionID, archived: false })
      ctx.toast.show({ title: `${prefix} ${copy().restored}`, description: clean(info.title ?? ""), duration: 3000 })
      schedule()
    }

    const finished = async (sessionID: string, eventID: string, failed: boolean) => {
      schedule()
      const info = (await client()
        .session.get({ sessionID })
        .catch(() => undefined)) as SessionLike | undefined
      const task = info && toTask(info)
      // Unarchived tasks are ordinary sessions now; the app's own notifications cover them.
      if (!task?.archived) return
      if (ctx.sessions.current()?.id === sessionID && document.hasFocus()) return
      const text = copy()
      const title = `${prefix} ${failed ? text.broke : text.finished}`
      const result = await ctx.attention.notify({
        title,
        message: clean(task.title),
        variant: failed ? "error" : "default",
        session: { server: SERVER, id: sessionID },
        id: `openclaw-inbox:${sessionID}:${eventID}`,
      })
      if (!result.notification)
        ctx.toast.show({
          title,
          description: clean(task.title),
          variant: failed ? "error" : "success",
          actions: [{ label: text.open, run: () => open(task) }],
        })
    }

    createKeyed(
      () => ctx.servers.get(SERVER)?.data,
      (data) => {
        void refresh()
        const on = data.on as (type: string, handler: (event: any) => void) => () => void
        for (const type of [
          "session.created",
          "session.renamed",
          "session.archived",
          "session.unarchived",
          "session.deleted",
          "session.viewed",
          "session.execution.started",
          "session.execution.interrupted",
        ])
          onCleanup(on(type, schedule))
        onCleanup(
          on("session.inbox.enqueued", (event) => {
            const item = event.data?.item
            if (item?.type !== "user") return
            const metadata = item.payload?.metadata
            // `opencode run` sends no admission metadata; the desktop composer always does.
            const interactive =
              (metadata && Object.keys(metadata).length > 0) ||
              (ctx.sessions.current()?.id === event.data.sessionID && document.hasFocus())
            if (interactive)
              void takeOver(event.data.sessionID).catch((error) =>
                console.warn("[openclaw-inbox] unarchive failed", error),
              )
          }),
        )
        onCleanup(on("session.execution.succeeded", (event) => void finished(event.data.sessionID, event.id, false)))
        onCleanup(on("session.execution.failed", (event) => void finished(event.data.sessionID, event.id, true)))
      },
    )

    ctx.add(ComposerPill, {
      id: "inbox",
      order: 100,
      show: () => {
        const list = sorted()
        if (list.length === 0) return undefined
        const text = copy()
        const counts: Record<Status, number> = { running: 0, failed: 0, unread: 0, read: 0 }
        for (const task of list) counts[status(task)]++
        const parts = [
          counts.running && `${counts.running} ${text.running}`,
          counts.unread && `${counts.unread} ${text.unread}`,
          counts.failed && `${counts.failed} ${text.failed}`,
        ].filter(Boolean)
        return {
          label: `${prefix} ${parts.length ? parts.join(" · ") : text.quiet}`,
          tone: counts.failed
            ? ("danger" as const)
            : counts.unread
              ? ("success" as const)
              : counts.running
                ? ("warning" as const)
                : undefined,
          title: text.title,
          rows: list.slice(0, max).map((task) => {
            const state = status(task)
            return {
              id: task.id,
              label: clean(task.title),
              icon: ICON[state],
              tone: TONE[state],
              detail: detail(task),
              run: () => open(task),
            }
          }),
        }
      },
    })

    ctx.add(Command, () => ({
      id: "open",
      title: copy().palette,
      keywords: "openclaw inbox claw tasks 收件箱 任务",
      run: async () => {
        const list = sorted()
        if (list.length === 0) {
          ctx.toast.show({ title: copy().empty })
          return
        }
        const id = await ctx.dialogs.select({
          title: copy().title,
          options: list.map((task) => ({
            title: `${DOT[status(task)]} ${clean(task.title)}`,
            description: detail(task),
            value: task.id,
          })),
        })
        const task = list.find((item) => item.id === id)
        if (task) open(task)
      },
    }))

    const timer = setInterval(() => void refresh(), POLL)
    return () => {
      clearInterval(timer)
      clearTimeout(pending)
    }
  },
})
