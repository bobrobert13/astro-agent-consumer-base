/**
 * @file tests/_stubs/dom-setup.ts
 * @description Lo que jsdom no implementa y los componentes del registry sí usan.
 *
 * jsdom no trae `ResizeObserver`, y sin él reka-ui revienta al montar un `Slider`
 * o un `Select`: el fallo aparece como `ReferenceError: ResizeObserver is not
 * defined` en un `onMounted`, que se lee como un problema del componente cuando es
 * del entorno de test. Se declara aquí y no en cada spec para que cualquier isla
 * con primitivas del registry se pueda montar igual.
 *
 * Es un doble tonto a propósito: el tamaño de los elementos no es observable en
 * jsdom (todo mide 0), así que un observador con lógica daría una falsa sensación
 * de cobertura. Lo que sí se prueba en el proyecto `dom` es el render, el cableado
 * de props/eventos y el estado, no el layout.
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {
    /* jsdom no mide nada: no hay cambio de tamaño que notificar */
  }

  unobserve(): void {
    /* nada que dejar de observar */
  }

  disconnect(): void {
    /* nada que desconectar */
  }
}

globalThis.ResizeObserver ??= ResizeObserverStub;
