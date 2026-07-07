import { Box, Grid, Button, useMediaQuery } from "@mui/material";
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

  const botonesConfig = [
    {
      permiso: "cotizacion",
      to: "/vistacotizacion",
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      label: "COTIZACIÓN",
    },
    {
      permiso: "cuentaCombro",
      to: "/vistacuentadecobro",
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      label: "CUENTA DE COBRO",
    },
    {
      permiso: "crearEquipos",
      to: "/vistacreaequipo",
      icon: <AddCircleOutlineIcon sx={{ fontSize: 40 }} />,
      label: "CREAR EQUIPO",
    },
    {
      permiso: "eliminarEditarEquipos",
      to: "/vistaseleccionarequipo",
      icon: <EditIcon sx={{ fontSize: 40 }} />,
      label: "EDITAR o ELIMINAR EQUIPO",
    },
    {
      permiso: "crearUsuarios",
      to: "/VistaCrearUsuarios",
      icon: <PersonAddAlt1Icon sx={{ fontSize: 40 }} />,
      label: "CREAR USUARIOS",
    },
    {
      permiso: "eliminarUsuarios",
      to: "/VistaEliminarUsuario",
      icon: <PersonRemoveIcon sx={{ fontSize: 40 }} />,
      label: "EDITAR o ELIMINAR USUARIOS",
    },
    {
      permiso: "clientes",
      to: undefined,
      icon: <FolderSharedIcon sx={{ fontSize: 40 }} />,
      label: "CLIENTES",
    },
    {
      permiso: "gestionCartera",
      to: undefined,
      icon: <SupportAgentIcon sx={{ fontSize: 40 }} />,
      label: "CLIENTES POR COBRAR",
    },
    {
      permiso: "solicitudesCotizaciones",
      to: "/vistacotizacionesAdmin",
      icon: <ReceiptLongIcon sx={{ fontSize: 40 }} />,
      label: "SOLICITUDES COTIZACIONES",
    },
  ];

  const botonesVisibles = botonesConfig.filter((boton) =>
    permisos.includes(boton.permiso)
  );

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
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          // border: "2px solid red",
        }}
      >
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          spacing={{ xs: 2, sm: 4, md: 6 }}
        >
          {botonesVisibles.map((boton) => (
            <Grid
              key={boton.permiso}
              item
              xs={6}
              md={isMobile ? 6 : 4}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Button
                component={Link}
                to={boton.to}
                variant="adminSquare"
                sx={buttonStyle}
              >
                {boton.icon}
                {boton.label}
              </Button>
            </Grid>
          ))}
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
