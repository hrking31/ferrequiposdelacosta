// CORREGIR UNA FACTURA YA CARGADA. Es del administrador y es otra cosa que
// anotar: acá no pasa nada nuevo, se arregla un dato que alguien digitó mal.
//
// Los pasos, y ninguno toca la pantalla:
//
//   borradorDe          la factura, puesta como la muestran las casillas
//   erroresDelBorrador  lo que no deja guardar
//   facturaCorregida    el documento que se escribe
//   erroresDeLaPlata    lo que no deja guardar, mirando ese documento
//   otrasCorregidas     lo que cambia en las otras facturas del cliente
//
// La regla que sostiene todo: el equipo que NO se tocó vuelve tal cual estaba,
// letra por letra. Solo el que cambió se vuelve a armar desde sus hechos (ver
// rearmarEquipo), que es lo que rehace sus días vencidos.
import {
  MEDIO_CRUCE,
  calcularCuentaFactura,
  calcularDeposito,
  calcularDepositoTotal,
  calcularRetenido,
  diaAnterior,
  diasDeAlquiler,
  facturaCerrada,
  hechosDeEquipo,
  obtenerFechaHoyBogota,
  rearmarEquipo,
  sumarEntregas,
} from "./facturaCuentas";
import {
  GRUPO_INICIAL,
  abonosDe,
  adicionalesDe,
  datosFactura,
  descuentosDe,
  entregasDe,
  equiposAfuera,
  equiposDe,
  gestionesDe,
  gruposDe,
  pagosDe,
  tipoPagoDe,
  vencidosDe,
} from "./facturaModelo";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";
import { mismoContenido } from "../../Utils/mismoContenido";

const numero = (valor) => Number(valor) || 0;
// Lo guardado puede llegar con sus campos en otro orden: no cuenta.
const igual = mismoContenido;

// SI ALGO CAMBIÓ se decide comparando el borrador con el que saldría, recién
// hecho, de lo guardado. Lo escrito en una casilla llega como texto y lo
// guardado puede ser un número: "6" y 6 son el mismo dato, y la huella los
// iguala. Sin eso, una factura que nadie tocó figuraría corregida.
const huella = (valor) =>
  JSON.stringify(valor, (clave, dato) =>
    clave === "original" ? undefined : typeof dato === "number" ? String(dato) : dato,
  );
const cambio = (a, b) => huella(a) !== huella(b);

// Un equipo como lo muestran las casillas. `original` es el que está guardado
// —vacío en el que se agrega acá—: contra él se sabe si se tocó.
const equipoABorrador = (equipo, clave) => ({
  clave,
  original: equipo,
  nombre: equipo?.nombre ?? "",
  cantidad: equipo?.cantidadEquipos ?? "",
  dias: equipo?.diasAlquilados ?? "",
  valor: equipo?.valorDia ?? "",
  fechaDespacho: equipo?.fechaDespacho ?? "",
  aplicaIva: Boolean(equipo?.aplicaIva),
  hechos: hechosDeEquipo(equipo),
});

// Un equipo nuevo dentro de un despacho que ya existe: el que faltó cargar.
export const equipoNuevoEnBorrador = (clave, fechaDespacho, aplicaIva) => ({
  clave,
  original: null,
  nombre: "",
  cantidad: "",
  dias: "",
  valor: "",
  fechaDespacho: fechaDespacho ?? "",
  aplicaIva: Boolean(aplicaIva),
  hechos: [],
});

const grupoABorrador = (grupo) => {
  const adicionales = adicionalesDe(grupo);
  return {
    grupo: grupo.grupo,
    fechaSolicitud: grupo.fechaSolicitud ?? "",
    tipoPago: tipoPagoDe(grupo),
    pagos: pagosDe(grupo).map(({ medio, monto }) => ({ medio, monto })),
    transporte: adicionales.transporte ?? "",
    valorTransporte: adicionales.valorTransporte || "",
    valorDeposito: adicionales.valorDeposito || "",
    equipos: (grupo.equipos ?? []).map((equipo, indice) =>
      equipoABorrador(equipo, `${grupo.grupo}#${indice}`),
    ),
  };
};

