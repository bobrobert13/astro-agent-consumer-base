import { createPinia } from 'pinia';

/**
 * Pinia como singleton de módulo, no como plugin de "la app".
 *
 * Astro no tiene una app raíz: `@astrojs/vue` crea una `createApp()` por isla.
 * La única forma de que dos islas compartan estado es que ambas instalen el
 * MISMO objeto, y eso es precisamente lo que hace `src/vue-app.ts`.
 *
 * Ojo con SSR: este módulo se importa en el entry del navegador. Un componente
 * `.vue` **sin** directiva `client:*` se renderiza en el servidor, y ahí un
 * singleton de módulo significaría estado compartido entre peticiones de
 * usuarios distintos. De ahí la regla de `AGENTS.md`: stores y `useQuery` solo
 * dentro de islas hidratadas.
 */
export const pinia = createPinia();
