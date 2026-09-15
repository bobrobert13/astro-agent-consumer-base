/**
 * @file src/domains/app-shell/index.ts
 * @description Barrel del shell de aplicación: navegación, atajos, puente de
 * escritorio y notificaciones.
 *
 * Esqueleto: `useShortcuts` y el store global están; el menú nativo de desktop y
 * el centro de notificaciones se escriben sobre esto.
 */
export { useShortcuts } from './composables/useShortcuts';
export { useAppShellStore } from '@stores/app-shell';
