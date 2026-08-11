import { describe, expect, it } from "vitest";
import {
  calcularStatusPrevio,
  etiquetaEstado,
  hayCambios,
} from "./estadoDocumento";

// Una cotización como la que llega del buzón, recortada a lo que importa acá.
const cotizacion = (extra = {}) => ({
  tipo: "persona",
  empresa: "Ana Pérez",
  nit: "123",
  telefono: "300",
  items: [{ description: "Andamio", quantity: 2, price: 1000 }],
  totalNumero: 2000,
  status: "pendiente",
  id: "abc",
  cotizacionId: "COT-1",
  createdAt: 1,
  ...extra,
});

describe("etiquetaEstado", () => {
  it("traduce los cuatro estados", () => {
    expect(etiquetaEstado("creada")).toBe("Emitida");
    expect(etiquetaEstado("pendiente")).toBe("Pendiente");
    expect(etiquetaEstado("enProceso")).toBe("En Proceso");
    expect(etiquetaEstado("pausada")).toBe("Pausada");
  });

  it("aguanta un estado desconocido o vacío", () => {
    expect(etiquetaEstado("inventado")).toBe("Inventado");
    expect(etiquetaEstado(undefined)).toBe("Sin estado");
  });
});

describe("calcularStatusPrevio", () => {
  it("es el estado que tiene, cuando no está abierta", () => {
    expect(calcularStatusPrevio(cotizacion({ status: "pendiente" }))).toBe(
      "pendiente",
    );
    expect(calcularStatusPrevio(cotizacion({ status: "creada" }))).toBe("creada");
    expect(calcularStatusPrevio(cotizacion({ status: "pausada" }))).toBe(
      "pausada",
    );
  });

  it("al asumir una que otro dejó abierta, conserva el estado que ese anotó", () => {
    expect(
      calcularStatusPrevio(
        cotizacion({ status: "enProceso", statusPrevio: "pendiente" }),
      ),
    ).toBe("pendiente");
  });

  it("una abierta sin ese dato —de antes de esta versión— se trata como pausada", () => {
    expect(calcularStatusPrevio(cotizacion({ status: "enProceso" }))).toBe(
      "pausada",
    );
  });
});

describe("hayCambios", () => {
  it("no ve cambios cuando el formulario está igual", () => {
    expect(hayCambios(cotizacion(), cotizacion())).toBe(false);
  });

  it("abrir la cotización no cuenta como cambio", () => {
    // Abrirla le cambia el status y le pone quién la atiende: eso lo hace la
    // app, no el usuario, y no debe disparar la pregunta al salir.
    const abierta = cotizacion({
      status: "enProceso",
      statusPrevio: "pendiente",
      atendidoPor: "Yasbleidy",
      atendidoPorUid: "u1",
    });
    expect(hayCambios(abierta, cotizacion())).toBe(false);
  });

  it("ve el cambio de un dato del cliente", () => {
    expect(hayCambios(cotizacion({ empresa: "Otro" }), cotizacion())).toBe(true);
  });

  it("ve el cambio de un ítem", () => {
    const conOtroItem = cotizacion({
      items: [{ description: "Andamio", quantity: 5, price: 1000 }],
    });
    expect(hayCambios(conOtroItem, cotizacion())).toBe(true);
  });

  it("ve un ítem agregado o quitado", () => {
    expect(hayCambios(cotizacion({ items: [] }), cotizacion())).toBe(true);
  });

  it("no le afecta el orden en que estén las claves", () => {
    const alReves = { totalNumero: 2000, empresa: "Ana Pérez" };
    const enOrden = { empresa: "Ana Pérez", totalNumero: 2000 };
    expect(hayCambios(alReves, enOrden)).toBe(false);
  });
});
