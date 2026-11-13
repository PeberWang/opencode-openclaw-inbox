# opencode-openclaw-inbox

An OpenCode Desktop GUI plugin that gives tasks dispatched by another agent (OpenClaw, a script, a cron job) their own inbox, instead of piling them into Home and the session lists.

- **Dispatch** with `opencode run --archived --title "🦞 <task>" "<prompt>"`. `--archived` keeps the session out of Home and the session lists; the `🦞 ` title prefix puts it in the inbox.
- **Session header badge**: a quiet `🦞 ●1 ●2` at the top right of the session title row, beside the context usage. It shows a colored count only for tasks that are running, unread or failed. Click it for a list of every task: status, project and age, in a fixed-height list that scrolls. Click a row to open the task as a tab, which also marks it read.
- **macOS menubar item**: `🦞 🟡1 🟢2` stays in the menubar while OpenCode Desktop runs, even with its windows closed. Click a task in its menu and OpenCode comes forward on that session.
- **Get notified** when a task finishes: a system notification, or a toast while the window has focus.
- **Take over**: send a message from the desktop composer in an archived task and the plugin unarchives it, so it becomes a regular session. Home lists it under **All projects** or under its own project. Follow-ups from the dispatcher (`opencode run -s <id> "..."`) keep it archived.
- **Command palette**: "Open OpenClaw inbox" lists the same tasks from anywhere.

## Install

GUI parts load only from the global config (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugins": [{ "package": "/path/to/openclaw-inbox", "options": { "locale": "zh" } }],
}
```

| Option   | Default         | Meaning                                    |
| -------- | --------------- | ------------------------------------------ |
| `prefix` | `"🦞"`          | Title prefix that marks a dispatched task  |
| `days`   | `7`             | Only list tasks updated in the last N days |
| `max`    | `15`            | Tasks in the menubar menu                  |
| `locale` | follows the app | `"en"` or `"zh"`                           |

Build the bundle after cloning or editing:

```bash
npm install
npm run build        # or: npm run dev (rebuilds on save; the desktop app reloads the GUI and the menubar item)
```

## How it works

- Tasks are root sessions whose title starts with the prefix, read from the desktop app's own server (`sidecar`). The window refreshes on session events and every 20 seconds; the main process follows the server's event stream and polls every 30 seconds.
- Status comes from the session itself: `time.busy` / `time.idle` for running, `time.viewed` for read, `outcome` for failure.
- The menubar item lives in the plugin's `main` part (Electron `Tray`). A click hands the session to a window through a typed `Ipc` state, so a window that opens late still receives it; with no window open, the app's own activate handler restores one first.
- Take-over detection: the desktop composer sends admission metadata with every prompt and `opencode run` sends none, so an enqueued user prompt with metadata, or one sent into the session the focused window is showing, unarchives the task through `PATCH /api/session/{id}`. The server plugin API ignores `archived` (anomalyco/opencode#61038), so this lives in the GUI part.
- Home lists one project at a time unless **All projects** is selected, so a taken-over task in a project you never opened appears there, not under the project you work in.

## Notes

- On a Mac with a notch, macOS hides menubar items that do not fit beside a long app menu. ⌘-drag `🦞` toward the clock to keep it visible.
- Requires OpenCode Desktop 2.2.7 or newer. The GUI plugin API is experimental and may change between releases.

## License

MIT