// ── LA PLATA QUE ENTRÓ Y SALIÓ DESPUÉS: abonos y lo devuelto ───────────
//
// Cada abono y cada entrega se corrige en su factura: si un pago se repartió
// entre tres, cada parte es un abono distinto en cada una.
//
// EL CRUCE es la excepción, porque tiene dos puntas: de esta factura sale una
// entrega "Cruce" con los números de las facturas a las que fue, y en cada una
// de ellas entra un abono "cruce" con el número de esta. Se corrige solo desde
// la factura de donde SALIÓ la plata —regla del dueño, 2026-10-14—, y las dos
// puntas se guardan juntas o no se guarda ninguna. El abono que llegó por un
// cruce, visto desde la factura que lo recibió, no se toca.
//
// Las puntas no comparten un identificador: se encuentran por el número de la
// factura de origen, la fecha y el tipo. Si eso no alcanza para encontrar
// exactamente una por destino, el cruce se muestra pero no se corrige.

const numeroDe = (factura) => String(datosFactura(factura).numeroFactura ?? "s/n").trim();

export const esAbonoDeCruce = (abono) => abono?.tipo === "cruce";
export const esEntregaDeCruce = (entrega) => entrega?.medio === MEDIO_CRUCE;

const abonoABorrador = (abono, indice) => ({
  clave: `abono#${indice}`,
  original: abono,
  fecha: abono.fecha ?? "",
  medio: abono.medio ?? "",
  monto: abono.monto ?? "",
});

// El descuento al cobrar: solo fecha y monto, no tiene medio.
const descuentoABorrador = (descuento, indice) => ({
  clave: `descuento#${indice}`,
  original: descuento,
  fecha: descuento.fecha ?? "",
  monto: descuento.monto ?? "",
});

// Los abonos que trajo a otra factura cada cruce de esta. `null` si todavía no
// se leyeron las demás facturas; `false` si no se pudo encontrar la otra
// punta sin dudas.
const partesDelCruce = (entrega, numeroPropio, otras) => {
  if (!otras) return null;

  const partes = (Array.isArray(entrega.haciaFacturas) ? entrega.haciaFacturas : []).map(
    (destino) => {
      const candidatas = otras.filter((otra) => numeroDe(otra) === String(destino).trim());
      if (candidatas.length !== 1) return null;
      const [otra] = candidatas;
      const abonos = abonosDe(otra)
        .map((abono, indice) => ({ abono, indice }))
        .filter(
          ({ abono }) =>
            esAbonoDeCruce(abono) &&
            String(abono.desdeFactura ?? "").trim() === numeroPropio &&
            abono.fecha === entrega.fecha,
        );
      if (abonos.length !== 1) return null;
      return {
        facturaId: otra.id,
        numero: numeroDe(otra),
        indiceAbono: abonos[0].indice,
        monto: abonos[0].abono.monto ?? "",
      };
    },
  );

  if (partes.length === 0 || partes.some((parte) => !parte)) return false;
  const suma = partes.reduce((total, parte) => total + numero(parte.monto), 0);
  return suma === numero(entrega.monto) ? partes : false;
};

const entregaABorrador = (entrega, indice, numeroPropio, otras) => ({
  clave: `entrega#${indice}`,
  original: entrega,
  fecha: entrega.fecha ?? "",
  medio: entrega.medio ?? "",
  monto: entrega.monto ?? "",
  ...(esEntregaDeCruce(entrega)
    ? { partes: partesDelCruce(entrega, numeroPropio, otras) }
    : {}),
});

// `otras` son las DEMÁS facturas del cliente, abiertas y cerradas. Hacen falta
// para los cruces y para el número; sin ellas los cruces quedan sin enlazar.
export const borradorDe = (factura, otras = null) => {
  const datos = datosFactura(factura);
  return {
    numeroFactura: datos.numeroFactura ?? "",
    fechaCreacion: datos.fechaCreacion ?? "",
    grupos: gruposDe(factura).map(grupoABorrador),
    abonos: abonosDe(factura).map(abonoABorrador),
    entregas: entregasDe(factura).map((entrega, indice) =>
      entregaABorrador(entrega, indice, numeroDe(factura), otras),
    ),
    descuentos: descuentosDe(factura).map(descuentoABorrador),
  };
};

