import { screen, waitFor, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import CorregirFacturaDialog from "./CorregirFacturaDialog";
import { calcularVencimiento, obtenerFechaHoyBogota } from "./facturaUtils";
import { rearmarEquipo } from "./facturaCuentas";
import { formatearMoneda } from "../../Utils/formato";
import {
  unEquipo,
  unEquipoDevuelto,
  unTramoVencido,
  unaFactura,
} from "../../test/facturas";

// La pantalla con la que el administrador corrige una factura ya cargada. Las
// cuentas están probadas en correccionFactura.test.js; acá se fija lo que
// hace la pantalla: qué muestra antes de guardar, qué escribe y cuándo se
// niega a escribir.
const bd = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  // Las dos lecturas del historial: los cambios anotados y los usuarios.
  getDocs: vi.fn(),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
// El encabezado de la app trae la sesión y la foto del usuario; acá solo
// importan los botones que la corrección le pasa.
vi.mock("../HeaderUsuario/HeaderUsuario", () => ({
  default: function HeaderFalso({ acciones }) {
    return <div>{acciones}</div>;
  },
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  collection: (_db, ...partes) => partes.join("/"),
  query: (coleccion) => coleccion,
  where: () => null,
  getDocs: (coleccion) => bd.getDocs(coleccion),
  runTransaction: (_db, operacion) => operacion({ get: bd.get, update: bd.update }),
}));

// Lo que devuelve cada colección, como lo entrega Firestore.
const enLaBase = (colecciones) => (coleccion) =>
  Promise.resolve({
    docs: (colecciones[coleccion] ?? []).map(({ id, ...datos }) => ({
      id,
      data: () => datos,
    })),
  });

const HOY = obtenerFechaHoyBogota();
const hace = (dias) => calcularVencimiento(HOY, -dias);
const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

// 6 cerchas a $1.500 que salieron hace 40 días por 7 —cubiertas hasta hace
// 34— y volvieron a tiempo. La factura se digitó hace 3 días y la devolución
// quedó con esa fecha: 31 días de mora que no existieron, $279.000.
const DESPACHO = hace(40);
const VOLVIO_DE_VERDAD = hace(34);
const SE_ANOTO = hace(3);

const documento = () =>
  unaFactura({
    numeroFactura: "0412",
    fechaCreacion: DESPACHO,
    tipoPago: "total",
    pagos: [{ medio: "Efectivo", monto: 63000 }],
    equipos: [
      unEquipoDevuelto({
        nombre: "CERCHAS METALICAS",
        cantidad: 6,
        valorDia: 1500,
        dias: 7,
        fechaDespacho: DESPACHO,
        aplicaIva: false,
        vencidos: [unTramoVencido({ desde: hace(33), hasta: SE_ANOTO })],
        fechaDevolucion: SE_ANOTO,
      }),
    ],
  });

const abrir = (props = {}) =>
  renderConProviders(
    <CorregirFacturaDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={{ id: "f1", ...documento() }}
      {...props}
    />,
  );

const botonGuardar = () => screen.getByRole("button", { name: "Guardar cambios" });
const cuenta = () => within(screen.getByLabelText("Así queda"));
const renglon = (rotulo) => cuenta().getByText(rotulo).parentElement;

const escribirFecha = async (usuario, etiqueta, fecha) => {
  await usuario.clear(screen.getByLabelText(etiqueta));
  await usuario.type(screen.getByLabelText(etiqueta), fecha);
};

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto, en la base está la misma factura que se abrió.
  bd.get.mockResolvedValue({ data: () => documento() });
  bd.getDocs.mockImplementation(enLaBase({}));
});

