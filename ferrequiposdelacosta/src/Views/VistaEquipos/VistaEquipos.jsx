import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import EditIcon from "@mui/icons-material/Edit";
import BuildIcon from "@mui/icons-material/Build";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import PanelDocumentos from "../../Components/PanelLista/PanelDocumentos";
import EditarEquipos from "../../Components/EditarEquipos/EditarEquipos";
import EliminarEquipoDialogo from "../../Components/EliminarEquipos/EliminarEquipoDialogo";
import ListaEquipos from "../../Components/CatalogoEquipos/ListaEquipos";
import FichaEquipo from "../../Components/CatalogoEquipos/FichaEquipo";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";
import useSnackbar from "../../Hooks/useSnackbar";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { usePantallaCompacta } from "../../Utils/pantalla";

// Con este id los botones del encabezado y del pie guardan y deshacen.
const ID_FORMULARIO = "form-editar-equipo";

const rutaFicha = (id) => `/vistaequipos/${id}`;
const rutaEditar = (id) => `/vistaequipos/${id}/editar`;

// EQUIPOS: VER, EDITAR Y ELIMINAR EN UNA SOLA PANTALLA (2026-10-26, pedido
// del dueño; antes eran tres pantallas). Tres niveles, cada uno en su
// dirección (así recargar no pierde dónde se estaba):
// - /vistaequipos: la lista del catálogo;
// - /vistaequipos/{id}: la ficha del equipo, con EDITAR y ELIMINAR. En el
//   computador (desde 1010px), la lista a la izquierda y la ficha a la
//   derecha (la opción 2 que eligió el dueño); más angosto, una u otra;
// - /vistaequipos/{id}/editar (`editando`): el editor y, desde 1520px, la
//   lista al lado para pasar a editar otro. Si hay cambios sin guardar,
//   pregunta antes de dejarlo.
// La llave sube un nivel: del editor a la ficha del mismo equipo (en el
// computador, con la lista al lado) y de la ficha a la lista.
//
// Los mismos cortes de Crear equipo (que son los de Seguimiento).
const VistaEquipos = ({ editando = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { name, photoURL, role, genero } = useSelector((state) => state.user);
  const isFullScreen = usePantallaCompacta();
  const dosColumnas = useMediaQuery("(min-width:1010px)") && !isFullScreen;
  const conPanel = useMediaQuery("(min-width:1520px)") && !isFullScreen;
  const dosFotosPorFila = useMediaQuery("(min-width:1170px)") && !isFullScreen;

  // El catálogo en memoria (lo baja la app al abrirse): verlo no cuesta
  // lecturas. Si está vacío —se recargó la página acá— se pide una vez.
  const { equipos: catalogo, loading: cargandoCatalogo } = useSelector((state) => state.equipos);
  const equipo = id ? catalogo.find((e) => e.id === id) || null : null;
  const esperandoCatalogo = catalogo.length === 0 && cargandoCatalogo;
  const editar = editando && equipo !== null;
  const aviso =
    id && !equipo && !esperandoCatalogo ? "Ese equipo ya no está en el catálogo: elige otro." : null;

  const [cambios, setCambios] = useState(0);
  // Adónde ir si confirma que deja los cambios sin guardar.
  const [destinoPendiente, setDestinoPendiente] = useState(null);
  const [verEliminar, setVerEliminar] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (catalogo.length === 0) {
      dispatch(fetchEquiposData());
    }
    // Solo al montar: si dependiera del catálogo, uno vacío de verdad haría
    // que se pidiera en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Con cambios sin guardar, el navegador también pregunta antes de recargar
  // o cerrar la pestaña.
  useEffect(() => {
    if (cambios === 0) return undefined;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [cambios]);

  // Deja el editor: si tiene cambios sin guardar, primero pregunta.
  const irA = (ruta) => {
    if (cambios > 0) setDestinoPendiente(ruta);
    else navigate(ruta);
  };
  // Tocar un equipo de la lista: editando, pasa a editar ese; si no, su ficha.
  const elegir = (otro) => {
    if (otro.id === id) return;
    if (editar) irA(rutaEditar(otro.id));
    else navigate(rutaFicha(otro.id));
  };
  // Sube un nivel.
  const volver = () => {
    if (editar) irA(rutaFicha(equipo.id));
    else if (id) navigate("/vistaequipos");
  };
  const abrirEditor = () => navigate(rutaEditar(equipo.id));

  const descripcion = editar
    ? cambios > 0
      ? `${equipo.name} · ${cambios} ${cambios === 1 ? "recuadro" : "recuadros"} con cambios sin guardar`
      : `Editando ${equipo.name}`
    : equipo
      ? equipo.name
      : "Elige un equipo para verlo, editarlo o eliminarlo";

  // El menú al lado del buscador, en el celular (como en Clientes y
  // Seguimiento).
  const menuJuntoAlBuscador = isFullScreen && (
    <Tooltip title="Menú">
      <IconButton
        onClick={() => navigate("/adminforms")}
        aria-label="Menú"
        color="primary"
        sx={{ flexShrink: 0 }}
      >
        <DashboardIcon />
      </IconButton>
    </Tooltip>
  );

  const ficha = equipo && (
    // Una por equipo: al pasar a otro arranca en su portada.
    <FichaEquipo
      key={equipo.id}
      equipo={equipo}
      onEditar={abrirEditor}
      onEliminar={() => setVerEliminar(true)}
      // En el celular, EDITAR y Eliminar van en el pie.
      conBotones={!isFullScreen}
      // Al lado de la lista, al alto de la pantalla: sin hueco abajo.
      llenarAlto={dosColumnas}
    />
  );

  const panelCatalogo = (
    <PanelDocumentos titulo="Catálogo" icono={<BuildIcon fontSize="small" />}>
      <ListaEquipos equipos={catalogo} idElegido={equipo?.id} onElegir={elegir} enPanel />
    </PanelDocumentos>
  );

  let contenido;
  if (esperandoCatalogo) {
    contenido = <LoadingLogo height="40vh" text="Cargando equipos..." />;
  } else if (editar) {
    contenido = (
      <>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {/* Un formulario por equipo: al pasar a otro arranca de cero. */}
          <EditarEquipos
            key={equipo.id}
            equipo={equipo}
            idFormulario={ID_FORMULARIO}
            anchoCompleto={dosColumnas}
            fotosPorFila={dosFotosPorFila ? 2 : 1}
            onCambios={setCambios}
          />
        </Box>
        {conPanel && <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>{panelCatalogo}</Box>}
      </>
    );
  } else if (dosColumnas) {
    // La opción 2: la lista a la izquierda y la ficha a la derecha.
    contenido = (
      <>
        <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>{panelCatalogo}</Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {ficha || (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                textAlign: "center",
                color: "text.secondary",
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <TouchAppIcon sx={{ fontSize: 56, opacity: 0.4 }} />
              <Typography variant="h6" sx={{ color: "text.primary" }}>
                Elige un equipo de la lista
              </Typography>
              <Typography variant="body2">{aviso || "Aquí vas a ver su ficha."}</Typography>
            </Box>
          )}
        </Box>
      </>
    );
  } else {
    // Más angosto: la lista o la ficha, una a la vez.
    contenido = (
      <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {ficha || (
          <>
            {aviso && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                {aviso}
              </Typography>
            )}
            <ListaEquipos equipos={catalogo} onElegir={elegir} accion={menuJuntoAlBuscador} />
          </>
        )}
      </Box>
    );
  }

  // EN EL CELULAR, el pie solo con un equipo abierto: EQUIPOS (sube un nivel),
  // lo de la ficha o del editor, y el menú al final. En la lista no
  // hay pie: el menú va junto al buscador.
  const conPie = isFullScreen && equipo !== null;
  const botonPie = { p: 1.25 };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // En el celular el pie deja 5px bajo sus botones: con 7 más suman los
        // 12 del encabezado, como en la ficha del cliente. Sin pie, los 12.
        pb: isFullScreen ? (conPie ? "7px" : 1.5) : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          px: 0,
          py: isFullScreen ? 1.5 : 2,
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
            conLogo
            vista={"Equipos"}
            descripcion={descripcion}
            icono={<EditIcon />}
            compacto={isFullScreen}
            // En computador: editando, la llave, Guardar, Deshacer y
            // Eliminar; en la ficha sin lugar para la
            // lista, la llave para volver a ella. El
            // menú lo pone el encabezado al final. En celular, todo al pie.
            acciones={
              isFullScreen ? undefined : editar ? (
                <>
                  {/* La llave, que es la que lleva a la lista: siempre, también
                      con la lista al lado (pedido del dueño, 2026-10-26). */}
                  <Tooltip title="Volver al equipo">
                    <IconButton onClick={volver} color="info">
                      <BuildIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Guardar cambios">
                    <IconButton type="submit" form={ID_FORMULARIO} color="success">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Deshacer los cambios">
                    <IconButton type="reset" form={ID_FORMULARIO} color="warning">
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar equipo">
                    <IconButton onClick={() => setVerEliminar(true)} color="error">
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : equipo && !dosColumnas ? (
                <Tooltip title="Ver catálogo">
                  <IconButton onClick={volver} color="info">
                    <BuildIcon />
                  </IconButton>
                </Tooltip>
              ) : undefined
            }
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 3, mx: isFullScreen ? 0 : 2 }}>
        {contenido}
      </Box>

      {conPie && (
        <Box sx={{ py: 0.625, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* Solo íconos en el pie (pedido del dueño, 2026-10-26). La
                llave sube un nivel, como en el computador: del editor a la
                ficha y, tocándola otra vez, a la lista. */}
            <Tooltip title={editar ? "Volver al equipo" : "Ver catálogo"}>
              <IconButton aria-label="EQUIPOS" onClick={volver} sx={{ ...botonPie, color: "info.main" }}>
                <BuildIcon />
              </IconButton>
            </Tooltip>
            {editar ? (
              <>
                <Tooltip title="Guardar cambios">
                  <IconButton type="submit" form={ID_FORMULARIO} sx={{ ...botonPie, color: "success.main" }}>
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Deshacer los cambios">
                  <IconButton type="reset" form={ID_FORMULARIO} sx={{ ...botonPie, color: "warning.main" }}>
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="Editar equipo">
                <IconButton aria-label="Editar equipo" onClick={abrirEditor} sx={{ ...botonPie, color: "custom.accent" }}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Eliminar equipo">
              <IconButton onClick={() => setVerEliminar(true)} sx={{ ...botonPie, color: "error.main" }}>
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ir al menú">
              <IconButton onClick={() => irA("/adminforms")} sx={{ ...botonPie, color: "custom.accent" }}>
                <DashboardIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {equipo && (
        <EliminarEquipoDialogo
          equipo={equipo}
          open={verEliminar}
          onClose={() => setVerEliminar(false)}
          conCambios={cambios > 0}
          onTerminar={({ mensaje, severidad, eliminado }) => {
            showSnackbar(mensaje, severidad);
            if (eliminado) {
              setVerEliminar(false);
              setCambios(0);
              navigate("/vistaequipos", { replace: true });
            }
          }}
        />
      )}

      {/* Dejar el editor con cambios sin guardar. */}
      <Dialog
        open={destinoPendiente !== null}
        onClose={() => setDestinoPendiente(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Cambios sin guardar</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{equipo?.name}</strong> tiene cambios sin guardar. Si sales,
            se pierden.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5, "& > :not(style)": { m: "0 !important" } }}>
          <Button variant="outlined" onClick={() => setDestinoPendiente(null)} fullWidth>
            Seguir editando
          </Button>
          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={() => {
              const ruta = destinoPendiente;
              setDestinoPendiente(null);
              setCambios(0);
              navigate(ruta);
            }}
          >
            Salir sin guardar
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
};

VistaEquipos.propTypes = {
  // En /vistaequipos/{id}/editar: el editor en vez de la ficha.
  editando: PropTypes.bool,
};

export default VistaEquipos;