// Cuando llegan las demás facturas, a los cruces que todavía no tenían su otra
// punta se les busca. Lo demás del borrador queda como lo dejó el usuario.
export const enlazarCruces = (borrador, factura, otras) => {
  const base = borradorDe(factura, otras);
  return {
    ...borrador,
    entregas: borrador.entregas.map((item) =>
      item.partes === null
        ? { ...item, partes: base.entregas.find(({ clave }) => clave === item.clave)?.partes }
        : item,
    ),
  };
};

// Si la factura tiene cruces que salieron de ella: para corregirlos hay que
// leer las demás.
export const tieneCrucesPropios = (factura) => entregasDe(factura).some(esEntregaDeCruce);

// Cómo se llama un despacho en pantalla y en los avisos.
export const nombreDelGrupo = (grupo) =>
  grupo === GRUPO_INICIAL
    ? "Despacho inicial"
    : `Despacho agregado ${String(grupo ?? "").split("-").pop()}`;

// Lo que el equipo ES, en el vocabulario del documento.
const baseDelEquipo = (item) => ({
  nombre: String(item.nombre ?? "").trim(),
  cantidadEquipos: numero(item.cantidad),
  valorDia: numero(item.valor),
  diasAlquilados: numero(item.dias),
  fechaDespacho: item.fechaDespacho,
  aplicaIva: Boolean(item.aplicaIva),
});

const equipoTocado = (item) =>
  !item.original || cambio(item, equipoABorrador(item.original, item.clave));

const equipoRearmado = (item, hoyIso) =>
  rearmarEquipo(
    { ampliaciones: [], vencidos: [], ...(item.original ?? {}), ...baseDelEquipo(item) },
    item.hechos,
    hoyIso,
  );

const equipoCorregido = (item, hoyIso) =>
  equipoTocado(item) ? equipoRearmado(item, hoyIso) : item.original;

// Los medios que de verdad son un pago: con medio y con monto. "Sin pago" no
// guarda ninguno, aunque hayan quedado escritos.
const mediosValidos = (grupo) =>
  grupo.tipoPago === "sinPago"
    ? []
    : grupo.pagos
        .filter((pago) => pago.medio && numero(pago.monto) > 0)
        .map(({ medio, monto }) => ({ medio, monto: numero(monto) }));

const pagoDe = ({ tipoPago, pagos }) => ({ tipoPago, pagos });
const adicionalesDelBorrador = ({ transporte, valorTransporte, valorDeposito }) => ({
  transporte,
  valorTransporte,
  valorDeposito,
});

// Cada parte del despacho que no cambió se queda con lo que estaba guardado,
// sin reescribirlo: la factura real que nadie tocó sale idéntica, y el
// registro de cambios muestra solo lo que de verdad se corrigió.
const grupoCorregido = (original, grupo, hoyIso) => {
  const inicial = grupoABorrador(original);
  const corregido = {
    ...original,
    equipos: grupo.equipos.map((item) => equipoCorregido(item, hoyIso)),
  };

  if (grupo.fechaSolicitud !== inicial.fechaSolicitud) {
    corregido.fechaSolicitud = grupo.fechaSolicitud;
  }
  if (cambio(pagoDe(grupo), pagoDe(inicial))) {
    corregido.pagos = { tipoPago: grupo.tipoPago, medios: mediosValidos(grupo) };
  }
  if (cambio(adicionalesDelBorrador(grupo), adicionalesDelBorrador(inicial))) {
    const sinTransporte = !grupo.transporte || grupo.transporte === "Sin transporte";
    corregido.adicionales = {
      transporte: grupo.transporte || "",
      valorTransporte: sinTransporte ? 0 : numero(grupo.valorTransporte),
      deposito: numero(grupo.valorDeposito) > 0,
      valorDeposito: numero(grupo.valorDeposito),
    };
  }
  return corregido;
};

// QUÉ PASA CON EL DEPÓSITO después de corregir. Se resuelve cuando vuelve el
// último equipo, así que depende de las devoluciones: quitar una lo vuelve a
// dejar pendiente, y cambiar lo retenido cambia lo que se resolvió.
const depositoResueltoDe = (documento, anterior, hoyIso) => {
  if (calcularDepositoTotal(documento) <= 0) return false;
  if (equiposAfuera(documento).length > 0) return false;

  // La factura que pasó por el formulario de editar lo tiene como un "sí" a
  // secas, sin detalle. Sigue resuelto y no hay detalle que actualizar.
  if (anterior && typeof anterior !== "object") return anterior;

  const retenciones = equiposDe(documento)
    .map(({ equipo }) => equipo)
    .filter((equipo) => numero(equipo?.devolucion?.valorRetenido) > 0);
  const resuelto = {
    retenido: Math.min(calcularDepositoTotal(documento), calcularRetenido(documento)),
    motivo: retenciones
      .map((equipo) => `${equipo.nombre}: ${equipo.devolucion.motivo || ""}`)
      .join(" · "),
    fecha: anterior?.fecha ?? hoyIso,
  };
  return igual(resuelto, anterior) ? anterior : resuelto;
};

