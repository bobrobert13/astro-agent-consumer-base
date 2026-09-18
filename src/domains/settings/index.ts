/**
 * @file src/domains/settings/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que pueden
 * importar los consumidores.
 *
 * Lo que no está aquí no es público. El slice no tiene `server/` —no habla con
 * ningún backend, es preferencia de interfaz— y su estado no sale del panel.
 *
 * `THEME_OPTIONS` sí se exporta, y es la excepción que confirma lo demás: los tres
 * estados del tema los pintan dos sitios (este panel y el menú de la tarjeta de
 * usuario del rail), así que la lista es una sola o son dos listas que se
 * desincronizan al primer tema nuevo.
 */
export { default as SettingsPanel } from './views/SettingsPanel.vue';
export { THEME_OPTIONS } from './data/settings.seed';
