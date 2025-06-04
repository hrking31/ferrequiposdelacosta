import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useMemo, useState, createContext, useContext } from "react";

const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            light: "#85A6D2",
            main: "#669BBC",
            dark: "#3B6B8B",
            contrastText: "#fff",
          },
          secondary: {
            light: "#E57373",
            main: "#C94C4C",
            dark: "#8B2A2A",
            contrastText: "#fff",
          },
          background: {
            default: mode === "light" ? "#FDF6EC" : "#003049",
            paper: mode === "light" ? "#FFF8E7" : "#0A2540",
          },
          text: {
            primary: mode === "light" ? "#003049" : "#FDF6EC",
            secondary: mode === "light" ? "#5C5C5C" : "#CCCCCC",
          },
        },
        typography: {
          fontFamily: "Poppins, Roboto, Arial, sans-serif",
          h1: {
            fontWeight: 700,
            fontSize: "2.5rem",
          },
          button: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                border: "1px solid #e0e0e0",
                transition: "all 0.3s ease-in-out",
                cursor: "pointer",
              },
            },
          },
          MuiCardMedia: {
            styleOverrides: {
              root: {
                objectFit: "cover",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                padding: "8px 20px",
              },
            },
            variants: [
              {
                props: { variant: "danger" },
                style: ({ theme }) => ({
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.secondary.main,
                  "&:hover": {
                    backgroundColor: "#B03A3A",
                  },
                }),
              },
              {
                props: { variant: "success" },
                style: {
                  color: "#ffffff",
                  backgroundColor: "#28a745",
                  "&:hover": {
                    backgroundColor: "#218838",
                  },
                },
              },
              {
                props: { variant: "upload" },
                style: {
                  color: "#ffffff",
                  backgroundColor: "#009e88",
                  "&:hover": {
                    backgroundColor: "#007d6c",
                  },
                },
              },
            ],
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};


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