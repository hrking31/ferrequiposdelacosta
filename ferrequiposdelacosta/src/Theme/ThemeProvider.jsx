import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  responsiveFontSizes,
} from "@mui/material";
import { alpha, darken, lighten } from "@mui/material/styles";
// La misma escala de grises que MUI usa para palette.grey. Se importa para
// poder armar tokens con ella acá arriba, donde la paleta todavía se está
// definiendo y theme.palette.grey no existe.
import { grey } from "@mui/material/colors";
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { ColorModeContext } from "./useColorMode";

// Función para obtener el modo inicial de forma segura
const getInitialMode = () => {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);
  const location = useLocation();

  useEffect(() => {
    const isKioskRoute = location.pathname.toLowerCase().includes("kiosk");

    if (isKioskRoute) {
      setMode("dark"); // Oscuro si esta en el visor
    } else {
      // Restaurar el modo guardado si sale del kiosco; si nunca guardó
      // ninguno, usar la misma preferencia del sistema que en la carga
      // inicial.
      setMode(getInitialMode());
    }
  }, [location.pathname]); // Se dispara cada vez que cambias de página

  useEffect(() => {
    // Solo guarda en localStorage si NO esta en modo kiosco
    const isKioskRoute = location.pathname.toLowerCase().includes("kiosk");
    if (!isKioskRoute) {
      localStorage.setItem("theme", mode);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const stored = localStorage.getItem("theme");
      if (!stored && !isKioskRoute) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode, location.pathname]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [],
  );

  const theme = useMemo(() => {
    // ── Colores de marca ───────────────────────────────────────────────
    // Estos son los ÚNICOS códigos de color literales de la app. La paleta
    // de abajo los combina según el modo, y la tipografía y los estilos de
    // componentes leen SIEMPRE de la paleta — nunca de un hex suelto.
    // Para recolorear la app, cambiar acá.
    const AZUL_ACERO = "#1E293B";
    const AZUL_ACERO_CLARO = "#334155";
    const AZUL_NOCHE = "#0F172A";
    const AMARILLO = "#FFB800";
    // El amarillo de los importes. Es aparte del amarillo de marca —que tira a
    // dorado y vive en los acentos y el navbar— porque acá se necesita un
    // amarillo limpio, que se lea como cifra y no como adorno.
    const AMARILLO_VALOR = "#FFD740";
    const AMBAR_PREVENCION = "#F59E0B";
    const NARANJA = "#EA580C";
    // El acento del modo claro: el azul EXACTO del logo, muestreado del PNG
    // del isotipo. Tiene que ser este hex, no un azul parecido.
    //
    //   - como texto sobre una tarjeta ........... 9.75:1  (mínimo 4.5)
    //   - como texto sobre el fondo de página .... 9.31:1
    //   - con letra BLANCA encima ................ 10.2:1
    //
    // Sirve SOLO de día: sobre el azul noche se queda en 1.75:1, así que de
    // noche el acento es el amarillo.
    const AZUL_LOGO = "#283890";
    const VERDE = "#16A34A";
    const VERDE_OSCURO = "#15803D";
    const ROJO = "#DC2626";
    const ROJO_OSCURO = "#B91C1C";

    // ── Colores de ACCIÓN ──────────────────────────────────────────────
    // El color dice qué va a pasar al tocar el botón:
    //
    //   AZUL     navegación y acciones principales
    //   ACENTO   agregar, seleccionar
    //   VERDE    confirmar, crear, cobrar
    //   ROJO     eliminar, cancelar, deuda
    //   NEUTRO   secundarias (el botón de contorno)
    //
    // Cada uno tiene dos versiones: la de día y una más luminosa para la
    // noche, porque sobre el fondo azul noche los tonos oscuros desaparecen.
    // De noche todos los rellenos llevan letra OSCURA; de día, blanca —salvo
    // el verde, que con blanca se queda en 3.3:1 y necesita letra oscura.
    const AZUL_ACCION = "#2563EB";
    const AZUL_ACCION_NOCHE = "#3B82F6";
    const VERDE_NOCHE = "#22C55E";
    const ROJO_NOCHE = "#EF4444";
    // El borde de la acción neutra en modo claro (el botón de contorno).
    const BORDE_NEUTRO = "#CBD5E1";

    // El rojo del logo, muestreado del PNG igual que el azul. Marca el campo
    // que tiene el foco, y es el único lugar de la app donde se usa.
    //
    // De noche va una versión aclarada: el rojo del isotipo sobre el azul
    // noche se queda en 2.43:1 y un borde necesita 3:1. El aclarado da 4.03:1
    // sobre la tarjeta oscura, y el exacto da 5.75:1 sobre la clara.
    const ROJO_LOGO = "#C02030";
    const ROJO_LOGO_NOCHE = "#D3636E";
    const AZUL_LLAMADA = "#0284C7";
    const AZUL_LLAMADA_OSCURO = "#0369A1";
    // El verde oficial de WhatsApp. Es marca ajena: no se toca ni se adapta al
    // modo. Estaba escrito directo en la paleta; acá arriba queda junto al
    // resto de los colores literales, que es donde va por convención.
    const VERDE_WHATSAPP = "#25D366";
    const VERDE_WHATSAPP_OSCURO = "#128C7E";
    const BLANCO = "#FFFFFF";
    // Negro puro. Solo se usa translúcido, para oscurecer una foto por debajo
    // de un ícono; nunca como color de relleno ni de letra.
    const NEGRO = "#000000";
    const NIEVE = "#F8FAFC";
    const CONCRETO = "#F1F5F9";
    const GRIS_TEXTO = "#475569";
    const GRIS_SUAVE = "#94A3B8";
    const GRIS_CAPTION = "#64748B";
    // Un gris claro, el escalón que sigue después de CONCRETO. Se llamaba
    // BORDE_CLARO, pero de bordes ya no se ocupa —de eso se encarga
    // BORDE_INPUT— así que el nombre mentía.
    const CEMENTO = "#E2E8F0";
    const BORDE_INPUT = "#CBD5E1";

    const esClaro = mode === "light";

    // la paleta. Es la única fuente de verdad de color.
    const base = createTheme({
      palette: {
        mode,
        // AZUL: navegación y acciones principales. Con letra blanca da 5.17:1
        // de día; de noche el azul es más claro y pide letra oscura (4.85:1).
        primary: {
          main: esClaro ? AZUL_ACCION : AZUL_ACCION_NOCHE,
          light: esClaro ? AZUL_ACCION_NOCHE : lighten(AZUL_ACCION_NOCHE, 0.25),
          dark: esClaro ? darken(AZUL_ACCION, 0.15) : AZUL_ACCION,
          contrastText: esClaro ? BLANCO : AZUL_NOCHE,
        },
        // "secondary" no es un rol de esta app: nadie lo usa. Está definido
        // como red de seguridad, apuntando al acento.
        //
        // Borrarlo no lo elimina: MUI completa con un tema de fábrica todo lo
        // que el proyecto no define, y su "secondary" de fábrica es PÚRPURA
        // (#9C27B0 de día, #CE93D8 de noche). Un color="secondary" escrito por
        // descuido no daría error ni fallaría el build — saldría un botón
        // púrpura. Apuntándolo acá, ese descuido sale de un color de la marca.
        //
        // En código nuevo va color="accent", que dice lo que es.
        secondary: {
          main: esClaro ? AZUL_LOGO : AMARILLO,
          contrastText: esClaro ? BLANCO : AZUL_NOCHE,
        },
        // Semánticos. Sobre el azul oscuro del modo nocturno, el tono de marca
        // de success/error/info NO llega al mínimo WCAG AA (4.5:1) cuando se
        // usa como TEXTO. Por eso ".light" lo aclara partiendo del propio hex
        // de marca.
        //   Regla de uso: ".main" para fondos rellenos (con contrastText),
        //   ".light" para texto o íconos sueltos en modo oscuro.
        // El acento como color de MUI, para poder escribir color="accent" en
        // un botón igual que se escribe color="error".
        //
        // Mismo valor que custom.accent. Existe en los dos lugares porque MUI
        // solo reconoce como color de componente lo que está en la raíz de la
        // paleta: si se cambia uno, cambiar el otro.
        //
        // Se usa en: los botones de agregar y seleccionar (Crear y Editar
        // Equipo, los diálogos de Agregar equipo y Crear Factura, y el kiosco).
        accent: {
          main: esClaro ? AZUL_LOGO : AMARILLO,
          contrastText: esClaro ? BLANCO : AZUL_NOCHE,
        },
        // VERDE: confirmar, crear, cobrar.
        success: {
          main: esClaro ? VERDE : VERDE_NOCHE,
          light: lighten(VERDE, 0.35), // 6.4:1 sobre AZUL_ACERO
          dark: VERDE_OSCURO,
          // Letra OSCURA en los dos modos: sobre el verde de día da 5.4:1 y la
          // blanca solo 3.3:1; sobre el verde de noche, 7.83:1.
          contrastText: AZUL_NOCHE,
        },
        warning: {
          main: AMBAR_PREVENCION, // Amarillo prevención — ya da 6.8:1
          contrastText: AZUL_NOCHE,
        },
        // ROJO: eliminar, cancelar, deuda.
        error: {
          main: esClaro ? ROJO : ROJO_NOCHE,
          light: lighten(ROJO, 0.35), // 4.9:1 sobre AZUL_ACERO
          dark: ROJO_OSCURO,
          // De día, letra blanca (4.83:1). De noche el rojo es más claro y
          // pide letra oscura.
          contrastText: esClaro ? BLANCO : AZUL_NOCHE,
        },
        info: {
          main: AZUL_LLAMADA,
          light: lighten(AZUL_LLAMADA, 0.35), // 6.0:1 sobre AZUL_ACERO
          dark: AZUL_LLAMADA_OSCURO,
          contrastText: BLANCO,
        },

        // Tres niveles de superficie, en espejo con el oscuro. En claro la
        // elevación SUBE hacia el blanco; en oscuro sube hacia el gris azulado.
        // Que la tarjeta no sea blanca es a propósito: las fotos de los equipos
        // son blancas fijas, así que quedan por encima y se despegan solas.
        // Ninguno de los tres es blanco puro en modo claro, por lo del párrafo
        // de arriba: la tarjeta tiene que quedar un punto más oscura que la
        // foto que lleva encima.
        background: {
          default: esClaro ? CONCRETO : AZUL_NOCHE,
          paper: esClaro ? NIEVE : AZUL_ACERO,
          elevated: esClaro ? BLANCO : AZUL_ACERO_CLARO,
        },
        text: {
          primary: esClaro ? AZUL_ACERO : "rgba(255, 255, 255, 0.87)",
          secondary: esClaro ? GRIS_CAPTION : GRIS_SUAVE,
          // Escala de énfasis de Material: 87% principal, 60% secundario,
          // 38% deshabilitado. El texto deshabilitado está exento del mínimo
          // de contraste justamente porque tiene que leerse como inactivo.
          disabled: esClaro
            ? alpha(AZUL_ACERO, 0.38)
            : "rgba(255, 255, 255, 0.38)",
        },

        // Estados de interacción. Antes usaban el gris genérico de MUI; ahora
        // son tintes del acento de la marca, distintos por modo (sobre fondo
        // oscuro hace falta más opacidad para que el tinte se perciba).
        action: {
          // De acá sale el color por defecto de los IconButton y de los íconos
          // sueltos de MUI. Definirlo evita tener que pintarlos uno por uno.
          active: esClaro ? alpha(AZUL_ACERO, 0.72) : "rgba(255, 255, 255, 0.7)",
          hover: esClaro ? alpha(AZUL_ACERO, 0.05) : alpha(BLANCO, 0.07),
          hoverOpacity: esClaro ? 0.05 : 0.07,
          // El tinte que MUI pone encima de lo elegido y de lo que tiene el
          // foco —los chips de filtro, por ejemplo— sale del acento del modo.
          // Con el naranja acá, un filtro ya aplicado viraba a naranja al
          // volver a pasarle el mouse por encima.
          selected: esClaro ? alpha(AZUL_LOGO, 0.12) : alpha(AMARILLO, 0.16),
          selectedOpacity: esClaro ? 0.12 : 0.16,
          focus: esClaro ? alpha(AZUL_LOGO, 0.18) : alpha(AMARILLO, 0.2),
          focusOpacity: esClaro ? 0.18 : 0.2,
          disabled: esClaro ? alpha(AZUL_ACERO, 0.3) : alpha(BLANCO, 0.3),
          disabledBackground: esClaro
            ? alpha(AZUL_ACERO, 0.1)
            : alpha(BLANCO, 0.1),
          disabledOpacity: 0.38,
        },

        // Footer: tokens propios porque es un componente a medida, no un
        // Paper de MUI. El fondo es la superficie (un escalón por encima del
        // fondo de página), así se despega sin necesitar sombra.
        footer: {
          background: esClaro ? NIEVE : AZUL_ACERO,
          text: esClaro ? GRIS_TEXTO : GRIS_SUAVE,
        },
        // Bordes y separadores. En claro va dos pasos más oscuro que el fondo
        // de página: con un gris más suave se confundiría con él.
        divider: esClaro ? BORDE_INPUT : AZUL_ACERO_CLARO,
        // ╔══════════════════════════════════════════════════════════════╗
        // ║  TOKENS PROPIOS DE LA APP                                    ║
        // ╚══════════════════════════════════════════════════════════════╝
        //
        // Un token es un color con NOMBRE DE TRABAJO en vez de un código.
        // En vez de escribir "#EA580C" en cada pantalla, se escribe "el color
        // de acento", y acá se decide qué color es eso en cada modo.
        //
        // La ventaja: para recolorear la app se cambia acá y cambia en todos
        // lados. Y si un color se lee distinto en claro que en oscuro, el
        // token se encarga; la pantalla no se entera.
        //
        // Regla: si un componente necesita un color que no está en esta lista,
        // se agrega acá primero con un nombre que diga PARA QUÉ es, y recién
        // después se usa. Nunca un código de color suelto en la pantalla.
        custom: {
          // El color de la marca en cada modo: azul oscuro de día, amarillo
          // de noche. Hoy solo lo usa el globo de ayuda (el textito que
          // aparece al dejar el mouse encima de un botón).
          primary: esClaro ? AZUL_ACERO : AMARILLO,

          // ── El acento: el color que "resalta" cosas ──────────────────
          //
          // Es naranja de día y amarillo de noche. Se usa para todo lo que
          // tiene que llamar la atención: títulos, íconos, bordes de algo
          // seleccionado, el relleno de los botones de acción.
          //
          // Es UNO SOLO para toda la app y para los dos modos: el azul del
          // logo cumple contraste con cualquier tamaño de letra. Si aparece
          // `accentSmall` en algún lado, es código viejo.
          //
          // Para íconos, bordes, rellenos, títulos y letra chica.
          // Se usa en: NavBar, Drawer, Footer, AdminCotizaciones,
          // ClienteDetalle, ClienteSeguimientoCard, HeaderUsuario, Search,
          // FacturaFormDialog, AgregarEquipoDialog, KioskProductCardDetail.
          accent: esClaro ? AZUL_LOGO : AMARILLO,

          // El color del texto y los íconos que van ENCIMA de algo pintado
          // con el acento (un botón naranja, una pestaña amarilla).
          //
          // Cambia con el modo, y no es un capricho: el amarillo de noche es
          // clarísimo y pide letra oscura (da 12.4:1), pero el naranja de día
          // es oscuro y pide letra BLANCA — con la letra oscura de antes se
          // quedaba en 3.15:1, y así llega a 5.68:1.
          //
          // Se usa en: el botón de acción rápida y ClienteSeguimientoCard
          // (la pestaña de factura abierta).
          onAccent: esClaro ? BLANCO : AZUL_NOCHE,

          // ── La hoja de los documentos ────────────────────────────────
          //
          // La vista previa de una cotización o una cuenta de cobro imita una
          // hoja impresa. Una hoja siempre es blanca con letra oscura, de día
          // y de noche — no puede volverse oscura cuando se cambia el modo.
          // Sin esto, de noche quedaba letra gris clarita sobre papel blanco
          // y no se leía nada.
          // Se usan en: VistaCotWeb y VistaCcWeb.
          documentBackground: BLANCO,
          documentText: GRIS_TEXTO,

          // El amarillo del importe total, el número grande de la pizarra.
          // Igual en ambos modos, porque el pizarrón también lo es. Usa el
          // amarillo de importes, no el dorado de marca: ese queda para los
          // acentos y el navbar.
          // Se usa en: ClienteDetalle, ClienteSeguimientoCard,
          // FacturaFormDialog, AgregarEquipoDialog, AmpliarVencimientoDialog.
          totalText: AMARILLO_VALOR,

          // El rojo de lo que queda debiendo: saldos pendientes y renglones
          // de alerta dentro de la pizarra. Es el rojo de marca aclarado,
          // porque el pleno sobre el negro se queda en 3.4:1 y no se lee.
          // Se usa a través de la clase "alerta" de la pizarra de totales.
          saldoText: lighten(ROJO, 0.35),

          // El verde de lo que ya está saldado. Sobre el negro de la pizarra
          // el verde de marca da 5.1:1, así que no hace falta aclararlo.
          // Se usa a través de la clase "ok" de la pizarra de totales.
          saldadoText: VERDE,

          // ── La barra de arriba ───────────────────────────────────────
          //
          // El fondo de la barra es un tono más claro que el de la página,
          // para que se despegue y no parezca parte del fondo.
          // El texto, el ícono del carrito y la línea de abajo comparten el
          // mismo color: el acento del modo.
          // Se usan en: NavBar (y el fondo, en el estilo del AppBar).
          navbarBackground: esClaro ? NIEVE : AZUL_ACERO,
          navbarText: esClaro ? NARANJA : AMARILLO,

          // El contorno de los campos de formulario (las cajitas donde se
          // escribe). Los bordes de tarjetas y las líneas divisorias NO usan
          // esto: usan "divider".
          // Se usa en: el estilo general de los campos de texto.
          inputBorder: esClaro ? BORDE_INPUT : GRIS_TEXTO,

          // El rojo del logo, que marca el campo enfocado. Ver la constante
          // ROJO_LOGO para el porqué de las dos versiones.
          // Se usa en: el estilo general de los campos de texto.
          rojoLogo: esClaro ? ROJO_LOGO : ROJO_LOGO_NOCHE,

          // El contorno de los recuadros que envuelven cada equipo cargado en
          // los diálogos, para que se vean como fichas separadas. Es un paso
          // más marcado que "divider", que ahí quedaba casi invisible sobre el
          // fondo del diálogo.
          // Se usa en: Agregar equipo y Crear/Editar factura, en la lista de
          // equipos que se están cargando.
          itemBorder: esClaro ? BORDE_INPUT : GRIS_TEXTO,

          // El gris de los textos chiquitos de apoyo: epígrafes de fotos,
          // aclaraciones, etiquetas en minúscula.
          // Se usa en: el estilo general de "caption" y "overline".
          captionText: esClaro ? GRIS_CAPTION : GRIS_SUAVE,

          // ── El velo sobre las fotos ──────────────────────────────────
          //
          // Los íconos que van ENCIMA de una foto (la cámara al pasar sobre el
          // avatar, las flechas de la galería) necesitan un fondo que los
          // despegue de la imagen. Es negro translúcido, IGUAL en los dos
          // modos: lo que hay debajo es una foto, no una superficie de la app,
          // así que no cambia con el tema. El segundo es el mismo velo un poco
          // más cerrado, para el paso del mouse.
          // Se usan en: HeaderUsuario (el avatar) y DetailGallery.
          veloFoto: alpha(NEGRO, 0.5),
          veloFotoHover: alpha(NEGRO, 0.7),

          // ── La nota grabada ──────────────────────────────────────────
          //
          // La aclaración al pie del formulario de factura, la de las 3 p.m.
          // Se ve como grabada en bajorrelieve: letra muy tenue más una línea
          // de luz justo debajo, que simula el borde iluminado de un hueco.
          // De día la luz es blanca marcada; de noche apenas se insinúa, o el
          // relieve se vería como un subrayado.
          //
          // El aspecto completo (tamaño incluido) está armado abajo como la
          // variante "notaGrabada" de Typography; estos son solo sus colores.
          notaGrabadaText: esClaro ? alpha(NEGRO, 0.35) : alpha(BLANCO, 0.25),
          notaGrabadaRelieve: esClaro
            ? `0px 1px 0px ${alpha(BLANCO, 0.7)}`
            : `0px 1px 0px ${alpha(BLANCO, 0.12)}`,

          // ── El recuadro de totales: una PIZARRA ──────────────────────
          //
          // La idea es esa: una pizarra donde se anotan los importes. Fondo
          // negro en LOS DOS modos, tiza blanca para los renglones comunes,
          // amarillo para el total y rojo para lo que hay que mirar (un saldo
          // pendiente, un vencimiento). Se lee igual de día que de noche.
          //
          // El aspecto completo de la caja (bordes, espaciado, la línea
          // punteada antes del total) está armado abajo como la variante
          // "totales" de Paper, para que cualquier pantalla la use sin
          // repetir estilos.
          //
          // Sobre el negro: la tiza blanca da 15.9:1 y el amarillo 9.6:1.
          // Para el rojo hay que usar "error.light", no "error.main": el rojo
          // pleno sobre negro se queda en 3.4:1 y no llega al mínimo.

          // El pizarrón.
          panelBackground: "#1e1e1e",
          panelShadow: "0 0 10px rgba(0, 0, 0, 0.1)",

          // Relieve para los paneles oscuros: una luz fina arriba y una
          // sombra abajo, por dentro, más un apoyo hacia afuera. Da volumen
          // sin la sombra difusa de panelShadow, que aplana el recuadro.
          // Se usa en: ClienteDetalle (el resumen de cuenta de la factura).
          panelRelieve:
            "inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.55), 0 2px 3px rgba(0, 0, 0, 0.35)",
          // La tiza blanca: etiquetas e importes comunes.
          panelText: NIEVE,

          // El fondo de la tira de pestañas de facturas, esa que simula
          // carpetas apiladas una detrás de otra.
          // Se usa en: ClienteSeguimientoCard.
          tabStripBackground: esClaro ? CEMENTO : AZUL_NOCHE,

          // El globito con la cantidad que va DENTRO de un chip de filtro ya
          // aplicado. El chip está relleno con su color, así que el globo se
          // hace con blanco translúcido: se aclara sobre cualquier color de
          // fondo sin tener que saber cuál es. Igual en los dos modos.
          // Se usa en: ListaClientes (los filtros de estado y tipo).
          contadorSobreChip: alpha(BLANCO, 0.3),

          // La sombra que separa una pestaña de factura de la que tiene detrás.
          // No es una sombra de elevación —va hacia el COSTADO, no hacia
          // abajo— y por eso no sale de theme.shadows: es lo que hace que las
          // pestañas se lean como carpetas apiladas. Igual en los dos modos,
          // porque el efecto de apilado no depende del tema.
          // Se usa en: ClienteSeguimientoCard.
          sombraPestana: `3px 0 4px -2px ${alpha(NEGRO, 0.35)}`,

          // El realce al pasar el mouse por una tarjeta de solicitud: dos capas
          // muy difusas que la despegan de la página. Es de las pocas sombras
          // que SÍ se muestran de noche —el resto de la app las apaga—, y ahí
          // van en negro, porque una sombra azulada sobre el fondo noche no se
          // percibe.
          // Se usa en: AdminCotizaciones.
          sombraTarjetaHover: esClaro
            ? `0 12px 24px -6px ${alpha(AZUL_ACERO_CLARO, 0.25)}, 0 4px 14px -2px ${alpha(AZUL_ACERO_CLARO, 0.15)}`
            : `0 12px 20px -5px ${alpha(NEGRO, 0.4)}, 0 4px 12px -2px ${alpha(NEGRO, 0.2)}`,

          // El relleno de las pestañas de factura que NO están abiertas: un
          // gris apagado, para que la abierta —que va con el acento— sea la
          // única que resalta.
          // Se usa en: ClienteSeguimientoCard.
          pestanaInactiva: esClaro ? grey[300] : grey[700],

          // Los cinco estados de una factura. Cada uno tiene que distinguirse
          // de los otros cuatro, así que no salen todos de la paleta de marca.
          //
          // Son FIJOS en los dos modos: quien los usa saca el color de la
          // letra con getContrastText, así que el chip se lee igual de día que
          // de noche sin necesitar dos versiones.
          //
          // Las claves son las mismas que guarda Firestore en el campo
          // "estado", para poder indexar directo sin traducir.
          // Se usan en: ClienteDetalle, ListaClientes, ClienteSeguimientoCard.
          estadoFactura: {
            pendienteDespacho: "#F59E0B", // ámbar
            despachada: "#2563EB", // azul
            devolucionParcial: "#7C3AED", // violeta
            finalizada: "#16A34A", // verde
            inactivo: "#6B7280", // gris
          },

          // El gris de respaldo para una factura cuyo estado no está en la
          // lista de arriba: las migradas del Excel traen valores viejos que no
          // siempre coinciden. Antes este mismo cálculo estaba copiado en
          // ClienteDetalle y ClienteSeguimientoCard.
          // Se usa en: ClienteDetalle y ClienteSeguimientoCard.
          estadoNeutro: esClaro ? grey[400] : grey[700],

          // Cada bloque de la factura tiene su propio color, para poder
          // distinguir de un vistazo qué se está mirando: el pago, los equipos
          // con los que se emitió y los que se sumaron después. De acá salen
          // el borde, el resplandor interno y el degradado de cada recuadro,
          // y también el rótulo que lo encabeza.
          // Se usan en: ClienteDetalle.
          seccionPago: "#22C55E", // verde
          seccionEquipos: "#3B82F6", // azul
          seccionEquiposAgregados: "#A855F7", // violeta
          seccionAdicionales: "#F97316", // naranja

          // El puntito verde que indica que un usuario está conectado.
          // Se usa en: ListaUsuarios y AdminCotizaciones.
          online: VERDE,

          // Los colores oficiales de WhatsApp y del botón de llamar. Son de
          // marcas ajenas, así que son siempre los mismos y no cambian con el
          // modo: si se tocaran, dejarían de reconocerse.
          // Se usan en: ButtonContacto, Drawer, ClienteSeguimientoCard.
          //
          // El "hover" es el mismo color apenas insinuado, para teñir el
          // renglón del menú al pasar el mouse. De noche va más suave: sobre
          // el fondo oscuro un tinte del 12% ya se ve como un bloque de color.
          whatsapp: {
            main: VERDE_WHATSAPP,
            dark: VERDE_WHATSAPP_OSCURO,
            hover: alpha(VERDE_WHATSAPP, esClaro ? 0.12 : 0.08),
          },
          call: {
            main: AZUL_LLAMADA,
            dark: AZUL_LLAMADA_OSCURO,
            hover: alpha(AZUL_LLAMADA, esClaro ? 0.12 : 0.08),
          },

          // Los medios de pago que maneja la empresa (ver MODOS_PAGO en
          // facturaUtils.js). Nequi, Bancolombia y Daviplata se muestran con su
          // logo de verdad, así que no necesitan color acá. El efectivo no es
          // una marca: va con un ícono verde.
          // Se usa en: ClienteDetalle (renderMedioPago).
          pagoEfectivo: VERDE,
        },
      },
      shape: {
        borderRadius: 6, // Esquinas un poco más rectas para estética industrial
        // Forma de píldora (bordes completamente redondeados). Antes se escribía
        // como 999 o 50 sueltos en cada componente, que en sx se multiplican por
        // borderRadius y daban números sin sentido.
        pill: "999px",
      },
      // Unidad base de espaciado: theme.spacing(2) = 16px. Explícito para que
      // se vea que es una decisión y no el valor por defecto de MUI.
      spacing: 8,
      // Escala de sombras (theme.shadows[0..24]). MUI exige exactamente 25.
      //
      // En CLARO las tiñe de azul noche en vez del negro puro de MUI: sobre
      // superficies frías el gris neutro se ve sucio.
      //
      // En OSCURO son todas "none" a propósito. Una sombra sobre fondo oscuro
      // no se percibe; la elevación la dan los tres tonos de azul. Así, poner
      // elevation={n} en modo oscuro no ensucia nada.
      shadows: esClaro
        ? Array.from({ length: 25 }, (_, i) => {
            if (i === 0) return "none";
            const y = Math.max(1, Math.round(i * 0.8));
            const desenfoque = Math.round(i * 1.6) + 2;
            const recogido = Math.round(i * 0.4);
            const opacidad = Math.min(0.04 + i * 0.006, 0.16);
            return `0px ${y}px ${desenfoque}px -${recogido}px ${alpha(
              AZUL_NOCHE,
              opacidad,
            )}`;
          })
        : Array.from({ length: 25 }, () => "none"),
    });

    const p = base.palette;

    // Paso 2: tipografía y componentes, construidos SOBRE la paleta anterior.
    let newTheme = createTheme(base, {
      typography: {
        fontFamily: '"Open Sans", "Roboto", "Arial", sans-serif',

        h1: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 800,
          fontSize: "2.5rem",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          // h1 solo se usa hoy en el título del NavBar, que siempre va
          // sobre una barra oscura (ver MuiAppBar) — necesita texto claro.
          color: p.custom.navbarText,

          "@media (max-width:1200px)": {
            fontSize: "2.5rem",
          },
          "@media (max-width:900px)": {
            fontSize: "2rem",
          },
          "@media (max-width:600px)": {
            fontSize: "1.75rem",
            lineHeight: 1.3,
          },
          "@media (max-width:400px)": {
            fontSize: "1.5rem",
            lineHeight: 1.35,
          },
        },

        h2: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "2.25rem", // 36px base
          lineHeight: 1.3,
          color: p.custom.accent,

          "@media (max-width:1200px)": {
            fontSize: "2rem", // 32px
          },
          "@media (max-width:900px)": {
            fontSize: "1.75rem", // 28px
          },
          "@media (max-width:600px)": {
            fontSize: "1.5rem", // 24px
          },
          "@media (max-width:400px)": {
            fontSize: "1.375rem", // 22px
          },
        },

        h3: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "1.875rem", // 30px
          lineHeight: 1.35,
          color: p.custom.accent,

          "@media (max-width:1200px)": {
            fontSize: "1.75rem", // 28px
          },
          "@media (max-width:900px)": {
            fontSize: "1.5rem", // 24px
          },
          "@media (max-width:600px)": {
            fontSize: "1.375rem", // 22px
          },
          "@media (max-width:400px)": {
            fontSize: "1.25rem", // 20px
          },
        },

        h4: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "1.5rem", // 24px
          lineHeight: 1.4,
          color: p.custom.accent,

          "@media (max-width:1200px)": {
            fontSize: "1.4rem",
          },
          "@media (max-width:900px)": {
            fontSize: "1.3rem",
          },
          "@media (max-width:600px)": {
            fontSize: "1.2rem",
          },
          "@media (max-width:400px)": {
            fontSize: "1.15rem",
          },
        },

        h5: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "1.2rem",
          color: p.custom.accent,

          "@media (max-width:1200px)": {
            fontSize: "1.1rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "1rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.95rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.9rem", // xs
          },
        },

        // h6 se usa como título de sección en varias pantallas (ClienteDetalle,
        // ListaClientes, EliminarEquipos y el Footer en móvil). Antes no estaba
        // definido y caía al default de MUI: Roboto, peso 500 y 1.25rem — o sea
        // otra fuente y MÁS GRANDE que h5, invirtiendo la jerarquía.
        h6: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "1.1rem",
          color: p.custom.accent,

          "@media (max-width:1200px)": {
            fontSize: "1.05rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "0.95rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.9rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.85rem", // xs
          },
        },

        subtitle1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "1rem",
          color: p.text.secondary,

          "@media (max-width:1200px)": {
            fontSize: "0.95rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "0.925rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.875rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.825rem", // xs
          },
        },

        subtitle2: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "0.875rem",
          color: p.text.secondary,

          "@media (max-width:1200px)": {
            fontSize: "0.85rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "0.825rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.8rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.75rem", // xs
          },
        },

        body1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "1rem", // >= md
          lineHeight: 1.5,
          color: p.text.primary,

          "@media (max-width:1200px)": {
            fontSize: "0.95rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "0.925rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.875rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.8rem", // xs
          },
        },

        body2: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.875rem",
          lineHeight: 1.43,
          color: p.text.primary,

          "@media (max-width:1200px)": {
            fontSize: "0.85rem", // lg
          },
          "@media (max-width:900px)": {
            fontSize: "0.825rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.8rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.75rem", // xs
          },
        },

        // El texto del resumen del carrito: la lista de equipos pedidos y las
        // opciones de transporte. Es "body2" pero más chico de 900px para
        // arriba, porque ahí el resumen se va a una columna angosta al costado
        // y con el tamaño normal no entraba.
        //
        // Se usa en: VistaCart y KioskCart.
        resumenCarrito: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.875rem",
          lineHeight: 1.43,
          color: p.text.primary,

          "@media (min-width:900px)": {
            fontSize: "0.675rem",
          },
          "@media (max-width:900px)": {
            fontSize: "0.825rem", // md
          },
          "@media (max-width:600px)": {
            fontSize: "0.8rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.75rem", // xs
          },
        },

        // El par de renglones con el que se anota cada dato dentro de los
        // recuadros de una factura: arriba el rótulo en mayúsculas
        // ("DEPÓSITO", "MEDIO", "SALDO") y abajo su valor en negrita. Nunca
        // van uno sin el otro, así que son dos variantes hermanas.
        //
        // Lo raro de estas dos es que achican de 900px PARA ARRIBA, al revés
        // que el resto: en computador los recuadros se acomodan en columnas
        // angostas al lado de los equipos, y ahí un importe de siete cifras
        // se monta sobre el de al lado. En celular cada dato ocupa el ancho
        // completo y el texto va del tamaño normal.
        //
        // El COLOR no va acá a propósito: el rótulo lleva el color del bloque
        // al que pertenece (pago, adicionales, abonos) y se lo pasa cada
        // pantalla; dentro de la pizarra de totales lo hereda del renglón.
        //
        // Se usan en: los cuatro recuadros de ClienteDetalle.
        rotuloDato: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.925rem", // hasta 900px: el tamaño normal del texto
          display: "block",
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          color: p.text.primary,

          "@media (max-width:600px)": {
            fontSize: "0.875rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.8rem", // xs
          },
          // De acá para arriba el rótulo se vuelve una etiqueta chiquita.
          "@media (min-width:900px)": {
            fontSize: "0.6rem",
          },
          "@media (min-width:1200px)": {
            fontSize: "0.7rem",
          },
        },

        valorDato: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 700,
          fontSize: "0.925rem", // hasta 900px: el tamaño normal del texto
          lineHeight: 1.25,
          color: p.text.primary,

          "@media (max-width:600px)": {
            fontSize: "0.875rem", // sm
          },
          "@media (max-width:400px)": {
            fontSize: "0.8rem", // xs
          },
          "@media (min-width:900px)": {
            fontSize: "0.75rem",
          },
          "@media (min-width:1200px)": {
            fontSize: "0.9rem",
          },
        },

        // El renglón de "© 2026 Ferrequipos de la Costa…" que cierra el menú
        // lateral (tanto el de celular como la columna de computador) y el pie
        // de página. Es la MISMA frase en los tres lugares, pero cada uno
        // traía su propia escala escrita a mano —0,5 / 0,6 / 0,675 / 0,7 /
        // 0,8 rem—, así que se veía de un tamaño distinto según dónde
        // apareciera. Acá queda una sola escala: chiquita, y un punto más
        // chica todavía en celular.
        //
        // El COLOR no va acá a propósito: el del menú usa el acento y el del
        // pie usa el gris del footer, y eso lo sigue poniendo cada pantalla.
        copyright: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.7rem",
          lineHeight: 1.4,

          "@media (max-width:600px)": {
            fontSize: "0.6rem",
          },
        },

        // El pie de las hojas de cotización y cuenta de cobro: la página web,
        // el correo, la dirección y los teléfonos, en letra chica al final de
        // la hoja. Es el mismo bloque repetido en las dos vistas, y cada una
        // preguntaba por su cuenta si la pantalla era chica para achicarlo.
        // Ahora lo decide el tema con la misma medida (600px) que usaban las
        // dos, así que se ve exactamente igual que antes.
        //
        // El color azul lo sigue poniendo cada vista: la hoja es blanca en los
        // dos modos y necesita el truco de "&&" para no dejarse pisar.
        documentoPie: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.75rem",
          lineHeight: 1.2,

          "@media (max-width:600px)": {
            fontSize: "0.625rem",
          },
        },

        // La aclaración al pie del formulario de factura (la de las 3 p.m.):
        // letra muy chica y tenue, con una línea de luz debajo que la hace ver
        // grabada en la superficie. Es información de respaldo, no algo que
        // haya que leer sí o sí, y el tratamiento lo dice sin necesidad de
        // achicarla más.
        //
        // Concentraba SIETE valores escritos a mano en el componente: el
        // tamaño, dos grises translúcidos y dos sombras, cada color con su
        // propio "si el modo es claro". Los colores salen ahora de
        // custom.notaGrabadaText y notaGrabadaRelieve.
        //
        // Hereda de body1 todo lo demás —tipo de letra, grosor e interlineado—
        // porque eso es lo que hacía antes: era un Typography sin variante.
        // El tamaño NO escala con la pantalla, también como antes.
        // Se usa en: FacturaFormDialog.
        notaGrabada: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.65rem",
          lineHeight: 1.5,
          color: p.custom.notaGrabadaText,
          textShadow: p.custom.notaGrabadaRelieve,
        },

        button: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "0.875rem",
          textTransform: "uppercase", // Estilo técnico e industrial
          letterSpacing: "0.05em",
        },

        caption: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.75rem",
          color: p.custom.captionText,

        },

        overline: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "0.625rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: p.custom.captionText,

        },
      },

      components: {
        MuiCssBaseline: {
          // El scroll de toda la app: toma su color de "custom.primary" (azul
          // acero en claro, amarillo en oscuro) en vez de repetir los hex, así
          // cambiar la paleta cambia también la barra de scroll.
          //
          // OJO: MuiCssBaseline es la excepción — su "styleOverrides" recibe el
          // tema DIRECTO, no un objeto { theme } como el resto de componentes.
          styleOverrides: (temaActual) => {
            const scrollbarAcento = temaActual.palette.custom.accent;

            const esModoClaro = temaActual.palette.mode === "light";

            return {
              // Variables CSS: el puente para las hojas de estilo planas, que
              // no pueden leer el theme de MUI. Cambiar la paleta acá arriba
              // también las cambia a ellas.
              ":root": {
                "--ff-texto": temaActual.palette.text.primary,
                "--ff-texto-suave": temaActual.palette.text.secondary,
                "--ff-acento": scrollbarAcento,
                "--ff-resplandor": alpha(scrollbarAcento, 0.7),
                "--ff-sombra": alpha(AZUL_NOCHE, esModoClaro ? 0.15 : 0.4),
              },

              body: {
                backgroundColor: temaActual.palette.background.default,
                color: temaActual.palette.text.primary,
              },

              // Selección de texto: acento translúcido, para que lo
              // seleccionado se siga leyendo.
              "::selection": {
                backgroundColor: alpha(scrollbarAcento, 0.3),
              },

              "*": {
                scrollbarWidth: "thin",
                scrollbarColor: `${alpha(scrollbarAcento, 0.4)} transparent`,
              },
              "*::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "*::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(scrollbarAcento, 0.4),
                borderRadius: `${temaActual.shape.borderRadius}px`,
              },
              "*::-webkit-scrollbar-thumb:hover": {
                backgroundColor: alpha(scrollbarAcento, 0.7),
              },
              "@media (pointer: coarse)": {
                "*": {
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                },
                "*::-webkit-scrollbar": {
                  display: "none",
                },
              },
            };
          },
        },

        // Paper es la base de Card, Dialog, Menu, Drawer, Accordion y varios
        // más: lo que se defina acá lo heredan todos.
        MuiPaper: {
          styleOverrides: {
            root: {
              // MUI le superpone al Paper un degradado que aclara el fondo
              // según la elevación, y SOLO en modo oscuro. Eso hacía que el
              // color renderizado no fuera el declarado. La elevación en
              // oscuro se resuelve con los tonos de superficie, no con esto.
              backgroundImage: "none",
            },
            outlined: ({ theme }) => ({
              border: `1px solid ${theme.palette.divider}`,
            }),
          },
          variants: [
            {
              // LA PIZARRA DE TOTALES.
              //
              // Se usa así, y cada pantalla pone adentro las filas que
              // necesite (Cotización lista subtotal, IVA, depósito y
              // transporte; Seguimiento solo total y saldo):
              //
              //   <Paper variant="totales">
              //     <Box className="fila">
              //       <Typography>Subtotal</Typography>
              //       <Typography>$ 100</Typography>
              //     </Box>
              //     <Box className="fila total">
              //       <Typography>TOTAL</Typography>
              //       <Typography>$ 119</Typography>
              //     </Box>
              //   </Paper>
              //
              // "fila" acomoda etiqueta a la izquierda e importe a la derecha.
              // "total" agrega la línea punteada y pinta el renglón de
              // amarillo. Para un renglón de alerta (saldo pendiente,
              // vencido) se agrega "alerta" y sale en rojo legible.
              props: { variant: "totales" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.custom.panelBackground,
                boxShadow: theme.palette.custom.panelShadow,
                borderRadius: theme.shape.borderRadius * 2,
                padding: theme.spacing(2),
                color: theme.palette.custom.panelText,

                "& .MuiTypography-root": { color: "inherit" },

                "& .fila": {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: theme.spacing(2),
                  marginBottom: theme.spacing(1),
                },

                "& .fila.total": {
                  color: theme.palette.custom.totalText,
                  borderTop: `1px dashed ${alpha(
                    theme.palette.custom.panelText,
                    0.35,
                  )}`,
                  marginTop: theme.spacing(2),
                  marginBottom: 0,
                  paddingTop: theme.spacing(2),
                },

                // Si el total es lo PRIMERO de la pizarra no hay nada arriba
                // que separar, así que no lleva línea. La línea solo aparece
                // cuando divide un desglose de su total, como en Cotización.
                "& .fila.total:first-of-type": {
                  borderTop: "none",
                  marginTop: 0,
                  paddingTop: 0,
                },

                // Separa dos bloques de la pizarra sin darle al de abajo
                // el color del total: se usa entre lo ya facturado y la
                // proyección de los días ampliados, que si van pegados
                // parecen una suma en columna.
                "& .fila.separada": {
                  borderTop: `1px dashed ${alpha(
                    theme.palette.custom.panelText,
                    0.35,
                  )}`,
                  marginTop: theme.spacing(2),
                  paddingTop: theme.spacing(2),
                },

                "& .fila.alerta": {
                  color: theme.palette.custom.saldoText,
                },

                // Para lo que ya está saldado o en orden.
                "& .fila.ok": {
                  color: theme.palette.custom.saldadoText,
                },

                // Las cuatro cifras de una cuenta se leen siempre con el mismo
                // color, acá y en el resumen del encabezado de la factura:
                // amarillo el total, verde lo pagado, azul los abonos y rojo
                // lo que queda debiendo.
                "& .fila.pagado": {
                  color: theme.palette.custom.saldadoText,
                },

                "& .fila.abono": {
                  color: theme.palette.info.light,
                },
              }),
            },
          ],
        },

        MuiAppBar: {
          styleOverrides: {
            root: ({ theme }) => ({
              // Navbar oscuro/profundo para dar soporte
              backgroundColor: theme.palette.custom.navbarBackground,
              // Desactiva el degradado de elevación que MUI le aplica al Paper
              // en modo oscuro: si no, el color renderizado no es el declarado.
              backgroundImage: "none",
              color: theme.palette.custom.navbarText,
              // La línea usa el mismo acento que el texto del navbar.
              borderBottom: `3px solid ${theme.palette.custom.navbarText}`,
            }),
          },
        },
        MuiCard: {
          styleOverrides: {
            root: ({ theme }) => {
              const esOscuro = theme.palette.mode === "dark";

              return {
                borderRadius: 8,
                border: `1px solid ${theme.palette.divider}`,
                // Sobre el fondo azul oscuro una sombra no se percibe, así que
                // en modo oscuro la elevación la marca el borde (y el borde de
                // acento al pasar el mouse), no un box-shadow.
                boxShadow: esOscuro
                  ? "none"
                  : "0 4px 6px -1px rgba(15, 23, 42, 0.06)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-3px)",
                  borderColor: theme.palette.custom.accent,
                  boxShadow: esOscuro
                    ? "none"
                    : "0 10px 15px -3px rgba(15, 23, 42, 0.12)",
                },
              };
            },
          },
        },

        // Superficies elevadas (diálogos, menús, popovers). En modo oscuro usan
        // el tercer tono de azul, más claro que "background.paper", para
        // despegarse del fondo sin depender de sombras. En modo claro
        // "background.elevated" es blanco, así que no cambia nada.
        // "backgroundImage: none" desactiva el degradado que MUI le aplica al
        // Paper en modo oscuro, que si no se sumaría al color y lo aclararía de
        // más.
        MuiDialog: {
          styleOverrides: {
            paper: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              backgroundImage: "none",
            }),
          },
        },

        MuiMenu: {
          styleOverrides: {
            paper: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              backgroundImage: "none",
            }),
          },
        },

        MuiPopover: {
          styleOverrides: {
            paper: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              backgroundImage: "none",
            }),
          },
        },

        // Íconos de listas y menús (Drawer, menú de cuenta, cambio de tema).
        // Toman el acento desde acá, así no hay que pintarlos uno por uno en
        // cada componente. Los que tienen color de marca propio —WhatsApp,
        // llamar— lo siguen declarando ellos.
        MuiListItemIcon: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.custom.accent,
            }),
          },
        },
        MuiButton: {
          styleOverrides: {
            // Callback y no objeto plano: adentro hace falta "theme", y el de
            // afuera todavía se está construyendo en este punto.
            root: ({ theme }) => ({
              // El doble que el resto de la app: con el radio general de 6 los
              // botones se veían cuadrados. Es a propósito que no siga a
              // shape.borderRadius — las tarjetas, los campos y los diálogos
              // se quedan en 6, que es la "estética industrial" del tema.
              borderRadius: theme.shape.borderRadius * 2,
              padding: "8px 22px",
              boxShadow: "none",
              transition: "all 0.2s ease-in-out",
              // UN SOLO gesto de hover para todos los botones: se levantan.
              // Antes convivían dos lenguajes —los tiles del menú y el botón
              // de acción rápida se levantaban, y el resto sacaba sombra—, y
              // cada variante lo repetía por su cuenta.
              "&:hover": {
                transform: "translateY(-3px)",
              },
            }),
            // El botón compacto: el que va en la barra de acciones del pie en
            // celular (MENU / CERRAR SESION) y en los botones de los diálogos.
            sizeSmall: ({ theme }) => ({
              padding: theme.spacing(0.75, 1),
              fontSize: "0.75rem",
            }),

            // La acción NEUTRA del sistema de colores: el botón de contorno.
            // De día es blanco con borde gris; de noche, la superficie de la
            // tarjeta. Sin esto, el "outlined" de MUI sale transparente y
            // sobre el fondo de página no se distingue de lo que tiene detrás.
            outlined: ({ theme }) => ({
              backgroundColor: esClaro ? BLANCO : AZUL_ACERO,
              borderColor: esClaro ? BORDE_NEUTRO : theme.palette.divider,
              color: theme.palette.text.primary,
              "&:hover": {
                backgroundColor: esClaro ? BLANCO : AZUL_ACERO,
                borderColor: theme.palette.text.secondary,
              },
            }),
          },
          // Un botón relleno con distinto color NO va acá: eso es
          // variant="contained" con color="error" / "success" / "accent".
          // Estas variantes son las que MUI no sabe hacer: colores de marca
          // ajena y formas propias.
          variants: [
            {
              // EXCEPCIÓN CONSCIENTE: el verde oficial de WhatsApp con texto
              // blanco da 2.0:1 y no cumple AA, pero es el botón reconocible de
              // una marca de terceros — cambiarlo lo haría irreconocible. Se
              // mantiene a propósito. No aplicar acá la regla de contraste.
              props: { variant: "whatsapp" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.custom.whatsapp.main,
                color: theme.palette.common.white,
                "&:hover": { backgroundColor: theme.palette.custom.whatsapp.dark },
              }),
            },
            {
              // Usa el azul OSCURO: el azul de llamada con texto blanco da
              // 4.1:1, justo por debajo del mínimo. El oscuro da 5.9:1.
              props: { variant: "call" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.custom.call.dark,
                color: theme.palette.common.white,
                "&:hover": {
                  backgroundColor: darken(theme.palette.custom.call.dark, 0.15),
                },
              }),
            },
            {
              // Botón cuadrado del menú de AdminForms: ícono arriba, texto
              // abajo. La forma vive acá; el componente solo aporta el
              // ancho/alto (dependen de cuántos botones hay y del tamaño
              // de pantalla, algo que el tema no puede saber de antemano).
              props: { variant: "adminSquare" },
              style: ({ theme }) => {
                const esOscuro = theme.palette.mode === "dark";

                return {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  overflow: "hidden",
                  // Estos tiles ocupan casi toda la pantalla: son SUPERFICIES,
                  // no acentos. Pintarlos con el color de marca saturado hacía
                  // que el modo claro se viera oscuro (9 bloques azules) y el
                  // oscuro se viera claro (9 bloques amarillos), contradiciendo
                  // el modo en ambos casos.
                  // Patrón estándar de Material 3 para áreas grandes: fondo de
                  // "surface" + el color de marca reservado al ícono y al borde.
                  backgroundColor: esOscuro
                    ? theme.palette.background.elevated
                    : theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  transition: "all 0.2s ease-in-out",
                  // Tamaños del tile: el ícono grande arriba y el rótulo
                  // abajo. En pantallas chicas —o bajitas, como un portátil
                  // con la ventana a media altura— todo encoge para que los
                  // 9 botones sigan entrando sin scroll.
                  fontSize: "0.875rem",
                  gap: theme.spacing(2),
                  "& .MuiSvgIcon-root": {
                    // El ícono es el que lleva el color de marca.
                    color: theme.palette.custom.accent,
                    fontSize: 40,
                  },
                  "@media (max-width:915px), (max-height:700px)": {
                    fontSize: "0.7rem",
                    gap: theme.spacing(1),
                    "& .MuiSvgIcon-root": { fontSize: 28 },
                  },
                  // El levantarse lo pone "root", igual que en todos los
                  // botones; acá solo va lo propio del tile.
                  "&:hover": {
                    backgroundColor: esOscuro
                      ? theme.palette.background.paper
                      : alpha(theme.palette.primary.main, 0.06),
                    borderColor: theme.palette.custom.accent,
                  },
                };
              },
            },
            {
              props: { variant: "quotationSquare" },
              style: ({ theme }) => ({
                // Relleno de acento con texto oscuro: naranja en claro,
                // amarillo en oscuro.
                backgroundColor: theme.palette.custom.accent,
                color: theme.palette.custom.onAccent,
                boxShadow: "none",
                // El levantarse y la transición los pone "root".
                "&:hover": {
                  backgroundColor: darken(theme.palette.custom.accent, 0.12),
                },
              }),
            },
            {
              // La misma tarjeta de acción, pero para lo que DESTRUYE. En el
              // buzón de cotizaciones todos los botones salían con la variante
              // de arriba, así que ELIMINAR se veía igual que EDITAR o que
              // Crear Cotización.
              //
              // Es una variante aparte y no un color="error" porque
              // "quotationSquare" fija su propio fondo: el color de MUI no le
              // gana. Misma forma y mismo tamaño, solo cambia el color.
              // Se usa en: AdminCotizaciones (el botón Eliminar).
              props: { variant: "quotationSquareDanger" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: darken(theme.palette.error.main, 0.12),
                },
              }),
            },
          ],
        },

        MuiOutlinedInput: {
          styleOverrides: {
            // El borde del campo tiene DOS estados y dos colores, nada más:
            //
            //   quieto → el acento del modo: azul del logo de día, amarillo
            //            de noche.
            //   foco   → el ROJO DEL LOGO, y el borde al doble de grueso.
            //
            // Pasar el mouse no cambia nada, pero la regla de :hover tiene que
            // estar igual: si no está, MUI la pinta por su cuenta.
            root: ({ theme }) => ({
              borderRadius: 6,

              // El botón que va DENTRO del campo —el ojo de la contraseña—
              // con el relleno normal de un IconButton estira el campo a 40px,
              // contra los 37 de los que no llevan ícono.
              //
              // Va acá y no en "MuiInputAdornment" porque esos botones no
              // siempre están envueltos en uno, y el ícono no siempre es de
              // MUI: el del ojo viene de react-icons, así que hay que apuntar
              // al <svg> pelado en vez de a "MuiSvgIcon-root".
              "& .MuiIconButton-root": {
                padding: 4,
                "& svg": {
                  width: 18,
                  height: 18,
                },
              },

              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.custom.accent,
                transition: "border-color 0.15s ease",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.custom.accent,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.custom.rojoLogo,
                borderWidth: "2px",
              },
            }),
            input: ({ theme }) => ({
              "&:-webkit-autofill": {
                boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                WebkitTextFillColor:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
                transition: "background-color 5000s ease-in-out 0s", // opcional para evitar parpadeo
              },

              // El calendarcito de los campos de fecha lo dibuja el NAVEGADOR,
              // no MUI, y lo pinta negro fijo: sobre el fondo oscuro quedaba
              // invisible. Invertirlo lo vuelve blanco, que es lo que se
              // necesita de noche. De día se deja como viene.
              //
              // Aplica a todos los campos de fecha de la app —Cotización,
              // Cuenta de Cobro, facturas, abonos, vencimientos— porque está en
              // el input de todos los TextField.
              "&::-webkit-calendar-picker-indicator": {
                filter: esClaro ? "none" : "invert(1)",
                cursor: "pointer",
                opacity: 0.85,
              },
            }),
          },
        },

        MuiTextField: {
          defaultProps: {
            variant: "outlined",
            size: "small",
            fullWidth: true,
          },
        },

        // Los selectores armados a mano —FormControl + InputLabel + Select, en
        // vez de un TextField— no heredaban el "small" de arriba y se quedaban
        // en el tamaño mediano de MUI: 16.5px de relleno vertical contra 8.5,
        // o sea 53px de alto contra 37. En un formulario con campos y
        // selectores mezclados se veía disparejo (Crear Usuarios era el caso
        // más visible, con Género y Rol más altos que el resto).
        //
        // Va como defaultProp y no como estilo para que cualquier pantalla
        // pueda pedir "medium" si algún día lo necesita.
        MuiFormControl: {
          defaultProps: {
            size: "small",
          },
        },

        MuiSelect: {
          defaultProps: {
            size: "small",
          },
        },

        MuiInputAdornment: {
          styleOverrides: {
            positionEnd: {
              cursor: "pointer",
            },
          },
        },

        MuiInputLabel: {
          // Acompaña al "small" de los campos: si la etiqueta se queda en
          // mediano, arranca desplazada respecto del recuadro.
          defaultProps: {
            size: "small",
          },
          styleOverrides: {
            // Estilos para la etiqueta flotante (label)
            root: ({ theme }) => ({
              fontSize: "0.875rem", // Tamaño de fuente del label
              fontWeight: 400, // Grosor del texto del label
              color:
                theme.palette.mode === "light"
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,

              "&.Mui-focused": {
                // Color del label cuando el input está enfocado
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
              },
            }),
          },
        },

        MuiInputBase: {
          styleOverrides: {
            // Estilo general de todos los inputs base (TextField, Select, etc.)
            root: {
              fontSize: "0.875rem", // Tamaño de fuente
              fontWeight: 400, // Peso de la fuente
            },
            input: {
              fontSize: "0.875rem", // Tamaño dentro del campo
              fontWeight: 400, // Peso del texto
            },
          },
        },

        MuiDivider: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderColor: theme.palette.divider,
            }),
          },
        },

        MuiCheckbox: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.custom.accent,
              "&.Mui-checked": {
                color: theme.palette.custom.accent,
              },
            }),
          },
          defaultProps: {
            size: "small",
          },
        },

        MuiRadio: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.custom.accent,
              "&.Mui-checked": {
                color: theme.palette.custom.accent,
              },
            }),
          },
          defaultProps: {
            size: "small",
          },
        },

        // Drawer: superficie elevada, igual que diálogos y menús.
        MuiDrawer: {
          styleOverrides: {
            paper: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              backgroundImage: "none",
              borderColor: theme.palette.divider,
            }),
          },
        },

        // Chip: solo forma y borde. Los colores semánticos (success, error…)
        // ya salen del palette, así que NO se tocan acá — pisarlos rompería
        // los <Chip color="..."> de las vistas de facturas.
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
            },
            // El dibujito que algunos chips llevan a la izquierda del texto
            // (los de filtrar por Personas / Empresas). MUI se lo pone a 20px
            // y al lado de una etiqueta chica se ve grande; 16px lo deja a
            // tono. Antes este número estaba escrito a mano en los cuatro
            // chips: dos en el buzón de cotizaciones y dos en el seguimiento
            // de clientes. Hoy son los únicos chips con ícono de la app.
            icon: {
              fontSize: 16,
            },
            outlined: ({ theme }) => ({
              borderColor: theme.palette.divider,
            }),
          },
          variants: [
            // ── Fichas de datos de un equipo ────────────────────────────
            //
            // Los chiquitos que acompañan a cada equipo con sus datos:
            // días, precio por día, fechas, días ampliados.
            // Se usan en: ClienteDetalle y ClienteSeguimientoCard.
            //
            // Cambian de piel según la pantalla, y eso lo resuelve el CSS
            // (no hace falta preguntar por el ancho desde el componente):
            //   - En computador: ficha rellena, esquinas rectas.
            //   - En celular: solo contorno y forma de píldora, para que
            //     varias juntas no ensucien la tarjeta.
            {
              props: { variant: "meta" },
              style: ({ theme }) => ({
                height: 22,
                fontSize: "0.7rem",
                fontWeight: 600,
                borderRadius: theme.shape.borderRadius,
                backgroundColor: theme.palette.background.elevated,
                border: "none",
                // El ícono de la ficha va en el acento: naranja de día,
                // amarillo de noche. Así se distingue del texto del dato.
                "& .MuiChip-icon": {
                  color: theme.palette.custom.accent,
                },
                [theme.breakpoints.down("sm")]: {
                  borderRadius: theme.shape.pill,
                  backgroundColor: "transparent",
                  border: `1px solid ${theme.palette.divider}`,
                },
              }),
            },
            // ── La etiqueta de estado ───────────────────────────────────
            //
            // El rótulo en mayúsculas que dice en qué anda un cliente o una
            // factura: PENDIENTE DESPACHO, DESPACHADA, FINALIZADA. Va con
            // ancho fijo para que en una lista todas queden alineadas aunque
            // el texto sea más corto o más largo.
            //
            // El color de fondo NO va acá: lo pone cada pantalla según el
            // estado, que es lo único que cambia entre una y otra.
            {
              props: { variant: "estado" },
              style: {
                fontSize: "0.7rem",
                fontWeight: "bold",
                textTransform: "uppercase",
                width: 190,
                justifyContent: "center",
              },
            },
            // La misma etiqueta donde no hay lista que alinear: se ajusta al
            // texto y va con sombra, porque ahí se apoya sobre una tarjeta.
            // La usan el buzón de cotizaciones y las tarjetas de seguimiento,
            // que antes tenían cada una su propio tamaño (0,75 y 0,65) y una
            // iba en mayúsculas y la otra no.
            {
              props: { variant: "estadoCompacto" },
              style: ({ theme }) => ({
                fontSize: "0.7rem",
                fontWeight: "bold",
                textTransform: "uppercase",
                borderRadius: theme.shape.borderRadius,
                boxShadow: theme.shadows[2],
              }),
            },
            // La misma ficha, pero para las que llevan color propio: el rojo
            // de "vencido", el verde de "descuento". Sale en contorno, que es
            // lo discreto; la que necesite ir rellena (la de "Venció", que
            // tiene que saltar a la vista) lo pide con su propio color de
            // fondo desde el componente.
            {
              props: { variant: "metaEstado" },
              style: ({ theme }) => ({
                height: 22,
                fontSize: "0.7rem",
                fontWeight: "bold",
                borderRadius: theme.shape.borderRadius,
                backgroundColor: "transparent",
                border: "1px solid currentColor",
                [theme.breakpoints.down("sm")]: {
                  borderRadius: theme.shape.pill,
                },
              }),
            },
          ],
        },

        MuiAlert: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: theme.shape.borderRadius,
            }),
          },
        },

        MuiSnackbarContent: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              color: theme.palette.text.primary,
              borderRadius: theme.shape.borderRadius,
            }),
          },
        },

        // Tooltip: tiene que contrastar contra la página, así que va al revés
        // del modo — oscuro sobre fondo claro, y un escalón más claro sobre
        // fondo oscuro.
        MuiTooltip: {
          styleOverrides: {
            tooltip: ({ theme }) => ({
              backgroundColor:
                theme.palette.mode === "light"
                  ? theme.palette.custom.primary
                  : theme.palette.background.elevated,
              color:
                theme.palette.mode === "light"
                  ? theme.palette.common.white
                  : theme.palette.text.primary,
              fontSize: "0.75rem",
              borderRadius: theme.shape.borderRadius,
            }),
            arrow: ({ theme }) => ({
              color:
                theme.palette.mode === "light"
                  ? theme.palette.custom.primary
                  : theme.palette.background.elevated,
            }),
          },
        },

        MuiSkeleton: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: theme.palette.action.hover,
            }),
          },
        },

        MuiTableCell: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderBottomColor: theme.palette.divider,
            }),
            head: ({ theme }) => ({
              backgroundColor: theme.palette.background.elevated,
              color: theme.palette.text.primary,
              fontWeight: 700,
            }),
          },
        },

        MuiTableRow: {
          styleOverrides: {
            root: ({ theme }) => ({
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }),
          },
        },

        // Los íconos toman su color del contexto. El de por defecto sale de
        // "palette.action.active"; los que necesitan color propio lo piden con
        // la prop "color", nunca con un hex.
        MuiSvgIcon: {
          defaultProps: {
            fontSize: "medium",
          },
        },

        MuiTypography: {
          defaultProps: {
            variantMapping: {
              h1: "h1",
              h2: "h2",
              h3: "h3",
              h4: "h4",
              h5: "h5",
              h6: "h6",
              subtitle1: "p",
              subtitle2: "p",
              body1: "p",
              body2: "p",
              // Variante propia (ver typography.resumenCarrito): sin esta
              // línea MUI la sacaría como <span> en vez de párrafo.
              resumenCarrito: "p",
              // Ídem: el renglón de copyright es un párrafo.
              copyright: "p",
              // Ídem: el rótulo y el valor de cada dato de una factura eran
              // párrafos (salían por "body1") y tienen que seguir siéndolo.
              rotuloDato: "p",
              valorDato: "p",
              // Ídem: la nota del pie del formulario era un Typography sin
              // variante, o sea un párrafo. Tiene que seguir saliendo así.
              notaGrabada: "p",
              // Este en cambio sí va como <span>, que es lo que era antes
              // (usaba "caption"): así el pie de la hoja no cambia de forma.
              documentoPie: "span",
            },
          },
        },
      },
    });

    return responsiveFontSizes(newTheme);
  }, [mode]);

  // Agrega clase al body para estilos globales si lo deseas
  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(`theme-${mode}`);
    document.body.style.transition =
      "background-color 0.3s ease, color 0.3s ease";
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

CustomThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
