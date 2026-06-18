import {
  Box,
  Grid,
   Stack,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import LogoutIcon from "@mui/icons-material/Logout";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function AdminForms() {
  const theme = useTheme();
  const { logout } = useAuth();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const { name, photoURL, role, genero, permisos } = useSelector((state) => state.user);

  const handlerLogout = async () => {
    await logout();
  };

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
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 2,
        px: { xs: 2, sm: 3 },
        overflow: "auto",
        boxSizing: "border-box",
        //  border: "2px solid red"
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal name={name} photoURL={photoURL} role={role} genero={genero} />
      </Box>

      <Box
        sx={{
          width: "100%",
          flex: 1,
          display: "flex",
          justifyContent: "center",
          // border: "2px solid red",
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
               EDITAR o ELIMINAR USUARIOS
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
                // to="/vistaseleccionarequipo"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <FolderSharedIcon sx={{ fontSize: 40 }} />
                CLIENTES
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
                // to="/vistaseleccionarequipo"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <SupportAgentIcon sx={{ fontSize: 40 }} />
                CLIENTES POR COBRAR
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
                to="/vistacotizacionesAdmin"
                variant="adminSquare"
                sx={buttonStyle}
              >
                <ReceiptLongIcon sx={{ fontSize: 40 }} />
                SOLICITUDES COTIZACIONES
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          pt: 4,
          pb: 1.5,
          //  border: "2px solid red"
        }}
      >
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
