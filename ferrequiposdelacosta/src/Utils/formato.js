// Cómo se MUESTRAN los datos. Nada de esto se guarda: los importes viven como
// números y las fechas como AAAA-MM-DD, y se les da formato recién al pintarlos
// en pantalla o en el PDF.
//
// Guardar el texto ya formateado —como hacía Cuenta de Cobro— mezcla el dato
// con su presentación: cualquier cálculo posterior tiene que volver a
// interpretar la cadena, quitándole el signo, los puntos y el espacio.

// Un importe en pesos colombianos: "$ 1.234.567". Sin decimales, que es lo que
// devuelve Intl para el peso.
//
// Lo que no es un número se muestra como "$ 0": sirve para totales y subtotales,
// que siempre tienen un valor aunque sea cero.
export const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
  });

// La misma cifra, pero devuelve NADA cuando el valor no es un número.
//
// La diferencia con la de arriba no es un descuido: sirve para datos que pueden
// no existir —una factura sin depósito, sin transporte— donde mostrar "$ 0"
// haría creer que se cobró cero, en vez de que no se cobró. Quien la usa deja
// el renglón vacío.
// Se usa en: ClienteDetalle y ClienteSeguimientoCard.
export const formatearMonedaOVacio = (valor) =>
  typeof valor === "number"
    ? valor.toLocaleString("es-CO", { style: "currency", currency: "COP" })
    : null;

// Los dos lados de un campo donde se escribe plata: cómo se ve mientras lo
// escribís y qué se guarda.
//
// El campo tiene que ser type="text", no "number": un input numérico no acepta
// los puntos de miles.
export const formatearMonedaInput = (valor) =>
  valor ? Number(valor).toLocaleString("es-CO") : "";

export const limpiarMonedaInput = (texto) => String(texto).replace(/\D/g, "");

// El NIT como se lee: "900.427.333-6". Se guarda sin puntos —solo dígitos y el
// guion del dígito de verificación— y se le da formato al mostrarlo.
export const formatearNit = (nit) => {
  const soloDigitos = String(nit || "")
    .replace(/[^\d-]/g, "")
    .substring(0, 11);
  return soloDigitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Lo que hay que guardar cuando alguien escribe un NIT: el dato pelado, sin los
// puntos de presentación.
export const limpiarNit = (texto) =>
  String(texto || "")
    .replace(/[^\d-]/g, "")
    .substring(0, 11);

// De la fecha que guarda la app (AAAA-MM-DD, la que devuelve un input date) a
// la que se lee en Colombia: DD/MM/AAAA.
export const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

// De la hora que guarda la app (HH:MM en 24 horas) a la que se lee en
// Colombia: "9:14 a. m.", "2:30 p. m.".
//
// Se guarda en 24 horas a propósito —así se ordena y se compara sola, sin
// interpretar el "a. m."— y se le da formato recién al mostrarla, igual que
// con las fechas y los importes.
//
// Los puntos y el espacio de "a. m." son los de la norma en español; no es un
// AM/PM en inglés.
// Se usa en: RegistrarLlamadaDialog y ClienteSeguimientoCard.
export const formatearHoraLegible = (horaHHMM) => {
  if (!horaHHMM) return "";
  const [horas, minutos] = String(horaHHMM).split(":").map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return horaHHMM;

  // Las 0 y las 12 son el caso raro: 00:30 son las 12:30 a. m. y 12:30 son
  // las 12:30 p. m.
  const hora12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${hora12}:${String(minutos).padStart(2, "0")} ${horas < 12 ? "a. m." : "p. m."}`;
};
