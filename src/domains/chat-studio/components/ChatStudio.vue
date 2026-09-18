<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/ChatStudio.vue
 * @description Raíz del estudio: es lo único que monta un `.astro`, lo único que
 * llama a `provideStudioShell()` y el sitio donde se ata la URL al motor del chat.
 *
 * **Por qué el estudio entero es una isla.** El chrome es interactivo (rail,
 * cajón, menús, panel de contexto, modal) y además el stream tiene que sobrevivir
 * a la navegación entre `/` y `/chat/<hilo>`. Como el motor del chat
 * (`useAgentChat` → AI SDK) solo existe en el navegador, una isla que contenga el
 * hilo no puede renderizarse en servidor; y partir el chrome en islas hermanas
 * obligaría a gobernar desde fuera un DOM que ya no les pertenece. Se monta con
 * `client:only` + `transition:persist`, y el hueco previo a la hidratación lo
 * cubre el `slot="fallback"` del layout.
 *
 * **La URL es el contrato**: el hilo llega por el segmento de ruta y el agente por
 * `?agente=`. Navegar no remonta la isla (`persist`), así que las props cambian
 * sin montar: de ahí el `watch`, que es lo que permite saltar de hilo sin cortar
 * una respuesta en curso.
 */
import { defineAsyncComponent, onMounted, watch } from 'vue';

import { PanelLeft } from '@lucide/vue';

import { TooltipProvider } from '@components/ui/tooltip';
import { useAgentChat } from '@domains/agent-chat';
import { ConnectorsDrawer } from '@domains/connectors';
import StudioContextPanel from './StudioContextPanel.vue';
import StudioPanel from './StudioPanel.vue';
import StudioPreviewDialog from './StudioPreviewDialog.vue';
import StudioSidebar from './StudioSidebar.vue';
import { useStudioSessions } from '../composables/useStudioSessions';
import { useStudioShortcuts } from '../composables/useStudioShortcuts';
import { provideStudioShell } from '../composables/useStudioShell';
import { routes } from '@config/routes';
import { DEFAULT_AGENT_ID, NEW_THREAD_ID } from '@config/app';

/**
 * Astro copia `transition:persist="chat-studio"` a las props de la isla
 * (`data-astro-transition-persist`), y Vue, que no la conoce, la dejaría caer al
 * primer elemento del DOM como atributo de paso. Con dos nodos marcados con el
 * mismo identificador, el swap de `ClientRouter` empareja la isla contra un
 * destino que ya no está y la navegación deja una copia huérfana fuera del
 * `body`. Hoy no se ve porque la raíz es `TooltipProvider` (que no reenvía
 * atributos), pero eso es suerte, no diseño: se corta aquí.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Agente activo. Viaja en `?agente=`. */
    agentId?: string;
    /** Hilo activo. Viaja en el segmento de ruta. */
    threadId?: string;
  }>(),
  { agentId: DEFAULT_AGENT_ID, threadId: NEW_THREAD_ID }
);

const { clearConversation, setAgent, setThread } = useAgentChat();
const sessions = useStudioSessions();

// El shell se provee aquí y se reparte a mano. Los atajos lo reciben por
// parámetro a propósito: `inject` resuelve desde el padre, así que este mismo
// componente no puede inyectar lo que acaba de proveer.
//
// "Nuevo chat" no vuelve a la raíz: **abre una sesión con hilo propio**, que es lo
// que hace que cada conversación tenga su URL y su entrada en el historial. El
// hilo se crea aquí porque esta es la raíz que conoce al motor y a las sesiones.
const shell = provideStudioShell({
  onNewChat: () => {
    clearConversation();
    return routes.chat(sessions.create());
  },
});
const { railOpen, drawerOpen, openNav, connectorsOpen, connectorsTab, closeConnectors, setConnectorsTab } = shell;
useStudioShortcuts(shell);

const Toaster = defineAsyncComponent(() => import('@/components/ui/sonner/Sonner.vue'));

onMounted(() => {
  setAgent(props.agentId);
  setThread(props.threadId);

  /**
   * La home se prerenderiza (`prerender = true`), así que allí `?agente=` no se
   * puede leer en el servidor: se aplica al montar y solo si la URL lo trae. En
   * `/chat/<hilo>` la página sí es SSR y ya llega resuelto por props.
   */
  const override = new URLSearchParams(window.location.search).get('agente');
  if (override !== null && override !== '') setAgent(override);
});

watch(
  () => [props.agentId, props.threadId],
  ([agentId, threadId]) => {
    setAgent(agentId);
    setThread(threadId);
  }
);
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="flex h-svh overflow-hidden bg-canvas text-ink">
      <StudioSidebar :active-thread-id="props.threadId" />

      <!--
        Botón de reapertura del rail. Se enseña cuando el rail está contraído (en
        escritorio) o siempre en móvil, donde el cajón arranca cerrado; y se
        esconde si el cajón está abierto, porque entonces ya hay navegación en
        pantalla. Con el panel de conectores abierto también se esconde **mientras
        el panel es una capa** —por debajo del corte del drawer—, porque comparten
        esquina y quedaría encima suyo; a partir de ahí el panel es una columna y
        no se pisan.
      -->
      <button
        type="button"
        class="fixed top-9 left-9 z-50 grid size-11 place-items-center rounded-control border border-line bg-surface text-ink-muted shadow-sm transition-colors hover:bg-elevated"
        :class="[railOpen ? 'nav:hidden' : '', drawerOpen ? 'max-nav:hidden' : '', connectorsOpen ? 'max-drawer:hidden' : '']"
        :aria-label="railOpen ? 'Expandir navegación' : 'Abrir navegación'"
        @click="openNav()"
      >
        <PanelLeft class="size-4" aria-hidden="true" />
      </button>

      <div class="flex min-w-0 flex-1 pt-4.5 pr-5 pb-4.5 max-nav:p-3">
        <StudioPanel />
      </div>

      <StudioContextPanel />

      <!--
        El panel de conectores va **después** del de contexto, así que vive en el
        borde exterior de la fila: la conversación se queda pegada a su propio
        panel y el espacio de trabajo, fuera. Por debajo del corte del drawer el CSS
        lo convierte en capa y se superpone en vez de comerse el chat.
      -->
      <ConnectorsDrawer
        :open="connectorsOpen"
        :tab="connectorsTab"
        @close="closeConnectors()"
        @update:tab="setConnectorsTab"
      />

      <!--
        El modal vive fuera de la fila y no dentro del panel: es una capa, y
        anidarlo en un contenedor con `overflow-hidden` lo recortaría.
      -->
      <StudioPreviewDialog />

      <Toaster position="bottom-center" />
    </div>
  </TooltipProvider>
</template>
