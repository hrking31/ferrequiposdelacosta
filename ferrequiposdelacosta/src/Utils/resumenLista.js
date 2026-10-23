// LO QUE SE PUEDE SACAR DE UNA LISTA YA CARGADA (2026-10-22), para la columna
// de la derecha del buzón de cotizaciones y de la lista de cuentas de cobro:
// las que llevan más esperando, lo más pedido y quién atendió.
//
// Trabaja sobre lo que la pantalla YA trajo —las 50 más recientes, más lo que
// se pida con "Cargar más"—, así que no cuesta ninguna lectura. Por lo mismo
// no es "del mes": es de lo que se está viendo. El número exacto del mes lo
// lleva el servidor en la pizarra (ver Utils/resumenDocumentos).

import { formatearDias } from "./formato";

const DIA_MS = 24 * 60 * 60 * 1000;

// Cuántos días enteros pasaron desde un instante.
export const diasDesde = (ms, ahora = Date.now()) =>
  Math.max(0, Math.floor((ahora - ms) / DIA_MS));

// "hoy", "hace 1 día", "hace 3 días".
export const textoEspera = (dias) => (dias === 0 ? "hoy" : `hace ${formatearDias(dias)}`);

// Las `cuantas` más viejas según su fecha, de la más vieja a la más nueva. Las
// que no tienen fecha no entran: no se sabe cuánto llevan.
export const masAntiguas = (documentos, fechaDe, cuantas = 4) =>
  documentos
    .filter((documento) => Number(fechaDe(documento)))
    .sort((a, b) => fechaDe(a) - fechaDe(b))
    .slice(0, cuantas);

// Los equipos que más se piden, sumando la cantidad de cada renglón. El mismo
// equipo escrito con otras mayúsculas o con espacios de más cuenta como uno.
export const masPedidos = (documentos, cuantos = 5) => {
  const porEquipo = new Map();
  documentos.forEach((documento) => {
    (documento.items || []).forEach((item) => {
      const nombre = String(item.description || "").trim();
      if (!nombre) return;
      const clave = nombre.toUpperCase();
      const previo = porEquipo.get(clave) || { nombre, cantidad: 0 };
      previo.cantidad += Number(item.quantity) || 0;
      porEquipo.set(clave, previo);
    });
  });
  return [...porEquipo.values()]
    .filter(({ cantidad }) => cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
    .slice(0, cuantos);
};

// Cuántos documentos tiene cada persona, de quien más tiene a quien menos.
export const porPersona = (documentos, nombreDe) => {
  const conteos = new Map();
  documentos.forEach((documento) => {
    const nombre = String(nombreDe(documento) || "").trim();
    if (!nombre) return;
    conteos.set(nombre, (conteos.get(nombre) || 0) + 1);
  });
  return [...conteos.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
};
