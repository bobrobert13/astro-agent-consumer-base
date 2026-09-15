import { app } from 'electron';

/**
 * @file electron/lib/single-instance.mjs
 * @description Ventana única, con énfasis en por qué hace falta aquí.
 *
 * En una app normal es una comodidad. Aquí no: cada instancia levanta **su propio
 * servidor Astro**, así que dos instancias significan dos servidores, dos puertos
 * y dos vistas de la misma memoria de agentes. El segundo arranque se limita a
 * enfocar la ventana existente.
 */
export function enforceSingleInstance({ onSecondInstance }) {
  const got = app.requestSingleInstanceLock();
  if (!got) {
    app.quit();
    return false;
  }

  app.on('second-instance', (_event, argv) => {
    onSecondInstance(argv);
  });

  return true;
}