// Un abono o una entrega que no se tocó vuelve como estaba, con todo lo que
// trae aparte de las casillas —el tipo, de qué factura vino—.
const abonoTocado = (item) =>
  item.fecha !== (item.original.fecha ?? "") ||
  item.medio !== (item.original.medio ?? "") ||
  numero(item.monto) !== numero(item.original.monto);

const abonoCorregido = (item) =>
  abonoTocado(item)
    ? { ...item.original, fecha: item.fecha, medio: item.medio, monto: numero(item.monto) }
    : item.original;

const descuentoCorregido = (item) =>
  item.fecha !== (item.original.fecha ?? "") || numero(item.monto) !== numero(item.original.monto)
    ? { ...item.original, fecha: item.fecha, monto: numero(item.monto) }
    : item.original;

// El monto de un cruce es lo que fue a cada factura, sumado.
const montoDeLaEntrega = (item) =>
  Array.isArray(item.partes)
    ? item.partes.reduce((total, parte) => total + numero(parte.monto), 0)
    : numero(item.monto);

const entregaCorregida = (item) => {
  const tocada =
    item.fecha !== (item.original.fecha ?? "") ||
    item.medio !== (item.original.medio ?? "") ||
    montoDeLaEntrega(item) !== numero(item.original.monto);
  return tocada
    ? { ...item.original, fecha: item.fecha, medio: item.medio, monto: montoDeLaEntrega(item) }
    : item.original;
};

// El documento entero, como se va a escribir. La bitácora viaja como está: no
// se corrige desde acá.
export const facturaCorregida = (
  factura,
  borrador,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const originales = gruposDe(factura);
  const documento = {
    factura: {
      ...datosFactura(factura),
      numeroFactura: String(borrador.numeroFactura ?? "").trim(),
      fechaCreacion: borrador.fechaCreacion,
    },
    grupos: borrador.grupos.map((grupo) =>
      grupoCorregido(
        originales.find((original) => original.grupo === grupo.grupo),
        grupo,
        hoyIso,
      ),
    ),
    abonos: borrador.abonos ? borrador.abonos.map(abonoCorregido) : abonosDe(factura),
    entregas: borrador.entregas ? borrador.entregas.map(entregaCorregida) : entregasDe(factura),
    // Solo si los tenía: desde acá se corrigen o se quitan, no se agregan.
    ...(descuentosDe(factura).length > 0
      ? {
          descuentos: borrador.descuentos
            ? borrador.descuentos.map(descuentoCorregido)
            : descuentosDe(factura),
        }
      : {}),
    gestiones: gestionesDe(factura),
  };

  documento.factura.depositoResuelto = depositoResueltoDe(
    documento,
    datosFactura(factura).depositoResuelto,
    hoyIso,
  );
  documento.factura.cerrada = facturaCerrada(documento, hoyIso);
  return documento;
};

// Los hechos de un equipo sin el de esa posición. La anulación es de una
// entrega pactada: si se quita la entrega, se va con ella.
export const quitarHecho = (hechos, posicion) => {
  const quitado = hechos[posicion];
  return hechos.filter(
    (hecho, indice) =>
      indice !== posicion &&
      !(quitado?.tipo === "entregaPactada" && hecho.tipo === "entregaAnulada"),
  );
};

// Si el borrador cambia algo de lo guardado. Sin cambios no hay nada que
// escribir, y el botón de guardar no se enciende.
export const hayCorrecciones = (factura, borrador, otras = null) =>
  cambio(borrador, borradorDe(factura, otras));

