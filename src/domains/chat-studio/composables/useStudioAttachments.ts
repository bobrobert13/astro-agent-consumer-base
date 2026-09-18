/**
 * @file src/domains/chat-studio/composables/useStudioAttachments.ts
 * @description Archivos adjuntos del composer: lo que se ha elegido y todavía no se
 * ha enviado.
 *
 * **Es un mock declarado.** Nada se sube a ningún sitio: el archivo se queda en
 * memoria y, al enviar, su nombre y su tamaño viajan **dentro del texto** del
 * mensaje para que el simulacro lo muestre. El camino real es otro —el AI SDK lleva
 * un `file` como parte del mensaje y el transporte lo sube— y ese día este
 * composable es el único archivo que cambia: la vista sigue hablando de
 * `StudioAttachment`.
 *
 * **Vive fuera del componente a propósito.** El composer se monta en dos sitios
 * —dentro del hero y acoplado abajo— y son excluyentes, así que al pasar de uno a
 * otro el componente se remonta: si los adjuntos vivieran en su estado local, se
 * perderían justo al enviar el primer mensaje. Es el mismo motivo por el que el
 * borrador vive en el motor, y por el que esto se comparte por módulo
 * (`createSharedComposable`), como las sesiones.
 */
import { createSharedComposable } from '@vueuse/shared';
import { ref, type Ref } from 'vue';

/** Un archivo elegido, con lo mínimo para pintarlo y para nombrarlo en el mensaje. */
export interface StudioAttachment {
  id: string;
  name: string;
  /** Bytes, tal cual los da el navegador. */
  size: number;
}

export interface StudioAttachments {
  items: Ref<StudioAttachment[]>;
  add: (files: FileList | File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** "informe.pdf (2,4 MB)", para la línea que acompaña al mensaje. */
  describe: (attachment: StudioAttachment) => string;
}

/** Contador para que dos archivos del mismo milisegundo no compartan id. */
let sequence = 0;

/**
 * Tamaño legible, con coma decimal como el resto del copy. No se usa
 * `Intl.NumberFormat` porque solo hay tres unidades y una llamada por archivo.
 */
export function attachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function defineStudioAttachments(): StudioAttachments {
  const items = ref<StudioAttachment[]>([]);

  function add(files: FileList | File[]): void {
    for (const file of Array.from(files)) {
      sequence += 1;
      items.value = [
        ...items.value,
        { id: `adjunto-${sequence.toString(36)}`, name: file.name, size: file.size },
      ];
    }
  }

  function remove(id: string): void {
    items.value = items.value.filter((attachment) => attachment.id !== id);
  }

  function clear(): void {
    items.value = [];
  }

  function describe(attachment: StudioAttachment): string {
    return `${attachment.name} (${attachmentSize(attachment.size)})`;
  }

  return { items, add, remove, clear, describe };
}

export const useStudioAttachments = createSharedComposable(defineStudioAttachments);
