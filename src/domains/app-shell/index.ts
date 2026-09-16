/**
 * @file src/domains/app-shell/index.ts
 * @description Barrel del shell de aplicación: navegación, atajos, apariencia y
 * puente con el escritorio.
 */
export { default as ShellShortcuts } from './components/ShellShortcuts.vue';
export { default as NavigationProgress } from './components/NavigationProgress.vue';
export { default as AppearanceCard } from './components/AppearanceCard.vue';
export { useShortcuts } from './composables/useShortcuts';
export { useAppShellStore } from '@stores/app-shell';
export type { ShellTheme } from '@stores/app-shell';
