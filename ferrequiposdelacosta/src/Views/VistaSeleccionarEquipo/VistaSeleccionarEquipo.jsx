import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import BuscadorFiltro from "../../Components/BuscadorFiltro/BuscadorFiltro";
import CardsSearchEquipos from "../../Components/CardsSearchEquipos/CardsSearchEquipos";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import EditIcon from "@mui/icons-material/Edit";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

// El cartel que ocupa el lugar de las tarjetas cuando no hay nada que mostrar:
// al entrar (todavía no buscaste) y cuando la búsqueda no encuentra nada. El
// ícono y el texto los pone quien lo usa, que es el que sabe cuál de los dos
// casos es.
const MensajeVacio = ({ icono, titulo, detalle }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: 1,
      py: 6,
      px: 3,
      // Centrado vertical con "m: auto" en vez de justifyContent en el padre:
      // con justify-content, un contenido más alto que el área se recorta por
      // arriba y no se puede scrollear hasta él.
      m: "auto",
      color: "text.secondary",
      "& .MuiSvgIcon-root": { fontSize: 56, opacity: 0.4 },
    }}
  >
    {icono}
    <Typography variant="h6" sx={{ color: "text.primary" }}>
      {titulo}
    </Typography>
    <Typography variant="body2">{detalle}</Typography>
  </Box>
);

MensajeVacio.propTypes = {
  icono: PropTypes.node.isRequired,
  titulo: PropTypes.string.isRequired,
  detalle: PropTypes.string.isRequired,
};

