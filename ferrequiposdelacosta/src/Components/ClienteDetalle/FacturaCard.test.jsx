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
// El PDF ya no se baja desde acá: hay un solo botón, en el encabezado del
// cliente, que decide qué documento armar según cuántas facturas se marquen
// (ver ReporteFacturasDialog).

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

describe("FacturaCard — el estado de cada equipo", () => {
  // La ficha del cliente es donde se ven los cinco estados: en cartera solo
  // entran los vencidos. El chip los dice sin que haya que deducirlos leyendo
  // las fechas, que es lo que tocaba hacer antes.
  //
  // El nombre del estado se fija acá a propósito: un cálculo correcto mal
  // contado en pantalla se cobra igual de caro que uno equivocado.
  it("el que ya volvió dice Devuelto", () => {
    mostrar(facturaFinalizada);
    expect(screen.getByText("Devuelto")).toBeInTheDocument();
  });

  it("el que se pasó de la fecha dice Vencido", () => {
    mostrar(facturaAbierta);
    expect(screen.getByText("Vencido")).toBeInTheDocument();
  });

  it("el que está en fecha dice Activo", () => {
    mostrar(facturaAlDia);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("el que todavía no sale de bodega dice Pendiente", () => {
    const maniana = calcularVencimiento(HOY, 1);
    mostrar(
      facturaCon({
        equipos: [
          andamio({ fechaDespacho: maniana, fechaVencimiento: calcularVencimiento(maniana, 2) }),
        ],
      }),
    );
    // Sale DOS veces, y está bien: el equipo no salió de bodega, así que la
    // factura entera también está pendiente. Es el único estado en que el
    // equipo y su factura usan la misma palabra.
    expect(screen.getAllByText("Pendiente")).toHaveLength(2);
  });

  it("el que tiene días agregados dice Ampliación", () => {
    // Sigue en fecha porque se los dieron: sin la ampliación estaría vencido.
    mostrar(
      facturaCon({
        equipos: [
          andamio({
            fechaVencimiento: calcularVencimiento(HOY, 5),
            ampliaciones: [{ diasAmpliados: 30, descuentoRealizado: 0 }],
          }),
        ],
      }),
    );
    expect(screen.getByText("Ampliación")).toBeInTheDocument();
  });
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

  // De cada equipo se ven siempre las tres condiciones del alquiler —por
  // cuántos días va, a cuánto el día y hasta cuándo—, y la historia completa
  // queda detrás de la flecha: son hasta nueve renglones por equipo, y una
  // factura con cinco no se podría recorrer con todo abierto.
  it("muestra las condiciones del equipo y guarda su historia bajo la flecha", async () => {
    // El que está en fecha: sus días son los 3 que pactó. Los de uno vencido
    // crecen con el calendario, y la prueba diría un número distinto cada día.
    const { usuario } = mostrar(facturaAlDia);

    expect(screen.getByText("3 días")).toBeInTheDocument();
    expect(screen.queryByText("Salida en alquiler")).not.toBeInTheDocument();

    await usuario.click(boton("ExpandMoreIcon"));

    expect(screen.getByText("Salida en alquiler")).toBeInTheDocument();
    expect(screen.getByText("Se entregó el equipo por 3 días.")).toBeInTheDocument();
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

});

describe("FacturaCard — lo que ya no se puede tocar", () => {
  it("una factura finalizada se sigue viendo, pero sin acciones", () => {
    mostrar(facturaFinalizada);

    expect(screen.getByText("Factura 1573")).toBeInTheDocument();
    expect(boton("AddIcon")).toBeDisabled();
    expect(boton("AssignmentReturnIcon")).toBeDisabled();
    expect(boton("EditIcon")).toBeDisabled();
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
