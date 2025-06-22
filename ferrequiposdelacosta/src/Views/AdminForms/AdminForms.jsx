import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import LogoutIcon from "@mui/icons-material/Logout";


export default function AdminForms() {
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:601px) and (max-width:915px)"
  );
  const { name, genero, permisos } = useSelector((state) => state.user);
  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  let appBarHeight = 64;

  if (isSmallScreen) {
    appBarHeight = 56;
  } else if (isMediumScreen) {
    appBarHeight = 64;
  }
  const buttonStyle = {
    width: {
      xs: "100%", 
      sm: 240, 
    },
    height: {
      xs: 180, 
      sm: 150, 
    },
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: {
      xs: 2,
      sm: 2,
      md: 4,
    },
    textAlign: "center",
    // border: "2px solid red",
  };
  
  
  return (
    <Box
      sx={{
        height: `calc(100vh - ${appBarHeight}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        p: 2,
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            color: theme.palette.text.secondary,
          }}
        >
          {saludo} {name}, Qué vamos a hacer hoy?
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          flex: 1,
          display: "flex",
          justifyContent: "center",
          // border: "2px solid red",
          p: 0,
        }}
      >
        <Grid
          container
          justifyContent="center"
          spacing={{ xs: 2, sm: 4, md: 6 }}
        >
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("cotizacion") && (
              <Button
                component={Link}
                to="/vistacotizacion"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <BuildIcon sx={{ fontSize: 40 }} />
                COTIZACIÓN
              </Button>
            )}
          </Grid>
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("cuentaCombro") && (
              <Button
                component={Link}
                to="/vistacuentadecobro"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <ReceiptIcon sx={{ fontSize: 40 }} />
                CUENTA DE COBRO
              </Button>
            )}
          </Grid>
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("crearEquipos") && (
              <Button
                component={Link}
                to="/vistacreaequipo"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 40 }} />
                CREAR EQUIPO
              </Button>
            )}
          </Grid>
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("eliminarEditarEquipos") && (
              <Button
                component={Link}
                to="/vistaseleccionarequipo"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <EditIcon sx={{ fontSize: 40 }} />
                EDITAR o ELIMINAR EQUIPO
              </Button>
            )}
          </Grid>
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("crearUsuarios") && (
              <Button
                component={Link}
                to="/VistaCrearUsuarios"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <PersonAddAlt1Icon sx={{ fontSize: 40 }} />
                CREAR USUARIOS
              </Button>
            )}
          </Grid>
          <Grid
            item
            xs={6}
            md={isMobile ? 6 : 4}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {permisos.includes("eliminarUsuarios") && (
              <Button
                component={Link}
                to="/VistaEliminarUsuario"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <PersonRemoveIcon sx={{ fontSize: 40 }} />
                ELIMINAR USUARIOS
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, mb: 2 }}>
        <Grid container justifyContent="center">
          <Grid item xs={12} sm={5} md={4}>
            <Button
              onClick={handlerLogout}
              variant="danger"
              fullWidth
              startIcon={<LogoutIcon />}
            >
              CERRAR SESIÓN
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}






