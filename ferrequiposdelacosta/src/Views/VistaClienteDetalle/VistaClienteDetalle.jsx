import { Box, Stack, IconButton, Tooltip } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import ClienteDetalle from "../../Components/ClienteDetalle/ClienteDetalle";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import BotonTienda from "../../Components/NavBar/BotonTienda";
import { usePantallaCompacta, usePantallaBaja } from "../../Utils/pantalla";

export default function VistaClienteDetalle() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho y sin
  // esto la pantalla se dibujaba como si fuera un computador.
  const isFullScreen = usePantallaCompacta();
  // El celular acostado: de alto quedan unos 390px y cada franja de aire pesa.
  const altoCorto = usePantallaBaja();

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // Sin barra de navegación (ver NavBar): ni arriba ni abajo hay que
        // dejarle hueco. En el celular el pie de ClienteDetalle ya deja 5px
        // bajo sus botones: con 7 más suman los 12 que deja el encabezado
        // arriba. Acostado, 4, que cada franja de aire pesa.
        pb: altoCorto ? 0.5 : isFullScreen ? "7px" : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          px: 0,
          // EN EL CELULAR, 12px arriba y abajo: el mismo aire que deja el pie
          // con sus botones, así el contenido queda parejo entre los dos. En
          // el computador no hay pie y el encabezado respira un poco más.
          py: isFullScreen ? (altoCorto ? 0.5 : 1.5) : 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          "@media (min-width:916px)": { px: 2 },
        }}
      >
        {/* El logo de la tienda, como en el menú: acá en computador y dentro
            del encabezado en el celular (conLogo), con ir a la tienda y
            cerrar sesión. */}
        {!isFullScreen && <BotonTienda alto={44} />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            vista={"Detalle Cliente"}
            descripcion={"Datos del cliente y su historial de facturas"}
            icono={<FolderSharedIcon />}
            compacto={isFullScreen}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Volver a Clientes">
              <IconButton onClick={() => navigate("/vistaclientes")} color="primary">
                <FolderSharedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Menú">
              <IconButton onClick={() => navigate("/adminforms")} color="primary">
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {/* El scroll ya no va acá: ClienteDetalle fija su propia tarjeta y el
          encabezado "Facturas / Crear Factura", y solo la lista de facturas
          se desplaza, dentro de este mismo alto fijo. */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", mx: isFullScreen ? 0 : 2 }}>
        <ClienteDetalle />
      </Box>

      {/* Esta vista no tiene pie propio: en celular ese renglón lo ocupan las
          acciones del cliente, que dibuja ClienteDetalle. El botón de MENU se
          sacó a pedido del dueño —al listado de clientes se vuelve con la
          carpeta, y de ahí al menú—, y el de cerrar sesión se mudó al bloque
          del usuario, arriba. */}
    </Box>
  );
}
