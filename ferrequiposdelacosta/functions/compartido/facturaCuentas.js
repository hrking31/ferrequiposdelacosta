// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/ClienteDetalle/facturaCuentas.js, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar una cuenta, tocá el original. Es el mismo archivo que usa la
// app, así que la corrección vale para las dos partes a la vez.

// LAS CUENTAS de una factura: qué se cobra, cuánto se debe y en qué estado
// está cada cosa. Todo sale de los datos guardados y de la fecha de hoy.
//
// Este archivo NO sabe nada de pantalla: ni un ícono, ni un color, ni un
// componente. Es un requisito, no prolijidad — una copia corre en el servidor,
// dentro de la Cloud Function que mantiene los totales del menú, y allá no
// existe React.
//
// ── La regla que ordena todo ──────────────────────────────────────────
//
// **Se guardan hechos, se calculan conclusiones.** Un equipo se vence solo a
// la medianoche sin que nadie escriba nada, así que su estado no puede estar
// guardado: un dato guardado no se entera de algo que no pasó. Lo mismo el
// saldo y el estado de la factura.
//
// Las dos únicas excepciones —`cerrada` y `depositoResuelto`— solo cambian si
// alguien escribe, y por eso sí se guardan.
//
// ── Cómo se cobra un equipo ───────────────────────────────────────────
//
// Siempre la misma multiplicación: **cantidad × valor del día × días**. Lo
// único que cambia es de dónde salen los días:
//
//   ya volvió    los que usó, que quedaron congelados en `diasAlquilados` el
//                día que volvió (ver el modelo). Si volvió antes, ahí ya están
//                los pocos días que estuvo afuera; si se pasó, los de más.
//
//   sigue afuera lo pactado —`diasAlquilados` más los días de cada
//                ampliación— y, si ya se pasó de la fecha, los que lleva
//                corriendo desde que salió.
//
// No hay créditos que restar ni excepciones que recordar. La versión anterior
// necesitaba una maquinaria aparte para descontar los días que el cliente
// pagó y no usó, y de ahí salieron dos errores de plata.

import {
  abonosDe,
  adicionalesDe,
  ampliacionesDe,
  datosFactura,
  entregaPactadaDe,
  entregasDe,
  equiposDe,
  gestionesDe,
  gruposDe,
  pagosDe,
  sigueAfuera,
  indefinidaDe,
  sinFechaDeEntrega,
  tieneEntregaPactada,
  tramoVencidoAbierto,
  vencidosDe,
// Con la extensión .js, y es obligatorio: este archivo viaja como copia al
// servidor, y allá lo carga Node directamente. Node exige la extensión en los
// imports relativos; Vite la completa solo, así que sin ella funciona en la
// app y el despliegue de las funciones falla.
} from "./facturaModelo.js";

// Medios de pago que maneja la empresa (Nequi y Nequi A son cuentas Nequi
// distintas, de dos personas diferentes).
export const MODOS_PAGO = ["Nequi", "Nequi A", "Bancolombia", "Daviplata", "Efectivo"];

export const IVA = 0.19;

const numero = (valor) => Number(valor) || 0;
const sumar = (lista, campo) =>
  (Array.isArray(lista) ? lista : []).reduce(
    (total, item) => total + numero(item?.[campo]),
    0,
  );

// ── Fechas ─────────────────────────────────────────────────────────────

const obtenerHoraBogota = () =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );

// La fecha de hoy en Colombia, en formato AAAA-MM-DD. Es la referencia de
// todos los cálculos que dependen del calendario.
export const obtenerFechaHoyBogota = () => {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-");
  return `${anio}-${mes}-${dia}`;
};

// CUÁNDO SALE UN EQUIPO que se despacha ahora mismo.
//
// Regla de negocio: antes de las 3pm (hora Colombia) alcanza a salir y su
// alquiler arranca hoy; a partir de las 3pm sale mañana y arranca mañana.
//
// Es la fecha del DESPACHO y de nada más. Se llamaba
// `obtenerFechaInicialEfectiva`, un nombre que no decía de qué era la fecha, y
// terminó usada para fechar cosas que pasaron HOY: la creación de una factura
// hecha a las 4 de la tarde nacía fechada mañana, y lo mismo la solicitud de
// un despacho agregado y el pago que venía con él. Para eso está
// `obtenerFechaHoyBogota`: lo que ya ocurrió se fecha hoy, sin importar la
// hora.
export const obtenerFechaDespachoSugerida = () => {
  const horaBogota = obtenerHoraBogota();
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (horaBogota >= 15) fecha.setUTCDate(fecha.getUTCDate() + 1);
  return aIso(fecha);
};

// EL EQUIPO VENCIDO QUE VUELVE AHORA, ¿paga el día de hoy?
//
// La misma hora de corte del despacho, mirada desde el otro lado: el que
// entrega antes de las 3 p.m. no alcanzó a usar el día, y no se le cobra; de
// las 3 p.m. en adelante sí. Regla del dueño, 2026-10-13, con la 0729: las
// cerchas volvían a las 10 a.m. y la cuenta ya traía ese día cobrado desde la
// medianoche.
//
// Vale SOLO para los días vencidos. El que devuelve en plazo paga el día en
// que vuelve, como siempre: ese día ya lo tenía pactado.
//
// Es lo que se SUGIERE al abrir el diálogo, no una orden: el reloj mira la
// hora en que se anota, y el cliente pudo haber entregado a las 10 y que lo
// registren a las 4.
export const seCobraElDiaAlDevolver = () => obtenerHoraBogota() >= 15;

const aIso = (fecha) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
};

// Días calendario entre dos fechas. Positivo si "hasta" es posterior.
export const diferenciaEnDias = (desdeIso, hastaIso) => {
  if (!desdeIso || !hastaIso) return 0;
  const [a1, m1, d1] = desdeIso.split("-").map(Number);
  const [a2, m2, d2] = hastaIso.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};

// Días de alquiler entre dos fechas, contando el día de salida como el
// primero: sale y vuelve el mismo día son 1 día, no 0.
export const diasDeAlquiler = (desdeIso, hastaIso) =>
  desdeIso && hastaIso ? diferenciaEnDias(desdeIso, hastaIso) + 1 : 0;

// Fecha de devolución = despacho + días, contando el propio día de despacho
// (despacho el 23 por 2 días → vence el 24, no el 25).
export const calcularFechaDevolucion = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + numero(dias) - 1);
  return aIso(fecha);
};

// Extiende un vencimiento ya existente: esos días se suman completos, sin
// restar 1, porque el día de vencimiento actual ya está contado.
export const calcularVencimiento = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + numero(dias));
  return aIso(fecha);
};

export const diaAnterior = (fechaIso) => calcularVencimiento(fechaIso, -1);

// ── HASTA QUÉ DÍA SE LE COBRA A UN EQUIPO ──────────────────────────────
//
// Casi siempre es hoy, o el día en que volvió: ahí se corta la cuenta.
//
// La excepción es la ENTREGA PACTADA. El cliente llama, dice que ya terminó,
// y el equipo llega a la bodega después —el camión no puede ir hasta el
// jueves—. Desde esa llamada no se le cobra más: el día del aviso queda por
// fuera, sea de mañana o de tarde, y da igual cuándo llegue el equipo.
// Regla del dueño, 2026-10-13.
//
// Con la 0729: las cerchas llevaban vencidas desde el 10/10 y el cliente avisó
// el 13. Se cobran el 10, el 11 y el 12 —$27.000— y ahí queda, aunque lleguen
// el 15.
//
// El día en que salió se cobra siempre: sin ese piso, pactar la entrega el
// mismo día del despacho dejaba un alquiler de cero días.
export const ultimoDiaCobrado = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const tope = equipo?.devolucion?.fechaDevolucion ?? hoyIso;
  if (!tieneEntregaPactada(equipo)) return tope;

  const antesDelAviso = diaAnterior(equipo.entregaPactada.fecha);
  const corte =
    equipo?.fechaDespacho && antesDelAviso < equipo.fechaDespacho
      ? equipo.fechaDespacho
      : antesDelAviso;
  return corte < tope ? corte : tope;
};

// ── HASTA CUÁNDO ESTÁ CUBIERTO UN EQUIPO ───────────────────────────────
//
// No se guarda: se encadena. Arranca con el plazo del alta y se estira con
// cada tramo vencido que ya se cerró y con cada plazo que el cliente pidió.
//
// El compresor de la 5698: sale el 01/09 por 7 días → cubierto hasta el
// 07/09; sus tramos 08→09 y 10→11 lo llevan al 11/09; su ampliación de 3
// días, al 14/09.
//
// Guardar esta fecha era el problema: al renovarle el plazo se movía, y con
// ella desaparecía lo único que probaba que el equipo se había vencido. De
// ahí salieron seis formas distintas de adivinarlo después. Con los tramos
// escritos no hay nada que adivinar, y ninguna fecha que se mueva.
export const cubiertoHasta = (equipo) => {
  const finales = [
    calcularFechaDevolucion(
      equipo?.fechaDespacho,
      numero(equipo?.diasAlquilados),
    ),
    ...vencidosDe(equipo).map((tramo) => tramo?.hasta),
    ...ampliacionesDe(equipo).map((ampliacion) => ampliacion?.hasta),
  ].filter(Boolean);

  return finales.length > 0
    ? finales.reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor))
    : null;
};

// Los días que el equipo pasó afuera de su plazo.
//
// Los tramos ya cerrados traen sus dos fechas y no vuelven a moverse nunca.
// El que sigue abierto se cuenta contra hoy —o contra el día en que volvió,
// si volvió: ahí la cuenta se corta (ver ultimoDiaCobrado).
export const diasVencidosDe = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const corte = ultimoDiaCobrado(equipo, hoyIso);

  return vencidosDe(equipo).reduce(
    (total, tramo) => total + diasDelTramo(tramo, corte),
    0,
  );
};

// LO QUE LLEVA VENCIDO DESDE EL ÚLTIMO ACUERDO: los días del tramo que está
// corriendo y lo que valen. Es lo que se dice al lado de la fecha vigente
// —"Vencida 25/09 · 3 días"— y lo que se le reclama al llamar.
//
// No es lo mismo que `diasVencidosDe`, que suma TODOS los tramos porque todos
// se cobran. La 03685 de Hernando Rey: 1 día vencido el 22/09, que se cerró al
// pactarle 3 días más, y otros 3 desde el 26. Se cobran 4, pero desde el 25/09
// lleva 3; la tarjeta decía 4 al lado de esa fecha.
//
// El equipo que pagó sus días o pidió más no tiene tramo corriendo: el
// contador vuelve a cero, que es la regla del 09/09.
export const vencidoQueCorre = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const corte = ultimoDiaCobrado(equipo, hoyIso);
  const tramo = tramoVencidoAbierto(equipo);
  const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
  return {
    dias: diasDelTramo(tramo, corte),
    valor: tramo ? valorDelTramo(tramo, corte, porDia) : 0,
  };
};

