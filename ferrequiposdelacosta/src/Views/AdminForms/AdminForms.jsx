import {
  Box,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
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
  const { logout } = useAuth();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isShortViewport = useMediaQuery("(max-height:700px)");
  const isCompact = isFullScreen || isShortViewport;
  const { name, photoURL, role, genero, permisos } = useSelector((state) => state.user);

  const handlerLogout = async () => {
    await logout();
  };

  const botonesConfig = [
    {
      permiso: "cotizacion",
      to: "/vistacotizacion",
      icon: <BuildIcon />,
      label: "COTIZACIÓN",
    },
    {
      permiso: "cuentaCombro",
      to: "/vistacuentadecobro",
      icon: <ReceiptIcon />,
      label: "CUENTA DE COBRO",
    },
    {
      permiso: "crearEquipos",
      to: "/vistacreaequipo",
      icon: <AddCircleOutlineIcon />,
      label: "CREAR EQUIPO",
    },
    {
      permiso: "eliminarEditarEquipos",
      to: "/vistaseleccionarequipo",
      icon: <EditIcon />,
      label: "EDITAR o ELIMINAR EQUIPO",
    },
    {
      permiso: "crearUsuarios",
      to: "/VistaCrearUsuarios",
      icon: <PersonAddAlt1Icon />,
      label: "CREAR USUARIOS",
    },
    {
      permiso: "eliminarUsuarios",
      to: "/VistaEliminarUsuario",
      icon: <PersonRemoveIcon />,
      label: "EDITAR o ELIMINAR USUARIOS",
    },
    {
      permiso: "clientes",
      to: "/vistaclientes",
      icon: <FolderSharedIcon />,
      label: "CLIENTES",
    },
    {
      permiso: "gestionCartera",
      to: "/vistaseguimientoclientes",
      icon: <SupportAgentIcon />,
      label: "SEGUIMIENTO de CLIENTES",
    },
    {
      permiso: "solicitudesCotizaciones",
      to: "/vistacotizacionesAdmin",
      icon: <ReceiptLongIcon />,
      label: "SOLICITUDES COTIZACIONES",
    },
  ];

  const botonesVisibles = botonesConfig.filter((boton) =>
    permisos.includes(boton.permiso)
  );

  const columnas = isMobile ? 2 : 3;
  const filas = Math.ceil(botonesVisibles.length / columnas) || 1;
  const gapPx = isCompact ? 12 : 32;

  // La forma del botón (ícono arriba, texto abajo, etc.) ya vive en el
  // tema como variant="adminSquare". Acá solo queda lo que de verdad
  // depende de esta pantalla: cuántos botones entran y el tamaño de
  // pantalla, algo que el tema no puede saber de antemano.
  const buttonStyle = {
    width: `calc((100% - ${(columnas - 1) * gapPx}px) / ${columnas})`,
    height: `calc((100% - ${(filas - 1) * gapPx}px) / ${filas})`,
    maxWidth: 240,
    maxHeight: 150,
    minHeight: 90,
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
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Gestión de Operaciones"}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "safe center",
          gap: `${gapPx}px`,
          overflowY: "auto",
          overflowX: "hidden",
          mx: isFullScreen ? 0 : 2,
          // Aire arriba para que quepa el hover. Los botones se levantan 3px
          // al pasar el mouse, y como este contenedor recorta lo que se sale
          // —tiene overflow para poder hacer scroll—, a los de la primera fila
          // se les cortaba el borde de arriba justo debajo del encabezado.
          pt: "6px",
        }}
      >
        {botonesVisibles.map((boton) => (
          <Button
            key={boton.permiso}
            component={Link}
            to={boton.to}
            variant="adminSquare"
            sx={buttonStyle}
          >
            {boton.icon}
            {boton.label}
          </Button>
        ))}
      </Box>

      {isFullScreen && (
        <Box sx={{ pt: 4, pb: 1.5 }}>
          <Grid container justifyContent="center">
            <Grid item xs={12} sm={5} md={4}>
              <Button
                onClick={handlerLogout}
                variant="contained"
                color="error"
                fullWidth
                startIcon={<LogoutIcon />}
              >
                CERRAR SESIÓN
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
