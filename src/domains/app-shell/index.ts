/**
 * @file src/domains/app-shell/index.ts
 * @description Barrel del shell de aplicación: navegación, atajos, puente de
 * escritorio y notificaciones.
 *
 * Esqueleto: `ShellShortcuts` (isla de atajos), `useShortcuts` y el store global
 * están; el menú nativo de desktop y el centro de notificaciones se escriben
 * sobre esto.
 */
export { default as ShellShortcuts } from './components/ShellShortcuts.vue';
export { useShortcuts } from './composables/useShortcuts';
export { useAppShellStore } from '@stores/app-shell';