// Lo que se CORRIGIÓ en la factura, anotado por el servidor: quién, cuándo y
// qué cambió. Va al final de la pantalla y solo lo lee el administrador.
describe("CorregirFacturaDialog — el historial de correcciones", () => {
  it("muestra solo las correcciones, con su autor, de la más nueva a la más vieja", async () => {
    const conAbono = (medio) => ({
      ...documento(),
      abonos: [{ fecha: SE_ANOTO, medio, monto: 50000, tipo: "cliente" }],
    });
    bd.getDocs.mockImplementation(
      enLaBase({
        registroFacturas: [
          {
            id: "c1",
            clase: "creada",
            cuando: Date.UTC(2026, 8, 1, 15, 0),
            quien: "uid-aida",
            tipoDeAutor: "app_user",
            antes: null,
            despues: documento(),
          },
          // El trabajo de todos los días: anotar un abono. No sale.
          {
            id: "c2",
            clase: "modificada",
            cuando: Date.UTC(2026, 9, 9, 15, 0),
            quien: "uid-aida",
            tipoDeAutor: "app_user",
            antes: documento(),
            despues: conAbono("Nequi"),
          },
          {
            id: "c3",
            clase: "modificada",
            cuando: Date.UTC(2026, 9, 10, 15, 0),
            quien: "uid-aida",
            tipoDeAutor: "app_user",
            antes: conAbono("Nequi"),
            despues: conAbono("Efectivo"),
          },
          {
            id: "c4",
            clase: "modificada",
            cuando: Date.UTC(2026, 9, 11, 15, 0),
            quien: "uid-hernando",
            tipoDeAutor: "app_user",
            antes: conAbono("Efectivo"),
            despues: documento(),
          },
        ],
        users: [
          { id: "uid-aida", name: "Aida Pérez" },
          { id: "uid-hernando", name: "Hernando Rey" },
        ],
      }),
    );
    abrir();

    const historial = within(await screen.findByLabelText("Historial de correcciones"));
    expect(await historial.findByText(/Hernando Rey/)).toBeInTheDocument();
    expect(historial.getByText(/Abono del .*: medio Nequi → Efectivo/)).toBeInTheDocument();
    expect(historial.getByText(/Abonos: .*50\.000.* → .*0/)).toBeInTheDocument();
    expect(historial.queryByText("· Se creó la factura.")).not.toBeInTheDocument();
    expect(historial.queryByText(/Abono de .*50\.000.* por Nequi/)).not.toBeInTheDocument();

    // La que quitó el abono, que es lo último que pasó, va primero.
    const autores = historial.getAllByText(/ · (Aida Pérez|Hernando Rey)$/);
    expect(autores.map((nodo) => nodo.textContent.split(" · ")[1])).toEqual([
      "Hernando Rey",
      "Aida Pérez",
    ]);
  });

  it("sin correcciones, lo dice", async () => {
    abrir();

    expect(await screen.findByText("Esta factura no tiene correcciones.")).toBeInTheDocument();
  });

  // Si el historial no se puede leer, la corrección sigue funcionando: son
  // dos cosas distintas y una no puede trabar a la otra.
  it("si no se puede leer, avisa y deja corregir igual", async () => {
    bd.getDocs.mockRejectedValue(new Error("permission-denied"));
    const { usuario } = abrir();

    expect(
      await screen.findByText("No se pudo leer el historial de esta factura."),
    ).toBeInTheDocument();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    expect(botonGuardar()).toBeEnabled();
  });
});

describe("CorregirFacturaDialog — al abrir", () => {
  it("muestra la factura entera y no deja guardar hasta que se corrija algo", () => {
    abrir();

    expect(screen.getByLabelText("N° de factura")).toHaveValue("0412");
    expect(screen.getByLabelText("Equipo")).toHaveValue("CERCHAS METALICAS");
    expect(screen.getByLabelText("Fecha de devolución")).toHaveValue(SE_ANOTO);
    // La cuenta como está hoy: en cobro, debiendo la mora.
    expect(renglon("Estado")).toHaveTextContent("Cobro");
    expect(renglon("Saldo pendiente")).toHaveTextContent(enPantalla(279000));
    expect(botonGuardar()).toBeDisabled();
  });
});

