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
            main: "#669BBC",
          },
          secondary: {
            main: "#6699BBC",
          },
          background: {
            default: mode === "light" ? "#FDF6EC" : "#003049",
            paper: mode === "light" ? "#6699BBC" : "#003049",
          },
          text: {
            primary: mode === "light" ? "#003049" : "#FDF6EC",
            secondary: mode === "light" ? "#780000" : "#AE1F23",
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
                "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: "0 6px 16px rgba(102, 155, 188, 0.35)",
                },
              },
            },
          },
          MuiCardMedia: {
            styleOverrides: {
              root: {
                height: 180,
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
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: "#DC143C",
                  },
                }),
              },
              {
                props: { variant: "success" },
                style: ({ theme }) => ({
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: "#28a745",
                  },
                }),
              },
              {
                props: { variant: "upload" },
                style: ({ theme }) => ({
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: "#009e88",
                  },
                }),
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
