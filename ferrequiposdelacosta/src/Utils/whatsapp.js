// Cómo se abre WhatsApp desde la app. Lo comparten el carrito de la tienda
// —donde el cliente manda su pedido— y la cotización —donde el personal le
// envía el PDF—, que son dos pantallas distintas con el mismo problema.
//
// EL PROBLEMA: `wa.me` es una PÁGINA WEB, no la aplicación. El navegador la
// abre como una página más y desde ahí solo OFRECE pasar a WhatsApp, así que
// en el celular se terminaba escribiendo en WhatsApp Web y en el computador en
// el navegador, aun con WhatsApp Desktop instalado.
//
// LA SALIDA: el esquema `whatsapp://`, que entra directo a la app instalada.
// Como no es una navegación a otra página, la pestaña que lo abre QUEDA VIVA
// —terminando de guardar la solicitud o de generar el PDF— mientras el usuario
// ya está escribiendo.
//
// LA OTRA MITAD, igual de importante: hay que llamarlo DENTRO del mismo toque
// del usuario. Si se espera a que el servidor responda —uno o dos segundos— el
// navegador deja de reconocerlo como algo pedido por una persona, lo trata
// como ventana emergente (pide permiso) y lo manda a una pestaña nueva… que es
// justo donde `wa.me` se rinde. Por eso quien use esto abre WhatsApp PRIMERO y
// guarda después.

// Cuánto se le da a la app instalada para tomar el enlace antes de caer a la
// página web. Si abrió, el navegador quedó en segundo plano y el respaldo se
// cancela solo.
export const ESPERA_APP_WHATSAPP_MS = 1500;

/**
 * Deja el teléfono como lo quiere WhatsApp: solo dígitos y con el indicativo
 * de Colombia adelante. Acepta lo que haya escrito el usuario ("311 657 6633",
 * "+57 311...").
 */
export const normalizarTelefono = (telefono) => {
  const digitos = String(telefono ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  return digitos.startsWith("57") ? digitos : `57${digitos}`;
};

/**
 * Los dos enlaces de un mismo mensaje: el de la app y el de la página, que
 * queda como respaldo para quien no tenga WhatsApp instalado.
 */
export const construirEnlacesWhatsapp = (telefono, mensaje) => {
  const numero = normalizarTelefono(telefono);
  const texto = encodeURIComponent(String(mensaje ?? ""));

  return {
    app: `whatsapp://send?phone=${numero}&text=${texto}`,
    web: `https://wa.me/${numero}?text=${texto}`,
  };
};

/**
 * Abre el chat. Intenta la app instalada y, si a segundo y medio la página
 * sigue a la vista —señal de que no abrió nada porque no está instalada—,
 * recién ahí cae a la página web.
 *
 * Devuelve el identificador del temporizador por si quien lo llama necesita
 * cancelarlo (por ejemplo, al desmontar la pantalla).
 */
export const abrirWhatsapp = (telefono, mensaje) => {
  const { app, web } = construirEnlacesWhatsapp(telefono, mensaje);

  window.location.href = app;

  return window.setTimeout(() => {
    if (document.hidden) return;

    // Sin app: se va a la web. Se intenta en una pestaña aparte para no sacar
    // al usuario de lo que estaba haciendo; si el navegador la bloquea, se
    // navega en la misma.
    const otraPestana = window.open(web, "_blank", "noopener,noreferrer");
    if (!otraPestana) window.location.href = web;
  }, ESPERA_APP_WHATSAPP_MS);
};
