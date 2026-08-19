import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AbonoDialog from "./AbonoDialog";

// El diálogo donde se registra un pago que el cliente consigna después de
// facturar. Es de los que más plata mueven: un solo valor puede repartirse
// entre varias facturas, y lo que acá se muestre es lo que el usuario cree que
// va a pasar antes de apretar Guardar.
//
// El reparto en sí ya está probado como función pura en facturaUtils.test.js.
// Lo que se prueba ACÁ es lo otro: que la pantalla muestre ese reparto, que no
// deje guardar un abono incompleto, y que al guardar escriba los abonos que
// mostró — ni más ni menos.
//
// Firebase se reemplaza por un doble: la prueba no toca la base, pero sí puede
// revisar QUÉ se le pidió escribir.
const { updateSimulado, commitSimulado } = vi.hoisted(() => ({
  updateSimulado: vi.fn(),
  commitSimulado: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  // doc() devuelve la ruta armada, para poder afirmar a qué factura se escribió.
  doc: (_db, ...partes) => partes.join("/"),
  writeBatch: () => ({ update: updateSimulado, commit: commitSimulado }),
}));

const cliente = { id: "cli1", nombre: "Aida" };

// Dos facturas sin pagar nada: una debe 500.000 y la otra 300.000. Sin equipos
// ni fechas, para que el total sea exactamente el valor y el reparto se lea sin
// tener que hacer cuentas de días.
const facturas = [
  { id: "chica", numeroFactura: 1235, valorTotal: 300000, pagos: [], equipos: [], abonos: [] },
  { id: "grande", numeroFactura: 1234, valorTotal: 500000, pagos: [], equipos: [], abonos: [] },
];

const abrir = (props = {}) =>
  renderConProviders(
    <AbonoDialog
      open
      onClose={() => {}}
      cliente={cliente}
      facturas={facturas}
      {...props}
    />,
  );

beforeEach(() => {
  updateSimulado.mockClear();
  commitSimulado.mockClear();
});

describe("AbonoDialog", () => {
  it("dice cuántas facturas con saldo hay y las lista", () => {
    abrir();

    expect(screen.getByText("2 facturas con saldo")).toBeInTheDocument();
    expect(screen.getByText("Factura 1234")).toBeInTheDocument();
    expect(screen.getByText("Factura 1235")).toBeInTheDocument();
  });

  it("avisa cuando el cliente no debe nada, en vez de mostrar una lista vacía", () => {
    abrir({ facturas: [{ id: "x", valorTotal: 100, pagos: [{ monto: 100 }], equipos: [] }] });

    expect(
      screen.getByText("Este cliente no tiene facturas con saldo pendiente."),
    ).toBeInTheDocument();
    // El contador del título ("2 facturas con saldo") desaparece; el rótulo de
    // la sección, que dice lo mismo sin número, se queda siempre.
    expect(screen.queryByText(/^\d+ facturas? con saldo$/)).not.toBeInTheDocument();
  });

  it("muestra el reparto antes de guardar: salda la que más debe y pasa el resto", async () => {
    const { usuario } = abrir();

    // 600.000 alcanzan para saldar la de 500.000 y dejar 100.000 en la otra.
    await usuario.type(screen.getByLabelText("Valor del abono"), "600000");

    expect(screen.getByText("Queda saldada")).toBeInTheDocument();
    expect(screen.getByText("Queda debiendo")).toBeInTheDocument();
    // Lo que le queda debiendo a la chica: 300.000 − 100.000.
    expect(screen.getByText(/200[.,]000/)).toBeInTheDocument();
  });

  it("no deja guardar sin medio de pago ni valor, y no escribe nada", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    expect(screen.getByText("Elegí el medio de pago.")).toBeInTheDocument();
    expect(screen.getByText("El valor debe ser mayor a 0.")).toBeInTheDocument();
    expect(commitSimulado).not.toHaveBeenCalled();
  });

  it("guarda el abono en cada factura que recibió plata, con su parte", async () => {
    const alCerrar = vi.fn();
    const alAbonar = vi.fn();
    const { usuario } = abrir({ onClose: alCerrar, onAbonado: alAbonar });

    await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
    await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
    await usuario.type(screen.getByLabelText("Valor del abono"), "600000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    expect(commitSimulado).toHaveBeenCalledTimes(1);
    expect(updateSimulado).toHaveBeenCalledTimes(2);

    // A la que más debía le entra lo suyo primero…
    const [rutaGrande, cambiosGrande] = updateSimulado.mock.calls[0];
    expect(rutaGrande).toBe("clientes/cli1/facturas/grande");
    expect(cambiosGrande.abonos).toEqual([
      { fecha: expect.any(String), medio: "Efectivo", monto: 500000 },
    ]);

    // …y a la otra, solo el resto.
    const [rutaChica, cambiosChica] = updateSimulado.mock.calls[1];
    expect(rutaChica).toBe("clientes/cli1/facturas/chica");
    expect(cambiosChica.abonos[0].monto).toBe(100000);

    // Guardar avisa a la pantalla de atrás y cierra el diálogo.
    expect(alAbonar).toHaveBeenCalled();
    expect(alCerrar).toHaveBeenCalled();
  });

  it("conserva los abonos que la factura ya tenía en vez de pisarlos", async () => {
    const abonoViejo = { fecha: "2026-08-01", medio: "Nequi", monto: 50000 };
    const { usuario } = abrir({
      facturas: [
        {
          id: "unica",
          numeroFactura: 1,
          valorTotal: 300000,
          pagos: [],
          equipos: [],
          abonos: [abonoViejo],
        },
      ],
    });

    await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
    await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
    await usuario.type(screen.getByLabelText("Valor del abono"), "10000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    const [, cambios] = updateSimulado.mock.calls[0];
    expect(cambios.abonos).toHaveLength(2);
    expect(cambios.abonos[0]).toEqual(abonoViejo);
    expect(cambios.abonos[1].monto).toBe(10000);
  });
});
