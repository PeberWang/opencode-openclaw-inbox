import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const script = fileURLToPath(new URL("../integrations/openclaw/opencode-dispatch/scripts/opencode-dispatch", import.meta.url))

const dispatch = (...args: string[]) => {
  const run = spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_DISPATCH_DRY_RUN: "1", OPENCODE_INBOX_PREFIX: "" },
  })
  return { code: run.status, argv: run.stdout.trim().split("\n").slice(2), stderr: run.stderr }
}

test("a new task is always archived and prefixed", () => {
  assert.deepEqual(dispatch("--auto", "--title", "Fix the test", "-f", "BRIEF.md", "go").argv, [
    "--title", "🦞 Fix the test", "--archived", "--auto", "-f", "BRIEF.md", "go",
  ])
  for (const title of ["🦞 Fix the test", "🦞Fix the test", "🦞   Fix the test"]) {
    assert.equal(dispatch(`--title=${title}`, "go").argv[1], "🦞 Fix the test")
  }
  assert.equal(dispatch("--archived", "--title", "x", "go").argv.filter((a) => a === "--archived").length, 1)
})

test("follow-ups pass through untouched", () => {
  assert.deepEqual(dispatch("-s", "ses_1", "--auto", "more").argv, ["-s", "ses_1", "--auto", "more"])
  assert.deepEqual(dispatch("--continue", "more").argv, ["--continue", "more"])
})

test("--detach is consumed, not passed to opencode", () => {
  const run = dispatch("--detach", "--title", "x", "go")
  assert.deepEqual(run.argv, ["--title", "🦞 x", "--archived", "go"])
  assert.match(run.stderr, /would detach/)
  assert.deepEqual(dispatch("-s", "ses_1", "--detach", "more").argv, ["-s", "ses_1", "more"])
})

test("a new task without a title is refused", () => {
  for (const args of [["go"], ["--title", "🦞 ", "go"]]) {
    const run = dispatch(...args)
    assert.equal(run.code, 2)
    assert.match(run.stderr, /needs --title/)
  }
})
