# opencode-openclaw-inbox

An OpenCode Desktop GUI plugin that gives tasks dispatched by another agent (OpenClaw, a script, a cron job) their own inbox, instead of piling them into the session sidebar.

- **Dispatch** with `opencode run --archived --title "🦞 <task>" "<prompt>"`. `--archived` keeps the session out of the sidebar; the `🦞 ` title prefix puts it in the inbox.
- **Watch**: a pill above the composer reads `🦞 1 running · 2 unread`. Its menu lists each task with a status color (running, unread, failed, read), its project and its age. Click a row to open the task as a tab, which also marks it read.
- **Get notified** when a task finishes: a system notification, or a toast while the window has focus.
- **Take over**: send a message from the desktop composer in an archived task and the plugin unarchives it, so it moves back to the sidebar. Follow-ups from the dispatcher (`opencode run -s <id> "..."`) keep it archived.
- **Command palette**: "Open OpenClaw inbox" lists the same tasks from anywhere.

## Install

GUI parts load only from the global config (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugins": [{ "package": "/path/to/openclaw-inbox", "options": { "locale": "zh" } }],
}
```

| Option   | Default            | Meaning                                  |
| -------- | ------------------ | ---------------------------------------- |
| `prefix` | `"🦞"`             | Title prefix that marks a dispatched task |
| `days`   | `7`                | Only list tasks updated in the last N days |
| `max`    | `12`               | Rows in the pill menu                    |
| `locale` | follows the app    | `"en"` or `"zh"`                         |

Build the bundle after cloning or editing:

```bash
npm install
npm run build        # or: npm run dev (rebuilds on save; the desktop app reloads the GUI)
```

## How it works

- Tasks are root sessions whose title starts with the prefix, read from the desktop app's own server (`sidecar`) through the OpenCode client, refreshed on session events and every 20 seconds.
- Status comes from the session itself: `time.busy` / `time.idle` for running, `time.viewed` for read, `outcome` for failure.
- Take-over detection: the desktop composer sends admission metadata with every prompt and `opencode run` sends none, so an enqueued user prompt with metadata, or one sent into the session the focused window is showing, unarchives the task through `PATCH /api/session/{id}`. The server plugin API ignores `archived` (anomalyco/opencode#61038), so this lives in the GUI part.

Requires OpenCode Desktop 2.2.7 or newer. The GUI plugin API is experimental and may change between releases.

## License

MIT