describe("CorregirFacturaDialog — corregir la fecha de la devolución", () => {
  it("antes de guardar muestra la cuenta de antes y la de después", async () => {
    const { usuario } = abrir();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);

    expect(renglon("Estado")).toHaveTextContent("Cobro → Finalizada");
    expect(renglon("Días vencidos")).toHaveTextContent(
      `${enPantalla(279000)} → ${enPantalla(0)}`,
    );
    expect(renglon("Saldo pendiente")).toHaveTextContent(
      `${enPantalla(279000)} → ${enPantalla(0)}`,
    );
    // Y avisa que lo descargado antes ya no vale.
    expect(screen.getByText(/ya no valen/)).toBeInTheDocument();
    expect(botonGuardar()).toBeEnabled();
  });

  it("guarda solo la factura y sus despachos, con la mora rehecha", async () => {
    const onGuardado = vi.fn();
    const { usuario } = abrir({ onGuardado });

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    await usuario.click(botonGuardar());

    expect(await screen.findByText("Factura corregida.")).toBeInTheDocument();
    expect(bd.update).toHaveBeenCalledTimes(1);
    const [ruta, escrito] = bd.update.mock.calls[0];
    expect(ruta).toBe("clientes/cli1/facturas/f1");
    // Los abonos, las entregas y la bitácora no viajan: no se corrigieron.
    expect(Object.keys(escrito).sort()).toEqual(["factura", "grupos"]);

    const [equipo] = escrito.grupos[0].equipos;
    expect(equipo.devolucion.fechaDevolucion).toBe(VOLVIO_DE_VERDAD);
    expect(equipo.vencidos).toEqual([]);
    expect(escrito.factura.cerrada).toBe(true);
    expect(onGuardado).toHaveBeenCalled();
  });

  // Son facturas reales: si otra persona anotó algo mientras la pantalla
  // estaba abierta, guardar encima borraría lo que esa persona hizo.
  it("si la factura cambió en la base mientras tanto, no escribe nada", async () => {
    const cambiada = documento();
    cambiada.grupos[0].equipos[0].valorDia = 2000;
    bd.get.mockResolvedValue({ data: () => cambiada });
    const { usuario } = abrir();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    await usuario.click(botonGuardar());

    expect(
      await screen.findByText(/cambió mientras la corregías y no se guardó nada/),
    ).toBeInTheDocument();
    expect(bd.update).not.toHaveBeenCalled();
  });

  // La marca de "cerrada" la pone el servidor un momento después de cada
  // cambio: que la pantalla la tenga atrasada no es que alguien tocó algo.
  it("que el servidor haya movido la marca de cerrada no lo impide", async () => {
    const sellada = documento();
    sellada.factura.cerrada = true;
    bd.get.mockResolvedValue({ data: () => sellada });
    const { usuario } = abrir();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    await usuario.click(botonGuardar());

    expect(await screen.findByText("Factura corregida.")).toBeInTheDocument();
  });

  // La factura que se abrió y la que se relee al guardar llegan por dos
  // lecturas distintas, y Firestore puede entregar los campos en otro orden.
  // Pasó con una factura real el 14/10: nadie la tocó y no dejaba guardar.
  it("la misma factura con los campos en otro orden no cuenta como cambiada", async () => {
    const alReves = (valor) =>
      Array.isArray(valor)
        ? valor.map(alReves)
        : valor && typeof valor === "object"
          ? Object.fromEntries(
              Object.entries(valor)
                .reverse()
                .map(([clave, dato]) => [clave, alReves(dato)]),
            )
          : valor;
    bd.get.mockResolvedValue({ data: () => alReves(documento()) });
    const { usuario } = abrir();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    await usuario.click(botonGuardar());

    expect(await screen.findByText("Factura corregida.")).toBeInTheDocument();
    expect(bd.update).toHaveBeenCalledTimes(1);
  });

  it("quitar la devolución deja el equipo afuera y vencido", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Quitar la devolución" }));

    expect(screen.queryByLabelText("Fecha de devolución")).not.toBeInTheDocument();
    expect(renglon("Estado")).toHaveTextContent("Cobro → Vencida");

    await usuario.click(botonGuardar());
    await screen.findByText("Factura corregida.");
    const [equipo] = bd.update.mock.calls[0][1].grupos[0].equipos;
    expect(equipo.devolucion).toBeUndefined();
    expect(equipo.vencidos).toEqual([
      { desde: hace(33), hasta: null, indefinida: false },
    ]);
  });
});

