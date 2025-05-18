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
            main: "#C1121F",
          },
          secondary: {
            main: "#6699BBC",
          },
          background: {
            default: mode === "light" ? "#FDF6EC" : "#121212",
            paper: mode === "light" ? "#FFFFFF" : "#1E1E1E",
          },
          text: {
            primary: mode === "light" ? "#111" : "#E0E0E0",
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
                  backgroundColor: "#7C4DFF",
                  "&:hover": {
                    backgroundColor: "#780000",
                  },
                }),
              },
              {
                props: { variant: "success" },
                style: ({ theme }) => ({
                  color: theme.palette.primary.contrastText,
                  backgroundColor: "#7C4DFF",
                  "&:hover": {
                    backgroundColor: "#669BBC",
                  },
                }),
              },
              {
                props: { variant: "upload" },
                style: ({ theme }) => ({
                  color: theme.palette.primary.contrastText,
                  backgroundColor: "#00BFA5",
                  "&:hover": {
                    backgroundColor: "#003049",
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
