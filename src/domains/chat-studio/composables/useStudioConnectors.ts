/**
 * @file src/domains/chat-studio/composables/useStudioConnectors.ts
 * @description Abre la vista de conectores desde cualquier punto del estudio.
 *
 * Vive en el slice del estudio y no en el de conectores porque quien navega es el
 * estudio: el destino se describe con `@config/routes` y aquí solo se decide **qué
 * viaja en la URL**. El vocabulario de la pestaña se importa como tipo, así que no
 * hay acoplamiento en tiempo de ejecución entre las dos slices.
 *
 * **Qué viaja, y por qué:**
 *  - `pestana`: a qué sección se entra —conectores, conocimiento o plantillas—.
 *  - `hilo` y `agente`: los vivos en ese momento. `ChatStudio` escucha sus props,
 *    así que una capa que llegara sin ellos cambiaría de hilo al abrirse y
 *    cortaría una respuesta en curso.
 *  - `volver`: la ruta exacta de salida. De `/` no se vuelve igual que de
 *    `/chat/<hilo>`, y el hilo por sí solo no lo distingue: los dos pueden ser
 *    `nuevo`.
 *
 * Es un composable y no tres líneas copiadas en cada botón porque hay tres sitios
 * que abren la vista (la franja del composer, el rail y las herramientas del
 * composer) y el contrato de la URL tiene que ser el mismo en los tres.
 */
import { navigate } from 'astro:transitions/client';

import type { ConnectorTab } from '@domains/connectors';
import { useAgentChat } from '@domains/agent-chat';
import { routes } from '@config/routes';

export interface StudioConnectors {
  open: (tab?: ConnectorTab) => void;
}

export function useStudioConnectors(): StudioConnectors {
  const { activeAgentId, threadId } = useAgentChat();

  function open(tab?: ConnectorTab): void {
    void navigate(
      routes.connectors({
        tab,
        hilo: threadId.value,
        agente: activeAgentId.value,
        volver: `${window.location.pathname}${window.location.search}`,
      })
    );
  }

  return { open };
}
