import { useEffect, useState } from "react";
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
import { useSelector } from "react-redux";
import { httpsCallable } from "firebase/functions";
import GroupIcon from "@mui/icons-material/Group";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import { functions } from "../../Components/Firebase/Firebase";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import PanelDocumentos from "../../Components/PanelLista/PanelDocumentos";
import FranjaLista from "../../Components/PanelLista/FranjaLista";
import CajonLista from "../../Components/PanelLista/CajonLista";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";
import ListaUsuarios from "../../Components/Usuarios/ListaUsuarios";
import FichaUsuario from "../../Components/Usuarios/FichaUsuario";
import EditarUsuario from "../../Components/Usuarios/EditarUsuario";
import CrearUsuario from "../../Components/Usuarios/CrearUsuario";
import EliminarUsuarioDialogo from "../../Components/Usuarios/EliminarUsuarioDialogo";
import AvatarUsuario from "../../Components/Usuarios/AvatarUsuario";
import useUsuarios from "../../Components/Usuarios/useUsuarios";
import { estadoConexion, filtrarUsuarios } from "../../Components/Usuarios/usuarios";
import useSnackbar from "../../Hooks/useSnackbar";
import { usePantallaCompacta, usePantallaBaja, ALINEAR_CON_EL_BORDE } from "../../Utils/pantalla";

// Con este id los botones del encabezado y del pie guardan, crean, deshacen y
// limpian el formulario que se ve.
const ID_FORMULARIO = "form-usuario";

const RUTA = "/vistausuarios";
const RUTA_NUEVO = `${RUTA}/nuevo`;
const rutaFicha = (id) => `${RUTA}/${id}`;
const rutaEditar = (id) => `${RUTA}/${id}/editar`;

