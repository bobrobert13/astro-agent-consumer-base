/**
 * @file src/shared/env/client.ts
 * @description Barril del entorno visible desde el navegador.
 *
 * Por qué existe un archivo aparte en vez de un único `env.ts`: importar
 * `astro:env/server` desde código que termina en el chunk del cliente **rompe el
 * build**. Al separarlos, el error deja de ser posible por estructura: el nombre
 * del archivo dice qué lado puede usarlo.
 *
 * Regla: `@shared/env/client` lo importan composables, componentes `.vue` y
 * `<scope>.api.ts`. Nunca un módulo bajo `server/`.
 *
 * El alias `PUBLIC_X as X` no es decoración: la clave de `env.schema` tiene que
 * ser el nombre literal de la variable —con su prefijo— o Astro no la encuentra
 * y usa el `default` en silencio. El resto del repo importa el nombre corto.
 */
export {
  PUBLIC_AGENT_TRANSPORT as AGENT_TRANSPORT,
  PUBLIC_APP_NAME as APP_NAME,
} from 'astro:env/client';
