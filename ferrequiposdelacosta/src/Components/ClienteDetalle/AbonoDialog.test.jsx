import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AbonoDialog from "./AbonoDialog";
import { unEquipoDevuelto, unaFactura } from "../../test/facturas";

// El diálogo donde se registra un pago que el cliente consigna después de
// facturar. Es de los que más plata mueven: un solo valor puede repartirse
// entre varias facturas, y lo que acá se muestre es lo que el usuario cree que
// va a pasar antes de apretar Guardar.
//
// El reparto en sí ya está probado como función pura en facturaCuentas.test.js.
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

// Una factura que debe exactamente lo que se le pide, sin nada más.
//
// El total ya no es un campo: sale de sus equipos. Así que lleva UN equipo, de
// un día y ya devuelto —con la línea cerrada los días no corren con el
// calendario—, y su valor por día es el total que la prueba necesita. Sin eso,
// mañana la factura debería más que hoy y el reparto cambiaría solo.
const facturaQueDebe = ({ id, numero, monto, abonos = [] }) => ({
  id,
  ...unaFactura({
    numeroFactura: String(numero),
    abonos,
    equipos: [
      unEquipoDevuelto({
        cantidad: 1,
        dias: 1,
        valorDia: monto,
        fechaDespacho: "2026-08-10",
        fechaVencimiento: "2026-08-10",
        fechaDevolucion: "2026-08-10",
      }),
    ],
  }),
});

const facturas = [
  facturaQueDebe({ id: "chica", numero: 1235, monto: 300000 }),
  facturaQueDebe({ id: "grande", numero: 1234, monto: 500000 }),
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
    const saldada = facturaQueDebe({ id: "x", numero: 9, monto: 100 });
    saldada.grupos[0].pagos = {
      tipoPago: "total",
      medios: [{ medio: "Efectivo", monto: 100 }],
    };
    abrir({ facturas: [saldada] });

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
    // `tipo: "sistema"` dice quién decidió que fuera a esta factura: lo
    // repartió la app entre las que tenían saldo, no lo pidió el cliente.
    expect(cambiosGrande.abonos).toEqual([
      { fecha: expect.any(String), medio: "Efectivo", monto: 500000, tipo: "sistema" },
    ]);

    // …y a la otra, solo el resto.
    const [rutaChica, cambiosChica] = updateSimulado.mock.calls[1];
    expect(rutaChica).toBe("clientes/cli1/facturas/chica");
    expect(cambiosChica.abonos[0].monto).toBe(100000);

    // Guardar avisa a la pantalla de atrás y cierra el diálogo.
    expect(alAbonar).toHaveBeenCalled();
    expect(alCerrar).toHaveBeenCalled();
  });

// Por defecto reparte la app, pero el cliente puede pedir otra cosa —"esto es
// para la 1234"— y entonces manda él. Es una decisión de plata: si se ignora,
// el abono termina en una factura que el cliente no nombró.
describe("AbonoDialog — cuando el cliente elige la factura", () => {
  const marcar = (usuario, numero) =>
    usuario.click(screen.getByLabelText(`Abonar a la factura ${numero}`));

  const cargarAbono = async (usuario, monto) => {
    await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
    await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
    await usuario.type(screen.getByLabelText("Valor del abono"), monto);
  };

  it("va entero a la que se marcó, aunque otra deba más", async () => {
    const { usuario } = abrir();

    // La 1235 debe $300.000 y la 1234 debe $500.000. Sin marcar nada, estos
    // $600.000 saldarían primero la grande; el cliente pidió la chica.
    await marcar(usuario, 1235);
    await cargarAbono(usuario, "600000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    expect(updateSimulado).toHaveBeenCalledTimes(1);
    const [ruta, cambios] = updateSimulado.mock.calls[0];
    expect(ruta).toBe("clientes/cli1/facturas/chica");
    expect(cambios.abonos[0].monto).toBe(600000);
    // Y queda escrito que lo decidió él, no el reparto.
    expect(cambios.abonos[0].tipo).toBe("cliente");
  });

  it("con dos marcadas reparte solo entre esas, de mayor a menor saldo", async () => {
    const { usuario } = abrir({
      facturas: [
        ...facturas,
        facturaQueDebe({ id: "tercera", numero: 1236, monto: 900000 }),
      ],
    });

    await marcar(usuario, 1234);
    await marcar(usuario, 1235);
    await cargarAbono(usuario, "600000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    // La tercera es la que más debe, pero no se marcó: no recibe nada.
    expect(updateSimulado).toHaveBeenCalledTimes(2);
    const rutas = updateSimulado.mock.calls.map(([ruta]) => ruta);
    expect(rutas).toEqual([
      "clientes/cli1/facturas/grande",
      "clientes/cli1/facturas/chica",
    ]);
    expect(updateSimulado.mock.calls[0][1].abonos[0].monto).toBe(500000);
    expect(updateSimulado.mock.calls[1][1].abonos[0].monto).toBe(100000);
  });

  it("desmarcar todo vuelve al reparto automático", async () => {
    const { usuario } = abrir();

    await marcar(usuario, 1235);
    await marcar(usuario, 1235);
    await cargarAbono(usuario, "600000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    // Las dos reciben, empezando por la que más debe, y el tipo vuelve a decir
    // que lo decidió la app.
    expect(updateSimulado).toHaveBeenCalledTimes(2);
    expect(updateSimulado.mock.calls[0][1].abonos[0].tipo).toBe("sistema");
  });

  it("lo que sobra queda a favor de la que el cliente eligió", async () => {
    const { usuario } = abrir();

    // Pidió que fuera a la chica, que debe $300.000, y entregó $400.000.
    await marcar(usuario, 1235);
    await cargarAbono(usuario, "400000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    // No se le pasa el sobrante a la otra: él dijo dónde iba esta plata.
    expect(updateSimulado).toHaveBeenCalledTimes(1);
    expect(updateSimulado.mock.calls[0][1].abonos[0].monto).toBe(400000);
  });
});

describe("AbonoDialog — lo que ya tenía", () => {
  it("conserva los abonos que la factura ya tenía en vez de pisarlos", async () => {
    const abonoViejo = {
      fecha: "2026-08-01",
      medio: "Nequi",
      monto: 50000,
      tipo: "cliente",
    };
    const { usuario } = abrir({
      facturas: [
        facturaQueDebe({ id: "unica", numero: 1, monto: 300000, abonos: [abonoViejo] }),
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
});
