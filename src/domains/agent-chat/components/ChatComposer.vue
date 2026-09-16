<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatComposer.vue
 * @description Área de texto + envío + acciones del hilo. Presentacional: no toca
 * el transporte, recibe el estado y emite intenciones.
 *
 * Así el mismo composer sirve para la isla de chat y para una vista de
 * "repetir con otra config" sin duplicar la lógica de teclas.
 *
 * **El autocrecimiento es del `Textarea` del registry**, no de un `watch` que
 * mide `scrollHeight`: la primitiva trae `field-sizing-content`, que hace crecer
 * el campo con su contenido de forma nativa. Se borraron el `nextTick` y el
 * manejo de altura en línea que había antes; el techo lo pone `max-h-60` y el
 * suelo `min-h-9` (una línea cuando el navegador no soporta `field-sizing`).
 */
import { Trash2 } from '@lucide/vue';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{
  text: string;
  canSubmit: boolean;
  disabled: boolean;
  placeholder?: string | undefined;
}>();

const emit = defineEmits<{
  'update:text': [value: string];
  submit: [];
  stop: [];
  clear: [];
}>();

function onKeydown(event: KeyboardEvent): void {
  // Enter envía; Shift+Enter deja el salto de línea nativo del textarea.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (props.canSubmit) emit('submit');
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-1.5 border-t border-line bg-surface px-gutter py-2.5"
    @submit.prevent="emit('submit')"
  >
    <div class="flex items-end gap-2">
      <Label class="sr-only" for="aac-composer">Mensaje para el agente</Label>
      <Textarea
        id="aac-composer"
        :model-value="text"
        rows="1"
        :placeholder="placeholder ?? 'Escribe un mensaje…  (/error y /slow simulan fallos)'"
        :disabled="disabled"
        class="max-h-60 min-h-9 flex-1 resize-none rounded-panel"
        @update:model-value="emit('update:text', String($event))"
        @keydown="onKeydown"
      />

      <Button v-if="disabled" type="button" variant="outline" class="border-danger text-danger" @click="emit('stop')">
        Detener
      </Button>
      <Button v-else type="submit" :disabled="!canSubmit">Enviar</Button>
    </div>

    <div class="flex items-center justify-between gap-2">
      <!--
        Cada par tecla+verbo es un flex con `gap`, no un texto con espacios: el
        compilador de Vue condensa el whitespace entre hermanos inline y
        "Enter" pegaría con "envía".
      -->
      <div class="flex items-center gap-3 text-caption text-ink-muted">
        <span class="flex items-center gap-1">
          <Kbd>Enter</Kbd>
          <span>envía</span>
        </span>
        <span class="flex items-center gap-1">
          <Kbd>Esc</Kbd>
          <span>detiene</span>
        </span>
      </div>

      <!--
        El disparador va con `aria-label` y sin tooltip a propósito: encadenar
        `TooltipTrigger as-child` con `DialogTrigger as-child` deja a reka
        buscando el nodo real a través de dos capas de clonado, y el tooltip no
        aporta nada que la etiqueta accesible no diga ya.
      -->
      <Dialog>
        <DialogTrigger as-child>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Limpiar conversación">
            <Trash2 />
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Limpiar la conversación?</DialogTitle>
            <DialogDescription>
              Se quitan los mensajes de esta pantalla. La memoria del hilo en el backend no se toca.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose as-child>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" @click="emit('clear')">Limpiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </form>
</template>
