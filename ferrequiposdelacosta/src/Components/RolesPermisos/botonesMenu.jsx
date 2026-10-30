import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import PaymentsIcon from "@mui/icons-material/Payments";
import HandshakeIcon from "@mui/icons-material/Handshake";
import Inventory2Icon from "@mui/icons-material/Inventory2";

// LOS BOTONES DEL MENÚ (AdminForms) y el permiso que pide cada uno. Viven acá
// y no en el menú porque la pantalla de Usuarios los muestra también: qué ve
// cada rol al entrar (ver MenuDelRol). `corto` es el nombre en esas casillas.
//
// Crear usuarios y Editar / eliminar usuarios se juntaron en USUARIOS
// (pedido del dueño, 2026-10-28): todo se hace desde la misma pantalla. Lo
// mismo Crear equipo y Editar / eliminar equipo en EQUIPOS (2026-10-29).
//
// `area`: en qué recuadro del menú va (ver AREAS_MENU).
const BOTONES_MENU = [
  {
    permiso: "cotizacion",
    to: "/vistacotizacion",
    area: "ventas",
    icon: <BuildIcon />,
    label: "COTIZACIÓN",
    corto: "Cotización",
  },
  {
    permiso: "cuentaCombro",
    to: "/vistacuentadecobro",
    area: "cobros",
    icon: <ReceiptIcon />,
    label: "CUENTA DE COBRO",
    corto: "Cuenta de cobro",
  },
  {
    permiso: "eliminarEditarEquipos",
    to: "/vistaequipos",
    area: "catalogo",
    icon: <EditIcon />,
    label: "EQUIPOS",
    corto: "Equipos",
  },
  {
    permiso: "crearUsuarios",
    to: "/vistausuarios",
    area: "catalogo",
    icon: <GroupIcon />,
    label: "USUARIOS",
    corto: "Usuarios",
  },
  {
    permiso: "clientes",
    to: "/vistaclientes",
    area: "clientes",
    icon: <FolderSharedIcon />,
    label: "CLIENTES",
    corto: "Clientes",
  },
  {
    permiso: "gestionCartera",
    to: "/vistaseguimientoclientes",
    area: "clientes",
    icon: <SupportAgentIcon />,
    label: "SEGUIMIENTO de CLIENTES",
    corto: "Seguimiento",
  },
  {
    permiso: "solicitudesCotizaciones",
    to: "/vistacotizacionesAdmin",
    area: "ventas",
    icon: <ReceiptLongIcon />,
    label: "SOLICITUDES COTIZACIONES",
    corto: "Solicitudes",
  },
  {
    permiso: "cuentaCombro",
    to: "/vistacuentascobro",
    area: "cobros",
    icon: <ManageSearchIcon />,
    label: "BUSCAR CUENTAS DE COBRO",
    corto: "Buscar cuentas",
  },
];

// LAS ÁREAS DEL MENÚ (pedido del dueño, 2026-10-29: "reorganiza todo, ya hay
// menos botones"): los botones agrupados de a dos, cada área con su ícono y
// su color. `color` es el del tema: info, success, warning o el acento. Cada
// rol ve solo las áreas en las que tiene algún botón.
export const AREAS_MENU = [
  { id: "ventas", titulo: "VENTAS", icono: <RequestQuoteIcon />, color: "info" },
  { id: "cobros", titulo: "COBROS", icono: <PaymentsIcon />, color: "success" },
  { id: "clientes", titulo: "CLIENTES", icono: <HandshakeIcon />, color: "warning" },
  { id: "catalogo", titulo: "CATÁLOGO Y PERSONAL", icono: <Inventory2Icon />, color: "accent" },
];

export default BOTONES_MENU;
