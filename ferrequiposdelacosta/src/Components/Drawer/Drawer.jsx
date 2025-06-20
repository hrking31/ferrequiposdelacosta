import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  Box,
  Grid,
  CssBaseline,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  Snackbar,
  Modal,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { WhatsApp, LocalPhone } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircle from "@mui/icons-material/AccountCircle";
import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import Search from "../../Components/Search/Search";
import InstallApp from "../../Components/InstallApp/InstallApp.jsx";
import ButtonContacto, {
  WhatsAppButton,
} from "../../Components/ButtonContacto/ButtonContacto";
import EquipoImageCarousel from "../../Components/EquipoImageCarousel/EquipoImageCarousel.jsx";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useColorMode } from "../../Theme/ThemeProvider";
import Login from "../Login/Login";

export default function MobileDrawerLayout() {
  const [open, setOpen] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");
  const equipos = useSelector((state) => state.equipos.equipos);
  const equipo = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const { toggleColorMode } = useColorMode();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  useEffect(() => {
    if (error) {
      setSnackbarMessage(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo."
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } else if (hasSearched && !loading && equipo.length === 0) {
      setSnackbarMessage("No se encontraron equipos.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  }, [error, equipos, loading, hasSearched]);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleOpenAccount = () => setOpenAccount(true);
  const handleCloseAccount = () => setOpenAccount(false);

  const toggleDrawer = () => setOpen((prev) => !prev);

  const drawerWidth = "clamp(240px, 50vw, 60vw)";
  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "@media (max-height: 600px)": {
          height: "auto",
          minHeight: "100%",
        },
      }}
    >
      {/* Header del Drawer */}
      <Box sx={{ flexShrink: 0 }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
          <IconButton onClick={toggleDrawer} sx={{ color: "text.primary" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Título */}
        <Box sx={{ px: 2, mb: 3 }}>
          <Typography
            variant="h4"
            textAlign="center"
            sx={{
              color:
                theme.palette.mode === "dark"
                  ? "primary.light"
                  : "primary.main",
              fontWeight: 700,
            }}
          >
            Ferrequipos
          </Typography>
          <Typography variant="subtitle1" textAlign="center" sx={{ mt: 1 }}>
            Alquiler de equipos para la Construcción
          </Typography>
        </Box>
      </Box>

      {/* Contenido principal - Scrollable */}
      <Box
        sx={{
          flex: "1 1 auto",
          overflowY: "auto",
          py: 1,
          "@media (max-height: 600px)": {
            overflowY: "visible",
          },
        }}
      >
        <List>
          {/* Sección WhatsApp */}
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href="https://wa.me/+573116576633"
              target="_blank"
              sx={{
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(37, 211, 102, 0.08)"
                      : "rgba(37, 211, 102, 0.12)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#25D366" }}>
                <WhatsApp />
              </ListItemIcon>
              <ListItemText
                primary="Cotiza con nosotros"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ width: "80%", mx: "auto", my: 1 }} />

          {/* Sección Teléfono */}
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href="tel:+573116576633"
              sx={{
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(52, 183, 241, 0.08)"
                      : "rgba(52, 183, 241, 0.12)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#34B7F1" }}>
                <LocalPhone />
              </ListItemIcon>
              <ListItemText
                primary="Llama ahora"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* Footer - Siempre visible */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: "1px solid",
          borderColor: "divider",
          py: 1,
          position: "relative",
        }}
      >
        <List>
          {/* Toggle de tema */}
          <ListItem disablePadding>
            <ListItemButton onClick={toggleColorMode}>
              <ListItemIcon>
                {theme.palette.mode === "dark" ? (
                  <Brightness7 sx={{ color: "warning.main" }} />
                ) : (
                  <Brightness4 sx={{ color: "warning.main" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  theme.palette.mode === "dark" ? "Modo claro" : "Modo oscuro"
                }
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ width: "80%", mx: "auto", my: 1 }} />

          {/* Cuenta */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleOpenAccount}>
              <ListItemIcon>
                <AccountCircle sx={{ color: "secondary.main" }} />
              </ListItemIcon>
              <ListItemText
                primary="Mi cuenta"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Copyright - Se mantiene en la parte inferior */}
        <Typography
          sx={{
            px: 2,
            py: 1,
            color: "text.secondary",
            fontSize: "0.7rem",
            textAlign: "center",
            display: "block",
          }}
        >
          © {new Date().getFullYear()} Ferrequipos de la Costa.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar (solo visible en móvil) */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Toolbar
            sx={{
              minHeight: {
                xs: 56,
                sm: 64,
              },
            }}
          >
            <IconButton edge="start" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Search onSearch={handleSearch} LabelOff={false} />
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer solo para móviles */}
      {isMobile && (
        <Drawer
          open={open}
          onClose={toggleDrawer}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Contenido principal */}
      <Grid container>
        <Grid
          item
          md={3}
          sx={{
            // border: "2px solid #000",
            display: isMobile ? "none" : "block",
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ p: 1 }}>
              <Box sx={{ pt: 2 }}>
                <Search onSearch={handleSearch} />
              </Box>
              <InstallApp />
              <Box sx={{ pt: 2 }}>
                <EquipoImageCarousel />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mt: "15px",
                  mb: "15px",
                  fontSize: "1.5rem",
                }}
              >
                Alquiler de equipos para la Construcción
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ButtonContacto />
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  width: "100%",
                  height: 400,
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.7449071484803!2d-74.83734642630112!3d10.982617155359392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42ce6e1990133%3A0x279860b2dde76a7b!2sFerrequipos%20de%20la%20Costa!5e0!3m2!1ses-419!2sco!4v1750278112137!5m2!1ses-419!2sco"
                  style={{
                    border: 0,
                    width: "100%",
                    height: "100%",
                  }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mt: "15px",
                  mb: "15px",
                  fontSize: "1.5rem",
                }}
              >
                Elaboración De Rejas En Hierro y Aluminio, Todo En Soldadura.
              </Typography>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "#333", fontSize: "1.5rem" }}
                >
                  +57 311 657 6633
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  Llámanos para más información
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>

            <Box
              sx={{
                p: 2,
                flexDirection: "column",
                justifyContent: "flex-end",
                boxSizing: "border-box",
              }}
            >
              <IconButton
                onClick={toggleColorMode}
                disableRipple
                sx={{
                  display: "flex",
                  padding: 0,
                  color: "primary.main",
                  textTransform: "none",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  mb: 3,
                  cursor: "pointer",
                }}
                aria-label="Toggle theme"
              >
                {theme.palette.mode === "dark" ? (
                  <Brightness7 sx={{ mr: 0.5 }} />
                ) : (
                  <Brightness4 sx={{ mr: 0.5 }} />
                )}
                {theme.palette.mode === "dark" ? "Claro" : "Oscuro"}
              </IconButton>

              <Typography
                onClick={handleOpenAccount}
                sx={{
                  display: "flex",
                  cursor: "pointer",
                  color: "primary.main",
                  fontWeight: 600,
                }}
              >
                <AccountCircle sx={{ mr: 1 }} />
                Mi cuenta
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Box
          sx={{
            flex: 1,
            pt: isMobile ? 2 : 0,
            pb: 8,
            //  border: "2px solid #000"
          }}
        >
          {isMobile && (
            <Box>
              <InstallApp />
              <Box
                sx={{
                  pt: 6,
                }}
              >
                <EquipoImageCarousel />
              </Box>
              <WhatsAppButton />
            </Box>
          )}

          {loading ? <LoadingLogo /> : <CardsEquipos />}
        </Box>
        <Modal open={openAccount} onClose={handleCloseAccount}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#FDF6EC",
              padding: "0px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <Login onClose={handleCloseAccount} />
          </div>
        </Modal>
        <Snackbar
          open={openSnackbar}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Grid>
    </Box>
  );
}
