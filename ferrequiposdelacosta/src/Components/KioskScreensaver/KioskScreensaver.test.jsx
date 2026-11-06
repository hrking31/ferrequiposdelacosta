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

// Las fotos de los equipos, y todo lo que está dibujado: desde el 2026-11-06
// cada tres fotos entra una pantalla con el logo, que también es una imagen y
// también cuenta como una de las tres diapositivas vivas.
const fotos = () =>
  screen.queryAllByRole("img").filter((img) => img.getAttribute("src")?.startsWith("https://ejemplo.test/"));
const vivas = () => screen.queryAllByRole("img");
const logo = () => screen.queryByRole("img", { name: "Ferrequipos" });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("KioskScreensaver", () => {
  it("no aparece mientras alguien está usando el kiosco", () => {
    mostrar();

    expect(vivas()).toHaveLength(0);
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
    expect(vivas()).toHaveLength(3);
  });

  it("al pasar de foto sigue habiendo tres, no se van acumulando", () => {
    mostrar();
    esperarInactividad();

    // Pasa también por la pantalla del logo: tampoco suma de más.
    for (let paso = 0; paso < 5; paso += 1) {
      pasarFoto();
      expect(vivas()).toHaveLength(3);
    }
  });

  it("después de la tercera foto entra la pantalla del logo", () => {
    mostrar();
    esperarInactividad();

    // En la foto 0 el logo no está ni por llegar.
    expect(logo()).not.toBeInTheDocument();

    // En la foto 2 el logo es la que sigue: ya está cargado.
    pasarFoto();
    pasarFoto();
    expect(logo()).toBeInTheDocument();

    // Pasado el logo, sale de la ventana.
    pasarFoto();
    pasarFoto();
    pasarFoto();
    expect(logo()).not.toBeInTheDocument();
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
  it("con una sola foto la dibuja una vez, no tres (más el logo)", () => {
    mostrar([equipos[0]]);
    esperarInactividad();

    expect(fotos()).toHaveLength(1);
    expect(logo()).toBeInTheDocument();
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
