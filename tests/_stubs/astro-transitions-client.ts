/**
 * @file tests/_stubs/astro-transitions-client.ts
 * @description Doble de `astro:transitions/client` para el proyecto `dom`.
 *
 * Ese especificador lo materializa Astro en el build; fuera de Astro no existe,
 * igual que `astro:env/*`. Sin este doble, cualquier componente que navegue (el
 * estado del estudio lo hace en "nuevo chat") no se puede importar en un test, y
 * el fallo se lee como un problema del componente cuando es del entorno.
 *
 * `navigate` no navega: jsdom no tiene router de Astro. Lo que se prueba en el
 * proyecto `dom` es que la intención de navegar ocurre, no el viaje.
 */
export function navigate(): Promise<void> {
  return Promise.resolve();
}