// Los días de UN tramo vencido. El abierto se cuenta hasta el corte; el que se
// abrió y se cerró en el acto —su `hasta` cae antes que su `desde`— no suma.
const diasDelTramo = (tramo, corte) => {
  const hasta = tramo?.hasta ?? corte;
  if (!tramo?.desde || hasta < tramo.desde) return 0;
  return diasDeAlquiler(tramo.desde, hasta);
};

// Lo que se cobra de un tramo vencido: sus días al valor del día, menos el
// descuento que se le hizo al cerrarlo, si se le hizo (ver ampliarEquipo).
const valorDelTramo = (tramo, corte, porDia) =>
  Math.max(0, diasDelTramo(tramo, corte) * porDia - numero(tramo?.descuento));

// ── La cuenta de un equipo ─────────────────────────────────────────────
//
// Devuelve el desglose completo de una línea. Las pantallas lo muestran por
// partes —lo pactado por un lado, lo que corre por vencimiento por otro— y por
// eso cada pedazo sale separado en vez de un único número que ya no dice de
// dónde salió.
export const calcularEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
  const ampliaciones = ampliacionesDe(equipo);

  const diasAmpliados = sumar(ampliaciones, "dias");

  // Lo que se le prometió: los días del despacho más los que pidió después.
  const prometidos = numero(equipo?.diasAlquilados) + diasAmpliados;
  const diasVencidos = diasVencidosDe(equipo, hoyIso);

  // El que devolvió ANTES de su fecha no usó todo lo pactado, y lo que no usó
  // no se le cobra. El que sigue afuera paga lo pactado completo aunque no lo
  // haya consumido todavía: esos días ya son suyos.
  //
  // Con la entrega pactada pasa lo mismo que con el que ya volvió, aunque el
  // equipo siga afuera: la cuenta quedó detenida el día del aviso.
  const devuelto = !sigueAfuera(equipo);
  const corte = ultimoDiaCobrado(equipo, hoyIso);
  const usados =
    devuelto || tieneEntregaPactada(equipo)
      ? diasDeAlquiler(equipo?.fechaDespacho, corte)
      : prometidos;
  const diasPactados = Math.min(prometidos, Math.max(0, usados));

  const dias = diasPactados + diasVencidos;

  // Dos descuentos, cada uno sobre sus propios días: el de las ampliaciones
  // sale de lo pactado, y el de cada tramo vencido, de ese tramo y de nada
  // más. Ninguno pasa de lo que valen sus días, así que `bruto - descuento`
  // es siempre el neto: la cuenta de cobro resta el descuento una sola vez
  // al final y tiene que dar lo mismo.
  const descuentoPactado = Math.min(
    sumar(ampliaciones, "descuento"),
    diasPactados * porDia,
  );
  const netoPactado = diasPactados * porDia - descuentoPactado;
  const netoVencido = vencidosDe(equipo).reduce(
    (total, tramo) => total + valorDelTramo(tramo, corte, porDia),
    0,
  );

  return {
    dias,
    diasPactados,
    diasVencidos,
    bruto: dias * porDia,
    descuento: descuentoPactado + (diasVencidos * porDia - netoVencido),
    neto: netoPactado + netoVencido,
    netoPactado,
    netoVencido,
    devuelto,
  };
};

// ── DE DÓNDE SALIÓ CADA DÍA que se le cobra a un equipo ────────────────
//
// Tres tramos, y cada uno cuenta una historia distinta sobre la misma plata:
//
//   alta      los que se pactaron al despacharlo
//   ampliados los que el cliente PIDIÓ después
//   vencidos  los que corrieron porque no devolvió
//
// Las pantallas los nombran por separado —"días ampliados" no es lo mismo que
// "días vencidos"— y esta es la única función que decide cuál es cuál, para
// que el desglose de la ficha, los chips y el PDF no puedan discrepar.
//
// El que devolvió antes de tiempo no usó todo lo que tenía pactado. Lo que se
// le cobra se recorta desde el final: primero se llenan los días del alta y
// recién lo que sobra son ampliados.
export const diasDeEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const cuenta = calcularEquipo(equipo, hoyIso);
  const cobradosPactados = cuenta.dias - cuenta.diasVencidos;
  const alta = Math.min(numero(equipo?.diasAlquilados), cobradosPactados);

  return {
    alta,
    ampliados: Math.max(0, cobradosPactados - alta),
    vencidos: cuenta.diasVencidos,
  };
};

// ── LOS MISMOS DÍAS, PERO CON SU FECHA ─────────────────────────────────
//
// `diasDeEquipo` dice CUÁNTOS días de cada clase se le cobran. Esto dice
// CUÁNDO pasó cada uno, y por eso es lo único que permite ponerlos en orden.
//
// Hace falta porque **la clase de tramo no dice el orden**. Lo corriente es
// alta → lo que pidió → lo que se pasó, pero un equipo que se venció y recién
// DESPUÉS pidió días va al revés: alta → lo que se pasó → lo que pidió.
// Deducir el orden de la clase —que es como se hacía— cruzaba esos dos
// renglones: en la 8932 de Hernando Rey los 3 días vencidos aparecían después
// de los 5 que se le habían pactado el 14, cuando fue exactamente al revés.
//
// Cada tramo trae el día en que arrancó, sus días y lo que vale, ya con el
// descuento aplicado. **La suma de los valores es exactamente el `neto` de
// `calcularEquipo`**: esto reparte lo que ya se cobra, no recalcula nada, y
// hay una prueba que lo fija.
export const tramosDeEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
  const dias = diasDeEquipo(equipo, hoyIso);
  const corte = ultimoDiaCobrado(equipo, hoyIso);

  const tramos = [];

  // 1. LOS DÍAS DEL ALTA, desde que salió de la bodega.
  if (dias.alta > 0) {
    tramos.push({
      clave: "inicial",
      tipo: "inicial",
      desde: equipo?.fechaDespacho ?? null,
      dias: dias.alta,
      valor: dias.alta * porDia,
    });
  }

  // 2. CADA AMPLIACIÓN, con los días que de verdad se le cobran. El que
  // devolvió antes no usó todo lo que había pedido, y ese recorte cae desde
  // la última ampliación hacia atrás — la misma regla que reparte
  // `diasDeEquipo`, acá aplicada tramo por tramo.
  let pactadosPorRepartir = dias.ampliados;
  ampliacionesDe(equipo).forEach((ampliacion, indice) => {
    const cobrados = Math.min(numero(ampliacion?.dias), pactadosPorRepartir);
    if (cobrados <= 0) return;
    pactadosPorRepartir -= cobrados;

    tramos.push({
      clave: `ampliados-${indice}`,
      tipo: "ampliados",
      // El día en que arrancan los días nuevos. `fecha` —cuándo se pactó— es
      // el respaldo para las ampliaciones viejas, que no guardaban el desde.
      desde: ampliacion?.desde ?? ampliacion?.fecha ?? null,
      dias: cobrados,
      valor: cobrados * porDia,
    });
  });

  // 3. CADA TRAMO VENCIDO. El que sigue abierto se cuenta contra hoy —o
  // contra el día en que volvió—, igual que en `diasVencidosDe`.
  vencidosDe(equipo).forEach((tramo, indice) => {
    const diasTramo = diasDelTramo(tramo, corte);
    if (diasTramo <= 0) return;

    tramos.push({
      clave: `vencidos-${indice}`,
      tipo: "vencidos",
      desde: tramo.desde,
      dias: diasTramo,
      // Al valor del día, menos el descuento que se le haya hecho a ESTE
      // tramo al cerrarlo: se pacta con el cliente y queda en su renglón.
      valor: valorDelTramo(tramo, corte, porDia),
    });
  });

  // EL DESCUENTO DE LAS AMPLIACIONES se resta de lo pactado, que es de donde
  // salió: primero de las ampliaciones y, si es más grande que ellas —el que
  // devolvió antes no usó todos los días que pidió—, lo que sobra sale del
  // alta. Así la suma de los tramos da lo mismo que `neto`, que también lo
  // resta del pactado completo.
  let porDescontar = sumar(ampliacionesDe(equipo), "descuento");
  [...tramos]
    .filter((tramo) => tramo.tipo === "ampliados")
    .concat(tramos.filter((tramo) => tramo.tipo === "inicial"))
    .forEach((tramo) => {
      if (porDescontar <= 0) return;
      const quita = Math.min(tramo.valor, porDescontar);
      tramo.valor -= quita;
      porDescontar -= quita;
    });

  // En orden de calendario, y los del mismo día en el orden en que se
  // armaron: primero salió, después se le dio y al final se pasó.
  return tramos
    .map((tramo, orden) => ({ ...tramo, orden }))
    .sort((a, b) => {
      if (!a.desde || !b.desde || a.desde === b.desde) return a.orden - b.orden;
      return a.desde < b.desde ? -1 : 1;
    });
};

// ── El estado de un equipo ─────────────────────────────────────────────
//
// Se resuelve en orden y gana el primero. El orden no es un detalle: un equipo
// devuelto NO figura vencido aunque haya vuelto tarde —ya volvió—, y uno que
// se pasó de su fecha ampliada es vencido, no "ampliación".
export const ESTADOS_EQUIPO_EN_ORDEN = [
  "pendiente",
  "activo",
  "ampliacion",
  "vencido",
  "porRecoger",
  "devuelto",
];

export const calcularEstadoEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  if (!sigueAfuera(equipo)) return "devuelto";
  // Se pactó la entrega: ya no corre ni vence, solo falta que llegue. Manda
  // sobre todo lo demás —un equipo por recoger no está vencido aunque su
  // fecha haya pasado, porque ya no se le cobra—.
  if (tieneEntregaPactada(equipo)) return "porRecoger";
  // Todavía no salió de la bodega.
  if (equipo?.fechaDespacho && equipo.fechaDespacho > hoyIso) return "pendiente";
  // El que quedó sin fecha de entrega cuenta como vencido: tenía que avisar
  // y no avisó, y mientras tanto corren días.
  if (sinFechaDeEntrega(equipo)) return "vencido";
  // Un equipo vence el día que se le acaba la cobertura, no al día siguiente:
  // así entra a cartera ese mismo día y se le puede avisar al cliente que
  // vence mañana.
  const hasta = cubiertoHasta(equipo);
  if (hasta && hasta <= hoyIso) return "vencido";
  if (ampliacionesDe(equipo).length > 0) return "ampliacion";
  return "activo";
};

