// The few Electron APIs the main process uses; the app provides `electron` at runtime.
declare module "electron" {
  export interface NativeImage {
    isEmpty(): boolean
  }
  export const nativeImage: {
    createEmpty(): NativeImage
  }
  export interface BrowserWindow {
    readonly id: number
    isDestroyed(): boolean
    isMinimized(): boolean
    restore(): void
    show(): void
    focus(): void
  }
  export interface WebContentsView {}
  export interface MenuItemConstructorOptions {
    label?: string
    sublabel?: string
    type?: "normal" | "separator"
    enabled?: boolean
    click?: () => void
  }
  export class Menu {
    static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu
  }
  export class Tray {
    constructor(image: NativeImage)
    setTitle(title: string): void
    setToolTip(toolTip: string): void
    popUpContextMenu(menu?: Menu): void
    on(event: "click" | "right-click", listener: () => void): this
    destroy(): void
    isDestroyed(): boolean
  }
  export const app: {
    focus(options?: { steal: boolean }): void
    emit(event: string, ...args: unknown[]): boolean
    getLocale(): string
  }
}
