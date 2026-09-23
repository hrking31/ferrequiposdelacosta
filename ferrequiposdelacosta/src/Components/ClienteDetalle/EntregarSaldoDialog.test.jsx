import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import EntregarSaldoDialog from "./EntregarSaldoDialog";
import { unEquipoDevuelto, unaFactura } from "../../test/facturas";
import { obtenerFechaHoyBogota } from "./facturaCuentas";

// El diálogo por donde SALE la plata hacia el cliente: el depósito que vuelve,
// o lo que pagó de más.
//
// Lo que se prueba acá es la decisión que lo hace peligroso: si el cliente
// debe en OTRA factura, entregarle la plata es sacarla de la caja para volver
// a pedírsela. El cruce evita eso, y como toca dos documentos a la vez, lo que
// hay que fijar es que las dos puntas se escriban y que ninguna invente plata.
const { updateSimulado, commitSimulado, updateDocSimulado } = vi.hoisted(() => ({
  updateSimulado: vi.fn(),
  commitSimulado: vi.fn(() => Promise.resolve()),
  updateDocSimulado: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: updateDocSimulado,
  writeBatch: () => ({ update: updateSimulado, commit: commitSimulado }),
}));

const cliente = { id: "cli1", nombre: "ReYaz" };

// Una factura con un equipo ya devuelto —con la línea cerrada los días no
// corren con el calendario, así que mañana debe lo mismo que hoy— y el pago
// que decide si le sobra o le falta plata.
const facturaCon = ({ id, numero, total, pagado }) => ({
  id,
  ...unaFactura({
    numeroFactura: String(numero),
    fechaCreacion: "2026-08-10",
    equipos: [
      unEquipoDevuelto({
        cantidad: 1,
        dias: 1,
        valorDia: total,
        fechaDespacho: "2026-08-10",
        fechaDevolucion: "2026-08-10",
      }),
    ],
    pagos: [{ medio: "Efectivo", monto: pagado }],
  }),
});

// La 2455 del caso real: pagó $1.000.000 sobre un total de $714.000, así que
// le quedan $286.000 a favor.
const conSaldoAFavor = () =>
  facturaCon({ id: "2455", numero: 2455, total: 714000, pagado: 1000000 });

const abrir = (props = {}) =>
  renderConProviders(
    <EntregarSaldoDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={conSaldoAFavor()}
      {...props}
    />,
  );

beforeEach(() => {
  updateSimulado.mockClear();
  commitSimulado.mockClear();
  updateDocSimulado.mockClear();
});

// EL CASO REAL, la 2455 de ReYaz: una rana de 6 días a $100.000 con IVA y
// $500.000 de depósito. La factura es de $714.000 y pagó $1.000.000: de eso,
// $500.000 fueron el depósito y $500.000 la factura, que quedó debiendo
// $214.000. Al devolver la rana el depósito quedó libre.
const conDeposito = () => ({
  id: "2455",
  ...unaFactura({
    numeroFactura: "2455",
    fechaCreacion: "2026-09-10",
    aplicaIva: true,
    valorDeposito: 500000,
    // El depósito ya se resolvió: la devolución quedó registrada y no se le
    // retuvo nada, así que los $500.000 son del cliente.
    depositoResuelto: true,
    equipos: [
      unEquipoDevuelto({
        nombre: "RANA",
        cantidad: 1,
        dias: 6,
        valorDia: 100000,
        fechaDespacho: "2026-09-10",
        fechaDevolucion: "2026-09-15",
      }),
    ],
    pagos: [{ medio: "Efectivo", monto: 1000000 }],
  }),
});