export const equipoVencido = (equipo, hoyIso = obtenerFechaHoyBogota()) =>
  calcularEstadoEquipo(equipo, hoyIso) === "vencido";

// Un equipo que sigue afuera y todavía no vence: el cliente lo puede devolver
// sin que eso sea una gestión de cobranza.
export const equipoAlDia = (equipo, hoyIso = obtenerFechaHoyBogota()) =>
  ["activo", "ampliacion"].includes(calcularEstadoEquipo(equipo, hoyIso));

const siguienteDia = (fechaIso) => calcularVencimiento(fechaIso, 1);

// ── ABRIR Y CERRAR LOS TRAMOS VENCIDOS ─────────────────────────────────
//
// Son las dos únicas operaciones que escriben la mora de un equipo, y entre
// las dos sostienen el modelo entero.
//
// ABRIR lo hace el repaso de la madrugada, cuando un equipo amanece pasado de
// plazo. Se escribe UNA vez, con el `hasta` vacío, y no se vuelve a tocar:
// los días que van corriendo los cuenta el calendario, que para eso está.
//
// CERRAR lo provoca siempre una persona —el cliente paga, pide días o
// devuelve—, nunca el calendario. Ahí el tramo queda con sus dos fechas y no
// se recalcula nunca más: es historia escrita.
//
// Por eso ya no hay ventana por donde se pierda un vencimiento. Antes, HACER
// algo borraba el rastro —renovar movía la fecha y el día vencido
// desaparecía—; ahora hacer algo es justamente lo que lo deja escrito.
export const abrirTramoVencido = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  if (!sigueAfuera(equipo)) return equipo;
  // Con la entrega pactada la cuenta está detenida: la madrugada no le abre
  // mora a un equipo que solo está esperando que lo recojan.
  if (tieneEntregaPactada(equipo)) return equipo;
  if (tramoVencidoAbierto(equipo)) return equipo;

  const hasta = cubiertoHasta(equipo);
  // El último día cubierto todavía está pagado: la mora arranca al siguiente.
  // (El equipo sí figura vencido ese mismo día, para poder avisarle al
  // cliente: eso lo decide calcularEstadoEquipo, no esto.)
  if (!hasta || hasta >= hoyIso) return equipo;

  return {
    ...equipo,
    vencidos: [
      ...vencidosDe(equipo),
      {
        desde: siguienteDia(hasta),
        hasta: null,
        // Si el cliente ya había avisado que no sabía cuándo devolver, estos
        // días corren con permiso. Es lo único que los distingue.
        indefinida: sinFechaDeEntrega(equipo),
      },
    ],
  };
};

// Si el tramo todavía no se abrió, se abre acá mismo y se cierra en el acto.
// Pasa con el equipo que se venció después del último repaso de la madrugada,
// y sobre todo con la factura cargada con la fecha de despacho atrasada: se
// despachó el 15/09 por 3 días y se carga el 24, así que lleva 7 días vencidos
// que nadie anotó. Sin esto, devolverlo ese mismo día cerraba un tramo que no
// existía y esos 7 días se perdían para siempre.
export const cerrarTramoVencido = (equipo, hastaIso) => {
  const base = abrirTramoVencido(equipo, hastaIso);
  const abierto = tramoVencidoAbierto(base);
  if (!abierto) return equipo;

  return {
    ...base,
    vencidos: vencidosDe(base).map((tramo) =>
      tramo === abierto ? { ...tramo, hasta: hastaIso } : tramo,
    ),
  };
};

// Cerrar la mora de un equipo al que le está pasando algo: paga, pide días o
// devuelve.
//
// Casi siempre es cerrar el tramo que venía corriendo. Pero hay un caso que
// no tiene tramo y sin embargo YA ESTABA VENCIDO: al que le renuevan el plazo
// el mismo día en que se le acaba. Ese día el equipo figura vencido —así entra
// a cartera y se le puede avisar al cliente— pero todavía no le corrió ni un
// día de mora, así que la madrugada nunca llegó a abrirle nada.
//
// Es EXACTAMENTE el caso de la 0123 de ReYaz, el que el modelo viejo perdía:
// se le pactaron 4 días el mismo 11/09 en que vencían, no se pasó ni un día, y
// la factura salió de cartera debiendo $71.400.
//
// Por eso se le anota un tramo que no suma ni un día —su `hasta` cae antes que
// su `desde`— pero que deja escrito que llegó a vencerse.
const cerrarMora = (equipo, hoyIso) => {
  // Al de la entrega pactada ya se le cerró todo el día del aviso. Sin esto,
  // un pago posterior le anotaba un tramo desde ese día hasta hoy y le
  // cobraba justo los días que se habían detenido.
  if (tieneEntregaPactada(equipo)) return equipo;

  const cerrado = cerrarTramoVencido(equipo, hoyIso);
  if (cerrado !== equipo) return cerrado;

  const hasta = cubiertoHasta(equipo);
  if (!hasta || hasta > hoyIso) return equipo;
  // Y si hoy ya se le cerró uno, no se le encima otro: pasar dos veces por
  // acá —el mismo pago que cierra y despues vuelve a mirar— no puede
  // duplicar el registro.
  if (vencidosDe(equipo).some((tramo) => tramo?.hasta === hoyIso)) return equipo;

  return {
    ...equipo,
    vencidos: [
      ...vencidosDe(equipo),
      {
        desde: siguienteDia(hasta),
        hasta: hoyIso,
        indefinida: sinFechaDeEntrega(equipo),
      },
    ],
  };
};

// El equipo vuelve a tener fecha, así que su entrega indefinida se cierra con
// el día en que dejó de estarlo. El que nunca estuvo sin fecha no estrena un
// nodo vacío.
export const cerrarIndefinida = (equipo, hoyIso) =>
  sinFechaDeEntrega(equipo)
    ? {
        ...equipo,
        indefinida: { ...indefinidaDe(equipo), activa: false, hasta: hoyIso },
      }
    : equipo;

// ── Lo que se le da a un equipo al ampliarle el plazo ──────────────────
//
// Cuando el cliente pide "un día más" y el equipo lleva 4 días vencidos, ese
// día que se le promete es MAÑANA. Por eso lo primero es cerrar el tramo que
// venía corriendo —esos 4 días quedan escritos— y recién sobre esa base
// arrancan los días nuevos.
//
// Los 4 vencidos NO se regalan: se siguen cobrando, solo que en su propio
// renglón y no disfrazados de días ampliados. Perdonarlos es una decisión que
// se negocia con el cliente, y por eso la ampliación trae DOS descuentos: uno
// sobre los días nuevos y otro sobre los vencidos que se cierran hoy.
//
// Los vencidos de la proyección son los del tramo que se cierra HOY, no todos
// los que el equipo acumuló: los de tramos anteriores ya se cerraron con su
// propia gestión, y el descuento de hoy no los toca.
export const proyectarAmpliacion = (
  equipo,
  diasPedidos,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const pedidos = Math.max(0, numero(diasPedidos));
  const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
  // Con el tramo de hoy ya cerrado —y abierto antes, si la madrugada todavía
  // no lo había escrito—: de ahí salen los días vencidos y el día en que
  // arrancan los nuevos.
  const cerrado = cerrarTramoVencido(equipo, hoyIso);
  const desde = siguienteDia(cubiertoHasta(cerrado));
  const tramo = tramoQueCierraHoy(cerrado, hoyIso);
  const diasVencidos = diasDelTramo(tramo, hoyIso);

  return {
    porDia,
    diasVencidos,
    vencidosDesde: diasVencidos > 0 ? tramo.desde : null,
    // Hasta cuánto se les puede descontar: lo que valen, y nada más.
    valorVencidos: diasVencidos * porDia,
    // Los que se le prometieron, que es lo que el cliente escuchó. Y nada más:
    // el renglón de la ampliación ya no mezcla los vencidos adentro.
    diasPedidos: pedidos,
    valorPedidos: pedidos * porDia,
    desde,
    hasta: pedidos > 0 ? calcularFechaDevolucion(desde, pedidos) : null,
  };
};

// Si alguno de los dos descuentos pasa de lo que valen sus días.
export const descuentoExcedido = (proyeccion, { descuento, descuentoVencidos } = {}) =>
  numero(descuento) > proyeccion.valorPedidos ||
  numero(descuentoVencidos) > proyeccion.valorVencidos;

// El tramo vencido que termina hoy: el que cierra una ampliación. El que se
// abrió y se cerró en el acto no suma días, así que no cuenta.
const tramoQueCierraHoy = (equipo, hoyIso) =>
  vencidosDe(equipo).find(
    (tramo) => tramo?.hasta === hoyIso && diasDelTramo(tramo, hoyIso) > 0,
  ) ?? null;

// EL DESCUENTO SOBRE LOS VENCIDOS QUE SE CIERRAN HOY. Queda pegado al tramo,
// que es de donde sale la plata: así la cuenta y la historia del equipo lo
// leen del mismo lugar. Lo usan las dos gestiones que cierran la mora
// negociando con el cliente: ampliar el plazo y devolver.
//
// El equipo ya tiene que llegar con el tramo cerrado hoy. Sin tramo —no se
// le venció nada— no hay de dónde descontar y vuelve tal cual.
export const descontarVencidosDeHoy = (
  equipo,
  monto,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const descuento = Math.max(0, numero(monto));
  const tramo = descuento > 0 ? tramoQueCierraHoy(equipo, hoyIso) : null;
  if (!tramo) return equipo;

  return {
    ...equipo,
    vencidos: vencidosDe(equipo).map((cada) =>
      cada === tramo
        ? { ...cada, descuento: numero(cada.descuento) + descuento }
        : cada,
    ),
  };
};

// El equipo con su plazo nuevo: el tramo vencido cerrado hoy, la entrega
// indefinida apagada —ya tiene fecha— y la ampliación anotada con lo que el
// cliente PIDIÓ.
//
// Cada descuento queda pegado a los días de donde sale: el de los días nuevos
// en la ampliación, y el de los vencidos en el tramo que se cierra hoy. Así la
// historia del equipo muestra cada renglón con lo que de verdad se cobra.
export const ampliarEquipo = (
  equipo,
  { dias, descuento, descuentoVencidos } = {},
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const pedidos = Math.max(0, numero(dias));
  if (pedidos <= 0) return equipo;

  const proyeccion = proyectarAmpliacion(equipo, pedidos, hoyIso);
  const base = descontarVencidosDeHoy(
    cerrarIndefinida(cerrarMora(equipo, hoyIso), hoyIso),
    descuentoVencidos,
    hoyIso,
  );

  return {
    ...base,
    ampliaciones: [
      ...ampliacionesDe(base),
      {
        fecha: hoyIso,
        dias: pedidos,
        desde: proyeccion.desde,
        hasta: proyeccion.hasta,
        descuento: numero(descuento),
      },
    ],
  };
};