// USUARIOS: CREAR, VER, EDITAR Y ELIMINAR EN UNA SOLA PANTALLA (2026-10-28,
// pedido del dueño; antes eran dos pantallas y dos botones en el menú). Como
// la de Equipos, cada nivel en su dirección (recargar no pierde dónde se
// estaba):
// - /vistausuarios: la lista del personal;
// - /vistausuarios/nuevo: crear a alguien;
// - /vistausuarios/{id}: su ficha, con EDITAR y ELIMINAR;
// - /vistausuarios/{id}/editar: el editor. Si hay cambios sin guardar,
//   pregunta antes de dejarlo.
// Es UNA sola ruta (/vistausuarios/*) para que pasar de un nivel a otro no
// vuelva a leer la lista: el personal se lee una vez al entrar.
//
// En el computador, desde 1501px, la lista va a la izquierda y lo demás a la
// derecha. Entre 1010 y 1500, con alguien abierto (su ficha o el editor) o
// creando, la lista se guarda en una franja de caras a la izquierda, cuya
// flecha la saca entera, y lo de la derecha usa la vista ancha (pedido del
// dueño, 2026-10-29, como en Equipos); sin nadie elegido, la lista y el
// recuadro de elegir. Más angosto, una cosa a la vez. El ícono del grupo sube
// un nivel: del editor a la ficha y de la ficha (o de crear) a la lista.
export default function VistaUsuarios() {
  const navigate = useNavigate();
  const { "*": resto = "" } = useParams();
  const [primero, segundo] = resto.split("/").filter(Boolean);
  const creando = primero === "nuevo";
  const id = creando ? undefined : primero;
  const { uid: miUid, name, photoURL, role, genero } = useSelector((state) => state.user);
  const presencia = useSelector((state) => state.presence.usuariosConectados || {});
  const isFullScreen = usePantallaCompacta();
  // EL CELULAR ACOSTADO: los botones del pie pasan a una columna a la
  // izquierda (pedido del dueño, 2026-10-30), como en el menú.
  const acostado = usePantallaBaja();
  const dosColumnas = useMediaQuery("(min-width:1010px)") && !isFullScreen;
  // LA VISTA ANCHA, igual para las tres (pedido del dueño, 2026-10-28): la
  // ficha en su recuadro grande con el carné al lado de los recuadros, y el
  // editor y crear en dos columnas. Desde 1501px, al lado de la lista; entre
  // 1010 y 1500, con la lista guardada en la franja (`conCajon`).
  const vistaAncha = useMediaQuery("(min-width:1501px)") && !isFullScreen;
  const conCajon = dosColumnas && !vistaAncha;
  // LA FICHA, con los cortes de la de un equipo (pedido del dueño,
  // 2026-10-29): en todo el computador el carné y los recuadros en una fila
  // y, de 960 a 1032px con la pantalla de pie (una tableta grande), en dos
  // pisos (ver FichaUsuario). Acostada —un iPad mini— los dos pisos no caben
  // de alto: va como en el resto del computador (pedido del dueño, 2026-10-30).
  const dePie = useMediaQuery("(orientation: portrait)");
  const fichaEnDosPisos =
    useMediaQuery("(min-width:960px) and (max-width:1032px)") && !isFullScreen && dePie;
  // Con la pantalla baja (un iPad mini acostado, un portátil de 768), ROL y
  // SESIONES lado a lado: uno debajo del otro no cabían (pedido del dueño,
  // 2026-10-30).
  const pantallaBaja = useMediaQuery("(max-height:800px)");
  const [verLista, setVerLista] = useState(false);

  const { usuarios, cargando, error, recargar } = useUsuarios();
  const usuario = id ? usuarios.find((u) => u.id === id) || null : null;
  const esperando = cargando && usuarios.length === 0;
  const editar = segundo === "editar" && usuario !== null;
  const conFranja = conCajon && (creando || usuario !== null);
  const ancho = vistaAncha || conFranja;
  // Mientras se vuelve a leer (recién creada) todavía no aparece: no avisar.
  const aviso = id && !usuario && !cargando ? "Esa persona ya no está en la lista: elige otra." : null;

  const [cambios, setCambios] = useState(0);
  // Adónde ir si confirma que deja los cambios sin guardar.
  const [destinoPendiente, setDestinoPendiente] = useState(null);
  const [verEliminar, setVerEliminar] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (error) showSnackbar("No se pudo cargar la lista de usuarios.", "error");
  }, [error, showSnackbar]);

  // Fuera del editor no hay cambios que cuidar.
  useEffect(() => {
    if (!editar) setCambios(0);
  }, [editar]);

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
  // Tocar a alguien de la lista: editando, pasa a editar a esa persona; si
  // no, su ficha.
  const elegir = (otro) => {
    if (otro.id === id && !creando) return;
    if (editar) irA(rutaEditar(otro.id));
    else navigate(rutaFicha(otro.id));
  };
  const nuevo = () => irA(RUTA_NUEVO);
  // Sube un nivel.
  const volver = () => {
    if (editar) irA(rutaFicha(usuario.id));
    else navigate(RUTA);
  };
  const abrirEditor = () => navigate(rutaEditar(usuario.id));

  // Las sesiones: las hace el servidor y después se vuelve a leer la lista.
  const llamar = async (funcion, datos, listo, fallo) => {
    try {
      await httpsCallable(functions, funcion)(datos);
      showSnackbar(listo, "success");
      recargar();
    } catch (errorSesion) {
      console.error(errorSesion);
      showSnackbar(fallo, "error");
    }
  };
  const nombre = usuario?.name || usuario?.email || "";
  const sesiones = usuario && {
    onCerrarSesionAparato: (aparato) =>
      llamar(
        "cerrarSesionAparato",
        { uid: usuario.id, aparatoId: aparato.id },
        `Listo: se cerró la sesión de ${nombre} en ${aparato.descripcion}.`,
        "No se pudo cerrar la sesión. Inténtelo de nuevo.",
      ),
    onCerrarSesiones: () =>
      llamar(
        "cerrarSesiones",
        { uid: usuario.id },
        `Listo: se cerraron las sesiones de ${nombre}.`,
        "No se pudieron cerrar las sesiones. Inténtelo de nuevo.",
      ),
    onQuitarDosPasos: () =>
      llamar(
        "quitarDosPasos",
        { uid: usuario.id },
        `Listo: ${nombre} tendrá que activar los dos pasos de nuevo.`,
        "No se pudieron quitar los dos pasos. Inténtelo de nuevo.",
      ),
  };

  const descripcion = creando
    ? "Nuevo usuario"
    : editar
      ? cambios > 0
        ? `${nombre} · ${cambios} ${cambios === 1 ? "recuadro" : "recuadros"} con cambios sin guardar`
        : `Editando a ${nombre}`
      : usuario
        ? nombre
        : "Elige a alguien para verlo, editarlo o eliminarlo";

  // En el celular, en la lista: nuevo y el menú al lado del buscador.
  const accionesCelular = isFullScreen && (
    <>
      <Tooltip title="Nuevo usuario">
        <IconButton onClick={nuevo} aria-label="Nuevo usuario" color="primary" sx={{ flexShrink: 0 }}>
          <PersonAddAlt1Icon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Menú">
        <IconButton onClick={() => navigate("/adminforms")} aria-label="Menú" color="primary" sx={{ flexShrink: 0 }}>
          <DashboardIcon />
        </IconButton>
      </Tooltip>
    </>
  );

  // `enCajon`: la lista que sale de la franja; elegir la guarda.
  const lista = (enPanel, enCajon = false) => (
    <ListaUsuarios
      usuarios={usuarios}
      presencia={presencia}
      miUid={miUid}
      idElegido={usuario?.id}
      editando={editar}
      onElegir={
        enCajon
          ? (otro) => {
              setVerLista(false);
              elegir(otro);
            }
          : elegir
      }
      // La zona punteada en el computador, con la lista en su columna o sola
      // (916 a 1009px), pero no al lado del editor ni de crear (pedido del
      // dueño, 2026-10-29, como en Equipos); en el celular, el ícono junto al
      // buscador.
      onNuevo={
        isFullScreen || editar || creando
          ? undefined
          : enCajon
            ? () => {
                setVerLista(false);
                nuevo();
              }
            : nuevo
      }
      accion={enPanel ? undefined : accionesCelular}
      enPanel={enPanel}
    />
  );

  const terminarFormulario = ({ mensaje, severidad, guardado, uid }) => {
    showSnackbar(mensaje, severidad);
    if (guardado) {
      setCambios(0);
      recargar();
    }
    if (uid) {
      recargar();
      navigate(rutaFicha(uid), { replace: true });
    }
  };

  // Lo de la derecha (o todo, más angosto): crear, el editor o la ficha.
  let detalle = null;
  if (creando) {
    detalle = (
      <CrearUsuario
        idFormulario={ID_FORMULARIO}
        anchoCompleto={ancho}
        onTerminar={terminarFormulario}
      />
    );
  } else if (editar) {
    detalle = (
      // Uno por persona: al pasar a otra arranca de cero.
      <EditarUsuario
        key={usuario.id}
        usuario={usuario}
        idFormulario={ID_FORMULARIO}
        anchoCompleto={ancho}
        onCambios={setCambios}
        onTerminar={terminarFormulario}
      />
    );
  } else if (usuario) {
    detalle = (
      <FichaUsuario
        usuario={usuario}
        conexion={estadoConexion(presencia[usuario.id], usuario.genero)}
        esTu={usuario.id === miUid}
        onEditar={abrirEditor}
        onEliminar={() => setVerEliminar(true)}
        {...sesiones}
        // En el celular, EDITAR y ELIMINAR van en el pie.
        conBotones={!isFullScreen}
        llenarAlto={!isFullScreen}
        enDosPisos={fichaEnDosPisos}
        rolYSesionesAlLado={pantallaBaja && !isFullScreen}
      />
    );
  }

  let contenido;
  if (esperando) {
    contenido = <LoadingLogo height="40vh" text="Cargando usuarios..." />;
  } else if (conFranja) {
    contenido = (
      <>
        {/* Las caras en el orden de la lista, con su punto de conexión. */}
        <FranjaLista
          icono={<GroupIcon />}
          redondas
          items={filtrarUsuarios(usuarios, "").map((otro) => ({
            id: otro.id,
            nombre: otro.name || otro.email || "Sin nombre",
            vista: (
              <AvatarUsuario
                usuario={otro}
                tamano={44}
                enLinea={estadoConexion(presencia[otro.id], otro.genero).enLinea}
              />
            ),
            elemento: otro,
          }))}
          idElegido={usuario?.id}
          onElegir={elegir}
          onAbrir={() => setVerLista(true)}
        />
        {/* La ficha ancha no se desplaza (solo su lista de sesiones). */}
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: usuario && !editar ? "hidden" : "auto" }}>
          {detalle}
        </Box>
      </>
    );
  } else if (dosColumnas) {
    contenido = (
      <>
        <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>
          <PanelDocumentos>{lista(true)}</PanelDocumentos>
        </Box>
        {/* La ficha ancha no se desplaza (solo su lista de sesiones); en
            una columna, sí. */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: usuario && !editar && vistaAncha ? "hidden" : "auto",
          }}
        >
          {detalle || (
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
                Elige a alguien de la lista
              </Typography>
              <Typography variant="body2">{aviso || "Aquí vas a ver su ficha, o crea uno nuevo."}</Typography>
            </Box>
          )}
        </Box>
      </>
    );
  } else {
    // Más angosto: la lista o lo demás, una cosa a la vez.
    contenido = (
      <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {detalle || (
          <>
            {aviso && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                {aviso}
              </Typography>
            )}
            {lista(false)}
          </>
        )}
      </Box>
    );
  }

  // Los botones del encabezado, en el computador. El menú lo pone el
  // encabezado al final; en el celular todo va al pie.
  const botonVolver = (titulo) => (
    <Tooltip title={titulo}>
      <IconButton onClick={volver} color="info" aria-label={titulo}>
        <GroupIcon />
      </IconButton>
    </Tooltip>
  );
  let acciones;
  if (creando) {
    acciones = (
      <>
        {botonVolver("Volver a la lista")}
        <Tooltip title="Crear usuario">
          <IconButton type="submit" form={ID_FORMULARIO} color="success" aria-label="Crear usuario">
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Limpiar el formulario">
          <IconButton type="reset" form={ID_FORMULARIO} color="error" aria-label="Limpiar el formulario">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  } else if (editar) {
    acciones = (
      <>
        {botonVolver("Volver a la ficha")}
        <Tooltip title="Guardar cambios">
          <IconButton type="submit" form={ID_FORMULARIO} color="success" aria-label="Guardar cambios">
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Deshacer los cambios">
          <IconButton type="reset" form={ID_FORMULARIO} color="warning" aria-label="Deshacer los cambios">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar usuario">
          <IconButton onClick={() => setVerEliminar(true)} color="error" aria-label="Eliminar usuario">
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  } else if (usuario && !dosColumnas) {
    acciones = botonVolver("Volver a la lista");
  }

  // EN EL CELULAR, el pie solo fuera de la lista (en la lista, nuevo y el
  // menú van junto al buscador). Solo íconos, como en Equipos.
  const conPie = isFullScreen && (creando || usuario !== null);
  const botonPie = { p: 1.25 };
  const iconoPie = (titulo, Icono, color, props) => (
    <Tooltip title={titulo}>
      <IconButton aria-label={titulo} sx={{ ...botonPie, color }} {...props}>
        <Icono />
      </IconButton>
    </Tooltip>
  );

  // Los botones del pie: abajo en fila o, acostado, en columna a la izquierda.
  const botonesPie = (
    <>
      {iconoPie(editar ? "Volver a la ficha" : "Volver a la lista", GroupIcon, "info.main", {
        onClick: volver,
      })}
      {creando && (
        <>
          {iconoPie("Crear usuario", SaveIcon, "success.main", { type: "submit", form: ID_FORMULARIO })}
          {iconoPie("Limpiar el formulario", RestartAltIcon, "error.main", { type: "reset", form: ID_FORMULARIO })}
        </>
      )}
      {editar && (
        <>
          {iconoPie("Guardar cambios", SaveIcon, "success.main", { type: "submit", form: ID_FORMULARIO })}
          {iconoPie("Deshacer los cambios", RestartAltIcon, "warning.main", { type: "reset", form: ID_FORMULARIO })}
        </>
      )}
      {usuario && !editar && iconoPie("Editar usuario", EditIcon, "custom.accent", { onClick: abrirEditor })}
      {usuario && iconoPie("Eliminar usuario", DeleteOutlineIcon, "error.main", { onClick: () => setVerEliminar(true) })}
      {iconoPie("Ir al menú", DashboardIcon, "custom.accent", { onClick: () => irA("/adminforms") })}
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // Los mismos aires de Equipos: con pie, 7px que con los 5 del pie
        // suman los 12 del encabezado.
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
            vista="Usuarios"
            descripcion={descripcion}
            icono={<GroupIcon />}
            compacto={isFullScreen}
            acciones={isFullScreen ? undefined : acciones}
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
          por encima. Elegir a alguien (o NUEVO USUARIO) la guarda. */}
      <CajonLista open={conFranja && verLista} onClose={() => setVerLista(false)}>
        {lista(true, true)}
      </CajonLista>

      {usuario && (
        <EliminarUsuarioDialogo
          usuario={usuario}
          esTu={usuario.id === miUid}
          open={verEliminar}
          onClose={() => setVerEliminar(false)}
          conCambios={cambios > 0}
          onTerminar={({ mensaje, severidad, eliminado }) => {
            showSnackbar(mensaje, severidad);
            if (eliminado) {
              setVerEliminar(false);
              setCambios(0);
              recargar();
              navigate(RUTA, { replace: true });
            }
          }}
        />
      )}

      {/* Dejar el editor con cambios sin guardar. */}
      <Dialog open={destinoPendiente !== null} onClose={() => setDestinoPendiente(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: "bold" }}>Cambios sin guardar</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{nombre}</strong> tiene cambios sin guardar. Si sales, se pierden.
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
}
