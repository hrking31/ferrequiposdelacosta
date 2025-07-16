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
          color: mode === "light" ? "#F7F7F7" : "#FFD166",
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
          color: mode === "light" ? "#F7F7F7" : "#FFD166",
          "@media (max-width:1200px)": {
            fontSize: "1.2rem",
          },
          "@media (max-width:900px)": {
            fontSize: "1rem",
          },
          "@media (max-width:600px)": {
            fontSize: "0.95rem",
          },
          "@media (max-width:400px)": {
            fontSize: "0.9rem",
          },
        },
        h5: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "1.2rem",
          color: mode === "light" ? "#3A5169" : "#FFD166",
        },
        h6: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "1rem",
          lineHeight: 1.3,
          color: mode === "light" ? "#FFF" : "#FFD166",

          // Tablet
          "@media (max-width:1200px)": {
            fontSize: "1rem",
          },
          // Laptop pequeña
          "@media (max-width:900px)": {
            fontSize: "0.95rem",
          },
          // Celulares grandes
          "@media (max-width:600px)": {
            fontSize: "0.85rem",
          },
          // Celulares pequeños
          "@media (max-width:400px)": {
            fontSize: "0.7rem",
          },
        },

        subtitle1: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "1rem",
          color: mode === "light" ? "#3A5169" : "#A0AEC0",
          // color: mode === "light" ? "#F7F7F7" : "#FFD166",
        },
        subtitle2: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 600,
          fontSize: "0.875rem",
          // color: mode === "light" ? "#3A5169" : "#A0AEC0",
          color: mode === "light" ? "#F7F7F7" : "#FFD166",
        },
        subtitle3: {
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 200,
          fontSize: "0.7rem",
          // fontSize: "0.675rem",
          lineHeight: 1.5,
          color: mode === "light" ? "#1A1A1A" : "#F7F7F7",
          display: "block",
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
          // fontSize: "0.875rem",
          fontSize: "0.675rem",
          lineHeight: 1.5,
          color: mode === "light" ? "#1A1A1A" : "#F7F7F7",
        },

        button: {
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: "0.875rem",
          textTransform: "none",
        },

        lineHeight: 1.75,
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
        MuiCssBaseline: {
          styleOverrides: {
            "*": {
              scrollbarWidth: "thin",
              scrollbarColor: "#c1c1c1 #f5f5f5",
            },
            "*::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "*::-webkit-scrollbar-thumb": {
              backgroundColor: "#c1c1c1",
              borderRadius: "10px",
            },
            "*::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "#a8a8a8",
            },
          },
        },

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
              color: mode === "light" ? "#F7F7F7" : "#FFD166",
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
            {
              props: { variant: "adminSquare" },
              style: ({ theme }) => ({
                backgroundColor:
                  theme.palette.mode === "light"
                    ? theme.palette.secondary.main
                    : theme.palette.primary.main,
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.primary.light
                    : theme.palette.secondary.light,
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? theme.palette.primary.dark
                      : theme.palette.primary.main,
                },
              }),
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
            root: ({ theme }) => ({
              color:
                theme.palette.mode === "light"
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,

              "&.Mui-focused": {
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
              },
            }),
          },
        },

        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: mode === "light" ? "#5C6B73" : "#A0AEC0",
            },
          },
        },

        MuiCheckbox: {
          styleOverrides: {
            root: {
              color: mode === "light" ? "#3A5169" : "#FFD166",
              "&.Mui-checked": {
                color: mode === "light" ? "#3A5169" : "#FFD166",
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
              color: mode === "light" ? "#F7F7F7" : "#FFD166",
              "&.Mui-checked": {
                color: mode === "light" ? "#F7F7F7" : "#FFD166",
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