// ── PARTIR UNA LÍNEA cuando el cliente devuelve una parte ───────────────
//
// Las dos mitades se llevan la misma historia —el alta, las ampliaciones, los
// tramos vencidos—, porque la vivieron juntas. Pero los descuentos son PLATA,
// no historia: copiados tal cual, cada mitad restaba el descuento entero y el
// cliente terminaba con el doble. 4 tablones con $20.000 de descuento, vuelven
// 2: $10.000 van con los que volvieron y $10.000 con los que siguen afuera.
//
// Devuelve [la parte que vuelve, la que se queda]. Lo que sobra del redondeo
// va con la que se queda, para que las dos sumen exactamente el descuento.
export const partirLinea = (equipo, cantidadQueVuelve) => {
  const total = numero(equipo?.cantidadEquipos);
  const vuelve = Math.min(Math.max(0, numero(cantidadQueVuelve)), total);
  const parteQueVuelve = (monto) =>
    total > 0 ? Math.round((numero(monto) * vuelve) / total) : 0;

  const partir = (queda) => {
    const repartir = (lista) =>
      lista.map((item) =>
        numero(item?.descuento) > 0
          ? {
              ...item,
              descuento: queda
                ? numero(item.descuento) - parteQueVuelve(item.descuento)
                : parteQueVuelve(item.descuento),
            }
          : item,
      );

    return {
      ...equipo,
      cantidadEquipos: queda ? total - vuelve : vuelve,
      ...(Array.isArray(equipo?.ampliaciones) && {
        ampliaciones: repartir(equipo.ampliaciones),
      }),
      ...(Array.isArray(equipo?.vencidos) && {
        vencidos: repartir(equipo.vencidos),
      }),
    };
  };

  return [partir(false), partir(true)];
};

// El equipo que queda SIN FECHA DE ENTREGA: el cliente se lo queda y avisará.
//
// Su tramo vencido se cierra hoy —esos días ya están cobrados— y desde mañana
// empieza a correr uno nuevo, marcado como que corre con permiso. Sin esto,
// al día siguiente el calendario volvería a contar los días ya pagados.
export const dejarSinFechaDeEntrega = (
  equipo,
  hoyIso = obtenerFechaHoyBogota(),
) => ({
  ...cerrarMora(equipo, hoyIso),
  indefinida: { activa: true, desde: hoyIso, hasta: null },
});

// ── LA ENTREGA PACTADA ─────────────────────────────────────────────────
//
// El cliente avisa que ya terminó y el equipo llega a la bodega después. Se
// anota el día del aviso y la cuenta queda detenida ahí: su mora se cierra
// AYER —el día del aviso no se cobra— y, si estaba sin fecha de entrega, eso
// también se apaga, porque ya se sabe que vuelve.
//
// El equipo NO queda devuelto: sigue afuera, "por recoger", con su depósito
// guardado, hasta que alguien lo recibe y registra la devolución. Ahí se
// revisa cómo volvió; acá todavía no lo vio nadie.
export const pactarEntrega = (equipo, hoyIso = obtenerFechaHoyBogota()) => ({
  ...cerrarIndefinida(cerrarMora(equipo, diaAnterior(hoyIso)), hoyIso),
  entregaPactada: { fecha: hoyIso },
});

// El equipo no llegó: se anula lo pactado y la cuenta vuelve a correr desde
// el día en que se había detenido, como si nunca hubiera parado. Perdonar
// alguno de esos días se negocia aparte, con el descuento de vencidos.
//
// La mora se le abre acá mismo y no se espera a la madrugada: hasta entonces
// esos días no figurarían en ninguna cuenta.
export const anularEntregaPactada = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  if (!tieneEntregaPactada(equipo)) return equipo;

  return abrirTramoVencido(
    {
      ...equipo,
      entregaPactada: { ...equipo.entregaPactada, anuladaEl: hoyIso },
    },
    hoyIso,
  );
};

// Los mismos grupos de la factura, con el tramo vencido de cada equipo que
// sigue afuera ya cerrado. Devuelve `null` cuando no había ninguno abierto,
// para que quien guarda no escriba de gusto.
export const sellarFacturaPagada = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  let hubo = false;

  const grupos = gruposDe(doc).map((grupo) => ({
    ...grupo,
    equipos: (grupo?.equipos ?? []).map((equipo) => {
      if (!sigueAfuera(equipo)) return equipo;
      const cerrado = cerrarMora(equipo, hoyIso);
      if (cerrado !== equipo) hubo = true;
      return cerrado;
    }),
  }));

  return hubo ? grupos : null;
};

// Los mismos grupos de la factura, con un tramo vencido ABIERTO en cada
// equipo que amaneció pasado de plazo. Devuelve `null` cuando no había
// ninguno que abrir.
//
// Lo llama el repaso de la madrugada, y es la única escritura que provoca el
// calendario en toda la app: a partir de ahí el hecho queda anotado —el día
// en que empezó la mora— y los días que van corriendo los cuenta la fecha,
// sin volver a escribir nada hasta que alguien cierre el tramo.
export const abrirTramosFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  let hubo = false;

  const grupos = gruposDe(doc).map((grupo) => ({
    ...grupo,
    equipos: (grupo?.equipos ?? []).map((equipo) => {
      const abierto = abrirTramoVencido(equipo, hoyIso);
      if (abierto !== equipo) hubo = true;
      return abierto;
    }),
  }));

  return hubo ? grupos : null;
};

// ── CORREGIR UN EQUIPO: sus hechos, y cómo se vuelve a armar ───────────
//
// Todo lo anterior ANOTA lo que pasa el día en que pasa. Corregir es otra
// cosa: alguien se equivocó al cargar —registró la devolución el 10/10 y el
// equipo había vuelto el 07/09— y hay que cambiar un dato ya escrito.
//
// El problema son los tramos vencidos: no son un dato suelto, salen de todo
// lo demás. Con la devolución el 10/10 el equipo tiene 33 días de mora; el
// 07/09, ninguno. Cambiar la fecha a mano y dejar el tramo como estaba le
// seguiría cobrando un mes que no existió.
//
// Por eso la corrección no toca los tramos: saca del equipo LO QUE PASÓ —sus
// hechos, con fecha—, deja que se corrija el hecho, y vuelve a pasar la
// historia entera por las mismas funciones que la escribieron la primera
// vez. Los tramos salen solos, y no hay una segunda forma de calcularlos.
//
// Los hechos:
//   sello            alguien cerró la mora sin pedir días (un pago que la salda)
//   indefinida       quedó sin fecha de entrega
//   ampliacion       el cliente pidió días
//   entregaPactada   avisó que ya terminó
//   entregaAnulada   no entregó lo pactado
//   devolucion       llegó a la bodega
//
// El descuento de un tramo vencido viaja con el hecho que lo cerró, que es
// quien lo negoció.

// El último día que se le cobra la mora al que vuelve: el de la devolución,
// o el anterior si volvió antes de las 3 p.m.
const corteDeLaDevolucion = (devolucion) =>
  devolucion?.diaCobrado === false
    ? diaAnterior(devolucion.fechaDevolucion)
    : devolucion?.fechaDevolucion;

// En qué orden pasan dos hechos del mismo día.
const ORDEN_DE_HECHOS = [
  "sello",
  "indefinida",
  "ampliacion",
  "entregaPactada",
  "entregaAnulada",
  "devolucion",
];

const ordenarHechos = (hechos) =>
  [...hechos].sort(
    (a, b) =>
      (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0) ||
      ORDEN_DE_HECHOS.indexOf(a.tipo) - ORDEN_DE_HECHOS.indexOf(b.tipo),
  );

export const hechosDeEquipo = (equipo) => {
  const ampliaciones = ampliacionesDe(equipo);
  const pactada = entregaPactadaDe(equipo);
  const devolucion = equipo?.devolucion ?? null;
  const indefinidaDesde = equipo?.indefinida?.desde ?? null;
  const corteDevolucion = corteDeLaDevolucion(devolucion);

  // Cada tramo cerrado lo cerró alguien: de ahí sale a qué hecho le
  // corresponde su descuento. El que no lo explica ningún otro hecho es un
  // sello.
  const descuentos = { ampliaciones: {}, pactada: 0, devolucion: 0 };
  const sellos = [];
  const cerrados = vencidosDe(equipo).filter((tramo) => tramo?.hasta);

  cerrados.forEach((tramo, posicion) => {
    const descuento = numero(tramo.descuento);
    const esElUltimo = posicion === cerrados.length - 1;

    if (devolucion && esElUltimo && tramo.hasta === corteDevolucion) {
      descuentos.devolucion += descuento;
    } else if (ampliaciones.some(({ fecha }) => fecha === tramo.hasta)) {
      descuentos.ampliaciones[tramo.hasta] =
        numero(descuentos.ampliaciones[tramo.hasta]) + descuento;
    } else if (indefinidaDesde === tramo.hasta) {
      // Lo cerró el quedar sin fecha de entrega, que no trae descuento.
    } else if (pactada?.fecha && diaAnterior(pactada.fecha) === tramo.hasta) {
      descuentos.pactada += descuento;
    } else {
      sellos.push({ tipo: "sello", fecha: tramo.hasta, descuentoVencidos: descuento });
    }
  });

  // Dos ampliaciones el mismo día cierran un solo tramo: su descuento va con
  // la primera.
  const yaRepartido = new Set();
  const hechosDeAmpliaciones = ampliaciones.map((ampliacion) => {
    const primera = !yaRepartido.has(ampliacion.fecha);
    yaRepartido.add(ampliacion.fecha);
    return {
      tipo: "ampliacion",
      fecha: ampliacion.fecha,
      dias: numero(ampliacion.dias),
      descuento: numero(ampliacion.descuento),
      descuentoVencidos: primera
        ? numero(descuentos.ampliaciones[ampliacion.fecha])
        : 0,
    };
  });

  return ordenarHechos([
    ...sellos,
    ...(indefinidaDesde ? [{ tipo: "indefinida", fecha: indefinidaDesde }] : []),
    ...hechosDeAmpliaciones,
    ...(pactada?.fecha
      ? [
          {
            tipo: "entregaPactada",
            fecha: pactada.fecha,
            descuentoVencidos: descuentos.pactada,
          },
        ]
      : []),
    ...(pactada?.anuladaEl
      ? [{ tipo: "entregaAnulada", fecha: pactada.anuladaEl }]
      : []),
    ...(devolucion
      ? [
          {
            tipo: "devolucion",
            fecha: devolucion.fechaDevolucion,
            cobraElDia: devolucion.diaCobrado !== false,
            descuentoVencidos: descuentos.devolucion,
            // Cómo volvió, lo retenido, por qué: lo que no es fecha viaja
            // entero.
            devolucion,
          },
        ]
      : []),
  ]);
};