describe("CorregirFacturaDialog — los datos del equipo", () => {
  it("corrige la cantidad y recalcula la cuenta", async () => {
    const { usuario } = abrir();

    await usuario.clear(screen.getByLabelText("Cantidad"));
    await usuario.type(screen.getByLabelText("Cantidad"), "4");
    await usuario.click(botonGuardar());

    await screen.findByText("Factura corregida.");
    const [equipo] = bd.update.mock.calls[0][1].grupos[0].equipos;
    expect(equipo.cantidadEquipos).toBe(4);
    // La devolución y su mora siguen donde estaban: no se tocaron.
    expect(equipo.devolucion.fechaDevolucion).toBe(SE_ANOTO);
    expect(equipo.vencidos).toEqual([
      { desde: hace(33), hasta: SE_ANOTO, indefinida: false },
    ]);
  });

  it("con un dato inválido dice cuál y no deja guardar", async () => {
    const { usuario } = abrir();

    await usuario.clear(screen.getByLabelText("Cantidad"));

    expect(
      screen.getByText("· CERCHAS METALICAS: la cantidad no es válida."),
    ).toBeInTheDocument();
    expect(botonGuardar()).toBeDisabled();
  });

  it("volver a dejar todo como estaba apaga el botón de guardar", async () => {
    const { usuario } = abrir();

    await usuario.clear(screen.getByLabelText("Cantidad"));
    await usuario.type(screen.getByLabelText("Cantidad"), "6");

    expect(botonGuardar()).toBeDisabled();
  });
});

// Una factura con otro equipo, armado desde sus hechos como lo habría escrito
// la app. En la base está la misma que se abre.
const abrirCon = (equipo) => {
  const documentoCon = () =>
    unaFactura({
      numeroFactura: "0413",
      fechaCreacion: DESPACHO,
      tipoPago: "total",
      pagos: [{ medio: "Efectivo", monto: 50000 }],
      equipos: [equipo],
    });
  bd.get.mockResolvedValue({ data: () => documentoCon() });
  return renderConProviders(
    <CorregirFacturaDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={{ id: "f1", ...documentoCon() }}
    />,
  );
};

const equipoGuardado = async () => {
  await screen.findByText("Factura corregida.");
  return bd.update.mock.calls[0][1].grupos[0].equipos[0];
};

// Un andamio a $10.000 que salió hace 40 días por 5. Se pasó dos días, y hace
// 34 pidió 3 más —$4.000 de descuento en los vencidos—. Volvió hace 31, en
// plazo.
const andamioAmpliado = () =>
  rearmarEquipo(
    unEquipo({
      nombre: "ANDAMIO",
      cantidad: 1,
      valorDia: 10000,
      dias: 5,
      fechaDespacho: DESPACHO,
      aplicaIva: false,
    }),
    [
      { tipo: "ampliacion", fecha: hace(34), dias: 3, descuento: 0, descuentoVencidos: 4000 },
      {
        tipo: "devolucion",
        fecha: hace(31),
        cobraElDia: true,
        descuentoVencidos: 0,
        devolucion: {
          fechaDevolucion: hace(31),
          buenEstado: true,
          motivo: "",
          valorRetenido: 0,
        },
      },
    ],
    HOY,
  );