// ── LO QUE CAMBIA EN LAS OTRAS FACTURAS del cliente ─────────────────────
//
// Dos cosas de esta corrección tocan a otras facturas:
//
//   · un cruce que salió de acá: su abono en la factura que lo recibió se
//     corrige o se quita con él;
//   · el número de esta factura: las otras la nombran —"Viene del saldo a
//     favor de la factura 0412", "Cruzado a factura 0412"— y con el número
//     viejo el cruce ya no se encontraría.
//
// Devuelve, por cada factura que cambia, lo que se le escribe y la factura
// como estaba, para comprobar al guardar que nadie la tocó en el medio.
export const otrasCorregidas = (factura, borrador, otras) => {
  if (!otras) return [];

  const base = borradorDe(factura, otras);
  const cambios = new Map();
  const tomar = (id) => {
    if (!cambios.has(id)) {
      const otra = otras.find((cada) => cada.id === id);
      cambios.set(id, { otra, abonos: [...abonosDe(otra)], entregas: [...entregasDe(otra)] });
    }
    return cambios.get(id);
  };

  base.entregas
    .filter(({ partes }) => Array.isArray(partes))
    .forEach((antes) => {
      const ahora = borrador.entregas.find(({ clave }) => clave === antes.clave);
      antes.partes.forEach((parte, posicion) => {
        const destino = tomar(parte.facturaId);
        const abono = destino.abonos[parte.indiceAbono];
        const monto = ahora ? numero(ahora.partes[posicion].monto) : 0;
        if (!ahora) {
          destino.abonos[parte.indiceAbono] = null;
        } else if (monto !== numero(abono.monto) || ahora.fecha !== abono.fecha) {
          destino.abonos[parte.indiceAbono] = { ...abono, fecha: ahora.fecha, monto };
        }
      });
    });

  const viejo = numeroDe(factura);
  const nuevo = String(borrador.numeroFactura ?? "").trim();
  if (nuevo && nuevo !== viejo) {
    otras.forEach((otra) => {
      const nombraAEsta =
        abonosDe(otra).some((abono) => String(abono.desdeFactura ?? "").trim() === viejo) ||
        entregasDe(otra).some((entrega) =>
          (entrega.haciaFacturas ?? []).some((destino) => String(destino).trim() === viejo),
        );
      if (!nombraAEsta) return;

      const destino = tomar(otra.id);
      destino.abonos = destino.abonos.map((abono) =>
        abono && String(abono.desdeFactura ?? "").trim() === viejo
          ? { ...abono, desdeFactura: nuevo }
          : abono,
      );
      destino.entregas = destino.entregas.map((entrega) =>
        Array.isArray(entrega.haciaFacturas)
          ? {
              ...entrega,
              haciaFacturas: entrega.haciaFacturas.map((cada) =>
                String(cada).trim() === viejo ? nuevo : cada,
              ),
            }
          : entrega,
      );
    });
  }

  return [...cambios.values()]
    .map(({ otra, abonos, entregas }) => {
      const escritura = {};
      const abonosNuevos = abonos.filter(Boolean);
      if (!igual(abonosNuevos, abonosDe(otra))) escritura.abonos = abonosNuevos;
      if (!igual(entregas, entregasDe(otra))) escritura.entregas = entregas;
      return { id: otra.id, original: otra, escritura };
    })
    .filter(({ escritura }) => Object.keys(escritura).length > 0);
};

// ── LO QUE NO DEJA GUARDAR, mirando la plata ya corregida ──────────────
//
// Estas reglas necesitan el documento armado, así que se miran después de las
// del borrador. Cada una se aplica solo si la corrección AGRANDA lo que vigila:
// bajar un monto que ya estaba de más no puede quedar trabado por estarlo.
const depositoLibre = (doc) => {
  const { recibido, retenido, aplicado } = calcularDeposito(doc);
  const libre = Math.max(0, recibido - retenido);
  return { aplicado, libre, exceso: Math.max(0, aplicado - libre) };
};

