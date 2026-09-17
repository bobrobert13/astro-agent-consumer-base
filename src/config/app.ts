/**
 * @file src/config/app.ts
 * @description Constantes de la aplicación que no son secretos ni configuración
 * de despliegue. Si algo puede cambiar por entorno, va en `env.schema`, no aquí.
 */
import { APP_NAME } from '@shared/env/client';

export const APP_NAME_LABEL = APP_NAME;

/** Versión visible. Fuente única: el `version` de `package.json` no llega al navegador. */
export const APP_VERSION = '0.0.1';

/** Hilo nuevo: `nanoid` sería una dependencia por un literal. */
export const NEW_THREAD_ID = 'nuevo';

/**
 * Agente con el que abre el chat cuando la URL no dice otro (`?agente=`).
 *
 * El id es el del backend (`communication-agent`, el agente de comunicación
 * general): el catálogo y las rutas `/chat/:agentId` lo aceptan tal cual. Vive
 * aquí y no en cada página porque es el default del PRODUCTO — estaba repetido
 * en la página, la isla y el composable, que es como se desincroniza.
 */
export const DEFAULT_AGENT_ID = 'communication-agent';

/** Cuánto silencio admite el cliente antes de mostrar "sin respuesta". */
export const STREAM_STALL_MS = 25_000;
