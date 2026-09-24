import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AbonoDialog from "./AbonoDialog";
import { unEquipo, unEquipoDevuelto, unaFactura,
  unTramoVencido,
} from "../../test/facturas";
import {
  calcularCuentaFactura,
  obtenerFechaHoyBogota,
} from "./facturaCuentas";
import { formatearMoneda } from "../../Utils/formato";

// La cifra tal como hay que buscarla en pantalla. Dos diferencias con el
// literal escrito a mano, y las dos muerden: el formato del peso trae
// decimales acá y no en el navegador ("$ 300.000,00" contra "$ 300.000"), y el
// separador que pone Intl es un espacio duro, que Testing Library convierte en
// uno normal antes de comparar.
const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

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
const facturaQueDebe = ({ id, numero, monto, abonos = [], fecha = "2026-08-10" }) => ({
  id,
  ...unaFactura({
    numeroFactura: String(numero),
    fechaCreacion: fecha,
    abonos,
    equipos: [
      unEquipoDevuelto({
        cantidad: 1,
        dias: 1,
        valorDia: monto,
        fechaDespacho: "2026-08-10",
        fechaDevolucion: "2026-08-10",
      }),
    ],
  }),
});

// La "grande" es además la MÁS ANTIGUA, que es lo que decide el reparto. Van
// desordenadas a propósito: el orden lo tiene que poner la app, no la lista.
const facturas = [
  facturaQueDebe({ id: "chica", numero: 1235, monto: 300000, fecha: "2026-08-20" }),
  facturaQueDebe({ id: "grande", numero: 1234, monto: 500000, fecha: "2026-08-10" }),
];

// `avisarEquiposVencidos` va encendido por defecto porque es como lo abre
// cartera, que es la pantalla donde se cobra; la ficha del cliente lo abre sin
// él y tiene su propia prueba.
const abrir = (props = {}) =>
  renderConProviders(
    <AbonoDialog
      open
      avisarEquiposVencidos
      onClose={() => {}}
      cliente={cliente}
      facturas={facturas}
      {...props}
    />,
  );

// El paso 1 del diálogo: qué se va a pagar.
const pagarTodo = (usuario) =>
  usuario.click(screen.getByRole("button", { name: /Toda la deuda/ }));
const pagarFacturas = (usuario) =>
  usuario.click(screen.getByRole("button", { name: /Facturas específicas/ }));

beforeEach(() => {
  updateSimulado.mockClear();
  commitSimulado.mockClear();
});

