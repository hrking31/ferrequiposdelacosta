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
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import WhatsApp from "@mui/icons-material/WhatsApp";
import LocalPhone from "@mui/icons-material/LocalPhone";
import CloseIcon from "@mui/icons-material/Close";
import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import Footer from "../../Components/Footer/Footer";
import Search from "../../Components/Search/Search";
import InstallApp from "../../Components/InstallApp/InstallApp.jsx";
import ButtonContacto, {
  WhatsAppButton,
} from "../../Components/ButtonContacto/ButtonContacto";
import EquipoImageCarousel from "../../Components/EquipoImageCarousel/EquipoImageCarousel.jsx";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import { useDispatch } from "react-redux";
import Brightness4 from "@mui/icons-material/Brightness4";
import Brightness7 from "@mui/icons-material/Brightness7";
import { useColorMode } from "../../Theme/useColorMode";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import { abrirWhatsapp, TELEFONO_EMPRESA } from "../../Utils/whatsapp";
import Place from "@mui/icons-material/Place";
import PasosAlquiler from "../ComoAlquilar/PasosAlquiler";
import MapaBodega from "../MapaBodega/MapaBodega";
import DondeEstamosDialogo from "../MapaBodega/DondeEstamosDialogo";

export default function MobileDrawerLayout() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  // "Dónde estamos" del celular: el mapa en una ventana.
  const [dondeEstamos, setDondeEstamos] = useState(false);
  const theme = useTheme();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const loading = useSelector((state) => state.equipos.loading);
  const { toggleColorMode } = useColorMode();
  const isSmallScreen = useMediaQuery("(max-width:599px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:600px) and (max-width:915px)",
  );
  // El botón del modo dice a qué modo pasa (2026-11-06): antes decía solo
  // "Claro" u "Oscuro", y en el celular con un espacio de más.
  const textoModo = theme.palette.mode === "dark" ? "Modo claro" : "Modo oscuro";

  // Al salir de la tienda, el buscador vuelve vacío.
  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  const toggleDrawer = () => setOpen((prev) => !prev);

  // Los títulos de la columna izquierda del computador: centrados y con los
  // renglones parejos, para que al angostar no quede una palabra sola
  // (2026-11-06).
  // Entre 916 y 1199 la columna mide de 229 a 300: ahí la letra crece con la
  // pantalla y llega a 1200 con el tamaño de siempre (el del tema), que
  // cuenta de ahí en adelante. Con la letra fija, en 916 la frase de las
  // rejas ocupaba seis renglones y dejaba un "Todo" suelto.
  const sxTextoColumna = (enGrande) => ({
    letterSpacing: "0.5px",
    textAlign: "center",
    textWrap: "balance",
    // Solo en pantallas medianas: de 1200 en adelante manda el tema.
    "@media (min-width:900px) and (max-width:1199.95px)": {
      fontSize: `clamp(${enGrande * 0.8}px, ${(enGrande / 1200) * 100}vw, ${enGrande}px)`,
    },
  });

  const drawerWidth = "clamp(240px, 50vw, 60vw)";

  const drawerContent = (
    <Box
      sx={{
        height: `calc(100vh - ${isSmallScreen ? 56 : 64}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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
        {/* Los pasos a la vista, como en la columna del computador (pedido
            del dueño, 2026-11-06). */}
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <PasosAlquiler denso />
        </Box>

        <Divider sx={{ width: "90%", mx: "auto" }} />

        {/* El mismo orden de la columna del computador (pedido del dueño,
            2026-11-06): los pasos, cotizar, dónde estamos (el mapa), las
            rejas y el teléfono. */}
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => abrirWhatsapp(TELEFONO_EMPRESA)}
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
              onClick={() => {
                setOpen(false);
                setDondeEstamos(true);
              }}
            >
              <ListItemIcon sx={{ color: "custom.accent" }}>
                <Place />
              </ListItemIcon>
              <ListItemText
                primary="Dónde estamos"
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ width: "90%", mx: "auto" }} />

        {/* El resto de la publicidad de la columna del computador (pedido
            del dueño, 2026-11-06). */}
        <Typography
          variant="h4"
          component="p"
          sx={{ ...sxTextoColumna(22.9), fontSize: "1.15rem", px: 2, pt: 2, pb: 1 }}
        >
          Elaboración De Rejas En Hierro y Aluminio, Todo En Soldadura.
        </Typography>

        {/* Llamar, al final, como los teléfonos en el computador. */}
        <List>
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
                primary={textoModo}
                primaryTypographyProps={{ variant: "subtitle1" }}
              />
            </ListItemButton>
          </ListItem>
          {/* "Mi cuenta" ya no va acá (2026-11-06): el personal entra por
              /acceso (ver VistaAcceso) y al cliente le hacía creer que
              alquilar pedía una cuenta. */}
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
              <Search LabelOff={false} />
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
                <Search />
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
                  pb: 3,
                }}
              >
                {/* Renglones parejos y centrados (2026-11-06): con la
                    columna angosta quedaba un "la" solo en su renglón. */}
                <Typography variant="h3" sx={sxTextoColumna(29.6)}>
                  Alquiler de equipos para la Construcción
                </Typography>
              </Box>

              {/* Los pasos a la vista, entre el título y el botón (pedido del
                  dueño, 2026-11-06): qué hacemos, cómo funciona y el botón
                  para empezar. En el celular van en "¿Cómo alquilar?". */}
              <Box sx={{ px: 2, pb: 5 }}>
                <PasosAlquiler denso />
              </Box>

              <Box
                sx={{
                  pb: 8,
                }}
              >
                {/* En pantallas medianas, el ancho de su texto: con 180 fijos
                    "Cotiza con nosotros" (203) quedaba pegado al borde
                    (2026-11-06). */}
                <ButtonContacto
                  width={{
                    md: "auto",
                    lg: 250,
                  }}
                />
              </Box>

              <Box sx={{ pb: 4 }}>
                <MapaBodega alto={400} />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 2,
                  pb: 6,
                }}
              >
                <Typography variant="h4" sx={sxTextoColumna(22.9)}>
                  Elaboración De Rejas En Hierro y Aluminio, Todo En Soldadura.
                </Typography>
              </Box>

              <Box
                sx={{
                  alignItems: "center",
                  pl: 2,
                }}
              >
                <Typography variant="subtitle1" sx={{ textWrap: "balance" }}>
                  Llámanos para más información
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  // Centrado: con los números uno debajo del otro, el ícono
                  // queda a la altura de los dos (pedido del dueño, 2026-11-06).
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
                {/* Cada número de una pieza (2026-11-06): con la columna
                    angosta se partía "605 3356050 - 311 / 657 6633". Si no
                    caben los dos, el segundo baja entero. */}
                <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1.5 }}>
                  {["605 3356050", "311 657 6633"].map((numero) => (
                    <Typography key={numero} variant="body1" sx={{ whiteSpace: "nowrap" }}>
                      {numero}
                    </Typography>
                  ))}
                </Box>
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
              {/* Un botón de texto con su ícono (2026-11-06): antes era un
                  botón redondo de ícono con el texto metido adentro. El
                  ícono cambia con el modo (sol / luna), el color no. */}
              <Button
                onClick={toggleColorMode}
                startIcon={theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
                sx={{
                  px: 1,
                  color: "text.primary",
                  textTransform: "none",
                  typography: "subtitle1",
                  "& .MuiButton-startIcon": { color: "custom.accent", mr: 1.5 },
                }}
              >
                {textoModo}
              </Button>
            </Box>

            <Typography
              variant="copyright"
              sx={{
                width: "100%",
                color:
                  theme.palette.custom.accent,
                // Sin aire propio arriba (2026-11-06): con él, el botón del
                // modo quedaba a 16 de la raya y a 32 del ©. Así queda
                // centrado entre los dos.
                pt: 0,
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

        <DondeEstamosDialogo open={dondeEstamos} onClose={() => setDondeEstamos(false)} />

      </Grid>
    </Box>
  );
}
