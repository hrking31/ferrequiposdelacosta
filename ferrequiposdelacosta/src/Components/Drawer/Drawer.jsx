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
    <Box sx={{ width: drawerWidth }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            flexGrow: 1,
            textAlign: "center",
            fontSize: {
              xs: "1.5rem",
              sm: "2rem",
            },
          }}
        >
          Ferrequipos
        </Typography>
        <IconButton onClick={toggleDrawer}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          width: drawerWidth,
          height: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Contenido superior */}
        <Box>
          <ListItem>
            <ListItemText primary="Alquiler de equipos para la Construcción" />
          </ListItem>
          <Divider sx={{ width: "80%", mx: "auto" }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component="a"
                href="https://wa.me/+573116576633"
                target="_blank"
              >
                <ListItemIcon>
                  <WhatsApp />
                </ListItemIcon>
                <ListItemText primary="Cotiza con nosotros" />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider sx={{ width: "80%", mx: "auto" }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton component="a" href="tel:+573116576633">
                <ListItemIcon>
                  <LocalPhone />
                </ListItemIcon>
                <ListItemText primary="Llama ahora" />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider sx={{ width: "80%", mx: "auto" }} />
        </Box>
        <Box sx={{ mt: "auto" }}>
          <ListItem disablePadding>
            <ListItemButton onClick={toggleColorMode}>
              <ListItemIcon>
                {theme.palette.mode === "dark" ? (
                  <Brightness7 sx={{ mr: 0.5 }} />
                ) : (
                  <Brightness4 sx={{ mr: 0.5 }} />
                )}
              </ListItemIcon>
              {theme.palette.mode === "dark" ? "Claro" : "Oscuro"}
            </ListItemButton>
          </ListItem>
          <Divider sx={{ width: "80%", mx: "auto" }} />
          <ListItem disablePadding>
            <ListItemButton onClick={handleOpenAccount}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Mi cuenta" />
            </ListItemButton>
          </ListItem>
        </Box>
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
            bgcolor: "#FDF6EC",
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
                sx={{
                  display: "flex",
                  padding: 0,
                  color: "primary.main",
                  textTransform: "none",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  mb: 3,
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                    backgroundColor: "transparent",
                  },
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
                  "&:hover": {
                    textDecoration: "underline",
                  },
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
                  pt: 2,
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
