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

// El WhatsApp de la empresa, al que escriben los clientes. Vive acá porque lo
// usan cuatro pantallas —el botón flotante, el de "Cotiza con nosotros", el
// panel lateral y el carrito— y tenerlo escrito cuatro veces es la forma
// segura de que un día cambie en tres.
export const TELEFONO_EMPRESA = "573116576633";

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
 * Si hay que caer a la página web, o si ya abrió una app y no hay nada que
 * hacer. Va aparte porque es la decisión que se equivocó una vez y la única
 * parte de todo esto que se puede probar sin un navegador de verdad.
 *
 * Las tres señales dicen lo mismo desde ángulos distintos, y hacen falta las
 * tres:
 *
 *   - `perdioElFoco`: la ventana avisó ella misma que algo se abrió encima.
 *     Es la buena en el COMPUTADOR, donde WhatsApp Desktop no oculta nada.
 *   - `estaOculta`: la pestaña quedó tapada. Es la buena en el CELULAR.
 *   - `tieneElFoco`: por si el aviso llegó antes de empezar a escuchar.
 *
 * Mirar solo si estaba oculta fue el error: en el computador la pestaña sigue
 * visible detrás de WhatsApp Desktop, así que se abría también la web.
 */
export const debeAbrirLaWeb = ({ perdioElFoco, estaOculta, tieneElFoco }) =>
  !perdioElFoco && !estaOculta && tieneElFoco;

/**
 * Abre el chat. Intenta la app instalada y, si a segundo y medio nada indica
 * que se haya abierto —porque no está instalada—, recién ahí cae a la web.
 *
 * Devuelve el identificador del temporizador por si quien lo llama necesita
 * cancelarlo (por ejemplo, al desmontar la pantalla).
 */
export const abrirWhatsapp = (telefono, mensaje) => {
  const { app, web } = construirEnlacesWhatsapp(telefono, mensaje);

  let perdioElFoco = false;
  const anotarQueAbrio = () => {
    perdioElFoco = true;
  };

  window.addEventListener("blur", anotarQueAbrio, { once: true });
  document.addEventListener("visibilitychange", anotarQueAbrio, { once: true });

  window.location.href = app;

  return window.setTimeout(() => {
    window.removeEventListener("blur", anotarQueAbrio);
    document.removeEventListener("visibilitychange", anotarQueAbrio);

    const caer = debeAbrirLaWeb({
      perdioElFoco,
      estaOculta: document.hidden,
      tieneElFoco: document.hasFocus(),
    });
    if (!caer) return;

    // Sin app: se va a la web. Se intenta en una pestaña aparte para no sacar
    // al usuario de lo que estaba haciendo; si el navegador la bloquea, se
    // navega en la misma.
    const otraPestana = window.open(web, "_blank", "noopener,noreferrer");
    if (!otraPestana) window.location.href = web;
  }, ESPERA_APP_WHATSAPP_MS);
};