describe("CorregirFacturaDialog — las ampliaciones", () => {
  it("muestra la ampliación con su fecha, sus días y sus descuentos", () => {
    abrirCon(andamioAmpliado());

    const ampliacion = within(screen.getByRole("group", { name: "Ampliación" }));
    expect(ampliacion.getByLabelText("Fecha de la ampliación")).toHaveValue(hace(34));
    expect(ampliacion.getByLabelText("Días pedidos")).toHaveValue(3);
    expect(ampliacion.getByLabelText("Descuento en los días vencidos")).toHaveValue("4.000");
    expect(botonGuardar()).toBeDisabled();
  });

  it("corrige los días pedidos", async () => {
    const { usuario } = abrirCon(andamioAmpliado());

    await usuario.clear(screen.getByLabelText("Días pedidos"));
    await usuario.type(screen.getByLabelText("Días pedidos"), "1");
    await usuario.click(botonGuardar());

    const equipo = await equipoGuardado();
    expect(equipo.ampliaciones).toHaveLength(1);
    expect(equipo.ampliaciones[0]).toMatchObject({ fecha: hace(34), dias: 1 });
  });

  it("quitarla deja esos días como mora, y se guarda sin ella", async () => {
    const { usuario } = abrirCon(andamioAmpliado());

    await usuario.click(screen.getByRole("button", { name: "Quitar la ampliación" }));
    expect(screen.queryByLabelText("Fecha de la ampliación")).not.toBeInTheDocument();
    await usuario.click(botonGuardar());

    const equipo = await equipoGuardado();
    expect(equipo.ampliaciones).toEqual([]);
    expect(equipo.vencidos).toEqual([
      { desde: hace(35), hasta: hace(31), indefinida: false },
    ]);
  });

  // Hace 36 todavía estaba cubierto: ese día no se cerró ningún día vencido,
  // y los $4.000 no tendrían de dónde salir.
  it("si el descuento de vencidos se queda sin días, lo dice y no deja guardar", async () => {
    const { usuario } = abrirCon(andamioAmpliado());

    await escribirFecha(usuario, "Fecha de la ampliación", hace(36));

    expect(
      screen.getByText(/ANDAMIO: la ampliación del .* trae descuento en los días vencidos/),
    ).toBeInTheDocument();
    expect(botonGuardar()).toBeDisabled();
  });

  it("y si pasa de lo que valen esos días, tampoco", async () => {
    const { usuario } = abrirCon(andamioAmpliado());
    const ampliacion = within(screen.getByRole("group", { name: "Ampliación" }));

    await usuario.clear(ampliacion.getByLabelText("Descuento en los días vencidos"));
    await usuario.type(ampliacion.getByLabelText("Descuento en los días vencidos"), "25000");

    expect(screen.getByText(/pasa de lo que valen esos días/)).toBeInTheDocument();
    expect(botonGuardar()).toBeDisabled();
  });
});

describe("CorregirFacturaDialog — la entrega pactada", () => {
  // 6 cerchas que salieron hace 40 días por 7. Se pasaron tres días y el
  // cliente avisó hace 30 que ya había terminado: siguen por recoger.
  const cerchasPactadas = () =>
    rearmarEquipo(
      unEquipo({
        nombre: "CERCHAS METALICAS",
        cantidad: 6,
        valorDia: 1500,
        dias: 7,
        fechaDespacho: DESPACHO,
        aplicaIva: false,
      }),
      [{ tipo: "entregaPactada", fecha: hace(30), descuentoVencidos: 0 }],
      HOY,
    );

  it("corrige la fecha del aviso", async () => {
    const { usuario } = abrirCon(cerchasPactadas());

    expect(screen.getByLabelText("Fecha del aviso")).toHaveValue(hace(30));
    await escribirFecha(usuario, "Fecha del aviso", hace(32));
    await usuario.click(botonGuardar());

    const equipo = await equipoGuardado();
    expect(equipo.entregaPactada).toEqual({ fecha: hace(32) });
    expect(equipo.vencidos).toEqual([
      { desde: hace(33), hasta: hace(33), indefinida: false },
    ]);
  });

  it("quitarla vuelve a correr la cuenta", async () => {
    const { usuario } = abrirCon(cerchasPactadas());

    await usuario.click(screen.getByRole("button", { name: "Quitar la entrega pactada" }));
    // Tres días cobrados hasta el aviso; sin él, corren hasta hoy.
    expect(renglon("Días vencidos")).toHaveTextContent(
      `${enPantalla(27000)} → ${enPantalla(306000)}`,
    );
    await usuario.click(botonGuardar());

    const equipo = await equipoGuardado();
    expect(equipo.entregaPactada).toBeUndefined();
    expect(equipo.vencidos).toEqual([
      { desde: hace(33), hasta: null, indefinida: false },
    ]);
  });
});

