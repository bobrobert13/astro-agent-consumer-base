<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourceStatus.vue
 * @description Píldora del estado de una fuente externa.
 *
 * Es la `Badge` del registry y el color lo elige su **variante**, no una clase
 * suelta: `default` es la marca, `destructive` el error y `outline`/`secondary`
 * los estados sin compromiso. Debajo, esas variantes apuntan a los tokens de
 * concepto, así que el modo oscuro no necesita una segunda lista.
 *
 * El estado que no se puede confundir es `error`: si se pintara como los demás,
 * una credencial caducada pasaría por un conector sano y la vista mentiría.
 */
import type { VariantProps } from 'class-variance-authority';
import { computed } from 'vue';

import { Badge, badgeVariants } from '@components/ui/badge';

import { CONNECTOR_STATUS_LABELS } from '../../data/connectors.seed';
import type { ConnectorStatus } from '../../types/connector.types';

interface Props {
  status: ConnectorStatus;
}

const props = defineProps<Props>();

/** La variante sale del propio registry: si cambia, esto sigue compilando. */
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const VARIANTS: Record<ConnectorStatus, BadgeVariant> = {
  connected: 'default',
  pending: 'outline',
  error: 'destructive',
  disconnected: 'secondary',
};

const label = computed(() => CONNECTOR_STATUS_LABELS[props.status]);
const variant = computed(() => VARIANTS[props.status]);
</script>

<template>
  <Badge :variant="variant">{{ label }}</Badge>
</template>
