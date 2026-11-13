import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

// Main asks one window to open a session; `nonce` 0 means no request. The window acknowledges with the nonce.
export const Tray = Ipc.define({
  id: "opencode-openclaw-inbox.tray",
  state: Schema.Struct({ sessionID: Schema.String, nonce: Schema.Number }),
  methods: {
    opened: { input: Schema.Number },
  },
})
