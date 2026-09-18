/**
 * @file src/domains/app-shell/index.ts
 * @description Barrel del shell de aplicación: progreso de navegación y estado
 * global del chrome (rail y tema).
 *
 * Los atajos globales salieron de aquí con la llegada del estudio: los registra él
 * mismo (`useStudioShortcuts`), porque es una isla única presente en todas las
 * rutas del producto, y tenerlos en una segunda isla hermana solo servía para que
 * las dos reaccionaran a la misma tecla.
 *
 * `AppearanceCard` también se fue: era la tarjeta de apariencia de `/settings`, y
 * el conmutador de tema vive ahora en el menú de la tarjeta de usuario del rail.
 */
export { default as NavigationProgress } from './components/NavigationProgress.vue';
export { useAppShellStore } from '@stores/app-shell';
export type { ShellTheme } from '@stores/app-shell';
