/**
 * @file src/shared/http/endpoints.ts
 * @description Fábrica de constructores de URL relativas para un bounded context.
 *
 * Cada slice declara sus endpoints en `<scope>.endpoints.ts` con este helper en
 * lugar de escribir strings sueltos dentro del servicio. El beneficio no es la
 * estética: centraliza el prefijo para que cambiar el contrato del BFF sea un
 * commit en un archivo, y mantiene las claves de caché deterministas.
 */
export interface EndpointHelpers {
  /** Une el prefijo base con una ruta, normalizando las barras intermedias. */
  url(path: string): string;
}

/**
 * @param prefix Prefijo del BFF, p. ej. `/api/agents`. Sin barra final.
 */
export function createEndpoints(prefix: string): EndpointHelpers {
  const base = prefix.replace(/\/+$/, '');
  return {
    url(path: string): string {
      if (path === '' || path === '/') return base || '/';
      return `${base}/${path.replace(/^\/+/, '')}`;
    },
  };
}

/**
 * Serializa filtros de query omitiendo los valores vacíos.
 *
 * Omitir (no mandar `""`) es obligatorio: el backend valida con `.strict()` y un
 * `?q=` vacío cambia la clave de caché sin cambiar el resultado.
 */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded === '' ? '' : `?${encoded}`;
}
