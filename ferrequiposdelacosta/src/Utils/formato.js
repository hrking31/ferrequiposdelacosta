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
