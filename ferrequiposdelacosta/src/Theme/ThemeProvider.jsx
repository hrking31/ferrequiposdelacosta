import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  responsiveFontSizes,
} from "@mui/material";
import { alpha, darken, lighten } from "@mui/material/styles";
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
      // inicial (antes se quedaba pegado en oscuro si no había nada
      // guardado).
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
    const AMARILLO_CLARO = "#FFC72C";
    const AMBAR = "#D97706";
    const AMBAR_PREVENCION = "#F59E0B";
    const NARANJA = "#EA580C";
    const NARANJA_OSCURO = "#C2410C";
    const VERDE = "#16A34A";
    const VERDE_OSCURO = "#15803D";
    const ROJO = "#DC2626";
    const ROJO_OSCURO = "#B91C1C";
    const AZUL_LLAMADA = "#0284C7";
    const AZUL_LLAMADA_OSCURO = "#0369A1";
    const BLANCO = "#FFFFFF";
    const CONCRETO = "#F1F5F9";
    const GRIS_TEXTO = "#475569";
    const GRIS_SUAVE = "#94A3B8";
    const GRIS_CAPTION = "#64748B";
    const BORDE_CLARO = "#E2E8F0";
    const BORDE_INPUT = "#CBD5E1";

    const esClaro = mode === "light";

    // Paso 1: la paleta. Es la única fuente de verdad de color.
    const base = createTheme({
      palette: {
        mode,
        primary: {
          main: esClaro ? AZUL_ACERO : AMARILLO, // Azul Acero / Amarillo Maquinaria
          light: esClaro ? AZUL_ACERO_CLARO : AMARILLO_CLARO,
          dark: esClaro ? AZUL_NOCHE : AMBAR,
          contrastText: esClaro ? BLANCO : AZUL_NOCHE,
        },
        secondary: {
          main: NARANJA, // Naranja Seguridad Viento/Obra
          light: AMARILLO, // Amarillo Alerta
          dark: NARANJA_OSCURO,
          // Texto oscuro sobre el naranja: da 5.0:1. El blanco solo daba 3.6:1
          // y no llegaba al mínimo AA.
          contrastText: AZUL_NOCHE,
        },
        // Semánticos. Sobre el azul oscuro del modo nocturno, el tono de marca
        // de success/error/info NO llega al mínimo WCAG AA (4.5:1) cuando se
        // usa como TEXTO. Por eso ".light" lo aclara partiendo del propio hex
        // de marca — no es un color nuevo, es el mismo aclarado.
        //   Regla de uso: ".main" para fondos rellenos (con contrastText),
        //   ".light" para texto o íconos sueltos en modo oscuro.
        success: {
          main: VERDE, // Verde para disponible / en buen estado
          light: lighten(VERDE, 0.35), // 6.4:1 sobre AZUL_ACERO
          dark: VERDE_OSCURO,
          // Texto oscuro sobre el verde: da 5.4:1. El blanco solo daba 3.3:1.
          contrastText: AZUL_NOCHE,
        },
        warning: {
          main: AMBAR_PREVENCION, // Amarillo prevención — ya da 6.8:1
          contrastText: AZUL_NOCHE,
        },
        error: {
          main: ROJO, // Rojo fuera de servicio
          light: lighten(ROJO, 0.35), // 4.9:1 sobre AZUL_ACERO
          dark: ROJO_OSCURO,
          contrastText: BLANCO,
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
        background: {
          default: esClaro ? BORDE_CLARO : AZUL_NOCHE,
          paper: esClaro ? CONCRETO : AZUL_ACERO,
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
          selected: esClaro ? alpha(NARANJA, 0.12) : alpha(AMARILLO, 0.16),
          selectedOpacity: esClaro ? 0.12 : 0.16,
          focus: esClaro ? alpha(NARANJA, 0.18) : alpha(AMARILLO, 0.2),
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
          background: esClaro ? CONCRETO : AZUL_ACERO,
          text: esClaro ? GRIS_TEXTO : GRIS_SUAVE,
        },
        // Bordes y separadores. En claro va un paso más oscuro que el fondo
        // de página: si usara BORDE_CLARO se confundiría con él.
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
          // Hay DOS versiones porque el color tiene que contrastar contra el
          // fondo, y cuánto contraste hace falta depende del tamaño de la
          // letra: un título grande se lee bien con menos contraste que un
          // texto chiquito. El naranja normal alcanza para lo grande pero
          // no para lo chico, así que la letra chica usa un naranja más
          // oscuro. A ese tamaño casi no se nota la diferencia de tono.
          // De noche no hace falta distinguir: el amarillo sirve para todo.

          // Para íconos, bordes, rellenos y títulos grandes (h2 a h5).
          // Se usa en: NavBar, Drawer, Footer, AdminCotizaciones,
          // ClienteDetalle, ClienteSeguimientoCard, HeaderUsuario, Search,
          // FacturaFormDialog, AgregarEquipoDialog, KioskProductCardDetail.
          accent: esClaro ? NARANJA : AMARILLO,

          // Para letra chica: subtítulos h6, epígrafes y textos de 14px o
          // menos, donde el naranja normal no se leería bien.
          // Se usa en: ClienteDetalle (el chip de cantidad ×N),
          // ClienteSeguimientoCard (las fechas de vencimiento).
          accentSmall: esClaro ? NARANJA_OSCURO : AMARILLO,

          // El color del texto y los íconos que van ENCIMA de algo pintado
          // con el acento (un botón naranja, una pestaña amarilla). Siempre
          // oscuro, porque tanto el naranja como el amarillo son claros.
          // Se usa en: el botón de acción rápida y ClienteSeguimientoCard
          // (la pestaña de factura abierta).
          onAccent: AZUL_NOCHE,

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

          // El color de los importes "Total". Es siempre el mismo naranja
          // oscuro, de día y de noche, porque así se decidió que se vea.
          // Se usa en: ClienteDetalle, ClienteSeguimientoCard,
          // FacturaFormDialog, AgregarEquipoDialog, AmpliarVencimientoDialog.
          //
          // Nota: de noche este naranja sobre el recuadro gris queda con poco
          // contraste. Si algún día cuesta leerlo, se le sube el tono acá y
          // se arregla en los cinco lugares de una vez.
          totalText: NARANJA_OSCURO,

          // ── La barra de arriba ───────────────────────────────────────
          //
          // El fondo de la barra es un tono más claro que el de la página,
          // para que se despegue y no parezca parte del fondo.
          // El texto, el ícono del carrito y la línea de abajo comparten el
          // mismo color: el acento del modo.
          // Se usan en: NavBar (y el fondo, en el estilo del AppBar).
          navbarBackground: esClaro ? CONCRETO : AZUL_ACERO,
          navbarText: esClaro ? NARANJA : AMARILLO,

          // El contorno de los campos de formulario (las cajitas donde se
          // escribe). Los bordes de tarjetas y las líneas divisorias NO usan
          // esto: usan "divider".
          // Se usa en: el estilo general de los campos de texto.
          inputBorder: esClaro ? BORDE_INPUT : GRIS_TEXTO,

          // El gris de los textos chiquitos de apoyo: epígrafes de fotos,
          // aclaraciones, etiquetas en minúscula.
          // Se usa en: el estilo general de "caption" y "overline".
          captionText: esClaro ? GRIS_CAPTION : GRIS_SUAVE,

          // El fondo de los recuadros que van DENTRO de una tarjeta, como el
          // cuadrito del total. Se separa de la tarjeta yendo al extremo de la
          // escala: blanco de día, casi negro de noche. Así el recuadro se lee
          // como una cosa aparte y no como parte de la tarjeta.
          // Se usa en: ClienteDetalle, ClienteSeguimientoCard, Cotizacion,
          // FacturaFormDialog.
          panelBackground: esClaro ? BLANCO : AZUL_NOCHE,

          // El fondo de la tira de pestañas de facturas, esa que simula
          // carpetas apiladas una detrás de otra.
          // Se usa en: ClienteSeguimientoCard.
          tabStripBackground: esClaro ? BORDE_CLARO : AZUL_NOCHE,

          // El violeta del estado "pendiente de despacho" de un cliente.
          // Es el único color que no sale de la paleta de la marca, y es a
          // propósito: los otros cuatro estados ya se llevaron el verde, el
          // azul, el naranja y el gris, y este necesita distinguirse de todos.
          // Se usa en: ClienteDetalle, ListaClientes, ClienteSeguimientoCard.
          pendienteDespacho: "#7E57C2",

          // El puntito verde que indica que un usuario está conectado.
          // Se usa en: ListaUsuarios y AdminCotizaciones.
          online: VERDE,

          // Los colores oficiales de WhatsApp y del botón de llamar. Son de
          // marcas ajenas, así que son siempre los mismos y no cambian con el
          // modo: si se tocaran, dejarían de reconocerse.
          // Se usan en: ButtonContacto, Drawer, ClienteSeguimientoCard.
          whatsapp: { main: "#25D366", dark: "#128C7E" },
          call: { main: AZUL_LLAMADA, dark: AZUL_LLAMADA_OSCURO },
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
          // 17.6px queda justo por debajo del umbral de "texto grande" de WCAG
          // (18.66px en negrita), así que necesita el acento oscuro.
          color: p.custom.accentSmall,

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
              borderRadius: theme.shape.borderRadius,
              padding: "8px 22px",
              boxShadow: "none",
              "&:hover": {
                boxShadow: theme.shadows[4],
              },
            }),
          },
          variants: [
            {
              props: { variant: "danger" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
                "&:hover": { backgroundColor: theme.palette.error.dark },
              }),
            },
            {
              // Mismo color que "danger", pero pensado para el botón de
              // cerrar sesión: ocupa todo el ancho y acomoda el ícono a la
              // izquierda del texto (antes esto se armaba a mano con
              // variant="danger" + fullWidth + startIcon en cada pantalla).
              props: { variant: "menuLogout" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
                width: "100%",
                justifyContent: "center",
                gap: 1,
                "&:hover": { backgroundColor: theme.palette.error.dark },
              }),
            },
            {
              // Usa el verde OSCURO, no el "main": el verde de marca con texto
              // blanco da 3.3:1 y no llega al mínimo AA. El oscuro da 5.0:1.
              props: { variant: "success" },
              style: ({ theme }) => ({
                backgroundColor: theme.palette.success.dark,
                color: theme.palette.common.white,
                "&:hover": {
                  backgroundColor: darken(theme.palette.success.dark, 0.15),
                },
              }),
            },
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
                  // El ícono es el que lleva el color de marca.
                  "& .MuiSvgIcon-root": {
                    color: theme.palette.custom.accent,
                  },
                  "&:hover": {
                    backgroundColor: esOscuro
                      ? theme.palette.background.paper
                      : alpha(theme.palette.primary.main, 0.06),
                    borderColor: theme.palette.custom.accent,
                    transform: "translateY(-3px)",
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
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: darken(theme.palette.custom.accent, 0.12),
                  transform: "translateY(-3px)",
                },
              }),
            },
          ],
        },

        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: 6,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.custom.inputBorder,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.custom.accent,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                // Foco en Naranja Seguridad: es naranja en ambos modos, por eso
                // usa "secondary.main" y no "custom.accent" (que vira a amarillo
                // en modo oscuro).
                borderColor: theme.palette.secondary.main,
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

        MuiInputAdornment: {
          styleOverrides: {
            positionEnd: {
              cursor: "pointer",
            },
          },
        },

        MuiInputLabel: {
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
            outlined: ({ theme }) => ({
              borderColor: theme.palette.divider,
            }),
          },
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
