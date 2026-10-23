// LO QUE SE PUEDE SACAR DE UNA LISTA YA CARGADA, para el recuadro de la
// columna de la derecha del buzón de cotizaciones y de la lista de cuentas de
// cobro. Lo eligió el dueño el 2026-10-23: en el buzón cuántas llegaron hoy y
// esta semana, lo más pedido y quién pide más; en las cuentas, cuántas se
// emitieron hoy y esta semana y quién debe más.
//
// Trabaja sobre lo que la pantalla YA trajo —las 50 más recientes, más lo que
// se pida con "Cargar más"—, así que no cuesta ninguna lectura. Hoy y esta
// semana caben de sobra en esas 50.

const DIA_MS = 24 * 60 * 60 * 1000;
// Colombia no cambia de hora en el año: siempre 5 horas menos que la hora
// universal.
const DESFASE_BOGOTA = 5 * 60 * 60 * 1000;

// Cuándo empezó, en Colombia, el día de un instante.
export const inicioDelDiaBogota = (ms) => {
  const local = ms - DESFASE_BOGOTA;
  return local - (((local % DIA_MS) + DIA_MS) % DIA_MS) + DESFASE_BOGOTA;
};

// Cuándo empezó, en Colombia, la semana de un instante: el lunes a las 12 a. m.
export const inicioDeSemanaBogota = (ms) => {
  const dia = inicioDelDiaBogota(ms);
  const diaDeLaSemana = new Date(dia - DESFASE_BOGOTA).getUTCDay(); // 0 es domingo
  return dia - ((diaDeLaSemana + 6) % 7) * DIA_MS;
};

// Cuántos nacieron hoy y cuántos desde el lunes. Los que no tienen fecha no
// cuentan.
export const hoyYEstaSemana = (documentos, fechaDe, ahora = Date.now()) => {
  const hoy = inicioDelDiaBogota(ahora);
  const lunes = inicioDeSemanaBogota(ahora);
  return documentos.reduce(
    (cuenta, documento) => {
      const fecha = Number(fechaDe(documento));
      if (fecha >= hoy) cuenta.hoy += 1;
      if (fecha >= lunes) cuenta.semana += 1;
      return cuenta;
    },
    { hoy: 0, semana: 0 },
  );
};

// LOS EQUIPOS QUE APARECEN EN MÁS DOCUMENTOS: en cuántas cotizaciones está
// cada uno, sin importar cuántas unidades pidieron. Antes se sumaban las
// unidades y un solo pedido grande (300 chazas) se llevaba el ranking; el
// dueño prefirió ver qué piden más clientes (2026-10-23).
//
// Un equipo repetido en dos renglones del mismo documento cuenta una vez. El
// mismo equipo escrito con otras mayúsculas o con espacios de más cuenta como
// uno.
export const equiposEnMas = (documentos, cuantos = 5) => {
  const porEquipo = new Map();
  documentos.forEach((documento) => {
    const vistos = new Set();
    (documento.items || []).forEach((item) => {
      const nombre = String(item.description || "").trim();
      const clave = nombre.toUpperCase();
      if (!nombre || vistos.has(clave)) return;
      vistos.add(clave);
      const previo = porEquipo.get(clave) || { nombre, cantidad: 0 };
      previo.cantidad += 1;
      porEquipo.set(clave, previo);
    });
  });
  return [...porEquipo.values()]
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
    .slice(0, cuantos);
};

// Los que más aparecen —los clientes que más piden—, contando cuántos
// documentos tiene cada uno. El mismo nombre escrito con otras mayúsculas o
// con espacios de más cuenta como uno.
export const masFrecuentes = (documentos, nombreDe, cuantos = 5) => {
  const conteos = new Map();
  documentos.forEach((documento) => {
    const nombre = String(nombreDe(documento) || "").trim();
    if (!nombre) return;
    const clave = nombre.toUpperCase();
    const previo = conteos.get(clave) || { nombre, cantidad: 0 };
    previo.cantidad += 1;
    conteos.set(clave, previo);
  });
  return [...conteos.values()]
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
    .slice(0, cuantos);
};
