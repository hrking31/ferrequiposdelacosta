/* eslint-env serviceworker */
// El ayudante que recibe los avisos cuando la app está CERRADA.
//
// Un service worker es un pedazo de la app que el navegador deja corriendo
// aparte, sin ninguna pestaña abierta. Es el único que puede recibir un aviso
// del servidor y mostrarlo en la pantalla del teléfono.
//
// POR QUÉ ESTE ARCHIVO NO USA EL SDK DE FIREBASE
//
// Lo normal sería cargar acá el SDK de mensajería desde internet y dejar que él
// muestre el aviso. No se hace por dos razones:
//
//   1. Habría que escribir la configuración del proyecto adentro de este
//      archivo, que sí va al repositorio (firebaseConfig.js no va).
//   2. El aviso lo dibujaría la librería, y no podríamos decidir el ícono, el
//      texto ni a dónde lleva al tocarlo.
//
// Un aviso push es un estándar del navegador: alcanza con escuchar el evento.
// El servidor manda solo datos (ver enviarAvisoCotizacion en functions), y acá
// se arma la notificación.
//
// OJO: este archivo es aparte del service worker de la PWA (el que guarda la
// app para usarla sin internet). Son dos, cada uno con su trabajo, y no se
// pisan porque este se registra en su propio rincón.

self.addEventListener("push", (event) => {
  const recibido = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      // Un aviso con datos ilegibles no puede dejar al usuario sin nada: se
      // muestra el genérico.
      return {};
    }
  })();

  // Firebase envía los datos dentro de "data"; se acepta también plano por si
  // algún día se manda desde otro lado.
  const datos = recibido.data || recibido;

  const titulo = datos.titulo || "Ferrequipos de la Costa";
  const opciones = {
    body: datos.cuerpo || "",
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-48x48.png",
    // Los avisos del mismo tipo se reemplazan entre sí en vez de apilarse: con
    // cinco solicitudes seguidas, el personal ve una que dice cinco, no cinco
    // avisos. `renotify` hace que igual suene cada vez.
    tag: datos.tipo || "aviso",
    renotify: true,
    data: { url: datos.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";

  // Al tocar el aviso hay que llevar a la persona a la pantalla que
  // corresponde. Si la app ya está abierta en alguna ventana, se usa esa —abrir
  // otra dejaría dos—; si no, se abre una.
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const abierta = ventanas.find((ventana) => ventana.url.includes(self.location.origin));

      if (abierta) {
        await abierta.focus();
        if ("navigate" in abierta) await abierta.navigate(destino);
        return;
      }

      await self.clients.openWindow(destino);
    })(),
  );
});