export const erroresDeLaPlata = (
  factura,
  borrador,
  documento,
  otras,
  hoyIso = obtenerFechaHoyBogota(),
  { noSePudieronLeer = false } = {},
) => {
  const errores = [];
  const nuevo = String(borrador.numeroFactura ?? "").trim();

  // El número: las otras facturas la nombran por él, así que hay que poder
  // leerlas para cambiarlo, y no puede quedar repetido.
  if (nuevo !== numeroDe(factura)) {
    if (!otras) {
      errores.push(
        noSePudieronLeer
          ? "No se pudieron leer las demás facturas del cliente: el número no se puede cambiar ahora."
          : "Buscando las demás facturas del cliente para cambiar el número...",
      );
    } else if (otras.some((otra) => numeroDe(otra) === nuevo)) {
      errores.push(`Ya hay otra factura de este cliente con el número ${nuevo}.`);
    }
  }

  // Lo pagado con el depósito sale del depósito que había libre. Se pasa por
  // subir ese abono, pero también por achicar el depósito: con $100.000 de
  // depósito y $50.000 pagados con él, corregir el depósito a $0 deja esos
  // $50.000 saliendo de la nada, y la cuenta se los devolvería al cliente.
  // Lo que se mira es CUÁNTO se pasa: si ya se pasaba, bajarlo se puede.
  const despues = depositoLibre(documento);
  if (despues.exceso > depositoLibre(factura).exceso) {
    errores.push(
      `Lo pagado con el depósito (${formatearMoneda(despues.aplicado)}) pasa del depósito que había libre (${formatearMoneda(despues.libre)}). Corregí o quitá el abono pagado con el depósito.`,
    );
  }

  // Lo devuelto no puede pasar de lo que el cliente tenía a favor.
  const devuelto = sumarEntregas(documento);
  if (devuelto > sumarEntregas(factura)) {
    const aFavor = calcularCuentaFactura({ ...documento, entregas: [] }, hoyIso).aDevolver;
    if (devuelto > aFavor) {
      errores.push(
        `Lo devuelto al cliente (${formatearMoneda(devuelto)}) pasa de lo que tenía a favor (${formatearMoneda(aFavor)}).`,
      );
    }
  }

  // Y lo que un cruce lleva a otra factura, de lo que esa factura debía.
  const base = borradorDe(factura, otras);
  borrador.entregas
    .filter(({ partes }) => Array.isArray(partes))
    .forEach((item) => {
      const antes = base.entregas.find(({ clave }) => clave === item.clave);
      item.partes.forEach((parte, posicion) => {
        if (numero(parte.monto) <= numero(antes?.partes?.[posicion]?.monto)) return;
        const destino = otras.find(({ id }) => id === parte.facturaId);
        const sinEsteAbono = {
          ...destino,
          abonos: abonosDe(destino).filter((_, indice) => indice !== parte.indiceAbono),
        };
        const debia = calcularCuentaFactura(sinEsteAbono, hoyIso).saldoPendiente;
        if (numero(parte.monto) > debia) {
          errores.push(
            `El cruce a la factura ${parte.numero} (${formatearMoneda(numero(parte.monto))}) pasa de lo que esa factura debía (${formatearMoneda(debia)}).`,
          );
        }
      });
    });

  return errores;
};

const NOMBRE_DE_HECHO = {
  sello: "el cierre de mora",
  indefinida: "la entrega indefinida",
  ampliacion: "la ampliación",
  entregaPactada: "la entrega pactada",
  entregaAnulada: "la anulación de la entrega pactada",
  devolucion: "la devolución",
};

const delDia = (hecho) =>
  `${NOMBRE_DE_HECHO[hecho.tipo] ?? "un registro"} del ${formatearFechaLegible(hecho.fecha)}`;

// Lo que pasa mientras la entrega pactada está vigente: el equipo solo espera
// que lo recojan, así que lo único que le puede pasar es llegar —o no llegar—.
// Una ampliación después del aviso es una historia que no pudo pasar.
const erroresDeLaEntregaPactada = (item, quien) => {
  const pactada = item.hechos.find(({ tipo }) => tipo === "entregaPactada");
  const anulada = item.hechos.find(({ tipo }) => tipo === "entregaAnulada");
  if (!pactada?.fecha) return [];

  if (anulada?.fecha && anulada.fecha < pactada.fecha) {
    return [`${quien}: la anulación no puede ser anterior a la entrega pactada.`];
  }
  const durante = item.hechos.find(
    (hecho) =>
      !["entregaPactada", "entregaAnulada", "devolucion"].includes(hecho.tipo) &&
      hecho.fecha > pactada.fecha &&
      (!anulada?.fecha || hecho.fecha <= anulada.fecha),
  );
  return durante
    ? [
        `${quien}: ${delDia(durante)} no puede ser posterior a la entrega pactada del ${formatearFechaLegible(pactada.fecha)}.`,
      ]
    : [];
};

