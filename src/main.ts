import { Menu, Tray as StatusItem, app, nativeImage, type BrowserWindow, type MenuItemConstructorOptions } from "electron"
import type { Plugin } from "@opencode/plugin/gui"
import { Tray } from "./contract"
import {
  DOT,
  clean,
  detail,
  loadTasks,
  markRead,
  pickCopy,
  readOptions,
  sortTasks,
  status,
  summary,
  tally,
  type Client,
  type Task,
} from "./shared"

// Events keep the menubar current; the poll only refreshes relative times and covers a dropped stream.
const POLL = 30_000
const EVENTS = [
  "session.created",
  "session.renamed",
  "session.archived",
  "session.unarchived",
  "session.deleted",
  "session.viewed",
  "session.execution.started",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
] as const

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

export const main: Plugin.MainSetup = (ctx) => {
  // Only macOS shows a status item's title; elsewhere the item would be a blank icon.
  if (process.platform !== "darwin") return
  const options = readOptions(ctx.options)
  const text = pickCopy(options.locale === "auto" ? app.getLocale() : options.locale)
  const client = () => ctx.client as unknown as Client & {
    event: {
      subscribe(input: { types: readonly string[] }, request: { signal: AbortSignal }): AsyncIterable<unknown>
    }
  }

  let tasks: Task[] = []
  let nonce = 0
  let queued: string | undefined
  const requests = new Map<number, { sessionID: string; nonce: number }>()

  const provider = ctx.provide(Tray, {
    state: (window: number) => requests.get(window) ?? { sessionID: "", nonce: 0 },
    opened: (value, caller) => {
      if (typeof value !== "number" || requests.get(caller.window)?.nonce !== value) return
      requests.delete(caller.window)
      provider.changed(caller.window)
    },
  })

  const target = () => ctx.windows.focused() ?? ctx.windows.list().find((window) => !window.isDestroyed())

  const reveal = (window: BrowserWindow) => {
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    app.focus({ steal: true })
  }

  const send = (window: BrowserWindow, sessionID: string) => {
    requests.set(window.id, { sessionID, nonce: ++nonce })
    provider.changed(window.id)
  }

  // With every window closed the app keeps running; its activate handler restores a window.
  const restore = () => {
    app.focus({ steal: true })
    app.emit("activate")
  }

  const openTask = (sessionID: string) => {
    const window = target()
    if (!window) {
      queued = sessionID
      restore()
      return
    }
    reveal(window)
    send(window, sessionID)
  }

  ctx.onCleanup(
    ctx.windows.on("open", (window) => {
      if (!queued) return
      const sessionID = queued
      queued = undefined
      send(window, sessionID)
    }),
  )

  const openApp = () => {
    const window = target()
    if (window) reveal(window)
    else restore()
  }

  const item = new StatusItem(nativeImage.createEmpty())

  const title = () => {
    const counts = tally(tasks)
    const parts = (["running", "unread", "failed"] as const)
      .filter((state) => counts[state] > 0)
      .map((state) => `${DOT[state]}${counts[state]}`)
    return parts.length ? `${options.prefix} ${parts.join(" ")}` : options.prefix
  }

  const menu = () => {
    const counts = tally(tasks)
    // A native menu cannot scroll, so it stops at `max` and points to the window's scrolling list for the rest.
    const sorted = sortTasks(tasks)
    const list = sorted.slice(0, options.max)
    const hidden = sorted.length - list.length
    const rows: MenuItemConstructorOptions[] = list.length
      ? list.map((task) => ({
          label: shorten(`${DOT[status(task)]}  ${clean(task.title, options.prefix)}`, 60),
          sublabel: detail(text, task),
          click: () => openTask(task.id),
        }))
      : [{ label: text.empty, enabled: false }]
    return Menu.buildFromTemplate([
      { label: `${text.title} · ${summary(text, counts) || text.quiet}`, enabled: false },
      { type: "separator" },
      ...rows,
      ...(hidden > 0 ? [{ label: text.more.replace("{n}", String(hidden)), click: openApp }] : []),
      { type: "separator" },
      {
        label: text.readAll,
        enabled: counts.unread + counts.failed > 0,
        click: () => void markRead(client(), tasks).then(refresh),
      },
      { label: text.openApp, click: openApp },
    ])
  }

  const render = () => {
    if (item.isDestroyed()) return
    item.setTitle(title())
    item.setToolTip(`${text.title} · ${summary(text, tally(tasks)) || text.quiet}`)
  }

  let busy = false
  let again = false
  async function refresh() {
    if (busy) {
      again = true
      return
    }
    busy = true
    try {
      tasks = await loadTasks(client(), options)
      render()
    } catch (error) {
      ctx.log.write("warn", "openclaw-inbox refresh failed", { error: String(error) })
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
    pending = setTimeout(() => void refresh(), 300)
  }

  // Built on each click, so the list is never stale; a refresh follows for the next one.
  const show = () => {
    item.popUpContextMenu(menu())
    schedule()
  }
  item.on("click", show)
  item.on("right-click", show)
  render()
  void refresh()
  ctx.log.write("info", "openclaw-inbox menubar ready", { prefix: options.prefix })

  const listen = async () => {
    while (!ctx.signal.aborted) {
      try {
        for await (const _ of client().event.subscribe({ types: EVENTS }, { signal: ctx.signal })) schedule()
      } catch (error) {
        if (ctx.signal.aborted) return
        ctx.log.write("debug", "openclaw-inbox event stream dropped", { error: String(error) })
      }
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
  void listen()

  const timer = setInterval(() => void refresh(), POLL)
  return () => {
    clearInterval(timer)
    clearTimeout(pending)
    item.destroy()
  }
}