const VistaSeleccionarEquipo = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  // El catálogo completo, el mismo que usa la tienda. Antes esta vista
  // consultaba Firestore en cada búsqueda y solo encontraba por el COMIENZO
  // del nombre; ahora filtra en memoria, así que "martillo" también encuentra
  // "Taladro martillo".
  const equipos = useSelector((state) => state.equipos.equipos);
  const loading = useSelector((state) => state.equipos.loading);
  const error = useSelector((state) => state.equipos.error);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const isFullScreen = useMediaQuery("(max-width:915px)");

  // Los tres bloques del cuerpo —buscador, tarjetas y botones— comparten ancho
  // y centrado. Antes esto vivía en un solo contenedor que además scrolleaba;
  // al separarlos hay que repetirlo, así que se declara una vez.
  const anchoContenido = {
    width: "100%",
    mx: "auto",
    [theme.breakpoints.up("md")]: { width: "60%" },
  };

  const equiposFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return [];
    return equipos.filter((equipo) =>
      (equipo.name || "").toLowerCase().includes(termino),
    );
  }, [equipos, busqueda]);

  const handleEditar = () => {
    if (equipoSeleccionado) {
      navigate("/vistaeditarequipo", { state: { equipo: equipoSeleccionado } });
    } else {
      showSnackbar("Debes seleccionar un Equipo para Editar.", "warning");
    }
  };

  const handleEliminar = () => {
    if (equipoSeleccionado) {
      navigate("/vistaeliminarequipo", {
        state: { equipo: equipoSeleccionado },
      });
    } else {
      showSnackbar("Debes seleccionar un Equipo para Eliminar.", "warning");
    }
  };

  const handlerLogout = async () => {
    await logout();
  };

  // El catálogo se pide una sola vez: si ya está cargado (porque se pasó por
  // la tienda o por otra vista), navegar hasta acá no vuelve a consultar.
  useEffect(() => {
    if (equipos.length === 0) {
      dispatch(fetchEquiposData());
    }
    // Solo al montar: si dependiera de "equipos", un catálogo vacío de verdad
    // haría que se pidiera en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Si el equipo elegido deja de estar a la vista —porque cambiaste la
  // búsqueda o la limpiaste— se suelta la selección. Sin esto quedaría
  // seleccionado algo que ya no se ve, y EDITAR o ELIMINAR trabajarían sobre
  // un equipo que el usuario cree haber soltado.
  useEffect(() => {
    if (
      equipoSeleccionado &&
      !equiposFiltrados.some((equipo) => equipo.id === equipoSeleccionado.id)
    ) {
      setEquipoSeleccionado(null);
    }
  }, [equiposFiltrados, equipoSeleccionado]);

  // "No se encontraron equipos" ya no va por aquí: con el filtrado al escribir
  // saldría un aviso por cada tecla. Ahora se muestra en el cuerpo de la vista.
  useEffect(() => {
    if (error) {
      showSnackbar(
        "Hubo un problema al cargar los equipos. Inténtalo de nuevo.",
        "error",
      );
    }
  }, [error, showSnackbar]);

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
      <Box
        sx={{
          p: 2,
          flexShrink: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Edita o Elimina un Equipo"}
            descripcion={"Busca el equipo que quieres editar o eliminar"}
            icono={<EditIcon />}
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

      {/* El buscador queda FIJO. Antes vivía dentro del área que scrollea:
          apenas la búsqueda devolvía varias tarjetas se iba hacia arriba, y
          para cambiar el texto había que volver a subir. */}
      <Box sx={{ ...anchoContenido, flexShrink: 0, pb: 2 }}>
        <BuscadorFiltro
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar equipo..."
        />
      </Box>

      {/* Lo ÚNICO que scrollea son las tarjetas. Los 6px de arriba son para que
          el contenedor no le recorte el borde superior a la primera fila
          cuando una tarjeta se levanta al pasar el mouse. */}
      <Box
        sx={{
          ...anchoContenido,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          pt: "6px",
        }}
      >
        {loading ? (
          <LoadingLogo height="40vh" text="Cargando equipos..." />
        ) : equiposFiltrados.length > 0 ? (
          <CardsSearchEquipos
            equipos={equiposFiltrados}
            onSelectEquipo={setEquipoSeleccionado}
            equipoSeleccionado={equipoSeleccionado}
          />
        ) : (
          // Antes acá salían 3 rectángulos grises animados, que parecían
          // "cargando" cuando en realidad la vista esperaba que escribieras.
          // Ahora dice lo que pasa.
          <MensajeVacio
            icono={busqueda ? <SearchOffIcon /> : <SearchIcon />}
            titulo={
              busqueda
                ? "No se encontraron equipos"
                : "Busca un equipo para empezar"
            }
            detalle={
              busqueda
                ? `Ningún equipo coincide con "${busqueda.trim()}".`
                : "Escribe el nombre del equipo que quieres editar o eliminar."
            }
          />
        )}
      </Box>

      {/* Los botones también quedan fijos, al pie del contenido y por encima de
          la barra de MENU / CERRAR SESION. */}
      <Box sx={{ ...anchoContenido, flexShrink: 0, pt: 2 }}>
        {/* Eran tres: había un CANCELAR que no cancelaba nada, solo soltaba la
            selección. Con el buscador nuevo dejó de hacer falta —la X limpia la
            búsqueda y la selección se suelta sola— así que se quitó y los dos
            que quedan se reparten el ancho. */}
        {/* En celular van lado a lado, como MENU y CERRAR SESION del pie:
            apilados se comian 130px de alto y del listado quedaba visible
            apenas media tarjeta. */}
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={6} sm={5} md={5}>
            <Button variant="contained" onClick={handleEditar} fullWidth>
              EDITAR
            </Button>
          </Grid>
          <Grid item xs={6} sm={5} md={5}>
            <Button variant="contained" color="error" onClick={handleEliminar} fullWidth>
              ELIMINAR
            </Button>
          </Grid>
        </Grid>
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
              onClick={handlerLogout}
              variant="contained"
              color="error"
              fullWidth
              size="small"
            >
              CERRAR SESIÓN
            </Button>
          </Stack>
        </Box>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
};

export default VistaSeleccionarEquipo;
