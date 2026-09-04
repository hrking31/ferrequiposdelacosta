import { act, screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import KioskScreensaver from "./KioskScreensaver";

// El protector de pantalla del kiosco: aparece cuando nadie toca nada y pasa
// las fotos del catálogo.
//
// Lo que se prueba es CUÁNTAS fotos tiene cargadas a la vez. El kiosco corre
// en una Raspberry Pi, y cada foto a pantalla completa ocupa varios megas de
// memoria ya descomprimida: dibujarlas todas —que es lo que hacía— sostenía
// cientos de megas todo el día en una máquina que tiene 1 GB. Es un detalle
// invisible en pantalla y fácil de deshacer sin darse cuenta, que es
// justamente por lo que conviene tenerlo escrito acá.

// Diez equipos con foto, para que se note la diferencia entre "todas" y "tres".
const equipos = Array.from({ length: 10 }, (_, i) => ({
  id: `e${i}`,
  nombre: `EQUIPO ${i}`,
  images: [{ url: `https://ejemplo.test/foto-${i}.jpg` }],
}));

const mostrar = (estadoEquipos = equipos) =>
  renderConProviders(<KioskScreensaver timeout={1000} />, {
    ruta: "/kioskhome",
    estadoInicial: { equipos: { equipos: estadoEquipos, status: "idle", error: null } },
  });

// El protector arranca por inactividad, así que hay que dejar correr el reloj.
const esperarInactividad = () => {
  act(() => {
    vi.advanceTimersByTime(1500);
  });
};

// Un paso del carrusel, que cambia cada 5 segundos.
const pasarFoto = () => {
  act(() => {
    vi.advanceTimersByTime(5000);
  });
};

const fotos = () => screen.queryAllByRole("img");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("KioskScreensaver", () => {
  it("no aparece mientras alguien está usando el kiosco", () => {
    mostrar();

    expect(fotos()).toHaveLength(0);
  });

  it("tras un rato sin tocar nada, se enciende", () => {
    mostrar();
    esperarInactividad();

    expect(screen.getByText(/TODO PARA TU PROYECTO/)).toBeInTheDocument();
  });

  it("con diez equipos carga TRES fotos, no las diez", () => {
    mostrar();
    esperarInactividad();

    // La que se ve, la anterior —que se está desvaneciendo— y la siguiente,
    // que llega cargada a su turno.
    expect(fotos()).toHaveLength(3);
  });

  it("al pasar de foto sigue habiendo tres, no se van acumulando", () => {
    mostrar();
    esperarInactividad();

    pasarFoto();
    expect(fotos()).toHaveLength(3);

    pasarFoto();
    expect(fotos()).toHaveLength(3);
  });

  it("la ventana avanza: entra la que sigue y sale la que quedó atrás", () => {
    mostrar();
    esperarInactividad();

    // Arranca en la 0, así que tiene cargadas la última, la 0 y la 1.
    const alPrincipio = fotos().map((img) => img.getAttribute("src"));
    expect(alPrincipio).toContain("https://ejemplo.test/foto-0.jpg");
    expect(alPrincipio).toContain("https://ejemplo.test/foto-1.jpg");
    expect(alPrincipio).not.toContain("https://ejemplo.test/foto-2.jpg");

    pasarFoto();

    // Ahora está en la 1: entra la 2 y la última ya no hace falta.
    const despues = fotos().map((img) => img.getAttribute("src"));
    expect(despues).toContain("https://ejemplo.test/foto-2.jpg");
    expect(despues).not.toContain("https://ejemplo.test/foto-9.jpg");
  });

  // Con pocas fotos los tres índices se pisan entre sí. Sin el conjunto que
  // los deduplica, la misma foto se dibujaría dos y hasta tres veces.
  it("con una sola foto la dibuja una vez, no tres", () => {
    mostrar([equipos[0]]);
    esperarInactividad();

    expect(fotos()).toHaveLength(1);
  });

  it("con dos fotos dibuja dos", () => {
    mostrar(equipos.slice(0, 2));
    esperarInactividad();

    expect(fotos()).toHaveLength(2);
  });

  it("sin equipos con foto no se enciende", () => {
    mostrar([]);
    esperarInactividad();

    expect(screen.queryByText(/TODO PARA TU PROYECTO/)).not.toBeInTheDocument();
  });
});
