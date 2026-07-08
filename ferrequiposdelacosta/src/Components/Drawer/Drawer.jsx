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
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import { useDispatch } from "react-redux";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useColorMode } from "../../Theme/ThemeProvider";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import Login from "../Login/Login";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function MobileDrawerLayout() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const theme = useTheme();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const equipo = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.equipos.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const { toggleColorMode } = useColorMode();
  const isSmallScreen = useMediaQuery("(max-width:599px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:600px) and (max-width:915px)",
  );

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    if (error) {
      showSnackbar(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo.",
        "error",
      );
    } else if (hasSearched && !loading && equipo.length === 0) {
      showSnackbar("No se encontraron equipos.", "warning");
    }
  }, [error, equipo, loading, hasSearched, showSnackbar]);

  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleOpenAccount = () => setOpenAccount(true);
  const handleCloseAccount = () => setOpenAccount(false);

  const toggleDrawer = () => setOpen((prev) => !prev);

  const drawerWidth = "clamp(240px, 50vw, 60vw)";

  const drawerContent = (
    <Box
      sx={{
        height: `calc(100vh - ${isSmallScreen ? 56 : 64}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ width: 48 }} />

        <Typography variant="h2" textAlign="center">
          Ferrequipos
        </Typography>

        <IconButton onClick={toggleDrawer}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" textAlign="center" sx={{ mt: 1 }}>
          Alquiler de equipos para la Construcción
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
        }}
      >
        <List>
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
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ width: "90%", mx: "auto" }} />

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
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={toggleColorMode}>
              <ListItemIcon>
                {theme.palette.mode === "dark" ? (
                  <Brightness7 sx={{ color: "warning.main" }} />
                ) : (
                  <Brightness4 sx={{ color: "primary.main" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={theme.palette.mode === "dark" ? " Claro" : "Oscuro"}
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ width: "90%", mx: "auto" }} />

          <ListItem disablePadding>
            <ListItemButton onClick={handleOpenAccount}>
              <ListItemIcon>
                {theme.palette.mode === "dark" ? (
                  <AccountCircle sx={{ color: "secondary.light" }} />
                ) : (
                  <AccountCircle sx={{ color: "primary.light" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Mi cuenta"
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Typography
          sx={{
            color:
              theme.palette.mode === "light"
                ? theme.palette.primary.light
                : theme.palette.secondary.light,
            fontSize: {
              xs: "0.6rem",
              sm: "0.7rem",
              md: "0.8rem",
            },
            textAlign: "center",
            display: "block",
          }}
        >
          © {new Date().getFullYear()}{" "}
          {isMediumScreen
            ? "Ferrequipos de la Costa. Todos los derechos reservados."
            : "Ferrequipos de la Costa."}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 0,
        height: isFullScreen ? "auto" : "100vh",
        overflow: isFullScreen ? "visible" : "hidden",
        // border: "2px solid red",
      }}
    >
      <CssBaseline />

      {/* AppBar (solo visible en móvil) */}
      {isFullScreen && (
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
              {theme.palette.mode === "light" ? (
                <MenuIcon sx={{ color: "secondary.main" }} />
              ) : (
                <MenuIcon sx={{ color: "secondary.light" }} />
              )}
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Search onSearch={handleSearch} LabelOff={false} />
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer solo para móviles */}
      {isFullScreen && (
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
      <Grid
        container
        sx={{
          height: isFullScreen ? "auto" : "100%",
          //  border: "2px solid red"
        }}
      >
        <Grid
          item
          md={3}
          sx={{
            display: isFullScreen ? "none" : "block",
            height: "100%",
            overflowY: "auto",
            borderRight: "1px solid",
            borderColor: "divider",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
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
              <Box sx={{ pt: 2, pb: 4 }}>
                <Search onSearch={handleSearch} />
              </Box>

              <InstallApp />

              <Box sx={{ pt: 2, pb: 4 }}>
                <EquipoImageCarousel />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 2,
                  pb: 6,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.75rem",
                    fontWeight: "bold",
                    letterSpacing: "0.5px",
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.main
                        : theme.palette.secondary.light,
                  }}
                >
                  Alquiler de equipos para la Construcción
                </Typography>
              </Box>

              <Box
                sx={{
                  pb: 8,
                }}
              >
                <ButtonContacto
                  width={{
                    md: 180,
                    lg: 250,
                  }}
                  fontSize={{
                    md: "0.8rem",
                    lg: "1rem",
                  }}
                />
              </Box>

              <Box
                sx={{
                  width: "100%",
                  height: 400,
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  pb: 4,
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

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 2,
                  pb: 6,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    letterSpacing: "0.5px",
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.main
                        : theme.palette.secondary.light,
                  }}
                >
                  Elaboración De Rejas En Hierro y Aluminio, Todo En Soldadura.
                </Typography>
              </Box>

              <Box
                sx={{
                  alignItems: "center",
                  pl: 2,
                }}
              >
                <Typography variant="subtitle1 ">
                  Llámanos para más información
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 2,
                  pb: 6,
                }}
              >
                <LocalPhone
                  sx={{
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.main
                        : theme.palette.secondary.light,
                  }}
                />
                <Typography variant="body1">
                  605 3356050 - 311 657 6633
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 1,
                p: 2,
                boxSizing: "border-box",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "95%",
                  borderTop: "1px solid",
                  borderColor: "divider",
                },
              }}
            >
              <IconButton onClick={toggleColorMode} disableRipple>
                {theme.palette.mode === "dark" ? (
                  <Brightness7 sx={{ color: "warning.main", mr: 2 }} />
                ) : (
                  <Brightness4 sx={{ color: "primary.main", mr: 2 }} />
                )}
                <Typography variant="subtitle1">
                  {theme.palette.mode === "dark" ? "Claro" : "Oscuro"}
                </Typography>
              </IconButton>

              <IconButton onClick={handleOpenAccount} disableRipple>
                {theme.palette.mode === "dark" ? (
                  <AccountCircle sx={{ color: "secondary.light", mr: 2 }} />
                ) : (
                  <AccountCircle sx={{ color: "primary.main", mr: 2 }} />
                )}
                <Typography variant="subtitle1">Mi cuenta</Typography>
              </IconButton>
            </Box>

            <Typography
              sx={{
                width: "100%",
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.primary.main
                    : theme.palette.secondary.light,
                fontSize: {
                  md: "0.675rem",
                },
                pt: 2,
                display: "block",
                textAlign: "center",
              }}
            >
              © {new Date().getFullYear()} Ferrequipos de la Costa. Todos los
              derechos reservados.
            </Typography>
          </Box>
        </Grid>

        <Box
          // sx={{
          //   flex: 1,
          //   //  border: "2px solid red"
          // }}
          sx={{
            flex: 1,
            height: isFullScreen ? "auto" : "100%",
            overflowY: isFullScreen ? "visible" : "auto",
          }}
        >
          {isFullScreen && (
            <Box
              sx={
                {
                  // border: "2px solid red",
                }
              }
            >
              <InstallApp />

              <EquipoImageCarousel />

              <WhatsAppButton />
            </Box>
          )}

          {loading ? (
            <LoadingLogo text="Cargando Equipos..." />
          ) : (
            <CardsEquipos />
          )}
        </Box>

        <Modal open={openAccount} onClose={handleCloseAccount}>
          <div
            style={{
              bgcolor: "background.default",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              padding: "0px",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <Login onClose={handleCloseAccount} />
          </div>
        </Modal>

        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Grid>
    </Box>
  );
}