// Cada hecho, aplicado con la MISMA función que lo anotó el día en que pasó.
const APLICAR_HECHO = {
  sello: (equipo, { fecha, descuentoVencidos }) =>
    descontarVencidosDeHoy(cerrarMora(equipo, fecha), descuentoVencidos, fecha),

  indefinida: (equipo, { fecha }) => dejarSinFechaDeEntrega(equipo, fecha),

  ampliacion: (equipo, { fecha, dias, descuento, descuentoVencidos }) =>
    ampliarEquipo(equipo, { dias, descuento, descuentoVencidos }, fecha),

  entregaPactada: (equipo, { fecha, descuentoVencidos }) =>
    descontarVencidosDeHoy(
      pactarEntrega(equipo, fecha),
      descuentoVencidos,
      diaAnterior(fecha),
    ),

  entregaAnulada: (equipo, { fecha }) => anularEntregaPactada(equipo, fecha),

  devolucion: (equipo, { fecha, cobraElDia, descuentoVencidos, devolucion }) => {
    // El día solo se deja de cobrar si de verdad había mora corriendo: el que
    // vuelve en plazo, o el que estaba por recoger, no tiene día que perdonar.
    const sinCobrarElDia =
      cobraElDia === false &&
      !tieneEntregaPactada(equipo) &&
      cubiertoHasta(equipo) < fecha;
    const corte = sinCobrarElDia ? diaAnterior(fecha) : fecha;

    const nodo = { ...devolucion, fechaDevolucion: fecha };
    delete nodo.diaCobrado;
    if (sinCobrarElDia) nodo.diaCobrado = false;

    return {
      ...descontarVencidosDeHoy(
        cerrarIndefinida(cerrarTramoVencido(equipo, corte), fecha),
        descuentoVencidos,
        corte,
      ),
      devolucion: nodo,
    };
  },
};

// El equipo con su historia vuelta a armar desde los hechos. Lo que el equipo
// ES —nombre, cantidad, precio, días, despacho, IVA— se toma del que llega;
// lo que le PASÓ, de la lista.
//
// Con los hechos tal como salen de `hechosDeEquipo` devuelve el mismo equipo:
// es la prueba de que rearmar no inventa ni pierde nada.
export const rearmarEquipo = (
  equipo,
  hechos = hechosDeEquipo(equipo),
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const base = { ...equipo, ampliaciones: [], vencidos: [] };
  delete base.indefinida;
  delete base.entregaPactada;
  delete base.devolucion;

  const armado = ordenarHechos(hechos).reduce(
    (parcial, hecho) => APLICAR_HECHO[hecho.tipo]?.(parcial, hecho) ?? parcial,
    base,
  );
  // Y lo que haría la madrugada: si sigue afuera y ya se pasó, su mora queda
  // abierta desde ahora.
  return abrirTramoVencido(armado, hoyIso);
};

// ── La cuenta de la factura ────────────────────────────────────────────

// El alquiler de todos los equipos, con su desglose.
export const calcularAlquiler = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc).reduce(
    (acumulado, { equipo }) => {
      const cuenta = calcularEquipo(equipo, hoyIso);
      return {
        bruto: acumulado.bruto + cuenta.bruto,
        descuento: acumulado.descuento + cuenta.descuento,
        neto: acumulado.neto + cuenta.neto,
        netoPactado: acumulado.netoPactado + cuenta.netoPactado,
        netoVencido: acumulado.netoVencido + cuenta.netoVencido,
      };
    },
    { bruto: 0, descuento: 0, neto: 0, netoPactado: 0, netoVencido: 0 },
  );

// ── El IVA: de cada EQUIPO, no de la factura ───────────────────────────
//
// No es el 19% del total. Se grava el alquiler y nada más: el flete y el
// depósito quedan afuera —el depósito porque es una garantía, no una venta—
// y cada equipo decide por su cuenta, con su propia marca `aplicaIva`. Un
// equipo exento puede ir al lado de uno que sí lo lleva en la misma factura.
//
// La marca la escribe SIEMPRE quien crea el equipo, así que acá no hay a quién
// preguntarle si falta: la factura ya no guarda una marca de arriba que sirva
// de respaldo.
export const equipoLlevaIva = (equipo) => Boolean(equipo?.aplicaIva);

// Si la factura lleva IVA es una conclusión de sus equipos, no un dato suyo.
// La usan los dos formularios para dejar marcada la casilla al abrirlos.
export const facturaLlevaIva = (doc) =>
  equiposDe(doc).some(({ equipo }) => equipoLlevaIva(equipo));

// La suma de los IVA de todos los equipos que lo llevan.
export const calcularIvaEquipos = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc).reduce(
    (total, { equipo }) =>
      equipoLlevaIva(equipo)
        ? total + calcularEquipo(equipo, hoyIso).neto * IVA
        : total,
    0,
  );

// El transporte de TODA la factura: el de cada despacho, porque cada uno sale
// con su propio flete.
export const calcularTransporteTotal = (doc) =>
  gruposDe(doc).reduce(
    (total, grupo) => total + numero(adicionalesDe(grupo).valorTransporte),
    0,
  );

// ── El depósito: una garantía, no un ingreso ───────────────────────────
//
// Se le pide al cliente junto con el alquiler, pero NO es parte de la
// factura: es plata suya que la empresa guarda mientras tiene los equipos. Por
// eso lleva su propia cuenta, al lado, y el total de la factura no lo incluye
// nunca —ni al despachar ni al devolver—.
//
// Antes entraba en el total y, al resolverse la devolución, se sacaba. En la
// 8154 la misma factura decía "Total $2.156.400" arriba y "Total factura
// $2.656.400" adentro: el mismo número con y sin depósito, sin decir por qué.
//
// Es de cada DESPACHO: el cliente pidió el benitín y dejó $300.000, y a los
// días pidió gatos y dejó otros $200.000. De ahí sale el tope de lo que se le
// puede retener a un equipo que vuelve mal.
export const calcularDepositoTotal = (doc) =>
  gruposDe(doc).reduce(
    (total, grupo) => total + numero(adicionalesDe(grupo).valorDeposito),
    0,
  );

// Lo retenido, sumando lo que se anotó en cada equipo que volvió mal.
export const calcularRetenido = (doc) =>
  equiposDe(doc).reduce(
    (total, { equipo }) => total + numero(equipo?.devolucion?.valorRetenido),
    0,
  );

// Si todavía falta definir qué pasa con el depósito: algún equipo sigue
// afuera, así que la garantía sigue vigente. Se define con el último equipo
// de vuelta, al registrar la devolución.
export const depositoPendiente = (doc) =>
  calcularDepositoTotal(doc) > 0 && !datosFactura(doc).depositoResuelto;

// Lo que entró por los despachos: el pago del alta y el de cada lote agregado.
// No incluye los abonos, que son plata posterior y se cuentan aparte.
export const sumarPagos = (doc) =>
  gruposDe(doc).reduce((total, grupo) => total + sumar(pagosDe(grupo), "monto"), 0);

// El medio con el que se registra un abono pagado CON EL DEPÓSITO: el cliente
// pide que lo que dejó de garantía se use para pagar la factura. No entra
// plata nueva —se mueve de una cuenta a la otra—, y por eso no está en
// MODOS_PAGO ni se reparte entre facturas: el depósito es de su factura.
export const MEDIO_DEPOSITO = "Depósito";

export const esAbonoConDeposito = (abono) => abono?.medio === MEDIO_DEPOSITO;

// Todos los abonos, los de plata y los pagados con el depósito.
export const sumarAbonos = (doc) => sumar(abonosDe(doc), "monto");

export const sumarAbonosConDeposito = (doc) =>
  sumar(abonosDe(doc).filter(esAbonoConDeposito), "monto");

// Plata que SALIÓ hacia el cliente: el depósito que se le devuelve, o un
// sobrepago que se le reintegra. Es lo contrario de un abono y por eso resta.
export const sumarEntregas = (doc) => sumar(entregasDe(doc), "monto");

// LA CUENTA DEL DEPÓSITO, aparte de la de la factura.
//
// Con la 8154: el depósito pactado es $500.000 y el pago del despacho fue
// $1.514.000. De ese pago, $500.000 son el depósito —recibido— y el resto
// paga la factura. El benitín volvió bien —nada retenido—, así que al
// resolverse la devolución los $500.000 quedan por devolver, hasta que se le
// entregan o el cliente pide usarlos para pagar —aplicado—.
//
// Las reglas, en el orden en que se aplican:
//   - Lo que se paga con cada despacho cubre PRIMERO su depósito: el equipo
//     no sale sin garantía.
//   - Si el despacho no lo cubrió entero, los abonos lo completan mientras
//     haya equipos afuera. Resuelta la devolución ya no hace falta garantía:
//     lo que falte no se cobra, y los abonos van enteros a la factura.
//   - Lo retenido por daños sale del depósito recibido: es un cargo de la
//     factura (ver `danos` en la cuenta) que se paga con la garantía.
//   - Lo que se le entrega al cliente sale primero de lo que queda del
//     depósito, y recién después de un saldo a favor.
export const calcularDeposito = (doc) => {
  const pactado = calcularDepositoTotal(doc);
  const resuelto = Boolean(datosFactura(doc).depositoResuelto);

  const conLosDespachos = gruposDe(doc).reduce(
    (total, grupo) =>
      total +
      Math.min(numero(adicionalesDe(grupo).valorDeposito), sumar(pagosDe(grupo), "monto")),
    0,
  );
  const aplicado = sumarAbonosConDeposito(doc);
  const abonosEnPlata = sumarAbonos(doc) - aplicado;
  const conAbonos = resuelto ? 0 : Math.min(pactado - conLosDespachos, abonosEnPlata);
  const recibido = conLosDespachos + conAbonos;

  const retenido = Math.min(calcularRetenido(doc), recibido);
  const disponible = Math.max(0, recibido - retenido - aplicado);
  const devuelto = Math.min(sumarEntregas(doc), disponible);
  const guardado = disponible - devuelto;

  return {
    pactado,
    // De dónde salió lo recibido: de los pagos de cada despacho o de los
    // abonos que lo completaron. El estado de cuenta los resta de su renglón
    // —"Pago inicial", "Abonos"— para mostrar solo lo que pagó la factura.
    conLosDespachos,
    conAbonos,
    recibido,
    // Lo que el cliente todavía tiene que dejar de garantía.
    porCobrar: resuelto ? 0 : pactado - recibido,
    retenido,
    aplicado,
    devuelto,
    // Lo que la empresa tiene hoy en la mano: con equipos afuera es la
    // garantía; resuelta la devolución, es plata que hay que devolverle.
    guardado,
    porDevolver: resuelto ? guardado : 0,
  };
};