// ── La plata de después: abonos, lo devuelto y los cruces ───────────────

// Abre la 0412 con lo que se le pase, y deja en la base a ella y a las demás
// facturas del cliente.
const abrirConPlata = ({ abonos = [], entregas = [] } = {}, otras = []) => {
  const propia = () => ({ ...documento(), abonos, entregas });
  bd.get.mockImplementation((ruta) =>
    Promise.resolve({
      data: () =>
        ruta === "clientes/cli1/facturas/f1"
          ? propia()
          : otras.find(({ id }) => ruta === `clientes/cli1/facturas/${id}`),
    }),
  );
  bd.getDocs.mockImplementation(
    enLaBase({ "clientes/cli1/facturas": [{ id: "f1", ...propia() }, ...otras] }),
  );
  return renderConProviders(
    <CorregirFacturaDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={{ id: "f1", ...propia() }}
    />,
  );
};

const escritoEn = (ruta) =>
  bd.update.mock.calls.find(([destino]) => destino === ruta)?.[1];

const escribirPlata = async (usuario, campo, valor) => {
  await usuario.clear(campo);
  await usuario.type(campo, valor);
};

describe("CorregirFacturaDialog — los abonos", () => {
  const ABONO = { fecha: SE_ANOTO, medio: "Nequi", monto: 20000, tipo: "cliente" };

  it("corrige el monto de un abono y lo guarda con la factura", async () => {
    const { usuario } = abrirConPlata({ abonos: [ABONO] });
    const abono = within(screen.getByRole("group", { name: "Abono" }));

    expect(abono.getByLabelText("Monto")).toHaveValue("20.000");
    await escribirPlata(usuario, abono.getByLabelText("Monto"), "200000");
    expect(renglon("Saldo pendiente")).toHaveTextContent(
      `${enPantalla(259000)} → ${enPantalla(79000)}`,
    );
    await usuario.click(botonGuardar());

    await screen.findByText("Factura corregida.");
    const escrito = escritoEn("clientes/cli1/facturas/f1");
    expect(escrito.abonos).toEqual([{ ...ABONO, monto: 200000 }]);
    // Sin cruces ni número nuevo no hay que leer las demás facturas.
    expect(bd.getDocs).not.toHaveBeenCalledWith("clientes/cli1/facturas");
  });

  it("quitar el abono que se anotó por error", async () => {
    const { usuario } = abrirConPlata({ abonos: [ABONO] });

    await usuario.click(screen.getByRole("button", { name: "Quitar el abono" }));
    await usuario.click(botonGuardar());

    await screen.findByText("Factura corregida.");
    expect(escritoEn("clientes/cli1/facturas/f1").abonos).toEqual([]);
  });
});

// Todo campo cambiado dice cómo estaba, y la pizarra cuenta lo que se tocó.
// Volver al valor de antes borra las dos cosas: con la plata no pasaba, porque
// lo escrito vuelve como texto y lo guardado es número (2026-10-30).
describe("CorregirFacturaDialog — lo que se modificó", () => {
  it("un campo cambiado muestra lo de antes y la pizarra lo cuenta", async () => {
    const { usuario } = abrir();
    expect(screen.getByText("TODAVÍA NO MODIFICASTE NADA")).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Cantidad"));
    await usuario.type(screen.getByLabelText("Cantidad"), "4");

    expect(screen.getByText("Antes: 6")).toBeInTheDocument();
    expect(screen.getByText(/^MODIFICASTE \d+ COSAS?$/)).toBeInTheDocument();
  });

  it("devolver la plata a su valor deja de marcarla", async () => {
    const { usuario } = abrirConPlata({
      abonos: [{ fecha: SE_ANOTO, medio: "Nequi", monto: 20000, tipo: "cliente" }],
    });
    const abono = within(screen.getByRole("group", { name: "Abono" }));

    await escribirPlata(usuario, abono.getByLabelText("Monto"), "200000");
    expect(screen.getByText(`Antes: ${enPantalla(20000)}`)).toBeInTheDocument();

    await escribirPlata(usuario, abono.getByLabelText("Monto"), "20000");
    expect(screen.queryByText(/^Antes:/)).not.toBeInTheDocument();
    expect(screen.getByText("TODAVÍA NO MODIFICASTE NADA")).toBeInTheDocument();
  });
});

