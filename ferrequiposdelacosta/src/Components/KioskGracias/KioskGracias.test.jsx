import { act, fireEvent, screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import KioskGracias from "./KioskGracias";

// EL CIERRE DEL KIOSKO: al enviar la solicitud, la tarjeta con el logo y un
// reloj que devuelve la tableta a la tienda para el siguiente cliente. Lo que
// importa es que vuelva SIEMPRE —sola o con un toque— y una sola vez: si se
// quedara, el próximo cliente encontraría la pantalla del anterior.
const mostrar = (props = {}) => {
  const onTerminar = vi.fn();
  renderConProviders(<KioskGracias onTerminar={onTerminar} {...props} />, {
    ruta: "/kioskcart",
  });
  return onTerminar;
};

const pasar = (segundos) => {
  for (let i = 0; i < segundos; i += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("KioskGracias", () => {
  it("confirma que la solicitud llegó", () => {
    mostrar();

    expect(screen.getByText("¡Listo! Tu solicitud llegó")).toBeInTheDocument();
    expect(screen.getByText(/Te escribimos por WhatsApp/)).toBeInTheDocument();
  });

  it("dice a qué número le van a escribir", () => {
    mostrar({ telefono: "3116576633" });

    expect(screen.getByText("Al 3116576633")).toBeInTheDocument();
  });

  it("sin teléfono no inventa uno", () => {
    mostrar();

    expect(screen.queryByText(/^Al /)).not.toBeInTheDocument();
  });

  it("cuenta hacia atrás y a los 8 segundos vuelve a la tienda", () => {
    const onTerminar = mostrar();

    expect(screen.getByText("Volvemos a la tienda en 8 s")).toBeInTheDocument();
    pasar(7);
    expect(screen.getByText("Volvemos a la tienda en 1 s")).toBeInTheDocument();
    expect(onTerminar).not.toHaveBeenCalled();

    pasar(1);
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("un toque vuelve de inmediato, sin esperar el reloj", () => {
    const onTerminar = mostrar();

    fireEvent.click(screen.getByRole("button", { name: "Volver a la tienda" }));

    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("si tocan y después se acaba el reloj, vuelve una sola vez", () => {
    const onTerminar = mostrar({ segundos: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Volver a la tienda" }));
    pasar(3);

    expect(onTerminar).toHaveBeenCalledTimes(1);
  });
});