// El medio de una salida que no pasó por caja: la plata que la empresa le
// debía al cliente acá se usó para pagar otra factura suya. Lo llevan las
// dos puntas del cruce, la entrega de esta y el abono de la otra.
export const MEDIO_CRUCE = "Cruce";

// A DÓNDE FUE CADA PESO QUE SALIÓ, partido en lo que salió del depósito y lo
// que salió de un pago de más —con la misma regla de calcularDeposito:
// primero el depósito—. Cada parte dice si se le entregó al cliente o se cruzó,
// y a qué facturas: "Devuelto al cliente" y "Cruzado a factura 2496" son dos
// renglones distintos aunque los dos resten.
//
// Con la 8154: $500.000 de depósito cruzados a la 2496 dan
// deposito: [{ cruzadoA: ["2496"], monto: 500000 }] y deMas: [].
export const repartirEntregas = (doc) => {
  let quedaDelDeposito = calcularDeposito(doc).devuelto;
  const deposito = [];
  const deMas = [];

  // Las de un mismo destino se juntan en un solo renglón: dos entregas en mano
  // son "Devuelto al cliente" una vez, con la suma.
  const anotar = (renglones, entrega, monto) => {
    if (monto <= 0) return;
    const cruzadoA =
      entrega?.medio === MEDIO_CRUCE
        ? (Array.isArray(entrega.haciaFacturas) ? entrega.haciaFacturas : [])
        : null;
    const clave = cruzadoA ? cruzadoA.join(",") : "";
    const existente = renglones.find((renglon) => renglon.clave === clave);
    if (existente) existente.monto += monto;
    else renglones.push({ clave, cruzadoA, monto });
  };

  entregasDe(doc).forEach((entrega) => {
    const monto = numero(entrega?.monto);
    const delDeposito = Math.min(monto, quedaDelDeposito);
    quedaDelDeposito -= delDeposito;
    anotar(deposito, entrega, delDeposito);
    anotar(deMas, entrega, monto - delDeposito);
  });

  return { deposito, deMas };
};

// La cuenta completa, tal como se muestra: el alquiler al día de hoy, los
// fletes, los daños, y lo que el cliente entregó. Si pagó de más, el sobrante
// no baja el saldo —que nunca es negativo— sino que sale aparte como saldo a
// favor.
//
// Los cargos son INDEPENDIENTES y entran al total una sola vez cada uno: el
// subtotal es el alquiler pelado, sin el flete adentro. Antes el flete iba
// dentro del subtotal Y en su propio renglón, así que los números de la
// pantalla no daban el total; y el IVA salía de ese subtotal, con lo que se le
// cobraba IVA al flete.
//
// El depósito va en su propia cuenta (`deposito`), y de él a la factura solo
// pasa lo que se usa para pagarla: lo retenido por daños y lo aplicado.
export const calcularCuentaFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const alquiler = calcularAlquiler(doc, hoyIso);
  const transporte = calcularTransporteTotal(doc);
  const subtotal = alquiler.neto;

  const iva = calcularIvaEquipos(doc, hoyIso);
  // Lo retenido por daños es un cargo de verdad: sube el total, a la vista,
  // en su propio renglón. Se paga con el depósito.
  const danos = calcularRetenido(doc);
  const total = subtotal + iva + transporte + danos;

  const deposito = calcularDeposito(doc);
  const pagado = sumarPagos(doc);
  const abonos = sumarAbonos(doc);
  const entregas = sumarEntregas(doc);

  // Lo que le llegó a la FACTURA: todo lo que el cliente entregó, menos la
  // parte que fue a la garantía, más lo que de la garantía pasó a pagarla, y
  // menos lo que se le devolvió aparte del depósito.
  const recibido =
    pagado +
    abonos -
    deposito.recibido +
    deposito.retenido -
    (entregas - deposito.devuelto);

  const neto = total - recibido;
  const saldoAFavor = Math.max(0, -neto);
  // Si la misma factura todavía debe, el depósito libre primero la paga: no
  // se le devuelve plata a quien la debe ahí mismo. La 2455: $500.000 de
  // depósito libre y $214.000 de saldo → se aplican $214.000 y se le
  // devuelven $286.000. Lo aplica el diálogo de devolver, a la vista.
  const depositoAlSaldo = Math.min(deposito.porDevolver, Math.max(0, neto));

  return {
    alquiler: alquiler.neto,
    descuento: alquiler.descuento,
    netoPactado: alquiler.netoPactado,
    netoVencido: alquiler.netoVencido,
    transporte,
    subtotal,
    iva,
    danos,
    total,
    deposito,
    pagado,
    abonos,
    // Lo mismo, pero solo lo que le llegó a la FACTURA: es lo que muestran
    // las casillas del recuadro negro, para que Total = Pagado + Abonos +
    // Retenido + Saldo. Del pago y de los abonos se saca lo que fue al
    // depósito. Lo retenido por daños NO va en abonos —no lo abonó el
    // cliente, lo pagó su depósito—: tiene su propia casilla.
    // Con la 8154: Pagado $1.014.000 + Abonos $1.142.400 = $2.156.400.
    pagadoFactura: pagado - deposito.conLosDespachos,
    abonosFactura: abonos - deposito.conAbonos,
    retenidoFactura: deposito.retenido,
    entregas,
    recibido,
    // Lo que el cliente debe: lo de la factura y, con equipos afuera, la
    // garantía que todavía no dejó.
    saldoPendiente: Math.max(0, neto) + deposito.porCobrar,
    saldoAFavor,
    depositoAlSaldo,
    // Todo lo que hay que devolverle: lo que pagó de más y el depósito libre,
    // menos la parte del depósito que paga lo que esta factura todavía debe.
    // Es lo que ofrece el botón DEVOLVER.
    aDevolver: saldoAFavor + deposito.porDevolver - depositoAlSaldo,
  };
};

// Lo que se le puede reclamar HOY. Distinto del saldo: los días que el cliente
// todavía tiene por delante —pactados pero no consumidos— se le cobran cuando
// devuelva, no ahora.
//
// Es el número que decide si una prórroga devuelve la factura a "activa".
// Antes salía del total GUARDADO de la factura, que no llevaba ni las
// ampliaciones ni los días vencidos: en una factura real decía $144.440 donde
// el cliente debía $1.727.140, y con pagar esos $144.440 la factura salía de
// cartera debiendo el resto.
export const calcularExigible = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  // El alquiler ya consumido y su IVA se acumulan juntos: el IVA es de cada
  // equipo, con su propia marca, así que hay que saber cuánto puso cada uno
  // antes de sumarlos. Al flete no se le cobra IVA.
  const { consumido, iva } = equiposDe(doc).reduce(
    (acumulado, { equipo }) => {
      const cuenta = calcularEquipo(equipo, hoyIso);

      // Sigue afuera: solo los días que ya transcurrieron.
      const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
      const usados = Math.min(
        cuenta.dias,
        diasDeAlquiler(equipo?.fechaDespacho, hoyIso),
      );
      const monto = cuenta.devuelto
        ? cuenta.neto
        : Math.max(0, usados * porDia - cuenta.descuento);

      return {
        consumido: acumulado.consumido + monto,
        iva: acumulado.iva + (equipoLlevaIva(equipo) ? monto * IVA : 0),
      };
    },
    { consumido: 0, iva: 0 },
  );

  const transporte = calcularTransporteTotal(doc);
  const cuenta = calcularCuentaFactura(doc, hoyIso);

  // La garantía que falta dejar también se reclama: sin ella el equipo no
  // debería estar afuera.
  return Math.max(
    0,
    consumido + iva + transporte + cuenta.danos - cuenta.recibido + cuenta.deposito.porCobrar,
  );
};

// ── ¿A esta factura se le venció la fecha alguna vez? ──────────────────
//
// Una sola pregunta a los datos, sin adivinar nada: si alguno de sus equipos
// tiene un tramo vencido, se venció.
//
// Acá vivían SEIS formas distintas de deducirlo —un equipo vencido hoy, uno
// devuelto después de su fecha, una renovación que se llevó días vencidos
// adentro…— y todas dependían de rastros que se borraban justo al renovar el
// plazo, que es cuando más falta hacían.
//
// El caso que lo destapó, la 0123 de ReYaz: los gatos vencían el 11/09 y ese
// MISMO día se les pactaron 4 más. La renovación quedó con "0 días vencidos"
// —no se pasó ninguno— y ese cero no distingue "le amplié el día que vencía",
// cuando el equipo ya estaba vencido, de "le amplié tres días antes", cuando
// no se venció nunca. La factura salió de cartera debiendo $71.400.
//
// Un tramo, en cambio, no se borra nunca: es el registro de que pasó.
export const facturaSeVencioAlgunaVez = (doc) =>
  equiposDe(doc).some(({ equipo }) => vencidosDe(equipo).length > 0);

// ── El estado de la factura ────────────────────────────────────────────

export const ESTADOS_FACTURA_EN_ORDEN = [
  "pendiente",
  "activa",
  "vencida",
  "cobro",
  "finalizada",
];

