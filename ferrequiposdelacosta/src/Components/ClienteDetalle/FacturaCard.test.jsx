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
      fechaDevolucion: "2026-08-03",
    }),
  ],
  pagos: [{ medio: "Efectivo", monto: 300000 }],
});

// Borrar una factura es solo del administrador, asi que las pruebas entran
// como uno: con cualquier otro rol el boton del tacho no se dibuja, y eso
// tiene su propia prueba.
const mostrar = (factura, { rol = "administrador", ...props } = {}) => {
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
    { estadoInicial: { user: { role: rol } } },
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
            // Le dieron 30 días que llegan más allá de hoy, así que no está
            // vencido: sin ellos lo estaría.
            ampliaciones: [
              {
                fecha: "2026-08-03",
                dias: 30,
                desde: "2026-08-04",
                hasta: calcularVencimiento(HOY, 5),
                descuento: 0,
              },
            ],
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

  // El tacho es solo del administrador: no se deshace y se lleva los abonos,
  // los despachos y la historia de cada equipo. La regla de Firestore es la
  // que de verdad lo impide; esconderlo evita que quien no puede lo intente.
  it("al que no es administrador ni le muestra el boton de borrar", () => {
    mostrar(facturaAbierta, { rol: "gestorFacturacion" });

    expect(screen.queryByTestId("DeleteIcon")).not.toBeInTheDocument();
    // Lo demas lo sigue teniendo: es su trabajo.
    expect(boton("EditIcon")).toBeEnabled();
  });

  // La finalizada SI se puede borrar aunque tenga movimientos: ya no hay nada
  // abierto —los equipos volvieron y la plata esta saldada— y lo que queda es
  // un registro que el administrador puede decidir que sobra.
  it("la finalizada se puede borrar aunque tenga historia", () => {
    mostrar(facturaFinalizada);

    expect(boton("DeleteIcon")).toBeEnabled();
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

// EL ESTADO DE CUENTA TIENE QUE EXPLICAR CÓMO SE LLEGÓ AL SALDO, no solo
// anunciarlo. Es la pantalla donde se revisan las cuentas de una factura.
describe("FacturaCard — el estado de cuenta discrimina la plata", () => {
  // El caso que lo destapó: la 2455, con el equipo ya devuelto y $286.000 a
  // favor. Mostraba "Total $714.000 / A favor $286.000" y nada más — no había
  // forma de saber que el cliente había entregado $1.000.000.
  it("con saldo a favor dice cuánto entregó el cliente", () => {
    const pagoDeMas = facturaCon({
      equipos: [
        unEquipoDevuelto({
          nombre: "ANDAMIO",
          cantidad: 1,
          dias: 3,
          valorDia: 100000,
          fechaDespacho: "2026-08-01",
          fechaDevolucion: "2026-08-03",
        }),
      ],
      pagos: [{ medio: "Efectivo", monto: 400000 }],
    });

    mostrar(pagoDeMas);

    // El renglón y su cifra, uno al lado del otro en la misma fila.
    // "Pago inicial" es también el rótulo de la información de pago: se busca
    // el renglón del estado de cuenta, que es el que va en una fila.
    const pagado = screen
      .getAllByText("Pago inicial")
      .map((texto) => texto.closest(".fila"))
      .find(Boolean);
    expect(pagado).toHaveTextContent(/400\.000/);

    const aFavor = screen.getByText("Saldo a favor").closest("div");
    expect(aFavor).toHaveTextContent(/100\.000/);
  });

  // La única excepción: pagó el total exacto, de una sola vez y sin abonos.
  // Ahí "Pago inicial" repetiría la cifra de arriba.
  it("y se calla cuando el pago fue por el total exacto", () => {
    mostrar(facturaFinalizada);

    expect(
      screen.getAllByText("Pago inicial").some((texto) => texto.closest(".fila")),
    ).toBe(false);
  });
});
