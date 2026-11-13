import { For, Show, createMemo, createSignal, onCleanup } from "solid-js"
import { Portal } from "solid-js/web"
import { Command, Slot, Style, createKeyed, type Plugin } from "@opencode/plugin/gui"
import { Tray } from "./contract"
import { css } from "./style"
import {
  DOT,
  SERVER,
  clean,
  detail,
  keep,
  loadTasks,
  markRead,
  pickCopy,
  project,
  readOptions,
  sortTasks,
  status,
  summary,
  tally,
  toTask,
  type Client,
  type Session,
  type Status,
  type Task,
} from "./shared"

const POLL = 20_000
const LOUD: readonly Status[] = ["running", "unread", "failed"]

type HeaderInput = { readonly active: boolean; readonly compact: boolean }

export const setup: Plugin.Setup = (ctx) => {
  const options = readOptions(ctx.options)
  const copy = () => pickCopy(options.locale === "auto" ? ctx.locale.locale() : options.locale)
  const client = () => (ctx.servers.get(SERVER)?.client ?? ctx.client) as unknown as Client & {
    session: {
      get(input: { sessionID: string }): Promise<unknown>
      update(input: { sessionID: string; archived: boolean }): Promise<void>
    }
  }
  const fetchSession = (sessionID: string) =>
    client()
      .session.get({ sessionID })
      .catch(() => undefined) as Promise<Session | undefined>

  const [tasks, setTasks] = createSignal<Task[]>([])
  const sorted = createMemo(() => sortTasks(tasks()))
  const counts = createMemo(() => tally(tasks()))

  let busy = false
  let again = false
  const refresh = async () => {
    if (busy) {
      again = true
      return
    }
    busy = true
    try {
      setTasks(await loadTasks(client(), options))
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

  const view = async (sessionID: string) => {
    const info = await fetchSession(sessionID)
    const task = info && toTask(info, options.prefix)
    if (task) await markRead(client(), [task])
    schedule()
  }

  const openTask = (sessionID: string) => {
    ctx.tabs.open({ server: SERVER, id: sessionID }, { focus: true })
    void view(sessionID)
  }

  // A prompt typed by the user into an archived task means they are taking it over: make it a regular session.
  const takeOver = async (sessionID: string) => {
    const info = await fetchSession(sessionID)
    if (!info?.time.archived || !(info.title ?? "").startsWith(options.prefix)) return
    await client().session.update({ sessionID, archived: false })
    const text = copy()
    ctx.toast.show({
      title: `${options.prefix} ${text.converted}`,
      description: text.convertedHint.replace("{project}", project(info.location?.directory ?? "")),
      duration: 6000,
    })
    schedule()
  }

  const finished = async (sessionID: string, eventID: string, failed: boolean) => {
    schedule()
    const info = await fetchSession(sessionID)
    const task = info && toTask(info, options.prefix)
    // Taken-over tasks are regular sessions now; the app's own notifications cover them.
    if (!task?.archived) return
    if (ctx.sessions.current()?.id === sessionID && document.hasFocus()) return
    const text = copy()
    const title = `${options.prefix} ${failed ? text.broke : text.finished}`
    const result = await ctx.attention.notify({
      title,
      message: clean(task.title, options.prefix),
      variant: failed ? "error" : "default",
      session: { server: SERVER, id: sessionID },
      id: `openclaw-inbox:${sessionID}:${eventID}`,
    })
    if (!result.notification)
      ctx.toast.show({
        title,
        description: clean(task.title, options.prefix),
        variant: failed ? "error" : "success",
        actions: [{ label: text.open, run: () => openTask(sessionID) }],
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

  // The menubar asks this window to open a session; acknowledge so main forgets the request.
  if (ctx.app.platform === "desktop") {
    const tray = ctx.main(Tray)
    createKeyed(
      () => {
        const request = tray.state()
        return request && request.nonce > 0 ? request : undefined
      },
      (request) => {
        openTask(request.sessionID)
        void tray.opened(request.nonce).catch(() => {})
      },
      { equals: (a, b) => a.nonce === b.nonce },
    )
  }

  // The badge sits with the session title row's actions, at the top right, and opens a scrolling list.
  const Badge = (props: { input: HeaderInput }) => {
    const [open, setOpen] = createSignal(false)
    const [place, setPlace] = createSignal({ top: 0, right: 0 })
    let button: HTMLButtonElement | undefined
    let pop: HTMLDivElement | undefined

    const position = () => {
      if (!button) return
      const rect = button.getBoundingClientRect()
      setPlace({ top: Math.round(rect.bottom + 6), right: Math.max(8, Math.round(window.innerWidth - rect.right)) })
    }

    const loud = () => LOUD.filter((state) => counts()[state] > 0)
    const urgent = () => (["failed", "unread", "running"] as const).find((state) => counts()[state] > 0)

    createKeyed(open, () => {
      const outside = (event: PointerEvent) => {
        const target = event.target as Node
        if (!button?.contains(target) && !pop?.contains(target)) setOpen(false)
      }
      const key = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false)
      }
      document.addEventListener("pointerdown", outside, true)
      document.addEventListener("keydown", key, true)
      window.addEventListener("resize", position)
      onCleanup(() => {
        document.removeEventListener("pointerdown", outside, true)
        document.removeEventListener("keydown", key, true)
        window.removeEventListener("resize", position)
      })
    })
    // A cached timeline that leaves the screen closes its list.
    createKeyed(
      () => !props.input.active,
      () => setOpen(false),
    )

    const toggle = () => {
      if (open()) return setOpen(false)
      position()
      setOpen(true)
      void refresh()
    }

    return (
      <Show when={tasks().length > 0}>
        <button
          ref={button}
          type="button"
          class="oci-badge"
          data-open={open() ? "" : undefined}
          data-quiet={loud().length === 0 ? "" : undefined}
          aria-haspopup="dialog"
          aria-expanded={open()}
          title={`${copy().title}${summary(copy(), counts()) ? ` · ${summary(copy(), counts())}` : ""}`}
          onClick={toggle}
        >
          <span class="oci-claw">{options.prefix}</span>
          <Show
            when={!props.input.compact}
            fallback={<Show when={urgent()}>{(state) => <span class="oci-dot" data-status={state()} />}</Show>}
          >
            <For each={loud()}>
              {(state) => (
                <span class="oci-count">
                  <span class="oci-dot" data-status={state} />
                  {counts()[state]}
                </span>
              )}
            </For>
          </Show>
        </button>
        <Show when={open()}>
          <Portal>
            <div
              ref={pop}
              class="oci-pop"
              role="dialog"
              aria-label={copy().title}
              data-mode={ctx.appearance.mode()}
              style={{ top: `${place().top}px`, right: `${place().right}px` }}
            >
              <div class="oci-head">
                <strong>{copy().title}</strong>
                <span class="oci-sum">{summary(copy(), counts()) || copy().quiet}</span>
                <Show when={counts().unread + counts().failed > 0}>
                  <button type="button" class="oci-link" onClick={() => void markRead(client(), tasks()).then(schedule)}>
                    {copy().readAll}
                  </button>
                </Show>
              </div>
              <div class="oci-list">
                <For each={sorted()} fallback={<div class="oci-empty">{copy().empty}</div>}>
                  {(task) => (
                    <button
                      type="button"
                      class="oci-row"
                      onClick={() => {
                        setOpen(false)
                        openTask(task.id)
                      }}
                    >
                      <span class="oci-dot" data-status={status(task)} />
                      <span class="oci-text">
                        <span class="oci-title">{clean(task.title, options.prefix)}</span>
                        <span class="oci-detail">{detail(copy(), task)}</span>
                      </span>
                    </button>
                  )}
                </For>
              </div>
              <div class="oci-foot">{keep(copy(), options.days)}</div>
            </div>
          </Portal>
        </Show>
      </Show>
    )
  }

  ctx.add(Style, css)
  ctx.add(Slot, {
    at: "session.header",
    order: -100,
    render: (input) => <Badge input={input} />,
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
          title: `${DOT[status(task)]} ${clean(task.title, options.prefix)}`,
          description: detail(copy(), task),
          value: task.id,
        })),
      })
      if (id) openTask(id)
    },
  }))

  const timer = setInterval(() => void refresh(), POLL)
  return () => {
    clearInterval(timer)
    clearTimeout(pending)
  }
}
