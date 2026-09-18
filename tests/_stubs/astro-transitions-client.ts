/**
 * @file tests/_stubs/astro-transitions-client.ts
 * @description Doble de `astro:transitions/client` para el proyecto `dom`.
 *
 * Ese especificador lo materializa Astro en el build; fuera de Astro no existe,
 * igual que `astro:env/*`. Sin este doble, cualquier componente que navegue (el
 * estado del estudio lo hace en "nuevo chat") no se puede importar en un test, y
 * el fallo se lee como un problema del componente cuando es del entorno.
 *
 * `navigate` no navega —jsdom no tiene router de Astro— pero **deja constancia**
 * de a dónde se pidió ir: lo que se prueba en el proyecto `dom` es la intención de
 * navegar, no el viaje. Sin la lista, esa intención era invisible y el flujo de
 * "nuevo chat" solo se podía comprobar a ojo.
 */
export const navigations: string[] = [];

export function navigate(href: string): Promise<void> {
  navigations.push(href);
  return Promise.resolve();
}

/** Vuelve a dejar el registro a cero entre casos que comparten módulo. */
export function resetNavigations(): void {
  navigations.length = 0;
}
