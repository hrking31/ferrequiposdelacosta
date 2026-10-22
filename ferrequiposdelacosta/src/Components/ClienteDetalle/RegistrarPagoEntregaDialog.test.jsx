import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import RegistrarPagoEntregaDialog from "./RegistrarPagoEntregaDialog";
import { unEquipo, unaFactura } from "../../test/facturas";
import { formatearMoneda } from "../../Utils/formato";

// El pago de un despacho "contra entrega", que llega a la oficina después con
// el personal de entrega (2026-10-22). Lo que se fija: que quede como PAGO DEL
// DESPACHO —el que cubre primero su depósito— y no como abono, y que lo que
// sobre sí vaya a abonos, como al crear la factura.
const { updateDocSimulado } = vi.hoisted(() => ({
  updateDocSimulado: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: updateDocSimulado,
}));

const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

const cliente = { id: "cli1", nombre: "FOCUS ING" };

// La 0773 como debió cargarse: 1 escalera por 1 día a $45.000 con IVA, flete
// de $80.000 y $100.000 de depósito. Al recibirla paga $233.550.
const factura = {
  id: "0773",
  ...unaFactura({
    numeroFactura: "0773",
    fechaCreacion: "2026-10-20",
    tipoPago: "contraEntrega",
    aplicaIva: true,
    transporte: "Ida y vuelta",
    valorTransporte: 80000,
    valorDeposito: 100000,
    equipos: [
      unEquipo({ nombre: "ESCALERA", cantidad: 1, dias: 1, valorDia: 45000, fechaDespacho: "2026-10-20" }),
    ],
  }),
};

const abrir = (props = {}) =>
  renderConProviders(
    <RegistrarPagoEntregaDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={factura}
      grupo={factura.grupos[0]}
      {...props}
    />,
  );

const elegirEfectivo = async (usuario) => {
  await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
  await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
};

beforeEach(() => {
  updateDocSimulado.mockClear();
});

describe("RegistrarPagoEntregaDialog", () => {
  it("dice cuánto paga al recibir: alquiler, IVA, transporte y depósito", () => {
    abrir();

    expect(screen.getByText(enPantalla(45000))).toBeInTheDocument();
    expect(screen.getByText(enPantalla(8550))).toBeInTheDocument();
    expect(screen.getByText(enPantalla(80000))).toBeInTheDocument();
    expect(screen.getByText(enPantalla(100000))).toBeInTheDocument();
    expect(screen.getByText(enPantalla(233550))).toBeInTheDocument();
  });

  it("lo guarda como pago del despacho, no como abono", async () => {
    const alGuardar = vi.fn();
    const { usuario } = abrir({ onGuardado: alGuardar });

    await elegirEfectivo(usuario);
    await usuario.click(screen.getByRole("button", { name: "Registrar pago" }));

    const [ruta, cambios] = updateDocSimulado.mock.calls[0];
    expect(ruta).toBe("clientes/cli1/facturas/0773");
    expect(cambios.grupos[0].pagos).toEqual({
      tipoPago: "total",
      medios: [{ medio: "Efectivo", monto: 233550 }],
    });
    // Nada de abonos: la plata es del despacho.
    expect(cambios).not.toHaveProperty("abonos");
    expect(alGuardar).toHaveBeenCalled();
  });

  it("lo que entrega de más queda como abono, con la fecha del despacho", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("combobox", { name: "Tipo de pago" }));
    await usuario.click(await screen.findByRole("option", { name: "Pago con abono" }));
    await elegirEfectivo(usuario);
    await usuario.type(screen.getByLabelText("Monto"), "250000");
    await usuario.click(screen.getByRole("button", { name: "Registrar pago" }));

    const [, cambios] = updateDocSimulado.mock.calls[0];
    expect(cambios.grupos[0].pagos.medios).toEqual([{ medio: "Efectivo", monto: 233550 }]);
    expect(cambios.abonos).toEqual([
      { fecha: "2026-10-20", medio: "Efectivo", monto: 16450, tipo: "sistema" },
    ]);
  });

  it("sin medio de pago no guarda nada", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(screen.getByText("Elegí el medio de pago y el valor que llegó.")).toBeInTheDocument();
    expect(updateDocSimulado).not.toHaveBeenCalled();
  });
});
