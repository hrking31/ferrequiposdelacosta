// LOS FILTROS DE SEGUIMIENTO (2026-10-19): por la gestión de la factura y por
// días vencidos. Filtran FACTURAS, no clientes: la tarjeta muestra solo las
// que cumplen, y el cliente que no tiene ninguna sale de la lista.
//
// La gestión y no el estado: en Seguimiento cada factura lleva el chip de su
// gestión (Sin gestionar, Renovación, Cobro...), y por eso se la busca. El
// estado se ve en Clientes y en Detalle Cliente.
import {
  calcularEstadoFactura,
  calcularGestionFactura,
  cubiertoHasta,
  equiposDe,
  estaPorRecoger,
  GESTION_INFO,
  sigueAfuera,
  sinFechaDeEntrega,
  TIPOS_GESTION,
  vencidoQueCorre,
} from "../ClienteDetalle/facturaUtils";

// Las gestiones que el chip de la tarjeta puede mostrar, aunque alguna esté en
// 0: así lo pidió el dueño. Todas menos "Devolución total", que nunca llega al
// chip: al devolver todo, la factura pasa a cobro —y ahí manda "Cobro"— o se
// finaliza y sale de Seguimiento. Queda solo en la bitácora.
export const FILTROS_GESTION = [
  { valor: "todos", label: "Todas" },
  ...TIPOS_GESTION.filter((tipo) => tipo !== "devolucionTotal").map((tipo) => ({
    valor: tipo,
    label: GESTION_INFO[tipo].label,
  })),
];

// Los días de una factura: una marca por cada equipo que la tiene en cartera.
// "hoy" el que vence hoy (todavía no le corre nada); un número, los días que
// lleva vencido desde el último acuerdo, que es lo que dice la tarjeta al lado
// de la fecha ("Vencida 25/09 · 3 días"). Va como texto porque es el valor del
// selector.
//
// El que está por recoger no marca nada: ya no le corre ningún día. Y la
// factura que devolvió todo y solo debe plata queda sin marcas: se la
// encuentra con "Todos" o con la gestión "Cobro".
export const diasDeFactura = (factura, hoy) => {
  const marcas = new Set();
  equiposDe(factura).forEach(({ equipo }) => {
    if (!sigueAfuera(equipo) || estaPorRecoger(equipo)) return;
    if (!sinFechaDeEntrega(equipo) && cubiertoHasta(equipo) === hoy) {
      marcas.add("hoy");
    }
    const { dias } = vencidoQueCorre(equipo, hoy);
    if (dias > 0) marcas.add(String(dias));
  });
  return [...marcas];
};

// Lo que los filtros miran de cada factura, calculado una sola vez. La
// gestión, igual que la del chip de la tarjeta.
export const datosParaFiltrar = (factura, hoy) => ({
  gestion: calcularGestionFactura(factura, calcularEstadoFactura(factura, hoy)),
  dias: diasDeFactura(factura, hoy),
});

export const cumpleGestion = ({ gestion }, filtroGestion) =>
  filtroGestion === "todos" || gestion === filtroGestion;

export const cumpleDias = ({ dias }, filtroDias) =>
  filtroDias === "todos" || dias.includes(filtroDias);

// LAS OPCIONES DEL SELECTOR DE DÍAS: solo las que hay (de la gestión elegida).
// Si hoy hay facturas que
// vencen hoy, de 1 y de 3 días, el selector dice Hoy, 1 y 3 —sin el 2—, cada
// una con cuántas facturas tiene. Primero "Hoy" y después de menor a mayor.
export const opcionesDias = (datosFacturas) => {
  const conteo = new Map();
  datosFacturas.forEach(({ dias }) =>
    dias.forEach((marca) => conteo.set(marca, (conteo.get(marca) || 0) + 1)),
  );
  const orden = (marca) => (marca === "hoy" ? 0 : Number(marca));
  return [...conteo.keys()]
    .sort((a, b) => orden(a) - orden(b))
    .map((valor) => ({
      valor,
      label: valor === "hoy" ? "Hoy" : valor === "1" ? "1 día" : `${valor} días`,
      cantidad: conteo.get(valor),
    }));
};
