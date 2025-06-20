// import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
// import { useMemo, useState, useEffect , createContext, useContext } from "react";

// const ColorModeContext = createContext({ toggleColorMode: () => {} });

// export const useColorMode = () => useContext(ColorModeContext);

// export const CustomThemeProvider = ({ children }) => {
//   const [mode, setMode] = useState(() => {
//     // return localStorage.getItem("theme") || "light";
//     return (
//       localStorage.getItem("theme") ||
//       (window.matchMedia("(prefers-color-scheme: dark)").matches
//         ? "dark"
//         : "light")
//     );

//   });

//   useEffect(() => {
//     localStorage.setItem("theme", mode);
//   }, [mode]);

//   const colorMode = useMemo(
//     () => ({
//       toggleColorMode: () =>
//         setMode((prev) => (prev === "light" ? "dark" : "light")),
//     }),
//     []
//   );

//   const theme = useMemo(
//     () =>
//       createTheme({
//         palette: {
//           mode,
//           primary: {
//             light: "#85A6D2",
//             main: "#669BBC",
//             dark: "#3B6B8B",
//             contrastText: "#fff",
//           },
//           secondary: {
//             light: "#E57373",
//             main: "#C94C4C",
//             dark: "#8B2A2A",
//             contrastText: "#fff",
//           },
//           background: {
//             default: mode === "light" ? "#FDF6EC" : "#003049",
//             paper: mode === "light" ? "#FFF8E7" : "#0A2540",
//           },
//           text: {
//             primary: mode === "light" ? "#003049" : "#FDF6EC",
//             secondary: mode === "light" ? "#5C5C5C" : "#CCCCCC",
//           },
//         },
//         typography: {
//           fontFamily: "Poppins, Roboto, Arial, sans-serif",
//           h1: {
//             fontWeight: 700,
//             fontSize: "2.5rem",
//           },
//           button: {
//             textTransform: "none",
//             fontWeight: 600,
//           },
//         },
//         shape: {
//           borderRadius: 12,
//         },
//         components: {
//           MuiCard: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 12,
//                 border: "1px solid #e0e0e0",
//                 transition: "all 0.3s ease-in-out",
//                 cursor: "pointer",
//               },
//             },
//           },
//           MuiCardMedia: {
//             styleOverrides: {
//               root: {
//                 objectFit: "cover",
//                 borderTopLeftRadius: 12,
//                 borderTopRightRadius: 12,
//               },
//             },
//           },
//           MuiButton: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 12,
//                 padding: "8px 20px",
//               },
//             },
//             variants: [
//               {
//                 props: { variant: "danger" },
//                 style: ({ theme }) => ({
//                   color: theme.palette.primary.contrastText,
//                   backgroundColor: theme.palette.secondary.main,
//                   "&:hover": {
//                     backgroundColor: "#B03A3A",
//                   },
//                 }),
//               },
//               {
//                 props: { variant: "success" },
//                 style: {
//                   color: "#ffffff",
//                   backgroundColor: "#28a745",
//                   "&:hover": {
//                     backgroundColor: "#218838",
//                   },
//                 },
//               },
//               {
//                 props: { variant: "upload" },
//                 style: {
//                   color: "#ffffff",
//                   backgroundColor: "#009e88",
//                   "&:hover": {
//                     backgroundColor: "#007d6c",
//                   },
//                 },
//               },
//             ],
//           },
//           MuiTextField: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 12,
//               },
//             },
//           },
//         },
//       }),
//     [mode]
//   );

//   return (
//     <ColorModeContext.Provider value={colorMode}>
//       <ThemeProvider theme={theme}>
//         <CssBaseline />
//         {children}
//       </ThemeProvider>
//     </ColorModeContext.Provider>
//   );
// };

///////////////////////////////////////////////////////////////////

// import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
// import { useMemo, useState, createContext, useContext } from "react";

// const ColorModeContext = createContext({ toggleColorMode: () => {} });

// export const useColorMode = () => useContext(ColorModeContext);

// export const CustomThemeProvider = ({ children }) => {
//   const [mode, setMode] = useState("light");

//   const colorMode = useMemo(
//     () => ({
//       toggleColorMode: () =>
//         setMode((prev) => (prev === "light" ? "dark" : "light")),
//     }),
//     []
//   );

