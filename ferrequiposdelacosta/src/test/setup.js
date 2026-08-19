// Se ejecuta una vez antes de cada archivo de test (lo carga vite.config.js →
// test.setupFiles). Importar jest-dom agrega matchers legibles a expect, como
// toBeInTheDocument(), toHaveValue() o toBeDisabled(), para afirmar sobre el DOM.
import "@testing-library/jest-dom";

// jsdom no implementa window.matchMedia, y el tema lo consulta al arrancar para
// saber si el sistema está en modo oscuro (ThemeProvider → getInitialMode). Sin
// esto, cualquier prueba que renderice una pantalla se cae antes de empezar.
// Responde siempre "no coincide", que equivale a modo claro y a la pantalla más
// ancha: el punto de partida de las pruebas.
// Ni ResizeObserver, que el menú del panel usa para medir su contenedor y
// repartir los recuadros parejos. Acá no hay medidas reales —nada tiene tamaño
// en jsdom—, así que alcanza con un doble que no haga nada: sin él, la pantalla
// ni siquiera llega a dibujarse.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Tampoco trae URL.createObjectURL, que usan las pantallas que muestran una
// vista previa de la imagen recién elegida (crear y editar equipos). Devuelve
// una dirección de mentira: en las pruebas nadie la abre, solo se guarda.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => "blob:vista-previa-de-prueba";
  URL.revokeObjectURL = () => {};
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
