import {
  Box,
  Stack,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/useAuth";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import BotonTienda from "../../Components/NavBar/BotonTienda";
import UsersList from "../../Components/ListaUsuarios/ListaUsuarios";

export default function VistaEliminarUsuario() {
  const navigate = useNavigate();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");

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
        // dejarle hueco. En el celular el aire de abajo lo pone el pie.
        pb: isFullScreen ? 0 : 2,
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
          py: isFullScreen ? 1.5 : 2,
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
            vista={"Edita o Elimina un Usuario"}
            descripcion={"Edita o da de baja al personal"}
            icono={<PersonRemoveIcon />}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: { xs: "flex-start", md: "center" },
          mx: isFullScreen ? 0 : 2,
        }}
      >
        <UsersList />
      </Box>

      {isFullScreen && (
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
          >
            <Button
              variant="contained"
              fullWidth
              size="small"
              onClick={() => navigate("/adminforms")}
            >
              MENU
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
