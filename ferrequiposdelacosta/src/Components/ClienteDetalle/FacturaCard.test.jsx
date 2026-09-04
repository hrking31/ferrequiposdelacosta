import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { calcularVencimiento, obtenerFechaHoyBogota } from "./facturaUtils";
import FacturaCard from "./FacturaCard";
import { unEquipo, unEquipoDevuelto, unaFactura } from "../../test/facturas";

// La tarjeta de una factura dentro de la ficha del cliente. No guarda nada: su
// trabajo es MOSTRAR el estado y decidir qué acciones quedan disponibles.
//
// Eso último es lo que se prueba acá, porque son reglas de negocio metidas en
// botones: una factura finalizada no se toca más, y una que ya tiene historia
// encima no se puede borrar de un clic.
//
// El PDF va como doble: generarlo abriría jsPDF, que no aporta nada a esta
// prueba.
const generarPdf = vi.hoisted(() => vi.fn());
vi.mock("../VistaPdf/VistaFacturaPdf", () => ({ default: generarPdf }));

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 1,
    dias: 3,
    valorDia: 100000,
    fechaDespacho: "2026-08-01",
    fechaVencimiento: "2026-08-03",
    ...extra,
  });

const facturaCon = ({ equipos = [andamio()], ...resto } = {}) => ({
  id: "f1",
  ...unaFactura({ numeroFactura: "1573", fechaCreacion: "2026-08-01", equipos, ...resto }),
});

// Una factura corriente: despachada, sin pagar y sin devolver nada. Su equipo
// venció en agosto.
const facturaAbierta = facturaCon();

// La misma, pero todavía vigente: salió hoy y vence dentro de 10 días. La
// fecha se calcula desde hoy a propósito — con una fija, la prueba dejaría de
// probar lo que dice el día que esa fecha quedara en el pasado.
const HOY = obtenerFechaHoyBogota();
const facturaAlDia = facturaCon({
  fechaCreacion: HOY,
  equipos: [andamio({ fechaDespacho: HOY, fechaVencimiento: calcularVencimiento(HOY, 10) })],
});

// La misma, pero ya cobrada y con el equipo de vuelta: no queda nada por
// hacer. Sus 3 días son los que de verdad estuvo afuera.
const facturaFinalizada = facturaCon({
  equipos: [
    unEquipoDevuelto({
      nombre: "ANDAMIO",
      cantidad: 1,
      dias: 3,
      valorDia: 100000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
      fechaDevolucion: "2026-08-03",
    }),
  ],
  pagos: [{ medio: "Efectivo", monto: 300000 }],
});

const mostrar = (factura, props = {}) => {
  const acciones = {
    onAgregarEquipo: vi.fn(),
    onRegistrarDevolucion: vi.fn(),
    onEditar: vi.fn(),
    onEliminar: vi.fn(),
    onDevolverSaldo: vi.fn(),
    ...props,
  };

  const utilidades = renderConProviders(
    <FacturaCard
      factura={factura}
      cliente={cliente}
      facturaColapsada={() => false}
      toggleFacturaColapsada={() => {}}
      seccionAbierta={() => false}
      toggleSeccion={() => {}}
      {...acciones}
    />,
  );

  return { ...utilidades, acciones };
};

// Los botones de acción son solo íconos: se los ubica por el ícono de MUI, que
// trae su propio identificador.
const boton = (icono) => screen.getAllByTestId(icono)[0].closest("button");

beforeEach(() => {
  generarPdf.mockClear();
});

describe("FacturaCard — lo que muestra", () => {
  it("dice de qué factura se trata", () => {
    mostrar(facturaAbierta);

    expect(screen.getByText("Factura 1573")).toBeInTheDocument();
  });

  it("una factura sin número no rompe la tarjeta", () => {
    const sinNumero = facturaCon();
    delete sinNumero.factura.numeroFactura;
    mostrar(sinNumero);

    expect(screen.getByText("Factura s/n")).toBeInTheDocument();
  });
});