//   const theme = useMemo(
//     () =>
//       createTheme({
//         palette: {
//           mode,
//           // Paleta principal basada en el sector construcción
//           primary: {
//             light: "#5C6B73", // Gris acero claro
//             main: "#2A3547", // Azul industrial profundo
//             dark: "#1A1A1A", // Negro carbón
//             contrastText: "#FFFFFF",
//           },
//           secondary: {
//             light: "#FFD166", // Amarillo alerta claro
//             main: "#FF6B35", // Naranja seguridad
//             dark: "#D64045", // Rojo maquinaria
//             contrastText: "#FFFFFF",
//           },
//           // Colores adicionales para el tema
//           success: {
//             main: "#4CB944", // Verde seguridad
//             contrastText: "#FFFFFF",
//           },
//           warning: {
//             main: "#FFD166", // Amarillo alerta
//             contrastText: "#1A1A1A",
//           },
//           error: {
//             main: "#D64045", // Rojo maquinaria
//             contrastText: "#FFFFFF",
//           },
//           background: {
//             default: mode === "light" ? "#F7F7F7" : "#1A1A1A", // Blanco rotura / Negro carbón
//             paper: mode === "light" ? "#FFFFFF" : "#2A3547", // Blanco / Azul industrial
//           },
//           text: {
//             primary: mode === "light" ? "#1A1A1A" : "#F7F7F7",
//             secondary: mode === "light" ? "#5C6B73" : "#A0AEC0",
//           },
//         },
//         typography: {
//           fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
//           h1: {
//             fontWeight: 700,
//             fontSize: "2.5rem",
//             color: "#2A3547",
//           },
//           h2: {
//             fontWeight: 600,
//             color: "#2A3547",
//           },
//           button: {
//             textTransform: "none",
//             fontWeight: 600,
//           },
//         },
//         shape: {
//           borderRadius: 8, // Bordes ligeramente menos redondeados para aspecto industrial
//         },
//         components: {
//           MuiAppBar: {
//             styleOverrides: {
//               root: {
//                 backgroundColor: "#2A3547",
//                 color: "#FFFFFF",
//               },
//             },
//           },
//           MuiCard: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 8,
//                 border:
//                   mode === "light" ? "1px solid #E2E8F0" : "1px solid #2D3748",
//                 boxShadow:
//                   mode === "light"
//                     ? "0 2px 4px rgba(0,0,0,0.1)"
//                     : "0 2px 4px rgba(0,0,0,0.3)",
//                 transition: "all 0.3s ease-in-out",
//                 "&:hover": {
//                   boxShadow:
//                     mode === "light"
//                       ? "0 4px 8px rgba(0,0,0,0.15)"
//                       : "0 4px 8px rgba(0,0,0,0.4)",
//                 },
//               },
//             },
//           },
//           MuiButton: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 8,
//                 padding: "8px 20px",
//                 fontWeight: 600,
//                 boxShadow: "none",
//                 "&:hover": {
//                   boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
//                 },
//               },
//             },
//             variants: [
//               {
//                 props: { variant: "danger" },
//                 style: {
//                   backgroundColor: "#D64045",
//                   color: "#FFFFFF",
//                   "&:hover": {
//                     backgroundColor: "#B03A3A",
//                   },
//                 },
//               },
//               {
//                 props: { variant: "success" },
//                 style: {
//                   backgroundColor: "#4CB944",
//                   color: "#FFFFFF",
//                   "&:hover": {
//                     backgroundColor: "#3CA33C",
//                   },
//                 },
//               },
//               {
//                 props: { variant: "whatsapp" },
//                 style: {
//                   backgroundColor: "#25D366",
//                   color: "#FFFFFF",
//                   "&:hover": {
//                     backgroundColor: "#128C7E",
//                   },
//                 },
//               },
//               {
//                 props: { variant: "call" },
//                 style: {
//                   backgroundColor: "#34B7F1",
//                   color: "#FFFFFF",
//                   "&:hover": {
//                     backgroundColor: "#269BD1",
//                   },
//                 },
//               },
//             ],
//           },
//           MuiTextField: {
//             styleOverrides: {
//               root: {
//                 borderRadius: 8,
//               },
//             },
//           },
//           MuiDivider: {
//             styleOverrides: {
//               root: {
//                 borderColor: mode === "light" ? "#E2E8F0" : "#2D3748",
//               },
//             },
//           },
//         },
//       }),
//     [mode]
//   );

//   return (
//     <ColorModeContext.Provider value={colorMode}>
//       <ThemeProvider theme={theme}>
//         <CssBaseline />
//         {children}
//       </ThemeProvider>
//     </ColorModeContext.Provider>
//   );
// };

import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  responsiveFontSizes,
} from "@mui/material";
import { useMemo, useState, useEffect, createContext, useContext } from "react";

