import {
  Box,
  Stack,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import EliminarEquipos from "../../Components/EliminarEquipos/EliminarEquipos";
import EditIcon from "@mui/icons-material/Edit";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

const VistaEliminaEquipo = () => {
  const navigate = useNavigate();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const isFullScreen = useMediaQuery("(max-width:915px)");

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
        {/* El logo de la tienda va dentro del encabezado (conLogo), con ir
            a la tienda, al menú y cerrar sesión; en computador, también los
            botones de la vista (acciones). */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            vista={"Elimina el Equipo"}
            descripcion={"Saca el equipo del catálogo"}
            icono={<EditIcon />}
            acciones={
              <Tooltip title="Seleccionar otro equipo">
                <IconButton onClick={() => navigate("/vistaseleccionarequipo")} color="primary">
                  <ListAltIcon />
                </IconButton>
              </Tooltip>
            }
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", mx: isFullScreen ? 0 : 2 }}>
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
              size="small"
              onClick={() => navigate("/vistaseleccionarequipo")}
            >
              SELECCIONA OTRO EQUIPO
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default VistaEliminaEquipo;
