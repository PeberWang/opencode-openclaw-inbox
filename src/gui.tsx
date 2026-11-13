import { Plugin } from "@opencode/plugin/gui"
import { main } from "./main"
import { setup } from "./window"

// Windows run `setup` (the badge in the session header); the desktop main process runs `main` (the menubar item).
export default Plugin.define({ setup, main })