// Contexto para cambiar el modo del tema
const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

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

  useEffect(() => {
    localStorage.setItem("theme", mode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(() => {
    let newTheme = createTheme({
      palette: {
        mode,
        primary: {
          light: "#F7F7F7", // Blaco
          main: "#3A5169", // Azul industrial más claro
          dark: "#1E2A3A", // Versión oscura más suave
          contrastText: "#FFFFFF",
        },
        secondary: {
          light: "#FFD166", // Amarillo alerta claro
          main: "#FF6B35", // Naranja seguridad
          dark: "#D64045", // Rojo maquinaria
          contrastText: "#FFFFFF",
        },
        success: {
          main: "#4CB944",
          contrastText: "#FFFFFF",
        },
        warning: {
          main: "#FFD166",
          contrastText: "#1A1A1A",
        },
        error: {
          main: "#D64045",
          contrastText: "#FFFFFF",
        },
        background: {
          default: mode === "light" ? "#F5F7FA" : "#313D4A",
          // paper: mode === "light" ? "#3A5169" : "#FF6B35",
          paper: mode === "light" ? "#FF6B35" : "#3A5169",
        },
        text: {
          primary: mode === "light" ? "#1A1A1A" : "#F7F7F7",
          secondary: mode === "light" ? "#5C6B73" : "#A0AEC0",
        },
      },
      typography: {
        fontFamily: '"Open Sans", "Roboto", "Arial", sans-serif',
        h1: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "calc(2rem + 2vw)",
          lineHeight: 1.2,
          letterSpacing: "-0.01562em",
          // color: mode === "light" ? "#FFD166" : "#FFF",
          color: mode === "light" ? "#FFF" : "#FFD166",
          "@media (max-width:900px)": {
            fontSize: "calc(1.8rem + 1vw)",
          },
          "@media (max-width:600px)": {
            fontSize: "calc(1.5rem + 0.5vw)",
            lineHeight: 1.3,
          },
        },
        h2: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "calc(1.75rem + 1.5vw)",
          lineHeight: 1.3,
          color: mode === "light" ? "#FFF" : "#FFD166",
          "@media (max-width:900px)": {
            fontSize: "calc(1.5rem + 1vw)",
          },
          "@media (max-width:600px)": {
            fontSize: "calc(1.25rem + 0.5vw)",
          },
        },
        h3: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "calc(1.5rem + 1vw)",
          color: mode === "light" ? "#2A3547" : "#FFFFFF",
          "@media (max-width:900px)": {
            fontSize: "calc(1.25rem + 0.75vw)",
          },
          "@media (max-width:600px)": {
            fontSize: "1.25rem",
          },
        },
        h4: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: "calc(1.25rem + 0.5vw)",
          color: mode === "light" ? "#2A3547" : "#FFFFFF",
          "@media (max-width:600px)": {
            fontSize: "1.1rem",
          },
        },
        h5: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 500,
          fontSize: "1.25rem",
          color: mode === "light" ? "#2A3547" : "#FFFFFF",
        },
        h6: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "1.2rem", // base para desktop grandes
          lineHeight: 1.3,
          color: mode === "light" ? "#FFF" : "#FFD166",

          // Tablet
          "@media (max-width:1200px)": {
            fontSize: "1.1rem",
          },
          // Laptop pequeña
          "@media (max-width:900px)": {
            fontSize: "1rem",
          },
          // Celulares grandes
          "@media (max-width:600px)": {
            fontSize: "0.9rem",
          },
          // Celulares pequeños
          "@media (max-width:400px)": {
            fontSize: "0.8rem",
          },
        },

        subtitle1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "1rem",
          color: mode === "light" ? "#3A5169" : "#A0AEC0",
        },
        subtitle2: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "0.875rem",
          color: mode === "light" ? "#3A5169" : "#A0AEC0",
        },
        body1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "1rem",
          lineHeight: 1.5,
          color: mode === "light" ? "#1A1A1A" : "#F7F7F7",
          "@media (max-width:600px)": {
            fontSize: "0.9rem",
          },
        },
        body2: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.875rem",
          lineHeight: 1.5,
          color: mode === "light" ? "#1A1A1A" : "#F7F7F7",
        },
        button: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "0.875rem",
          textTransform: "none",
          lineHeight: 1.75,
        },
        caption: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.75rem",
          color: mode === "light" ? "#5C6B73" : "#A0AEC0",
        },
        overline: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 400,
          fontSize: "0.625rem",
          textTransform: "uppercase",
          color: mode === "light" ? "#5C6B73" : "#A0AEC0",
        },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor:
                theme.palette.mode === "light"
                  ? // ? theme.palette.primary.main
                    // : theme.palette.secondary.main,
                    theme.palette.secondary.main
                  : theme.palette.primary.main,
              // color: mode === "light" ? "#FFD166" : "#FFF",
              color: mode === "light" ? "#FFF" : "#FFD166",
            }),
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              boxShadow:
                mode === "dark"
                  ? "0 2px 4px rgba(0,0,0,0.1)"
                  : "0 2px 4px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                boxShadow:
                  mode === "dark"
                    ? "0 4px 8px rgba(0,0,0,0.15)"
                    : "0 4px 8px rgba(0,0,0,0.4)",
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              padding: "8px 20px",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              },
            },
          },
          variants: [
            {
              props: { variant: "danger" },
              style: {
                backgroundColor: "#D64045",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#B03A3A",
                },
              },
            },
            {
              props: { variant: "success" },
              style: {
                backgroundColor: "#4CB944",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#3CA33C",
                },
              },
            },
            {
              props: { variant: "whatsapp" },
              style: {
                backgroundColor: "#25D366",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#128C7E",
                },
              },
            },
            {
              props: { variant: "call" },
              style: {
                backgroundColor: "#34B7F1",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#269BD1",
                },
              },
            },
          ],
        },

        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: 4,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor:
                  theme.palette.mode === "light"
                    ? theme.palette.secondary.main
                    : theme.palette.secondary.light,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor:
                  theme.palette.mode === "light"
                    ? theme.palette.primary.main
                    : theme.palette.primary.light,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.secondary.dark,
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

        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: mode === "light" ? "#5C6B73" : "#A0AEC0",
            },
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