// EL DESCUENTO DE LOS VENCIDOS sale del tramo que ese hecho cerró. Al mover
// una fecha, ese tramo puede quedar más corto —o no existir—, y las funciones
// que lo escriben no se quejan: lo que no tiene de dónde salir se pierde, y lo
// que pasa de lo que valen los días se recorta en la cuenta. Acá se rearma el
// equipo y se mira, para que ninguna de las dos cosas pase callada.
const erroresDeDescuentosVencidos = (item, quien, hoyIso) => {
  const conDescuento = item.hechos.filter((hecho) => numero(hecho.descuentoVencidos) > 0);
  if (conDescuento.length === 0) return [];

  const armado = equipoRearmado(item, hoyIso);
  const porDia = numero(item.cantidad) * numero(item.valor);
  // El último día de mora que cierra cada hecho.
  const corteDe = (hecho) => {
    if (hecho.tipo === "entregaPactada") return diaAnterior(hecho.fecha);
    if (hecho.tipo === "devolucion" && armado.devolucion?.diaCobrado === false) {
      return diaAnterior(hecho.fecha);
    }
    return hecho.fecha;
  };

  const errores = [];
  const revisados = new Set();
  conDescuento.forEach((hecho) => {
    const corte = corteDe(hecho);
    // Dos hechos del mismo día descuentan del mismo tramo: se mira una vez.
    if (revisados.has(corte)) return;
    revisados.add(corte);

    const tramo = vencidosDe(armado).find(
      (cada) => cada?.hasta === corte && cada.desde && cada.desde <= corte,
    );
    if (!tramo) {
      errores.push(
        `${quien}: ${delDia(hecho)} trae descuento en los días vencidos, pero ese día no se cerró ningún día vencido.`,
      );
      return;
    }
    const valor = diasDeAlquiler(tramo.desde, tramo.hasta) * porDia;
    if (numero(tramo.descuento) > valor) {
      errores.push(
        `${quien}: el descuento en los días vencidos de ${delDia(hecho)} pasa de lo que valen esos días (${formatearMoneda(valor)}).`,
      );
    }
  });
  return errores;
};