describe("AbonoDialog", () => {
  it("dice cuántas facturas con saldo hay y las lista al elegir facturas", async () => {
    const { usuario } = abrir();

    expect(screen.getByText("2 facturas con saldo")).toBeInTheDocument();
    // Hasta elegir qué se paga no aparece nada más.
    expect(screen.queryByLabelText("Valor del abono")).not.toBeInTheDocument();

    await pagarFacturas(usuario);
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

  it("muestra el reparto antes de guardar: salda la más antigua y pasa el resto", async () => {
    const { usuario } = abrir();

    // 600.000 alcanzan para saldar la más antigua —que debe 500.000— y dejar
    // 100.000 en la otra.
    await pagarTodo(usuario);
    await usuario.type(screen.getByLabelText("Valor del abono"), "600000");

    // La deuda del cliente entera: 800.000 y lo que queda después.
    expect(screen.getByText("Deuda después del abono")).toBeInTheDocument();
    expect(screen.getAllByText(/800[.,]000/).length).toBeGreaterThan(0);

    // El reparto por factura va plegado.
    expect(screen.queryByText("Queda saldada")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver cómo se reparte" }));
    expect(screen.getByText("Queda saldada")).toBeInTheDocument();
    expect(screen.getByText("Queda debiendo")).toBeInTheDocument();

    // Los 200.000 salen DOS veces, y por casualidad: lo que queda debiendo el
    // cliente (800.000 − 600.000) y lo que le queda debiendo la factura chica
    // (300.000 − 100.000).
    expect(screen.getAllByText(/200[.,]000/)).toHaveLength(2);
  });

  it("no deja guardar sin elegir qué se paga, sin valor ni sin medio", async () => {
    const { usuario } = abrir();

    // Sin el paso 1, el botón está apagado.
    expect(screen.getByRole("button", { name: "Registrar abono" })).toBeDisabled();

    await pagarTodo(usuario);
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));
    expect(screen.getByText("El valor debe ser mayor a 0.")).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Valor del abono"), "10000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));
    expect(screen.getByText("Elegí el medio de pago.")).toBeInTheDocument();

    expect(commitSimulado).not.toHaveBeenCalled();
  });

  it("guarda el abono en cada factura que recibió plata, con su parte", async () => {
    const alCerrar = vi.fn();
    const alAbonar = vi.fn();
    const { usuario } = abrir({ onClose: alCerrar, onAbonado: alAbonar });

    await pagarTodo(usuario);
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
  const marcar = async (usuario, numero) => {
    if (!screen.queryByLabelText(`Abonar a la factura ${numero}`)) await pagarFacturas(usuario);
    await usuario.click(screen.getByLabelText(`Abonar a la factura ${numero}`));
  };

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

  it("con dos marcadas reparte solo entre esas, de la más antigua a la más nueva", async () => {
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

  it("sin ninguna marcada no sigue, y volver a toda la deuda reparte la app", async () => {
    const { usuario } = abrir();

    await marcar(usuario, 1235);
    await marcar(usuario, 1235);
    // Con facturas específicas y ninguna marcada, no hay nada que pagar.
    expect(screen.queryByLabelText("Valor del abono")).not.toBeInTheDocument();

    await pagarTodo(usuario);
    await cargarAbono(usuario, "600000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    // Las dos reciben, empezando por la más antigua, y el tipo vuelve a decir
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
  // ── El sellado de los días vencidos ────────────────────────────────
  //
  // Un equipo que sigue afuera y pasado de fecha acumula días. Si el cliente
  // paga todo lo que se le puede reclamar hoy, esos días quedan cobrados y
  // tienen que cerrarse acá mismo: mañana el calendario los volvería a contar
  // y se le pedirían de nuevo, sumados a los nuevos.
  describe("cuando el abono salda una factura con equipos vencidos afuera", () => {
    // Un compresor despachado hace 4 días por 3: lleva 2 días vencidos y
    // sigue en la obra. Las fechas se cuentan contra HOY porque el diálogo usa
    // el día real al guardar.
    const haceDias = (dias) => {
      const fecha = new Date(`${obtenerFechaHoyBogota()}T00:00:00Z`);
      fecha.setUTCDate(fecha.getUTCDate() - dias);
      return fecha.toISOString().slice(0, 10);
    };

    const conCompresorVencido = (numero = "5698") => ({
      id: numero,
      ...unaFactura({
        numeroFactura: numero,
        fechaCreacion: haceDias(4),
        equipos: [
          unEquipo({
            nombre: "COMPRESOR",
            cantidad: 1,
            valorDia: 150000,
            dias: 3,
            fechaDespacho: haceDias(4),
            // Cubierto hasta hace dos días; la madrugada de ayer le abrió
            // su tramo, así que lleva 2 días de más.
            vencidos: [unTramoVencido({ desde: haceDias(1), hasta: null })],
          }),
        ],
      }),
    });

    // Ya no hay nada que elegir: el aviso de los equipos es un recordatorio,
    // así que el abono se guarda derecho.
    const abonarSobre = async (factura, monto) => {
      const { usuario } = abrir({ facturas: [factura] });
      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.type(screen.getByLabelText("Valor del abono"), String(monto));
      await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));
      return updateSimulado.mock.calls[0]?.[1];
    };

    it("sella los días vencidos junto con el abono", async () => {
      const factura = conCompresorVencido();
      const total = calcularCuentaFactura(factura, obtenerFechaHoyBogota()).total;

      const cambios = await abonarSobre(factura, total);

      // Se escriben las dos cosas en la misma operación: el abono y los
      // equipos con sus días ya cerrados.
      expect(cambios.abonos).toHaveLength(1);
      // El tramo que venía corriendo queda cerrado hoy, con sus dos fechas.
      const [tramo] = cambios.grupos[0].equipos[0].vencidos;
      expect(tramo).toMatchObject({
        desde: haceDias(1),
        hasta: obtenerFechaHoyBogota(),
      });
      // Y no se le inventa ninguna ampliación: no se le concedió ni un día,
      // solo se cerró lo que ya había pasado.
      expect(cambios.grupos[0].equipos[0].ampliaciones).toHaveLength(0);
    });

    // EL RECORDATORIO. Hasta el 2026-09-15 acá había un formulario —días o
    // entrega indefinida por cada equipo— y el botón de guardar apagado hasta
    // contestar. Trababa el cobro, así que quedó en aviso: el plazo se pacta
    // con el botón de renovación.
    it("avisa que el equipo sigue en la obra, pero deja cobrar igual", async () => {
      const factura = conCompresorVencido();
      const { usuario } = abrir({ facturas: [factura] });

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.type(screen.getByLabelText("Valor del abono"), "100000");

      expect(
        screen.getByText("1 equipo vencido pendiente de gestión"),
      ).toBeInTheDocument();
      // Y con la salida a la vista: el aviso no obliga a nada.
      expect(screen.getByText(/puedes omitir este aviso/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Registrar abono" })).toBeEnabled();

      await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

      // Entra la plata y nada más: ni ampliación, ni entrega indefinida, ni un
      // renglón de renovación en la bitácora que nadie pactó.
      const cambios = updateSimulado.mock.calls[0][1];
      expect(cambios.abonos).toHaveLength(1);
      expect(cambios.grupos).toBeUndefined();
      expect(cambios.gestiones).toBeUndefined();
    });

    // Con más de una factura recibiendo plata el aviso las nombra: el cliente
    // puede estar pagando dos y tener equipos afuera en las dos. Con una sola
    // no hace falta, que es la que se está mirando.
    it("cuenta los equipos de todas las facturas que reciben plata", async () => {
      const { usuario } = abrir({
        facturas: [conCompresorVencido(), conCompresorVencido("5699")],
      });

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.type(screen.getByLabelText("Valor del abono"), "5000000");

      expect(
        screen.getByText("2 equipos vencidos pendientes de gestión (facturas 5698, 5699)"),
      ).toBeInTheDocument();
    });

    // Una factura sin equipos vencidos no avisa nada: el diálogo sigue siendo
    // el de siempre.
    it("no avisa cuando no hay ningún equipo vencido afuera", async () => {
      const { usuario } = abrir();

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.type(screen.getByLabelText("Valor del abono"), "100000");

      expect(screen.queryByText(/pendiente.? de gestión/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Registrar abono" })).toBeEnabled();
    });

    // En la ficha del cliente solo se registran abonos: lo del equipo es
    // cobranza y se mira donde se cobra. Es la misma regla que ya siguen las
    // devoluciones.
    it("desde la ficha del cliente no avisa por los equipos", async () => {
      const factura = conCompresorVencido();
      const { usuario } = abrir({ facturas: [factura], avisarEquiposVencidos: false });

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.type(screen.getByLabelText("Valor del abono"), "100000");

      expect(screen.queryByText(/pendiente.? de gestión/)).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

      const cambios = updateSimulado.mock.calls[0][1];
      expect(cambios.abonos).toHaveLength(1);
      expect(cambios.grupos).toBeUndefined();
    });

    it("no sella nada si el abono no alcanza a cubrir lo que se le reclama hoy", async () => {
      const cambios = await abonarSobre(conCompresorVencido(), 100000);

      // Se escribe el abono y nada más: el equipo sigue igual, con su tramo
      // abierto, y mañana le corren los días que siga afuera.
      expect(cambios.abonos).toHaveLength(1);
      expect(cambios.grupos).toBeUndefined();
    });
  });

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

    await pagarTodo(usuario);
    await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
    await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
    await usuario.type(screen.getByLabelText("Valor del abono"), "10000");
    await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

    const [, cambios] = updateSimulado.mock.calls[0];
    expect(cambios.abonos).toHaveLength(2);
    expect(cambios.abonos[0]).toEqual(abonoViejo);
    expect(cambios.abonos[1].monto).toBe(10000);
  });

  // EL DEPÓSITO DENTRO DEL SALDO. Entra y sale de la cuenta solo —se cobra
  // mientras los equipos están afuera y se descuenta al liquidarlo—, así que
  // el saldo significa dos cosas distintas según el momento. Sin decirlo, el
  // que cobra no puede saber si la cifra que tiene delante ya lo tiene
  // adentro, y ahí es donde se cobra de más o se devuelve de más.
  describe("el depósito dentro del saldo", () => {
    // El caso de la 8215: el cliente dejó $300.000, devolvió todo, un equipo
    // volvió dañado y se le retuvieron $40.000. El depósito ya se liquidó y
    // quedan $260.000 libres.
    const conDepositoLiquidado = {
      id: "liquidada",
      ...unaFactura({
        numeroFactura: "8215",
        fechaCreacion: "2026-08-10",
        depositoResuelto: true,
        valorDeposito: 300000,
        pagos: [{ medio: "Efectivo", monto: 300000 }],
        equipos: [
          unEquipoDevuelto({
            cantidad: 1,
            dias: 1,
            valorDia: 500000,
            fechaDespacho: "2026-08-10",
            fechaDevolucion: "2026-08-10",
            buenEstado: false,
            motivo: "rayadura y golpe",
            valorRetenido: 40000,
          }),
        ],
      }),
    };

    // El mismo depósito, pero el equipo todavía está en la obra: la garantía
    // sigue vigente y por eso está sumada al saldo.
    const conEquipoAfuera = {
      id: "afuera",
      ...unaFactura({
        numeroFactura: "8300",
        fechaCreacion: "2026-08-10",
        valorDeposito: 300000,
        equipos: [
          unEquipo({
            cantidad: 1,
            dias: 30,
            valorDia: 10000,
            fechaDespacho: "2026-08-10",
          }),
        ],
      }),
    };

    it("con el equipo afuera avisa que el saldo trae el depósito por cobrar", async () => {
      const { usuario } = abrir({ facturas: [conEquipoAfuera] });

      await pagarFacturas(usuario);
      // Se compara contra la MISMA función que pinta la cifra: el formato del
      // peso cambia entre el navegador y las pruebas.
      expect(
        screen.getByText(`Incluye ${enPantalla(300000)} de depósito por cobrar`),
      ).toBeInTheDocument();

      // Con el equipo afuera no hay depósito libre: no se ofrece usarlo.
      await pagarTodo(usuario);
      expect(screen.queryByText(/Usar primero el depósito libre/)).not.toBeInTheDocument();
    });

    it("liquidado, ofrece usar primero el depósito libre, con cuánto hay", async () => {
      const { usuario } = abrir({ facturas: [conDepositoLiquidado] });

      await pagarTodo(usuario);
      // $300.000 menos los $40.000 del daño.
      expect(
        screen.getByText(`Usar primero el depósito libre (${enPantalla(260000)})`),
      ).toBeInTheDocument();
    });

    it("con el depósito solo, guarda un abono con ese medio y sin plata", async () => {
      const { usuario } = abrir({ facturas: [conDepositoLiquidado] });

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("checkbox"));
      await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

      expect(updateSimulado).toHaveBeenCalledTimes(1);
      const [ruta, cambios] = updateSimulado.mock.calls[0];
      expect(ruta).toBe("clientes/cli1/facturas/liquidada");
      expect(cambios.abonos).toEqual([
        { fecha: expect.any(String), medio: "Depósito", monto: 260000, tipo: "sistema" },
      ]);
    });

    it("depósito y plata en un solo paso: cada factura usa el suyo y la plata cubre el resto", async () => {
      // La liquidada debe $500.000 con $260.000 libres; la grande $500.000 y la
      // chica $300.000, sin depósito. Deben $1.300.000 en total.
      const { usuario } = abrir({ facturas: [conDepositoLiquidado, ...facturas] });

      await pagarTodo(usuario);
      await usuario.click(screen.getByRole("checkbox"));
      await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
      await usuario.click(await screen.findByRole("option", { name: "Efectivo" }));
      await usuario.click(screen.getByRole("button", { name: "Pagar lo que falta" }));
      expect(screen.getByLabelText("Valor del abono")).toHaveValue("1.040.000");
      expect(screen.getByText("Queda al día")).toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Registrar abono" }));

      // Un solo guardado, las tres facturas.
      expect(commitSimulado).toHaveBeenCalledTimes(1);
      const escrituras = Object.fromEntries(
        updateSimulado.mock.calls.map(([ruta, cambios]) => [ruta, cambios.abonos]),
      );
      // La liquidada: primero su depósito, después la plata que le faltaba.
      expect(escrituras["clientes/cli1/facturas/liquidada"]).toEqual([
        { fecha: expect.any(String), medio: "Depósito", monto: 260000, tipo: "sistema" },
        { fecha: expect.any(String), medio: "Efectivo", monto: 240000, tipo: "sistema" },
      ]);
      // Las otras, solo plata: el depósito de una no paga otra.
      expect(escrituras["clientes/cli1/facturas/grande"]).toEqual([
        { fecha: expect.any(String), medio: "Efectivo", monto: 500000, tipo: "sistema" },
      ]);
      expect(escrituras["clientes/cli1/facturas/chica"]).toEqual([
        { fecha: expect.any(String), medio: "Efectivo", monto: 300000, tipo: "sistema" },
      ]);
    });

    it("sin depósito libre no aparece la casilla", async () => {
      const { usuario } = abrir();

      await pagarTodo(usuario);
      expect(screen.queryByText(/Usar primero el depósito libre/)).not.toBeInTheDocument();
    });
  });
});
});
