import {
  Box,
  Stack,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import EliminarEquipos from "../../Components/EliminarEquipos/EliminarEquipos";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

const VistaEliminaEquipo = () => {
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
            vista={"Elimina el Equipo"}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Seleccionar otro equipo">
              <IconButton onClick={() => navigate("/vistaseleccionarequipo")}>
                <ListAltIcon />
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

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" /* border: "2px solid red" */ }}>
        <EliminarEquipos />
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
              onClick={() => navigate("/vistaseleccionarequipo")}
            >
              SELECCIONA OTRO EQUIPO
            </Button>

            <Button onClick={handlerLogout} variant="danger" fullWidth>
              CERRAR SESION
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default VistaEliminaEquipo;