describe("EntregarSaldoDialog", () => {
  // De los $500.000 del depósito, $214.000 pagan lo que esa misma factura
  // todavía debía: no se le devuelve plata a quien la debe ahí mismo. Sin esa
  // resta escrita, el diálogo mostraría el depósito y lo que se devuelve sin
  // nada que explicara la diferencia.
  it("muestra de dónde sale la plata: el depósito menos lo que debía la factura", () => {
    abrir({ factura: conDeposito() });

    const deposito = screen.getByText("Depósito").closest("div");
    expect(deposito).toHaveTextContent(/500\.000/);

    const pendiente = screen.getByText("Paga lo que debe esta factura").closest("div");
    expect(pendiente).toHaveTextContent(/214\.000/);

    const favor = screen.getByText("Depósito a devolver").closest("div");
    expect(favor).toHaveTextContent(/286\.000/);
  });

  it("al devolver, anota con el depósito lo que la factura debía", async () => {
    const { usuario } = abrir({ factura: conDeposito(), facturas: [conDeposito()] });

    await usuario.click(screen.getByRole("combobox", { name: "Se entregó por" }));
    await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
    await usuario.click(screen.getByRole("button", { name: "Registrar entrega" }));

    expect(updateDocSimulado).toHaveBeenCalledTimes(1);
    const [, datos] = updateDocSimulado.mock.calls[0];
    expect(datos.entregas[0]).toMatchObject({ monto: 286000, medio: "Efectivo" });
    expect(datos.abonos).toEqual([
      { fecha: expect.any(String), medio: "Depósito", monto: 214000, tipo: "sistema" },
    ]);
  });

  // Cuando el saldo a favor no viene de un depósito sino de un sobrepago, no
  // hay nada que descomponer: el diálogo muestra la cifra y ya.
  it("no inventa la resta cuando no hubo depósito", () => {
    abrir();

    expect(screen.queryByText("Depósito")).not.toBeInTheDocument();
    expect(screen.queryByText("Paga lo que debe esta factura")).not.toBeInTheDocument();
  });

  it("muestra lo que le quedó a favor al cliente", () => {
    abrir();

    expect(screen.getByText("A favor del cliente")).toBeInTheDocument();
    expect(screen.getByText(/286\.000/)).toBeInTheDocument();
  });

  // Sin otra factura debiendo, el diálogo es el de siempre: fecha, medio y se
  // entrega la plata.
  it("no pregunta nada cuando el cliente no debe en ninguna otra factura", () => {
    abrir({ facturas: [conSaldoAFavor()] });

    expect(screen.queryByText(/Cruzarlo con lo que debe/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Registrar entrega" }),
    ).toBeInTheDocument();
  });

  describe("cuando el cliente debe en otra factura", () => {
    // Debe $500.000 en la 8215 y tiene $286.000 a favor en la 2455.
    const laQueDebe = () =>
      facturaCon({ id: "8215", numero: 8215, total: 500000, pagado: 0 });

    it("lo avisa y ofrece cruzarlo, ya elegido", async () => {
      abrir({ facturas: [conSaldoAFavor(), laQueDebe()] });

      expect(
        screen.getByText(/Este cliente debe .*500\.000.*en la factura 8215/),
      ).toBeInTheDocument();
      // El cruce viene marcado: entregar la plata pasa a ser la excepción.
      expect(screen.getByRole("radio", { name: /Cruzarlo/ })).toBeChecked();
      expect(
        screen.getByRole("button", { name: "Cruzar" }),
      ).toBeInTheDocument();
    });

    it("muestra cómo queda la otra factura antes de guardar", () => {
      abrir({ facturas: [conSaldoAFavor(), laQueDebe()] });

      expect(screen.getByText("A la factura 8215")).toBeInTheDocument();
      expect(screen.getByText("Le queda debiendo")).toBeInTheDocument();
      // $500.000 − $286.000
      expect(screen.getByText(/214\.000/)).toBeInTheDocument();
    });

    // LAS DOS PUNTAS, en una sola operación: de esta factura sale la plata y
    // en la otra entra como abono. Si solo se escribiera una, el cliente la
    // perdería o la cobraría dos veces.
    it("al cruzar escribe la salida acá y el abono allá", async () => {
      const { usuario } = abrir({ facturas: [conSaldoAFavor(), laQueDebe()] });

      await usuario.click(screen.getByRole("button", { name: "Cruzar" }));

      expect(commitSimulado).toHaveBeenCalledTimes(1);
      const escrituras = Object.fromEntries(
        updateSimulado.mock.calls.map(([ruta, datos]) => [ruta, datos]),
      );

      const salida = escrituras["clientes/cli1/facturas/2455"];
      expect(salida.entregas).toHaveLength(1);
      expect(salida.entregas[0]).toMatchObject({
        monto: 286000,
        medio: "Cruce",
        nota: "Cruzado a la factura 8215",
        fecha: obtenerFechaHoyBogota(),
      });

      const entrada = escrituras["clientes/cli1/facturas/8215"];
      expect(entrada.abonos).toHaveLength(1);
      expect(entrada.abonos[0]).toMatchObject({
        monto: 286000,
        tipo: "cruce",
        // De dónde vino, para que la otra factura pueda explicar por qué bajó
        // sin que el cliente pagara nada.
        desdeFactura: "2455",
      });

      // Las dos puntas por el mismo valor: el cruce no inventa ni pierde plata.
      expect(salida.entregas[0].monto).toBe(entrada.abonos[0].monto);
    });

    // El saldo a favor puede ser más grande que la deuda: se cruza lo que
    // alcanza y el resto sigue siendo del cliente.
    it("si sobra después de saldarla, el resto le queda a favor", async () => {
      const chica = facturaCon({ id: "8215", numero: 8215, total: 100000, pagado: 0 });
      const { usuario } = abrir({ facturas: [conSaldoAFavor(), chica] });

      expect(screen.getByText("Le sigue quedando a favor")).toBeInTheDocument();
      expect(screen.getByText(/186\.000/)).toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Cruzar" }));

      const escrituras = Object.fromEntries(
        updateSimulado.mock.calls.map(([ruta, datos]) => [ruta, datos]),
      );
      // Solo se movió lo que la otra debía.
      expect(escrituras["clientes/cli1/facturas/8215"].abonos[0].monto).toBe(100000);
      expect(escrituras["clientes/cli1/facturas/2455"].entregas[0].monto).toBe(100000);
    });

    // Cruzar es lo normal, pero no lo único: el cliente puede pedir su plata.
    it("y si se elige entregársela, no toca la otra factura", async () => {
      const { usuario } = abrir({ facturas: [conSaldoAFavor(), laQueDebe()] });

      await usuario.click(screen.getByRole("radio", { name: /Entregárselo/ }));
      await usuario.click(screen.getByRole("combobox", { name: "Se entregó por" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.click(screen.getByRole("button", { name: "Registrar entrega" }));

      // Una sola escritura, y sobre esta factura: la otra no se entera.
      expect(updateSimulado).not.toHaveBeenCalled();
      expect(updateDocSimulado).toHaveBeenCalledTimes(1);
      const [ruta, datos] = updateDocSimulado.mock.calls[0];
      expect(ruta).toBe("clientes/cli1/facturas/2455");
      expect(datos.entregas[0]).toMatchObject({ monto: 286000, medio: "Efectivo" });
    });
  });
});