export const calcularEstadoFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const equipos = equiposDe(doc);

  // Sin equipos no hay nada que despachar todavía.
  if (equipos.length === 0) return "pendiente";

  const afuera = equipos.filter(({ equipo }) => sigueAfuera(equipo));

  // Ya no queda nada afuera: lo único que falta es la plata. "Finalizada"
  // significa que NO queda ningún asunto abierto, en ninguna de las dos
  // direcciones — ni el cliente debe, ni la empresa le debe a él, ni falta
  // definir el depósito. Mientras quede uno, sigue en "cobro", que es la lista
  // de lo que hay que resolver.
  if (afuera.length === 0) {
    const cuenta = calcularCuentaFactura(doc, hoyIso);
    if (cuenta.saldoPendiente > 0) return "cobro";
    // Pagó de más o hay depósito por devolverle: la empresa le debe plata.
    if (cuenta.aDevolver > 0) return "cobro";
    if (depositoPendiente(doc)) return "cobro";
    return "finalizada";
  }

  const estados = afuera.map(({ equipo }) => calcularEstadoEquipo(equipo, hoyIso));

  // Todavía no salió ninguno.
  if (estados.every((estado) => estado === "pendiente")) return "pendiente";
  if (estados.includes("vencido")) return "vencida";
  // El equipo por recoger también la deja en cartera, aunque ya no corra ni
  // un día: mientras nadie lo reciba hay algo que gestionar, y si la factura
  // saliera de Seguimiento ese equipo quedaba en la obra sin que nadie lo
  // tuviera a la vista.
  if (estados.includes("porRecoger")) return "vencida";

  // Regla de la prórroga: darle más días no alcanza para volver a "activa"
  // mientras quede algo por cobrar de lo ya vivido.
  if (estados.includes("ampliacion") && calcularExigible(doc, hoyIso) > 0) {
    return "vencida";
  }

  // Y a la que se le venció la fecha alguna vez no la devuelve ni ponerse al
  // día: vuelve a "activa" recién cuando se cancela TODO —lo que debía y lo
  // que contrató al renovar—.
  //
  // Antes salía apenas el cliente cubría los días ya consumidos: la factura
  // desaparecía de cartera con el equipo todavía afuera y los días recién
  // pactados sin pagar. El equipo sí sale —renovado deja de estar vencido—,
  // que es lo que hay que dejar de reclamar; la plata no.
  if (
    facturaSeVencioAlgunaVez(doc) &&
    calcularCuentaFactura(doc, hoyIso).saldoPendiente > 0
  ) {
    return "vencida";
  }

  return "activa";
};

// ── Cerrada: el único pedazo del estado que SÍ se guarda ───────────────
//
// Todo lo de arriba se calcula porque cambia SOLO con el calendario. Esto es
// lo contrario: una factura cerrada no tiene nada pendiente por ningún lado
// —devolvió todo, no debe plata y tampoco le sobró—, y eso no cambia sin que
// alguien escriba. De las escrituras el servidor se entera siempre.
//
// Guardarlo es lo que permite PREGUNTARLE a la base "dame solo las facturas
// abiertas" en vez de traerlas todas para averiguar cuáles son.
export const facturaCerrada = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  calcularEstadoFactura(doc, hoyIso) === "finalizada";

// ── Cuántas unidades hay que reclamar ──────────────────────────────────

// Las que están afuera Y vencidas: lo que de verdad hay que reclamarle hoy.
// Deja fuera lo que sigue en plazo — un equipo que vence la semana que viene
// no se cobra hoy, aunque su factura ya esté vencida por otro.
export const contarUnidadesVencidas = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc)
    .filter(({ equipo }) => equipoVencido(equipo, hoyIso))
    .reduce((total, { equipo }) => total + numero(equipo?.cantidadEquipos), 0);

// EL PLAZO DE LA FACTURA, dicho como se dice el de un equipo: hasta cuándo
// era y cuánto se pasó.
//
// Una factura no tiene un vencimiento propio —lo tienen sus equipos— así que
// se toma el del que la trajo a cartera: la fecha MÁS ANTIGUA entre los que
// siguen afuera y ya vencieron, y los días del que más lleva. Con eso la
// tarjeta contesta "hasta cuándo era" sin hacer restar de cabeza.
//
// Sin equipos vencidos devuelve `null`: esa factura sigue en cartera por la
// plata, y ahí no hay plazo que mostrar.
export const plazoVencidoFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const vencidos = equiposDe(doc)
    .map(({ equipo }) => equipo)
    .filter((equipo) => sigueAfuera(equipo) && equipoVencido(equipo, hoyIso));

  if (vencidos.length === 0) return null;

  // MANDA EL QUE MÁS DÍAS LLEVA VENCIDO: es el que define la urgencia de la
  // factura y el primero que se le reclama al cliente.
  //
  // La fecha y los días salen del MISMO equipo. Antes la fecha era la más
  // antigua de todos y los días los del que más llevaba, que podían ser
  // equipos distintos: la fila mostraba una fecha de uno con los días de otro.
  //
  // Y los días son los que corren desde ESA fecha, no todos los que el equipo
  // acumuló (ver vencidoQueCorre).
  const peor = vencidos.reduce((masViejo, equipo) =>
    vencidoQueCorre(equipo, hoyIso).dias > vencidoQueCorre(masViejo, hoyIso).dias
      ? equipo
      : masViejo,
  );

  return {
    fecha: cubiertoHasta(peor),
    dias: vencidoQueCorre(peor, hoyIso).dias,
    // Sin fecha de entrega, el cliente quedó de avisar. La fila lo dice con
    // otra palabra: para este equipo esa fecha no es un vencimiento sino el
    // día en que se pactó que no tendría ninguno.
    indefinida: sinFechaDeEntrega(peor),
  };
};

export const hayEquiposAlDia = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc).some(({ equipo }) => equipoAlDia(equipo, hoyIso));

// Los equipos que pasaron a vencidos con el cambio de día: hoy están vencidos,
// ayer no. Existe para poder avisar por EQUIPO y no por factura — una factura
// figura vencida en cuanto UNO de sus equipos lo está, así que la que ya está
// en seguimiento no volvería a "entrar" nunca más y el segundo equipo vencería
// en silencio.
export const equiposQueVencieronHoy = (doc, hoyIso, ayerIso) =>
  equiposDe(doc)
    .filter(
      ({ equipo }) =>
        sigueAfuera(equipo) &&
        equipoVencido(equipo, hoyIso) &&
        !equipoVencido(equipo, ayerIso),
    )
    .map(({ equipo }) => equipo);

// ── La cuenta del cliente ──────────────────────────────────────────────

// El resumen de TODAS las facturas de un cliente. Acá el saldo es NETO, a
// diferencia de una factura suelta: lo que sobró en una descuenta lo que se
// debe en otra, porque se mira su cuenta como un todo.
//
// El depósito NO entra al neto: es plata del cliente que la empresa guarda,
// no un pago de más. Va aparte, sumando lo guardado en cada factura.
export const calcularCuentaCliente = (facturas, hoyIso = obtenerFechaHoyBogota()) => {
  const resumen = (Array.isArray(facturas) ? facturas : []).reduce(
    (acumulado, doc) => {
      const cuenta = calcularCuentaFactura(doc, hoyIso);
      return {
        total: acumulado.total + cuenta.total,
        pagado: acumulado.pagado + cuenta.pagado,
        abonos: acumulado.abonos + cuenta.abonos,
        pagadoFactura: acumulado.pagadoFactura + cuenta.pagadoFactura,
        abonosFactura: acumulado.abonosFactura + cuenta.abonosFactura,
        retenidoFactura: acumulado.retenidoFactura + cuenta.retenidoFactura,
        recibido: acumulado.recibido + cuenta.recibido,
        depositoPorCobrar: acumulado.depositoPorCobrar + cuenta.deposito.porCobrar,
        depositoGuardado: acumulado.depositoGuardado + cuenta.deposito.guardado,
      };
    },
    {
      total: 0,
      pagado: 0,
      abonos: 0,
      pagadoFactura: 0,
      abonosFactura: 0,
      retenidoFactura: 0,
      recibido: 0,
      depositoPorCobrar: 0,
      depositoGuardado: 0,
    },
  );

  const neto = resumen.total - resumen.recibido;
  return {
    ...resumen,
    saldoPendiente: Math.max(0, neto) + resumen.depositoPorCobrar,
    saldoAFavor: Math.max(0, -neto),
  };
};

// Las facturas de un cliente que todavía tienen saldo, de la MÁS ANTIGUA a la
// más nueva. Es el orden en que se les va aplicando un abono cuando el cliente
// no dice a cuál va.
//
// Antes se ordenaban por saldo, de mayor a menor: primero a la que más debe.
// Con ese criterio una factura chica y vieja podía quedarse abierta
// indefinidamente mientras los abonos se iban a una grande y reciente, y la
// vieja es justamente la que está más cerca de volverse incobrable y la que
// dispara la cobranza. La más antigua primero es además cómo se imputa un pago
// cuando el deudor no elige.
//
// Empate de fechas: por número de factura, que también corre en el tiempo.
export const ordenarFacturasConSaldo = (facturas, hoyIso = obtenerFechaHoyBogota()) =>
  (Array.isArray(facturas) ? facturas : [])
    .map((doc) => ({ factura: doc, cuenta: calcularCuentaFactura(doc, hoyIso) }))
    .filter(({ cuenta }) => cuenta.saldoPendiente > 0)
    .sort((a, b) => {
      const porFecha = (datosFactura(a.factura).fechaCreacion || "").localeCompare(
        datosFactura(b.factura).fechaCreacion || "",
      );
      if (porFecha !== 0) return porFecha;
      return String(datosFactura(a.factura).numeroFactura || "").localeCompare(
        String(datosFactura(b.factura).numeroFactura || ""),
        undefined,
        { numeric: true },
      );
    });

// Reparte un monto entre facturas con saldo ya ordenadas: a cada una lo que le
// falta para saldarse, y si sobra pasa a la siguiente. La última que llega a
// recibir algo se lleva TODO lo que quede, así que un remanente no se pierde:
// queda como saldo a favor.
export const repartirEntreFacturas = (facturasConSaldo, monto) => {
  let restante = monto;
  return facturasConSaldo.map(({ factura, cuenta }, indice) => {
    if (restante <= 0) return { factura, cuenta, aplicado: 0 };
    const esUltima = indice === facturasConSaldo.length - 1;
    const aplicado = esUltima ? restante : Math.min(restante, cuenta.saldoPendiente);
    restante -= aplicado;
    return { factura, cuenta, aplicado };
  });
};

// Separa de un pago lo que excede el total: ese excedente no es pago, es
// abono. Se recorta de los últimos medios cargados.
export const separarExcedentePago = (pagos, total) => {
  const validos = (Array.isArray(pagos) ? pagos : [])
    .filter((pago) => pago?.medio && numero(pago.monto) > 0)
    .map((pago) => ({ medio: pago.medio, monto: numero(pago.monto) }));

  const suma = validos.reduce((acumulado, pago) => acumulado + pago.monto, 0);
  const excedente = Math.max(0, Math.round(suma - total));
  if (excedente === 0 || validos.length === 0) {
    return { pagos: validos, excedente: 0, medio: null };
  }

  const medio = validos[validos.length - 1].medio;
  let porDescontar = excedente;
  const recortados = [...validos].reverse().map((pago) => {
    if (porDescontar <= 0) return pago;
    const quita = Math.min(porDescontar, pago.monto);
    porDescontar -= quita;
    return { ...pago, monto: pago.monto - quita };
  });

  return { pagos: recortados.reverse().filter((pago) => pago.monto > 0), excedente, medio };
};