describe("FacturaCard — qué se puede hacer con una factura abierta", () => {
  it("deja agregar equipo, registrar devolución y editar", () => {
    mostrar(facturaAlDia);

    expect(boton("AddIcon")).toBeEnabled();
    expect(boton("AssignmentReturnIcon")).toBeEnabled();
    expect(boton("EditIcon")).toBeEnabled();
  });

  // Desde la ficha del cliente solo se registran las devoluciones que el
  // cliente pide ANTES de que se le venza el alquiler. Vencida, la factura ya
  // está en Seguimiento y la devolución es parte de la cobranza: se registra
  // allá, donde queda anotada en la bitácora.
  it("vencida, la devolución ya no se registra desde acá", () => {
    mostrar(facturaAbierta);

    expect(boton("AssignmentReturnIcon")).toBeDisabled();
  });

  // Pero una factura figura vencida en cuanto UNO de sus equipos lo está, y
  // puede tener otros agregados después con su propia fecha. Devolver esos no
  // es cobranza —todavía están en plazo—, así que el botón sigue encendido y
  // el diálogo, en ese caso, solo ofrece los que no vencieron.
  it("vencida pero con un equipo en plazo, la devolución sigue disponible", () => {
    mostrar(
      facturaCon({
        equipos: [
          andamio(),
          unEquipo({
            nombre: "MEZCLADORA",
            cantidad: 1,
            dias: 5,
            valorDia: 50000,
            fechaDespacho: HOY,
            fechaVencimiento: calcularVencimiento(HOY, 5),
          }),
        ],
      }),
    );

    expect(boton("AssignmentReturnIcon")).toBeEnabled();
  });

  it("vencida, el resto de las acciones sigue disponible", () => {
    mostrar(facturaAbierta);

    expect(boton("AddIcon")).toBeEnabled();
    expect(boton("EditIcon")).toBeEnabled();
  });

  it("al tocar editar, le avisa a la pantalla con esa factura", async () => {
    const { usuario, acciones } = mostrar(facturaAbierta);

    await usuario.click(boton("EditIcon"));

    expect(acciones.onEditar).toHaveBeenCalledWith(facturaAbierta);
  });

  it("deja borrarla mientras no tenga nada encima", () => {
    mostrar(facturaAbierta);

    expect(boton("DeleteIcon")).toBeEnabled();
  });

  it("el PDF se descarga con la factura y su cliente", async () => {
    const { usuario } = mostrar(facturaAbierta);

    await usuario.click(boton("PictureAsPdfIcon"));

    expect(generarPdf).toHaveBeenCalledWith({ factura: facturaAbierta, cliente });
  });
});

describe("FacturaCard — lo que ya no se puede tocar", () => {
  it("una factura finalizada se sigue viendo, pero sin acciones", () => {
    mostrar(facturaFinalizada);

    expect(screen.getByText("Factura 1573")).toBeInTheDocument();
    expect(boton("AddIcon")).toBeDisabled();
    expect(boton("AssignmentReturnIcon")).toBeDisabled();
    expect(boton("EditIcon")).toBeDisabled();
  });

  it("el PDF sí se puede descargar aunque esté finalizada", () => {
    mostrar(facturaFinalizada);

    expect(boton("PictureAsPdfIcon")).toBeEnabled();
  });

  it("una factura con un abono ya no se borra de un clic", () => {
    // Borrarla se llevaría esa historia con ella.
    mostrar(
      facturaCon({
        abonos: [
          { fecha: "2026-08-05", medio: "Nequi", monto: 20000, tipo: "cliente" },
        ],
      }),
    );

    expect(boton("DeleteIcon")).toBeDisabled();
    // Pero lo demás sigue disponible: todavía es una factura viva.
    expect(boton("EditIcon")).toBeEnabled();
  });
});
