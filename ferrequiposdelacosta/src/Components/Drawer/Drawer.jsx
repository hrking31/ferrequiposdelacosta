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
  Dialog,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { WhatsApp, LocalPhone } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircle from "@mui/icons-material/AccountCircle";
import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import Footer from "../../Components/Footer/Footer";
import RecaptchaNotice from "../../Components/RecaptchaNotice/RecaptchaNotice";
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
import { useColorMode } from "../../Theme/useColorMode";
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
                  backgroundColor: theme.palette.custom.whatsapp.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{ color: (theme) => theme.palette.custom.whatsapp.main }}
              >
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
                  backgroundColor: theme.palette.custom.call.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{ color: (theme) => theme.palette.custom.call.main }}
              >
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
                {/* El ÍCONO cambia con el modo (sol / luna); el color lo pone
                    el tema en MuiListItemIcon. */}
                {theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
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
                <AccountCircle />
              </ListItemIcon>
              <ListItemText
                primary="Mi cuenta"
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Typography
          variant="copyright"
          sx={{
            color: theme.palette.custom.accent,
            textAlign: "center",
            display: "block",
          }}
        >
          © {new Date().getFullYear()}{" "}
          {isMediumScreen
            ? "Ferrequipos de la Costa. Todos los derechos reservados."
            : "Ferrequipos de la Costa."}
        </Typography>

        <RecaptchaNotice />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        pt: isFullScreen ? { xs: 7, sm: 8 } : { md: 8, lg: 9 },
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
            <IconButton edge="start" onClick={toggleDrawer} sx={{ color: "custom.accent" }}>
              <MenuIcon />
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
                <Typography variant="h3" sx={{ letterSpacing: "0.5px" }}>
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
                <Typography variant="h4" sx={{ letterSpacing: "0.5px" }}>
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
                      theme.palette.custom.accent,
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
              <IconButton
                onClick={toggleColorMode}
                disableRipple
                sx={{ "& .MuiSvgIcon-root": { color: "custom.accent", mr: 2 } }}
              >
                {/* El ÍCONO cambia con el modo (sol / luna), el color no. */}
                {theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
                <Typography variant="subtitle1">
                  {theme.palette.mode === "dark" ? "Claro" : "Oscuro"}
                </Typography>
              </IconButton>

              <IconButton
                onClick={handleOpenAccount}
                disableRipple
                sx={{ "& .MuiSvgIcon-root": { color: "custom.accent", mr: 2 } }}
              >
                <AccountCircle />
                <Typography variant="subtitle1">Mi cuenta</Typography>
              </IconButton>
            </Box>

            <Typography
              variant="copyright"
              sx={{
                width: "100%",
                color:
                  theme.palette.custom.accent,
                pt: 2,
                display: "block",
                textAlign: "center",
              }}
            >
              © {new Date().getFullYear()} Ferrequipos de la Costa. Todos los
              derechos reservados.
            </Typography>

            <RecaptchaNotice />
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

          {/* Va acá adentro, después de las tarjetas, porque esta columna es
              la que tiene el scroll: puesto afuera quedaría fijo tapando la
              lista. Mismo lugar que en el listado del kiosco. */}
          <Box component="footer" sx={{ width: "100%", mt: 2 }}>
            <Footer />
          </Box>
        </Box>

        <Dialog open={openAccount} onClose={handleCloseAccount} maxWidth="xs" fullWidth>
          <Login onClose={handleCloseAccount} />
        </Dialog>

        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Grid>
    </Box>
  );
}