// ── El estado del cliente ──────────────────────────────────────────────
//
// Es un resumen de sus facturas, no un dato propio: gana la que exige atención
// más pronto. A diferencia del estado de la factura, este SÍ se guarda: la
// lista de clientes lee solo la colección `clientes`, y traer las facturas de
// todos para calcularlo al vuelo sería lento y caro. Lo mantiene el servidor.
const PRIORIDAD_ESTADO_CLIENTE = [
  "vencida", // se pasó la fecha y tiene equipos afuera: hay que llamar ya
  "cobro", // devolvió todo pero debe plata: hay que insistir
  "pendiente", // falta despachar: acción nuestra
  "activa", // equipos en la calle, corriendo días
  "finalizada", // solo si TODAS lo están
];

export const calcularEstadoCliente = (facturas, hoyIso = obtenerFechaHoyBogota()) => {
  const lista = Array.isArray(facturas) ? facturas : [];
  if (lista.length === 0) return "inactivo";

  const estados = lista.map((doc) => calcularEstadoFactura(doc, hoyIso));
  return PRIORIDAD_ESTADO_CLIENTE.find((estado) => estados.includes(estado)) ?? "inactivo";
};

// ── Los totales del panel del menú ─────────────────────────────────────
//
// Los dos números de "Equipos activos" y "Pagos pendientes". Los mantiene una
// Cloud Function en un solo documento y el menú lo lee de una. Viven acá para
// que el servidor use EXACTAMENTE esta lógica y no una versión suya.
export const ESTADOS_EQUIPOS_ACTIVOS = ["activa", "vencida"];

export const calcularAporteFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  if (!doc) return { equiposActivos: 0, pagosPendientes: 0 };

  const estado = calcularEstadoFactura(doc, hoyIso);
  const equiposActivos = ESTADOS_EQUIPOS_ACTIVOS.includes(estado)
    ? equiposDe(doc)
        .filter(({ equipo }) => sigueAfuera(equipo))
        .reduce((total, { equipo }) => total + numero(equipo?.cantidadEquipos), 0)
    : 0;

  return {
    equiposActivos,
    pagosPendientes: calcularCuentaFactura(doc, hoyIso).saldoPendiente,
  };
};

export const calcularTotalesFacturas = (facturas, hoyIso = obtenerFechaHoyBogota()) =>
  (Array.isArray(facturas) ? facturas : []).reduce(
    (acumulado, doc) => {
      const aporte = calcularAporteFactura(doc, hoyIso);
      return {
        equiposActivos: acumulado.equiposActivos + aporte.equiposActivos,
        pagosPendientes: acumulado.pagosPendientes + aporte.pagosPendientes,
      };
    },
    { equiposActivos: 0, pagosPendientes: 0 },
  );

// ── La gestión: qué se hizo para destrabar la factura ──────────────────
//
// El estado dice en qué punto está la factura; la gestión dice qué se hizo
// para moverla. Se ve SOLO en Seguimiento de cobro, y solo entran ahí las
// facturas vencidas o en cobro.
export const TIPOS_GESTION = [
  "sinGestionar",
  "sinRespuesta",
  "prorroga",
  "devolucionParcial",
  "devolucionTotal",
  "entregaPactada",
  "cobro",
];

export const obtenerGestiones = (doc) => gestionesDe(doc);

// Solo lo hecho con la factura ya vencida cuenta como cobranza. Lo anotado
// antes es historia, no gestión.
export const gestionesDeSeguimiento = (doc) =>
  obtenerGestiones(doc).filter((registro) => registro?.enSeguimiento !== false);

export const obtenerHoraBogotaHHMM = () =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const crearRegistroGestion = (tipo, datos = {}) => ({
  tipo,
  fecha: obtenerFechaHoyBogota(),
  hora: obtenerHoraBogotaHHMM(),
  ...datos,
});

export const contarLlamadasSinRespuesta = (doc) =>
  obtenerGestiones(doc).filter(
    (registro) => registro.tipo === "llamada" && !registro.contesto,
  ).length;

// Desde cuándo corre el vencimiento que se está cobrando HOY: el día en que se
// abrió el tramo vencido más antiguo de los que siguen corriendo.
//
// Con varios equipos manda el más viejo: si uno lleva diez días vencido y otro
// se venció esta madrugada, lo que se hizo por el primero sigue siendo la
// gestión de este cobro. Null cuando no hay ningún equipo vencido —la factura
// que está en cartera solo por la plata—: ahí no hay ciclo que reiniciar.
export const inicioVencimientoVigente = (doc) => {
  const inicios = equiposDe(doc)
    .map(({ equipo }) => tramoVencidoAbierto(equipo)?.desde)
    .filter(Boolean)
    .sort();
  return inicios[0] ?? null;
};

// La gestión vigente: la última acción registrada, salvo que la factura ya
// esté en cobro —devolvió todo y debe plata—, que manda sobre cualquier otra
// cosa porque es lo único que queda por resolver.
//
// "Última" es dentro del vencimiento que corre, no de toda la vida de la
// factura: lo anotado antes resolvió un vencimiento ANTERIOR y ya cumplió.
//
// El caso que lo pidió, la 8215 de ReYaz: el 14/09 el cliente pidió un día
// más, el 15 se cumplió y el equipo volvió a vencerse, y el chip seguía
// diciendo "Renovación" —una renovación terminada— en vez de avisar que a ese
// cliente hay que volver a llamarlo. Lo mismo valía para un "Sin respuesta"
// de hace dos semanas, que además mentía: esa llamada terminó contestada, y
// por eso hubo renovación.
//
// Nada se borra ni se marca: la bitácora se guarda entera y se sigue viendo
// completa en la tarjeta. Esto es solo cómo se LEE para decidir el chip.
export const calcularGestionFactura = (doc, estado) => {
  if (estado === "cobro") return "cobro";

  const desde = inicioVencimientoVigente(doc);
  const gestiones = gestionesDeSeguimiento(doc).filter(
    // Sin fecha no se puede ubicar en el tiempo, así que no manda sobre el
    // cobro de hoy. (Todo lo que anota la app lleva su fecha del día.)
    (registro) => !desde || (registro?.fecha ?? "") >= desde,
  );
  for (let i = gestiones.length - 1; i >= 0; i -= 1) {
    const registro = gestiones[i];
    if (registro.tipo === "llamada") {
      // Una llamada atendida no es una gestión en sí: lo que importa es lo que
      // se acordó en ella, que se anota aparte. Se sigue buscando hacia atrás.
      if (!registro.contesto) return "sinRespuesta";
      continue;
    }
    // Se anuló la entrega pactada: el cliente no cumplió y hay que volver a
    // llamarlo. Lo anotado antes ya no dice cómo está la factura.
    if (registro.tipo === "entregaAnulada") return "sinGestionar";
    if (TIPOS_GESTION.includes(registro.tipo)) return registro.tipo;
  }
  return "sinGestionar";
};

// Las facturas que se trabajan en Seguimiento de cobro: las que tienen equipos
// vencidos afuera y las que ya devolvieron todo pero deben plata.
export const estadoEnSeguimiento = (estado) => ["vencida", "cobro"].includes(estado);

export const facturaEnSeguimiento = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  estadoEnSeguimiento(calcularEstadoFactura(doc, hoyIso));

// ── Qué tiene una factura encima ───────────────────────────────────────
//
// Mientras solo tiene lo del alta, borrarla y volver a cargarla no pierde
// nada. Lo que pesa es lo que pasó DESPUÉS —un abono, un despacho agregado,
// una ampliación, una devolución, un depósito ya resuelto—: es historia que
// se iría con ella. De acá sale si se puede borrar de un clic y qué se le
// avisa al administrador antes de hacerlo.
export const movimientosFactura = (doc) => {
  const grupos = gruposDe(doc);
  const cantidadAbonos = abonosDe(doc).length;
  const cantidadAgregados = grupos.filter((grupo) => grupo?.grupo !== "grupo-inicial").length;
  const equiposConHistoria = equiposDe(doc)
    // La entrega pactada también es historia: alguien acordó algo con el
    // cliente.
    .filter(
      ({ equipo }) =>
        ampliacionesDe(equipo).length > 0 ||
        !sigueAfuera(equipo) ||
        tieneEntregaPactada(equipo),
    )
    .map(({ equipo }) => equipo);
  const depositoResuelto = Boolean(datosFactura(doc).depositoResuelto);

  return {
    cantidadAbonos,
    cantidadAgregados,
    equiposConHistoria,
    depositoResuelto,
    hayAlgo:
      cantidadAbonos > 0 ||
      cantidadAgregados > 0 ||
      equiposConHistoria.length > 0 ||
      depositoResuelto,
  };
};

// Lo mismo, en palabras, para el aviso de antes de borrar una factura. Vacío
// si no hay nada que avisar.
export const describirMovimientosFactura = (doc) => {
  const { cantidadAbonos, cantidadAgregados, equiposConHistoria, depositoResuelto } =
    movimientosFactura(doc);

  const partes = [];
  const plural = (n, singular, prefijo = "") =>
    `${n} ${prefijo}${singular}${n === 1 ? "" : "s"}`;

  if (cantidadAbonos > 0) partes.push(plural(cantidadAbonos, "abono"));
  if (cantidadAgregados > 0) partes.push(plural(cantidadAgregados, "despacho agregado"));
  if (equiposConHistoria.length > 0) {
    // "y sus registros de": lo que se borra no es el equipo a secas, son las
    // ampliaciones y devoluciones que se le anotaron encima.
    partes.push(
      `${equiposConHistoria.length} equipo${equiposConHistoria.length === 1 ? "" : "s"} y sus registros de ampliación, entrega pactada o devolución`,
    );
  }
  if (depositoResuelto) partes.push("el depósito ya resuelto");

  return partes;
};

// Etiqueta ordinal para cada fecha del historial de un equipo.
export const etiquetaVencimiento = (indice) => {
  const ordinales = ["1er", "2do", "3er", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo"];
  return `${ordinales[indice] || `${indice + 1}º`} vencimiento`;
};
