import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";

// LOS BOTONES DEL MENÚ (AdminForms) y el permiso que pide cada uno. Viven acá
// y no en el menú porque la pantalla de Usuarios los muestra también: qué ve
// cada rol al entrar (ver MenuDelRol). `corto` es el nombre en esas casillas.
//
// Crear usuarios y Editar / eliminar usuarios se juntaron en USUARIOS
// (pedido del dueño, 2026-10-28): todo se hace desde la misma pantalla.
const BOTONES_MENU = [
  {
    permiso: "cotizacion",
    to: "/vistacotizacion",
    icon: <BuildIcon />,
    label: "COTIZACIÓN",
    corto: "Cotización",
  },
  {
    permiso: "cuentaCombro",
    to: "/vistacuentadecobro",
    icon: <ReceiptIcon />,
    label: "CUENTA DE COBRO",
    corto: "Cuenta de cobro",
  },
  {
    permiso: "crearEquipos",
    to: "/vistacreaequipo",
    icon: <AddCircleOutlineIcon />,
    label: "CREAR EQUIPO",
    corto: "Crear equipo",
  },
  {
    permiso: "eliminarEditarEquipos",
    to: "/vistaequipos",
    icon: <EditIcon />,
    label: "EDITAR / ELIMINAR EQUIPO",
    corto: "Editar equipos",
  },
  {
    permiso: "crearUsuarios",
    to: "/vistausuarios",
    icon: <GroupIcon />,
    label: "USUARIOS",
    corto: "Usuarios",
  },
  {
    permiso: "clientes",
    to: "/vistaclientes",
    icon: <FolderSharedIcon />,
    label: "CLIENTES",
    corto: "Clientes",
  },
  {
    permiso: "gestionCartera",
    to: "/vistaseguimientoclientes",
    icon: <SupportAgentIcon />,
    label: "SEGUIMIENTO de CLIENTES",
    corto: "Seguimiento",
  },
  {
    permiso: "solicitudesCotizaciones",
    to: "/vistacotizacionesAdmin",
    icon: <ReceiptLongIcon />,
    label: "SOLICITUDES COTIZACIONES",
    corto: "Solicitudes",
  },
  {
    permiso: "cuentaCombro",
    to: "/vistacuentascobro",
    icon: <ManageSearchIcon />,
    label: "BUSCAR CUENTAS DE COBRO",
    corto: "Buscar cuentas",
  },
];

export default BOTONES_MENU;
