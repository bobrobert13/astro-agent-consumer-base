# Decisiones de arquitectura

Tres decisiones que no se pueden revertir sin tocar varias capas. Cada una con su
contexto, su coste aceptado y la prueba que la sostiene.

| | |
|---|---|
| [ADR-001](./001-relay-sse-verbatim.md) | El BFF reenvía el stream **verbatim** y normaliza solo el JSON |
| [ADR-002](./002-composable-first.md) | Composable primero; Pinia/colada entran por `appEntrypoint` y con disparador explícito |
| [ADR-003](./003-mock-first.md) | El boilerplate arranca y se prueba **sin backend** |

Cómo leerlos: cada ADR dice qué se rechazó y por qué, no solo qué se eligió. Si una
decisión va a cambiar, el ADR es el sitio donde anotar el disparador real, no en un
issue.
