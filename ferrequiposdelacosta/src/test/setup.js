// Se ejecuta una vez antes de cada archivo de test (lo carga vite.config.js →
// test.setupFiles). Importar jest-dom agrega matchers legibles a expect, como
// toBeInTheDocument(), toHaveValue() o toBeDisabled(), para afirmar sobre el DOM.
import "@testing-library/jest-dom";

// jsdom no implementa window.matchMedia, y el tema lo consulta al arrancar para
// saber si el sistema está en modo oscuro (ThemeProvider → getInitialMode). Sin
// esto, cualquier prueba que renderice una pantalla se cae antes de empezar.
// Responde siempre "no coincide", que equivale a modo claro y a la pantalla más
// ancha: el punto de partida de las pruebas.
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
