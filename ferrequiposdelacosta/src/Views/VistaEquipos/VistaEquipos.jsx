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
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import PanelDocumentos from "../../Components/PanelLista/PanelDocumentos";
import CrearEquipos from "../../Components/CrearEquipos/CrearEquipos";
import EditarEquipos from "../../Components/EditarEquipos/EditarEquipos";
import EliminarEquipoDialogo from "../../Components/EliminarEquipos/EliminarEquipoDialogo";
import ListaEquipos from "../../Components/CatalogoEquipos/ListaEquipos";
import FichaEquipo from "../../Components/CatalogoEquipos/FichaEquipo";
import MiniaturaEquipo from "../../Components/CatalogoEquipos/MiniaturaEquipo";
import { filtrarCatalogo } from "../../Components/CatalogoEquipos/catalogoEquipos";
import FranjaLista from "../../Components/PanelLista/FranjaLista";
import CajonLista from "../../Components/PanelLista/CajonLista";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";
import useSnackbar from "../../Hooks/useSnackbar";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { usePantallaCompacta, usePantallaBaja, ALINEAR_CON_EL_BORDE } from "../../Utils/pantalla";

// Con este id los botones del encabezado y del pie guardan y deshacen.
const ID_FORMULARIO = "form-editar-equipo";

const RUTA = "/vistaequipos";
const RUTA_NUEVO = `${RUTA}/nuevo`;
const rutaFicha = (id) => `${RUTA}/${id}`;
const rutaEditar = (id) => `${RUTA}/${id}/editar`;

