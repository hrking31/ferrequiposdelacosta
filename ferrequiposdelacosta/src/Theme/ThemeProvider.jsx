import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  responsiveFontSizes,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
    // Scrollbar amarillo en modo oscuro y azul acero en modo claro
    const scrollbarAcento = mode === "light" ? "#1E293B" : "#FFB800";

    let newTheme = createTheme({
      palette: {
        mode,
        primary: {
          main: mode === "light" ? "#1E293B" : "#FFB800", // Azul Acero / Amarillo Maquinaria
          light: mode === "light" ? "#334155" : "#FFC72C",
          dark: mode === "light" ? "#0F172A" : "#D97706",
          contrastText: mode === "light" ? "#FFFFFF" : "#0F172A",
        },
        secondary: {
          main: "#EA580C", // Naranja Seguridad Viento/Obra
          light: "#FFB800", // Amarillo Alerta
          dark: "#C2410C",
          contrastText: "#FFFFFF",
        },
        success: {
          main: "#16A34A", // Verde para disponible / en buen estado
          contrastText: "#FFFFFF",
        },
        warning: {
          main: "#F59E0B", // Amarillo prevención
          contrastText: "#0F172A",
        },
        error: {
          main: "#DC2626", // Rojo fuera de servicio
          contrastText: "#FFFFFF",
        },
        info: {
          main: "#0284C7",
          contrastText: "#FFFFFF",
        },

        background: {
          default: mode === "light" ? "#F1F5F9" : "#0F172A", // Gris concreto claro / Azul noche oscuro
          paper: mode === "light" ? "#FFFFFF" : "#1E293B",
        },
        text: {
          primary: mode === "light" ? "#0F172A" : "#F8FAFC",
          secondary: mode === "light" ? "#475569" : "#94A3B8",
        },
        custom: {
          primary: mode === "light" ? "#1E293B" : "#FFB800",
          secondary: mode === "light" ? "#EA580C" : "#F8FAFC",
        },
      },
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
          color: mode === "light" ? "#FFFFFF" : "#FFB800",

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
          color: mode === "light" ? "#1E293B" : "#FFB800",

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

        h5: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "1.2rem",
          color: mode === "light" ? "#1E293B" : "#FFB800",

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

        subtitle1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "1rem",
          color: mode === "light" ? "#475569" : "#94A3B8",

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
          color: mode === "light" ? "#475569" : "#94A3B8",

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
          color: mode === "light" ? "#0F172A" : "#F8FAFC",

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
          color: mode === "light" ? "#0F172A" : "#F8FAFC",

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

        lineHeight: 1.75,
        caption: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.75rem",
          color: mode === "light" ? "#64748B" : "#94A3B8",
        },

        overline: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "0.625rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: mode === "light" ? "#64748B" : "#94A3B8",
        },
      },

      shape: {
        borderRadius: 6, // Esquinas un poco más rectas para estética industrial
      },

      components: {
        MuiCssBaseline: {
          styleOverrides: {
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
              borderRadius: "4px",
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
          },
        },

        MuiAppBar: {
          styleOverrides: {
            root: () => ({
              backgroundColor: mode === "light" ? "#1E293B" : "#0F172A", // Navbar oscuro/profundo para dar soporte
              color: "#FFB800",
              borderBottom: `3px solid #EA580C`, // Detalle en naranja de seguridad
            }),
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              border: mode === "light" ? "1px solid #E2E8F0" : "1px solid #334155",
              boxShadow:
                mode === "dark"
                  ? "0 4px 6px -1px rgba(0, 0, 0, 0.4)"
                  : "0 4px 6px -1px rgba(15, 23, 42, 0.06)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-3px)",
                borderColor: mode === "light" ? "#EA580C" : "#FFB800",
                boxShadow:
                  mode === "dark"
                    ? "0 10px 15px -3px rgba(0, 0, 0, 0.6)"
                    : "0 10px 15px -3px rgba(15, 23, 42, 0.12)",
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              padding: "8px 22px",
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
            },
          },
          variants: [
            {
              props: { variant: "danger" },
              style: {
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                "&:hover": { backgroundColor: "#B91C1C" },
              },
            },
            {
              // Mismo color que "danger", pero pensado para el botón de
              // cerrar sesión: ocupa todo el ancho y acomoda el ícono a la
              // izquierda del texto (antes esto se armaba a mano con
              // variant="danger" + fullWidth + startIcon en cada pantalla).
              props: { variant: "menuLogout" },
              style: {
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                width: "100%",
                justifyContent: "center",
                gap: 1,
                "&:hover": { backgroundColor: "#B91C1C" },
              },
            },
            {
              props: { variant: "success" },
              style: {
                backgroundColor: "#16A34A",
                color: "#FFFFFF",
                "&:hover": { backgroundColor: "#15803D" },
              },
            },
            {
              props: { variant: "whatsapp" },
              style: {
                backgroundColor: "#25D366",
                color: "#FFFFFF",
                "&:hover": { backgroundColor: "#128C7E" },
              },
            },
            {
              props: { variant: "call" },
              style: {
                backgroundColor: "#0284C7",
                color: "#FFFFFF",
                "&:hover": { backgroundColor: "#0369A1" },
              },
            },
            {
              // Botón cuadrado del menú de AdminForms: ícono arriba, texto
              // abajo. La forma vive acá; el componente solo aporta el
              // ancho/alto (dependen de cuántos botones hay y del tamaño
              // de pantalla, algo que el tema no puede saber de antemano).
              props: { variant: "adminSquare" },
              style: ({ theme }) => ({
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                overflow: "hidden",
                backgroundColor: theme.palette.mode === "light" ? "#1E293B" : "#FFB800",
                color: theme.palette.mode === "light" ? "#FFB800" : "#0F172A",
                boxShadow: "none",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "light" ? "#0F172A" : "#F59E0B",
                  transform: "translateY(-3px)",
                },
              }),
            },
            {
              props: { variant: "quotationSquare" },
              style: () => ({
                backgroundColor: "#EA580C", // Naranja acción rápida
                color: "#FFFFFF",
                boxShadow: "none",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: "#C2410C",
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
                borderColor: theme.palette.mode === "light" ? "#CBD5E1" : "#475569",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.mode === "light" ? "#1E293B" : "#FFB800",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#EA580C", // Foco en Naranja Seguridad
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
            root: {
              borderColor: mode === "light" ? "#E2E8F0" : "#334155",
            },
          },
        },

        MuiCheckbox: {
          styleOverrides: {
            root: {
              color: mode === "light" ? "#1E293B" : "#FFB800",
              "&.Mui-checked": {
                color: mode === "light" ? "#EA580C" : "#FFB800",
              },
            },
          },
          defaultProps: {
            size: "small",
          },
        },

        MuiRadio: {
          styleOverrides: {
            root: {
              color: mode === "light" ? "#1E293B" : "#FFB800",
              "&.Mui-checked": {
                color: mode === "light" ? "#EA580C" : "#FFB800",
              },
            },
          },
          defaultProps: {
            size: "small",
          },
        },

        MuiTypography: {
          defaultProps: {
            variantMapping: {
              h1: "h1",
              h2: "h2",
              h5: "h5",
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
