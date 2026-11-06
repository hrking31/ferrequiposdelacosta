import { useDispatch } from "react-redux";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import Logos from "../../assets/LogoFerrequipos.svg";
import LogoHorizontal from "../../assets/LogoFerrequiposHorizontal.svg";
import LogoHorizontalOscuro from "../../assets/LogoFerrequiposHorizontalOscuro.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import CamionContador from "../../Components/Camion/Camion.jsx";

// LAS VISTAS INTERNAS VAN SIN BARRA (2026-10-20): al empleado no le sirven el
// camión del carrito ni el título, y la barra le quitaba un renglón a cada
// pantalla. La barra queda para lo que ve el cliente —tienda, detalle,
// carrito, kiosco—. Se empezó por el menú; el 2026-10-21 siguieron las demás.
// Cada una lleva su propio logo para ir a la tienda (BotonTienda).
//
// Cuenta también lo que cuelga de la ruta: la ficha de un cliente es
// /vistaclientes/{id}.
const RUTAS_SIN_BARRA = [
  "/adminforms",
  "/vistacotizacionesadmin",
  "/vistacotizacion",
  "/vistacuentadecobro",
  "/vistacuentascobro",
  "/vistaequipos",
  "/vistausuarios",
  "/vistaclientes",
  "/vistaseguimientoclientes",
  // La puerta del personal: sin carrito ni título de la tienda.
  "/acceso",
];

const vaSinBarra = (pathname) => {
  const ruta = pathname.toLowerCase();
  return RUTAS_SIN_BARRA.some((sin) => ruta === sin || ruta.startsWith(`${sin}/`));
};

export default function MenuAppBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:915px)");
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isKioskMode = location.pathname.startsWith("/kiosk");
  const isEnHome = ["/", "/home"].includes(location.pathname.toLowerCase());
  const sinBarra = vaSinBarra(location.pathname);
  // A PRUEBA (pedido del dueño, 2026-11-06, "no estoy muy convencido"): en el
  // celular, el círculo y la palabra "Ferrequipos" se cambian por el logo
  // horizontal con el nombre, directo sobre la barra y sin círculo: el de
  // fondo oscuro en modo oscuro (y el kiosko) y el de fondo claro en modo
  // claro, donde la barra es casi blanca. En el computador, como estaba.
  // Para deshacerlo basta con dejar esto en false.
  const logoConNombre = isSmallScreen;
  const logoHorizontal =
    theme.palette.mode === "dark" ? LogoHorizontalOscuro : LogoHorizontal;

  const handleLogoClick = () => {
    dispatch(clearSearchEquipo());
    if (isKioskMode) {
      navigate("/kioskhome");
    } else if (!user) {
      navigate("/home");
    } else if (isEnHome) {
      navigate("/adminforms");
    } else {
      navigate("/home?vistahome=si");
    }
  };

  const handlecartClick = () => {
    if (isKioskMode) {
      navigate("/kioskcart");
    } else {
      navigate("/vistacart");
    }
  };

  if (sinBarra) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          top: isSmallScreen ? "auto" : 0,
          bottom: isSmallScreen ? 0 : "auto",
          boxShadow: theme.shadows[4],
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: {
              xs: "56px !important",
              sm: "64px !important",
              lg: "72px !important",
            },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <Box
            onClick={handleLogoClick}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Un círculo, no un óvalo (2026-11-06): el logo va en un
              // cuadrado, como en BotonTienda.
              // El círculo del logo NO sigue el acento ni el modo: es el
              // respaldo del logotipo, que es rojo y azul, y necesita blanco
              // siempre. Sobre naranja el rojo se pierde (se probó y se
              // revirtió); sobre amarillo tampoco convence.
              // El logo con nombre no lo necesita: trae su versión para cada
              // fondo (ver logoConNombre).
              ...(!logoConNombre && {
                p: 0.5,
                borderRadius: "50%",
                backgroundColor: theme.palette.common.white,
              }),
            }}
          >
            {logoConNombre ? (
              <img
                src={logoHorizontal}
                alt="logo"
                style={{ display: "block", height: 42, width: "auto" }}
              />
            ) : (
              <img
                src={Logos}
                alt="logo"
                style={{
                  display: "block",
                  height: "clamp(32px, 3vw, 48px)",
                  width: "clamp(32px, 3vw, 48px)",
                  objectFit: "cover",
                }}
              />
            )}
          </Box>

          {/* El nombre ya va en el logo: queda solo el espacio. */}
          {logoConNombre ? (
            <Box sx={{ flexGrow: 1 }} />
          ) : (
            <Typography
              variant="h1"
              component="div"
              sx={{
                flexGrow: 1,
                textAlign: "center",
              }}
            >
              Ferrequipos De La Costa
            </Typography>
          )}

          <IconButton
            onClick={handlecartClick}
            disableRipple
            sx={{
              cursor: "pointer",
              p: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Mismo color que el título del NavBar (h1), no "primary.light"
              // (ese token cambia de tema en tema y no está pensado para esto).
              color: theme.palette.custom.navbarText,
              "&:hover": {
                backgroundColor: "transparent",
              },
              "&:focus": {
                outline: "none",
              },
            }}
          >
            <CamionContador size={isXs ? 28 : 38} />
          </IconButton>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