// Lo que no deja guardar, dicho con el nombre del equipo: en una factura de
// ocho líneas, "falta la cantidad" a secas no dice dónde.
export const erroresDelBorrador = (borrador, hoyIso = obtenerFechaHoyBogota()) => {
  const errores = [];

  if (!String(borrador.numeroFactura ?? "").trim()) {
    errores.push("Falta el número de la factura.");
  }
  if (!borrador.fechaCreacion) errores.push("Falta la fecha de creación.");

  borrador.grupos.forEach((grupo) => {
    const despacho = nombreDelGrupo(grupo.grupo);
    if (grupo.equipos.length === 0) {
      errores.push(`${despacho}: no puede quedar sin equipos.`);
    }

    grupo.equipos.forEach((item) => {
      const nombre = String(item.nombre ?? "").trim();
      const quien = nombre || `un equipo del ${despacho.toLowerCase()}`;
      const antesDelEquipo = errores.length;

      if (!nombre) errores.push(`${despacho}: hay un equipo sin nombre.`);
      if (numero(item.cantidad) <= 0) errores.push(`${quien}: la cantidad no es válida.`);
      if (numero(item.dias) <= 0) errores.push(`${quien}: los días no son válidos.`);
      if (numero(item.valor) <= 0) errores.push(`${quien}: el precio por día no es válido.`);
      if (!item.fechaDespacho) errores.push(`${quien}: falta la fecha de despacho.`);

      item.hechos.forEach((hecho) => {
        const que = NOMBRE_DE_HECHO[hecho.tipo] ?? "un registro";
        if (!hecho.fecha) {
          errores.push(`${quien}: falta la fecha de ${que}.`);
        } else if (item.fechaDespacho && hecho.fecha < item.fechaDespacho) {
          errores.push(`${quien}: ${que} no puede ser anterior al despacho.`);
        } else if (hecho.fecha > hoyIso) {
          errores.push(`${quien}: ${que} no puede tener una fecha futura.`);
        }

        if (hecho.tipo === "ampliacion" && hecho.fecha) {
          if (numero(hecho.dias) <= 0) {
            errores.push(`${quien}: ${delDia(hecho)} necesita los días que se pidieron.`);
          } else if (
            numero(hecho.descuento) >
            numero(hecho.dias) * numero(item.cantidad) * numero(item.valor)
          ) {
            errores.push(
              `${quien}: el descuento en los días nuevos de ${delDia(hecho)} pasa de lo que valen esos días.`,
            );
          }
        }
      });

      errores.push(...erroresDeLaEntregaPactada(item, quien));

      // La devolución es lo último que le pasa a un equipo: nada de lo demás
      // puede venir después.
      const devolucion = item.hechos.find(({ tipo }) => tipo === "devolucion");
      if (devolucion?.fecha) {
        const posterior = item.hechos.find(
          (hecho) => hecho !== devolucion && hecho.fecha > devolucion.fecha,
        );
        if (posterior) {
          errores.push(
            `${quien}: la devolución no puede ser anterior a ${
              NOMBRE_DE_HECHO[posterior.tipo]
            } del ${formatearFechaLegible(posterior.fecha)}.`,
          );
        }

        const retenido = numero(devolucion.devolucion?.valorRetenido);
        if (devolucion.devolucion?.buenEstado === false) {
          if (!String(devolucion.devolucion?.motivo ?? "").trim()) {
            errores.push(`${quien}: falta decir qué le pasó.`);
          }
          if (retenido > numero(grupo.valorDeposito)) {
            errores.push(
              `${quien}: no se puede retener más que el depósito de su despacho.`,
            );
          }
        }
      }

      // Los descuentos se miran sobre el equipo ya rearmado, y por eso solo
      // si todo lo demás está bien: con una fecha vacía no hay historia que
      // armar. El que nadie tocó vuelve como estaba, así que no se revisa.
      if (errores.length === antesDelEquipo && equipoTocado(item)) {
        errores.push(...erroresDeDescuentosVencidos(item, quien, hoyIso));
      }
    });
  });

  // Los abonos y lo devuelto: cada uno con su fecha, su medio y su monto.
  // Los que llegaron por un cruce no se corrigen acá, así que no se miran.
  const SIN_FECHA = {
    Abono: "Un abono",
    "Devolución al cliente": "Una devolución al cliente",
    Cruce: "Un cruce",
  };
  const revisarPlata = (item, que, conMonto = true) => {
    const cual = item.fecha ? `${que} del ${formatearFechaLegible(item.fecha)}` : SIN_FECHA[que];
    if (!item.fecha) errores.push(`${cual}: falta la fecha.`);
    else if (item.fecha > hoyIso) errores.push(`${cual}: no puede tener una fecha futura.`);
    if (!item.medio) errores.push(`${cual}: falta el medio.`);
    if (conMonto && numero(item.monto) <= 0) errores.push(`${cual}: el monto no es válido.`);
  };

  (borrador.abonos ?? [])
    .filter((item) => !esAbonoDeCruce(item.original))
    .forEach((item) => revisarPlata(item, "Abono"));

  // El descuento no tiene medio: solo la fecha y el monto.
  (borrador.descuentos ?? []).forEach((item) => {
    const cual = item.fecha
      ? `Descuento del ${formatearFechaLegible(item.fecha)}`
      : "Un descuento";
    if (!item.fecha) errores.push(`${cual}: falta la fecha.`);
    else if (item.fecha > hoyIso) errores.push(`${cual}: no puede tener una fecha futura.`);
    if (numero(item.monto) <= 0) errores.push(`${cual}: el monto no es válido.`);
  });

  (borrador.entregas ?? []).forEach((item) => {
    if (!Array.isArray(item.partes)) {
      if (!esEntregaDeCruce(item.original)) revisarPlata(item, "Devolución al cliente");
      return;
    }
    revisarPlata(item, "Cruce", false);
    item.partes.forEach((parte) => {
      if (numero(parte.monto) <= 0) {
        errores.push(`Cruce a la factura ${parte.numero}: el monto no es válido.`);
      }
    });
  });

  return errores;
};

// Los medios que se le pueden poner a un abono o a una devolución. El que ya
// tenía se ofrece aunque ya no esté en la lista —una factura vieja—: sin él,
// la casilla quedaría vacía y parecería que falta.
export const mediosParaCorregir = (lista, actual) =>
  actual && !lista.includes(actual) ? [...lista, actual] : lista;
