import { Box, Grid, Button, useMediaQuery } from "@mui/material";
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
      icon: <BuildIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "COTIZACIÓN",
    },
    {
      permiso: "cuentaCombro",
      to: "/vistacuentadecobro",
      icon: <ReceiptIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "CUENTA DE COBRO",
    },
    {
      permiso: "crearEquipos",
      to: "/vistacreaequipo",
      icon: <AddCircleOutlineIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "CREAR EQUIPO",
    },
    {
      permiso: "eliminarEditarEquipos",
      to: "/vistaseleccionarequipo",
      icon: <EditIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "EDITAR o ELIMINAR EQUIPO",
    },
    {
      permiso: "crearUsuarios",
      to: "/VistaCrearUsuarios",
      icon: <PersonAddAlt1Icon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "CREAR USUARIOS",
    },
    {
      permiso: "eliminarUsuarios",
      to: "/VistaEliminarUsuario",
      icon: <PersonRemoveIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "EDITAR o ELIMINAR USUARIOS",
    },
    {
      permiso: "clientes",
      to: undefined,
      icon: <FolderSharedIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "CLIENTES",
    },
    {
      permiso: "gestionCartera",
      to: undefined,
      icon: <SupportAgentIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "CLIENTES POR COBRAR",
    },
    {
      permiso: "solicitudesCotizaciones",
      to: "/vistacotizacionesAdmin",
      icon: <ReceiptLongIcon sx={{ fontSize: isCompact ? 28 : 40 }} />,
      label: "SOLICITUDES COTIZACIONES",
    },
  ];

  const botonesVisibles = botonesConfig.filter((boton) =>
    permisos.includes(boton.permiso)
  );

  const columnas = isMobile ? 2 : 3;
  const filas = Math.ceil(botonesVisibles.length / columnas) || 1;
  const gapPx = isCompact ? 12 : 32;

  const buttonStyle = {
    width: `calc((100% - ${(columnas - 1) * gapPx}px) / ${columnas})`,
    height: `calc((100% - ${(filas - 1) * gapPx}px) / ${filas})`,
    maxWidth: 240,
    maxHeight: 150,
    minHeight: 48,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: isCompact ? 1 : 2,
    fontSize: isCompact ? "0.7rem" : "0.875rem",
    overflow: "hidden",
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
        <HeaderUsuarioConModal
          name={name}
          photoURL={photoURL}
          role={role}
          genero={genero}
          vista={"Gestión de Operaciones"}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "center",
          gap: `${gapPx}px`,
          overflow: "hidden",
          // border: "2px solid red",
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
