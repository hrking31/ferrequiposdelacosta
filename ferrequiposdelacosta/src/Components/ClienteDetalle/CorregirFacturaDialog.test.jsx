import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import CorregirFacturaDialog from "./CorregirFacturaDialog";
import { calcularVencimiento, obtenerFechaHoyBogota } from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";
import { unEquipoDevuelto, unTramoVencido, unaFactura } from "../../test/facturas";

// La pantalla con la que el administrador corrige una factura ya cargada. Las
// cuentas están probadas en correccionFactura.test.js; acá se fija lo que
// hace la pantalla: qué muestra antes de guardar, qué escribe y cuándo se
// niega a escribir.
const bd = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  runTransaction: (_db, operacion) => operacion({ get: bd.get, update: bd.update }),
}));

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
