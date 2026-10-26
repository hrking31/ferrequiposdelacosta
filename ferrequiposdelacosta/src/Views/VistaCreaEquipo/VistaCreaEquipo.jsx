import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CrearEquipos from "../../Components/CrearEquipos/CrearEquipos";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import BuildIcon from "@mui/icons-material/Build";
import CloseIcon from "@mui/icons-material/Close";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import PanelDocumentos from "../../Components/PanelLista/PanelDocumentos";
import DetalleCatalogo from "../../Components/KpiCard/DetalleCatalogo";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";

const VistaCreaEquipo = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const isFullScreen = useMediaQuery("(max-width:915px)");

  // LOS EQUIPOS QUE YA HAY EN EL CATÁLOGO (2026-10-26, pedido del dueño), para
  // no crear uno repetido. Es la misma lista del recuadro "Equipos" del menú y
  // sale del catálogo en memoria, que la app ya bajó al abrirse: verla no
  // cuesta ninguna lectura. Si la memoria está vacía —se recargó la página
  // estando acá— se pide una vez, como en editar o eliminar equipo.
  const { equipos: catalogo, loading: cargandoCatalogo } = useSelector((state) => state.equipos);
  const equiposEnLista = catalogo.length === 0 && cargandoCatalogo ? null : catalogo;
  const [verCatalogo, setVerCatalogo] = useState(false);

  useEffect(() => {
    if (catalogo.length === 0) {
      dispatch(fetchEquiposData());
    }
    // Solo al montar: si dependiera del catálogo, uno vacío de verdad haría
    // que se pidiera en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

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
            a la tienda, al menú y cerrar sesión. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            vista={"Crea un Nuevo Equipo"}
            descripcion={"Agrega un equipo nuevo al catálogo"}
            icono={<AddCircleOutlineIcon />}
          />
        </Box>
      </Box>

      {/* EN EL COMPUTADOR, el catálogo en una columna a la derecha del
          formulario, con el mismo recuadro del buzón y de las cuentas de
          cobro. En el celular no entra: va en una ventana (botón del pie). */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 2,
          mx: isFullScreen ? 0 : 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <CrearEquipos />
        </Box>
        {!isFullScreen && (
          <Box sx={{ width: 360, flexShrink: 0, minHeight: 0 }}>
            <PanelDocumentos titulo="Catálogo" icono={<BuildIcon />}>
              <Box sx={{ mt: 1.5, px: 1 }}>
                <DetalleCatalogo equipos={equiposEnLista} />
              </Box>
            </PanelDocumentos>
          </Box>
        )}
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
            <Button
              variant="contained"
              fullWidth
              size="small"
              onClick={() => setVerCatalogo(true)}
            >
              VER CATÁLOGO
            </Button>
          </Stack>
        </Box>
      )}

      {/* La X arriba y sin botón "Cerrar" al pie, como las ventanas de los
          recuadros del menú. */}
      <Dialog
        open={isFullScreen && verCatalogo}
        onClose={() => setVerCatalogo(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            color: theme.palette.custom.accent,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pr: 1,
          }}
        >
          <Box component="span" sx={{ flex: 1 }}>
            Equipos del catálogo
          </Box>
          <Tooltip title="Cerrar">
            {/* El rojo del tema para cancelar y salir, el mismo de "Cerrar
                sesión" en el encabezado. */}
            <IconButton
              size="small"
              color="error"
              aria-label="Cerrar"
              onClick={() => setVerCatalogo(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <DetalleCatalogo equipos={equiposEnLista} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VistaCreaEquipo;
