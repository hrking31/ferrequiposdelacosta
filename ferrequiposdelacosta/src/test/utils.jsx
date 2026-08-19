import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import PropTypes from "prop-types";
import { crearStore } from "../Store/Store";
import { CustomThemeProvider } from "../Theme/ThemeProvider";

/**
 * Renderiza un componente con todo lo que la app le da por debajo.
 *
 * Casi ninguna pantalla se puede dibujar sola: leen el estado (Redux), saben en
 * qué ruta están (Router) y toman colores y medidas del tema. Sin esos tres
 * envoltorios, el componente se cae antes de que la prueba llegue a afirmar
 * nada, y el error que muestra no tiene que ver con lo que se estaba probando.
 *
 * El orden es el MISMO de main.jsx —Provider → Router → tema— y no es
 * decorativo: el tema consulta la ruta para forzar el modo oscuro del kiosco,
 * así que tiene que quedar por dentro del Router.
 *
 * Se usa MemoryRouter y no BrowserRouter: guarda la ruta en memoria en vez de
 * en la barra de direcciones, así cada prueba parte de donde quiere y no
 * arrastra la de la anterior.
 *
 * @param {JSX.Element} ui El componente a renderizar.
 * @param {Object} opciones
 * @param {string} opciones.ruta Con qué dirección arranca (por ejemplo
 *   "/kioskhome" para probar lo del kiosco).
 * @param {Object} opciones.estadoInicial Estado de Redux precargado.
 * @param {Object} opciones.store Un store propio, si la prueba necesita
 *   armarlo aparte.
 * @return {Object} Lo que devuelve render, más el `store` para revisar cómo
 *   quedó el estado y `usuario` para simular clics y escritura.
 */
export function renderConProviders(
  ui,
  { ruta = "/", estadoInicial, store = crearStore(estadoInicial), ...resto } = {},
) {
  const Envoltorio = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[ruta]}>
        <CustomThemeProvider>{children}</CustomThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  Envoltorio.propTypes = { children: PropTypes.node };

  return {
    store,
    // userEvent simula a una persona: enfoca el campo, teclea letra por letra y
    // dispara los mismos eventos que el navegador. fireEvent solo empuja el
    // valor, y así se escapan errores que en la pantalla sí ocurren.
    usuario: userEvent.setup(),
    ...render(ui, { wrapper: Envoltorio, ...resto }),
  };
}
