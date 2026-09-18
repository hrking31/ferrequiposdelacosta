import { Box, Stack, IconButton, Tooltip } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import ClienteDetalle from "../../Components/ClienteDetalle/ClienteDetalle";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import {
  usePantallaCompacta,
  usePantallaBaja,
  useNavbarAbajo,
} from "../../Utils/pantalla";

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
  // La franja de la barra de navegación, que se mueve solo por ancho.
  const navbarAbajo = useNavbarAbajo();

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
        // El aire va del lado en que esté la barra de navegación, no del
        // lado que diga la forma de la pantalla.
        pt: navbarAbajo ? 0 : { md: 8, lg: 9 },
        // Con la barra arriba, abajo no hay nada que esquivar: los 16px de
        // computador quedaban de aire muerto bajo los botones, y acostado el
        // teléfono ese alto se nota. Quedan 4, lo justo para que no se peguen
        // al borde.
        pb: navbarAbajo ? { xs: 7, sm: 8 } : altoCorto ? 0.5 : 2,
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
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
