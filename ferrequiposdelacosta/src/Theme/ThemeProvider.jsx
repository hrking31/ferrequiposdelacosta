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
