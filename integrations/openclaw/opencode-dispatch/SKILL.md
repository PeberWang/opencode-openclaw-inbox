---
name: opencode-dispatch
description: Hand a coding task to OpenCode so it shows up in the user's OpenCode Desktop inbox (opencode-openclaw-inbox). Use whenever you start, continue or check on work in OpenCode. Never call `opencode run` directly for a new task; always go through this skill's script.
---

# opencode-dispatch

The user runs the opencode-openclaw-inbox plugin in OpenCode Desktop. It only lists sessions that are **archived** and whose title starts with **`🦞 `**. A session started any other way lands in OpenCode's Home instead, the user never sees it in the inbox or the menubar, and it buries their own work.

The script below adds both for you. Use it for every handoff.

## Start a task

Run it from the project directory, in the background, with no time limit:

```sh
cd <project dir> && ~/.openclaw/workspace/skills/opencode-dispatch/scripts/opencode-dispatch \
  --title "<short task name>" -f <brief file> "<one-line instruction>"
```

- `--title` is required. Keep it short and specific; the script adds the `🦞 ` prefix, so write the name only.
- `--archived` is added automatically.
- Any other `opencode run` flag passes through (`-f`, `--model`, `--agent`, `--auto`). Only add `--auto` if the user has agreed that OpenCode may approve its own permission requests.
- Put the full brief in a file and attach it with `-f`; keep the message itself to one line.

## Continue a task

```sh
~/.openclaw/workspace/skills/opencode-dispatch/scripts/opencode-dispatch -s <session id> "<more instructions>"
```

Follow-ups pass through unchanged, so the task stays in the inbox. If the user has replied to the task from the desktop, the plugin has already moved it to their regular sessions; leave it there.

## Check that it worked

Right after starting a task, confirm the session is in the inbox:

```sh
opencode api get "/api/session?search=%F0%9F%A6%9E&limit=5"
```

The new session should be listed with a `🦞 ` title and `time.archived` set. If it is not, fix it before you report back:

```sh
opencode api patch /api/session/<session id> --data '{"title":"🦞 <task name>","archived":true}'
```

## Don't

- Don't run `opencode run` yourself for a new task, even "just this once". A session without the prefix or `--archived` is invisible to the inbox.
- Don't use the interactive TUI or anything that waits for the user to approve a prompt.
- Don't unarchive a task yourself. The plugin does it when the user takes the task over.

The prefix is the plugin's `prefix` option. If the user changed it, set `OPENCODE_INBOX_PREFIX` to the same value (with the trailing space) before running the script.