// EQUIPOS: VER, EDITAR Y ELIMINAR EN UNA SOLA PANTALLA (2026-10-26, pedido
// del dueño; antes eran tres pantallas), y desde el 2026-10-29 también CREAR
// (antes, su propia pantalla). Cada nivel en su dirección (así recargar no
// pierde dónde se estaba):
// - /vistaequipos: la lista del catálogo;
// - /vistaequipos/nuevo (`creando`): el formulario de crear, como el editor
//   (desde 1520px, la lista al lado). Al crear, el formulario queda en blanco
//   para el siguiente. Con algo escrito, pregunta antes de dejarlo;
// - /vistaequipos/{id}: la ficha del equipo, con EDITAR y ELIMINAR. Desde
//   1501px, la lista a la izquierda y la ficha a la derecha (la opción 2 que
//   eligió el dueño). Entre 1010 y 1500 la ficha ancha no cabe al lado de la
//   lista: con un equipo abierto la lista se guarda en una franja de
//   miniaturas a la izquierda, y su flecha la saca entera, por encima
//   (pedido del dueño, 2026-10-29); sin
//   equipo, la lista y el recuadro de elegir, como en la vista ancha. Más
//   angosto, una u otra;
// - /vistaequipos/{id}/editar (`editando`): el editor y, desde 1520px, la
//   lista al lado para pasar a editar otro. Si hay cambios sin guardar,
//   pregunta antes de dejarlo.
// La llave sube un nivel: del editor a la ficha del mismo equipo (en el
// computador, con la lista al lado) y de la ficha (o de crear) a la lista.
//
// Los mismos cortes de Seguimiento.
const VistaEquipos = ({ editando = false, creando = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { name, photoURL, role, genero, permisos } = useSelector((state) => state.user);
  const puedeCrear = permisos.includes("crearEquipos");
  const isFullScreen = usePantallaCompacta();
  // EL CELULAR ACOSTADO: los botones del pie pasan a una columna a la
  // izquierda (pedido del dueño, 2026-10-30), como en el menú.
  const acostado = usePantallaBaja();
  const dosColumnas = useMediaQuery("(min-width:1010px)") && !isFullScreen;
  const conPanel = useMediaQuery("(min-width:1520px)") && !isFullScreen;
  const dosFotosPorFila = useMediaQuery("(min-width:1170px)") && !isFullScreen;
  // Desde 1501px la lista va fija al lado de la ficha; entre 1010 y 1500 se
  // guarda y sale de la izquierda (`conCajon`).
  const listaAlLado = useMediaQuery("(min-width:1501px)") && !isFullScreen;
  const conCajon = dosColumnas && !listaAlLado;
  // De 960 a 1032px la ficha va en dos pisos (ver FichaEquipo).
  const fichaEnDosPisos =
    useMediaQuery("(min-width:960px) and (max-width:1032px)") && !isFullScreen;
  const [verLista, setVerLista] = useState(false);

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

  // Deja el editor o crear: si tiene cambios sin guardar, primero pregunta.
  const irA = (ruta) => {
    if (cambios > 0) setDestinoPendiente(ruta);
    else navigate(ruta);
  };
  // Tocar un equipo de la lista: editando, pasa a editar ese; si no, su ficha.
  const elegir = (otro) => {
    if (otro.id === id) return;
    if (editar) irA(rutaEditar(otro.id));
    else irA(rutaFicha(otro.id));
  };
  const nuevo = () => irA(RUTA_NUEVO);
  // Sube un nivel.
  const volver = () => {
    if (editar) irA(rutaFicha(equipo.id));
    else if (creando) irA(RUTA);
    else if (id) navigate(RUTA);
  };
  const abrirEditor = () => navigate(rutaEditar(equipo.id));

  const descripcion = creando
    ? "Agrega un equipo nuevo al catálogo"
    : editar
      ? cambios > 0
        ? `${equipo.name} · ${cambios} ${cambios === 1 ? "recuadro" : "recuadros"} con cambios sin guardar`
        : `Editando ${equipo.name}`
      : equipo
        ? equipo.name
        : "Elige un equipo para verlo, editarlo o eliminarlo";

  // En el celular, en la lista: nuevo y el menú al lado del buscador (como en
  // Usuarios).
  const accionesCelular = isFullScreen && (
    <>
      {puedeCrear && (
        <Tooltip title="Nuevo equipo">
          <IconButton onClick={nuevo} aria-label="Nuevo equipo" color="primary" sx={{ flexShrink: 0 }}>
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      )}
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
    </>
  );
  // La zona punteada NUEVO EQUIPO en el computador, con la lista en su
  // columna o sola (916 a 1009px); en el celular, el ícono junto al buscador.
  const onNuevo = puedeCrear && !isFullScreen ? nuevo : undefined;

  const ficha = equipo && (
    // Una por equipo: al pasar a otro arranca en su portada.
    <FichaEquipo
      key={equipo.id}
      equipo={equipo}
      onEditar={abrirEditor}
      onEliminar={() => setVerEliminar(true)}
      // En el celular, EDITAR y Eliminar van en el pie.
      conBotones={!isFullScreen}
      // En el computador, en una fila al alto de la pantalla; en el celular,
      // la foto arriba y los datos debajo.
      llenarAlto={!isFullScreen}
      enDosPisos={fichaEnDosPisos}
    />
  );

  // Sin título: el nombre va en el encabezado de la pantalla (pedido del
  // dueño, 2026-10-28). NUEVO EQUIPO solo mientras se miran equipos, no al
  // lado del editor ni de crear (pedido del dueño, 2026-10-29).
  const panelCatalogo = (
    <PanelDocumentos>
      <ListaEquipos
        equipos={catalogo}
        idElegido={equipo?.id}
        onElegir={elegir}
        onNuevo={editar || creando ? undefined : onNuevo}
        enPanel
      />
    </PanelDocumentos>
  );

  let contenido;
  if (esperandoCatalogo) {
    contenido = <LoadingLogo height="40vh" text="Cargando equipos..." />;
  } else if (creando) {
    contenido = (
      <>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <CrearEquipos
            idFormulario={ID_FORMULARIO}
            anchoCompleto={dosColumnas}
            fotosPorFila={dosFotosPorFila ? 2 : 1}
            onCambios={setCambios}
          />
        </Box>
        {conPanel && <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>{panelCatalogo}</Box>}
      </>
    );
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
  } else if (conCajon && equipo) {
    // La franja de la lista guardada y la ficha ancha en todo lo demás.
    contenido = (
      <>
        {/* Las miniaturas en el orden de la lista. */}
        <FranjaLista
          icono={<BuildIcon />}
          items={filtrarCatalogo(catalogo, "").map((otro) => ({
            id: otro.id,
            nombre: otro.name || "Sin nombre",
            vista: <MiniaturaEquipo equipo={otro} ancho={52} />,
            elemento: otro,
          }))}
          idElegido={equipo.id}
          onElegir={elegir}
          onAbrir={() => setVerLista(true)}
        />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>{ficha}</Box>
      </>
    );
  } else if (dosColumnas) {
    // La opción 2: la lista a la izquierda y la ficha a la derecha. Entre
    // 1010 y 1500, solo mientras no hay equipo elegido: el recuadro de
    // "Elige un equipo" como en la vista ancha (pedido del dueño, 2026-10-29).
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
            <ListaEquipos
              equipos={catalogo}
              onElegir={elegir}
              onNuevo={onNuevo}
              accion={accionesCelular}
            />
          </>
        )}
      </Box>
    );
  }

  // EN EL CELULAR, el pie solo con un equipo abierto o creando uno: EQUIPOS
  // (sube un nivel), lo de la ficha, del editor o de crear, y el menú al
  // final. En la lista no hay pie: nuevo y el menú van junto al buscador.
  const conPie = isFullScreen && (equipo !== null || creando);
  const botonPie = { p: 1.25 };

  // Los botones del pie: abajo en fila o, acostado, en columna a la izquierda.
  const botonesPie = (
    <>
      {/* Solo íconos en el pie (pedido del dueño, 2026-10-26). La
          llave sube un nivel, como en el computador: del editor a la
          ficha y, tocándola otra vez, a la lista. */}
      <Tooltip title={editar ? "Volver al equipo" : "Ver catálogo"}>
        <IconButton aria-label="EQUIPOS" onClick={volver} sx={{ ...botonPie, color: "info.main" }}>
          <BuildIcon />
        </IconButton>
      </Tooltip>
      {creando ? (
        <>
          <Tooltip title="Crear equipo">
            <IconButton
              type="submit"
              form={ID_FORMULARIO}
              aria-label="Crear equipo"
              sx={{ ...botonPie, color: "success.main" }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancelar y limpiar el formulario">
            <IconButton
              type="reset"
              form={ID_FORMULARIO}
              aria-label="Cancelar y limpiar el formulario"
              sx={{ ...botonPie, color: "error.main" }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </>
      ) : editar ? (
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
      {!creando && (
        <Tooltip title="Eliminar equipo">
          <IconButton onClick={() => setVerEliminar(true)} sx={{ ...botonPie, color: "error.main" }}>
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Ir al menú">
        <IconButton onClick={() => irA("/adminforms")} sx={{ ...botonPie, color: "custom.accent" }}>
          <DashboardIcon />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // En el celular el pie deja 5px bajo sus botones: con 7 más suman los
        // 12 del encabezado, como en la ficha del cliente. Sin pie, los 12.
        pb: isFullScreen ? (conPie && !acostado ? "7px" : 1.5) : 2,
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
            vista={"Catálogo de equipos"}
            descripcion={descripcion}
            icono={<EditIcon />}
            compacto={isFullScreen}
            // En computador: creando, la llave, Crear y Cancelar; editando,
            // la llave, Guardar, Deshacer y Eliminar; en la ficha sin lugar
            // para la lista, la llave para volver a ella. El
            // menú lo pone el encabezado al final. En celular, todo al pie.
            acciones={
              isFullScreen ? undefined : creando ? (
                <>
                  {/* La llave vuelve a la lista, también con la lista al
                      lado, como en el editor. */}
                  <Tooltip title="Volver a la lista">
                    <IconButton onClick={volver} color="info">
                      <BuildIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Crear equipo">
                    <IconButton type="submit" form={ID_FORMULARIO} color="success">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar y limpiar el formulario">
                    <IconButton type="reset" form={ID_FORMULARIO} color="error">
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : editar ? (
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

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: acostado ? 0.5 : 3, mx: isFullScreen ? 0 : 2 }}>
        {conPie && acostado && (
          <Stack justifyContent="space-evenly" sx={{ flexShrink: 0, ml: ALINEAR_CON_EL_BORDE }}>
            {botonesPie}
          </Stack>
        )}
        {contenido}
      </Box>

      {conPie && !acostado && (
        <Box sx={{ py: 0.625, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {botonesPie}
          </Stack>
        </Box>
      )}

      {/* ENTRE 1010 Y 1500, la lista completa que saca la flecha de la franja,
          por encima de la ficha. Elegir un equipo o NUEVO EQUIPO la guarda; la
          flecha de abajo también. */}
      <CajonLista open={conCajon && !editar && !creando && verLista} onClose={() => setVerLista(false)}>
        <ListaEquipos
          equipos={catalogo}
          idElegido={equipo?.id}
          onElegir={(otro) => {
            setVerLista(false);
            elegir(otro);
          }}
          onNuevo={
            onNuevo &&
            (() => {
              setVerLista(false);
              onNuevo();
            })
          }
          enPanel
        />
      </CajonLista>

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
              navigate(RUTA, { replace: true });
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
            {creando ? (
              <>El equipo nuevo todavía no se ha creado. Si sales, se pierde lo escrito.</>
            ) : (
              <>
                <strong>{equipo?.name}</strong> tiene cambios sin guardar. Si sales,
                se pierden.
              </>
            )}
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
  // En /vistaequipos/nuevo: el formulario de crear.
  creando: PropTypes.bool,
};

export default VistaEquipos;