describe("CorregirFacturaDialog — los cruces", () => {
  // De la 0412 salieron $50.000 a la 0500.
  const CRUCE = { fecha: SE_ANOTO, medio: "Cruce", monto: 50000, haciaFacturas: ["0500"] };
  const ABONO_DEL_CRUCE = {
    fecha: SE_ANOTO,
    medio: "Cruce",
    monto: 50000,
    tipo: "cruce",
    desdeFactura: "0412",
  };
  const la0500 = () => ({
    id: "f2",
    ...unaFactura({
      numeroFactura: "0500",
      fechaCreacion: DESPACHO,
      equipos: [unEquipo({ nombre: "RANA", valorDia: 10000, dias: 60, fechaDespacho: DESPACHO })],
      abonos: [ABONO_DEL_CRUCE],
    }),
  });

  it("corrige lo que llevó y guarda las dos puntas juntas", async () => {
    const { usuario } = abrirConPlata({ entregas: [CRUCE] }, [la0500()]);

    const campo = await screen.findByLabelText("A la factura 0500");
    expect(campo).toHaveValue("50.000");
    await escribirPlata(usuario, campo, "30000");
    await usuario.click(botonGuardar());

    await screen.findByText("Factura corregida.");
    expect(escritoEn("clientes/cli1/facturas/f1").entregas).toEqual([
      { ...CRUCE, monto: 30000 },
    ]);
    expect(escritoEn("clientes/cli1/facturas/f2")).toEqual({
      abonos: [{ ...ABONO_DEL_CRUCE, monto: 30000 }],
    });
  });

  it("si la otra factura cambió mientras tanto, no escribe ninguna", async () => {
    const otra = la0500();
    const { usuario } = abrirConPlata({ entregas: [CRUCE] }, [otra]);
    // Alguien le anotó un abono a la 0500 con la pantalla abierta.
    otra.abonos = [...otra.abonos, { fecha: HOY, medio: "Nequi", monto: 1000, tipo: "cliente" }];

    await escribirPlata(usuario, await screen.findByLabelText("A la factura 0500"), "30000");
    await usuario.click(botonGuardar());

    expect(await screen.findByText(/alguna de las que toca cambió/)).toBeInTheDocument();
    expect(bd.update).not.toHaveBeenCalled();
  });

  // Sin internet, por ejemplo: no se queda "buscando" para siempre, y lo
  // demás de la factura se corrige igual.
  it("si no se pueden leer las demás facturas, lo dice y deja corregir lo demás", async () => {
    const propia = { id: "f1", ...documento(), entregas: [CRUCE] };
    const base = enLaBase({});
    bd.get.mockResolvedValue({ data: () => propia });
    bd.getDocs.mockImplementation((ruta) =>
      ruta === "clientes/cli1/facturas" ? Promise.reject(new Error("unavailable")) : base(ruta),
    );
    const { usuario } = renderConProviders(
      <CorregirFacturaDialog open onClose={() => {}} cliente={cliente} factura={propia} />,
    );

    expect(
      await screen.findByText(/No se pudieron leer las demás facturas del cliente, así que este cruce no se corrige por ahora\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/buscando las facturas/)).not.toBeInTheDocument();

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    expect(botonGuardar()).toBeEnabled();
  });

  it("desde la factura que lo recibió solo se muestra", () => {
    const recibio = la0500();
    bd.get.mockResolvedValue({ data: () => recibio });
    renderConProviders(
      <CorregirFacturaDialog open onClose={() => {}} cliente={cliente} factura={recibio} />,
    );

    expect(screen.getByText(/Cruce del .* desde la factura 0412: .* Se corrige desde esa factura\./)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Abono" })).not.toBeInTheDocument();
  });
});

describe("CorregirFacturaDialog — el número de la factura", () => {
  it("lo corrige también en la factura que la nombra", async () => {
    const la0500 = {
      id: "f2",
      ...unaFactura({
        numeroFactura: "0500",
        abonos: [
          { fecha: SE_ANOTO, medio: "Nequi", monto: 10000, tipo: "agregado", desdeFactura: "0412" },
        ],
      }),
    };
    const { usuario } = abrirConPlata({}, [la0500]);

    await usuario.clear(screen.getByLabelText("N° de factura"));
    await usuario.type(screen.getByLabelText("N° de factura"), "0413");
    await waitFor(() => expect(botonGuardar()).toBeEnabled());
    await usuario.click(botonGuardar());

    await screen.findByText("Factura corregida.");
    expect(escritoEn("clientes/cli1/facturas/f1").factura.numeroFactura).toBe("0413");
    expect(escritoEn("clientes/cli1/facturas/f2")).toEqual({
      abonos: [{ ...la0500.abonos[0], desdeFactura: "0413" }],
    });
  });

  it("no deja repetir el número de otra factura del cliente", async () => {
    const { usuario } = abrirConPlata({}, [{ id: "f2", ...unaFactura({ numeroFactura: "0500" }) }]);

    await usuario.clear(screen.getByLabelText("N° de factura"));
    await usuario.type(screen.getByLabelText("N° de factura"), "0500");

    expect(
      await screen.findByText("· Ya hay otra factura de este cliente con el número 0500."),
    ).toBeInTheDocument();
    expect(botonGuardar()).toBeDisabled();
  });
});

// EL DESCUENTO AL COBRAR (2026-10-16): el administrador lo ve con su fecha y
// su monto, y puede quitarlo. Solo viaja si se tocó.
describe("CorregirFacturaDialog — el descuento al cobrar", () => {
  const conDescuento = () => ({
    ...documento(),
    descuentos: [{ fecha: SE_ANOTO, monto: 20000, tipo: "sistema" }],
  });

  it("lo muestra y, al quitarlo, guarda la lista sin él", async () => {
    bd.get.mockResolvedValue({ data: () => conDescuento() });
    const { usuario } = abrir({ factura: { id: "f1", ...conDescuento() } });

    const fila = screen.getByRole("group", { name: "Descuento" });
    expect(within(fila).getByText("Descuento al cobrar")).toBeInTheDocument();

    await usuario.click(within(fila).getByRole("button", { name: "Quitar el descuento" }));
    await usuario.click(botonGuardar());

    expect(await screen.findByText("Factura corregida.")).toBeInTheDocument();
    const [, escrito] = bd.update.mock.calls[0];
    expect(escrito.descuentos).toEqual([]);
  });

  it("si no se tocó, no viaja", async () => {
    bd.get.mockResolvedValue({ data: () => conDescuento() });
    const { usuario } = abrir({ factura: { id: "f1", ...conDescuento() } });

    await escribirFecha(usuario, "Fecha de devolución", VOLVIO_DE_VERDAD);
    await usuario.click(botonGuardar());

    expect(await screen.findByText("Factura corregida.")).toBeInTheDocument();
    const [, escrito] = bd.update.mock.calls[0];
    expect(escrito).not.toHaveProperty("descuentos");
  });
});

// EN EL CELULAR cada sección se pliega como las facturas (pedido del dueño,
// 2026-10-30): arrancan cerradas y se abren tocando su título.
describe("CorregirFacturaDialog — en el celular", () => {
  it("las secciones arrancan cerradas y se abren tocando su título", async () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: query.includes("max-width:915px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
    try {
      const { usuario } = abrir();

      expect(screen.queryByLabelText("Fecha de devolución")).not.toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: "Mostrar Despacho inicial" }));
      expect(screen.getByLabelText("Fecha de devolución")).toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: "Ocultar Despacho inicial" }));
      expect(screen.queryByLabelText("Fecha de devolución")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
