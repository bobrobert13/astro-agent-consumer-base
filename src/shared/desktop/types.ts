/**
 * @file src/shared/desktop/types.ts
 * @description Contrato del puente de escritorio (`window.desktop`).
 *
 * Esta es la **única** definición de TypeScript del puente. El lado de Electron
 * (`electron/preload.cjs`) es JavaScript y no puede importar de aquí, así que lo
 * que se garantiza es que los nombres de canal y de método del `contextBridge`
 * coinciden con `electron/lib/ipc.mjs`, que es su fuente espejo en Node.
 *
 * Si cambia este contrato, cambian a la vez el preload y `lib/ipc.mjs`; el test
 * `verify:electron` es el que lo detecta.
 */
export type DesktopPlatform = 'win32' | 'darwin' | 'linux';

/** Canales que el main puede empujar hacia el renderer. Allowlist cerrada. */
export type DesktopChannel = 'menu:action' | 'window:resized';

export interface DesktopDisplay {
  scaleFactor: number;
  isPrimary: boolean;
}

export interface DesktopBridge {
  readonly isDesktop: true;
  readonly platform: DesktopPlatform;
  readonly appVersion: string;
  readonly display: DesktopDisplay;
  /** Abre en el navegador externo. El main rechaza anything que no sea http/https. */
  openExternal(url: string): void;
  notify(title: string, body: string): void;
  /** Devuelve la función de cierre: pensada para `onScopeDispose()`. */
  on(channel: DesktopChannel, handler: (payload: unknown) => void): () => void;
}
