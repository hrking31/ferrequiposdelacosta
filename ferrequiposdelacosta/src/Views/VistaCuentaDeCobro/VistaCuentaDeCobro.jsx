import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  CAMPOS_INTERNOS_CC,
  limpiarCuentaCobro,
  setFormCuentaCobro,
} from "../../Store/Slices/cuentacobroSlice";
import { hayCambios } from "../../Utils/cambios";
import {
  generarCuentaCobroId,
  guardarCuentaCobro,
  liberarCuentaCobro,
} from "../../Components/CuentaDeCobro/cuentasCobroDb";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import { ALINEAR_CON_EL_BORDE } from "../../Utils/pantalla";

export default function VistaCuentaDeCobro() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cuentacobro);
  const usuario = useSelector((state) => state.user);
  const { name, photoURL, role, genero } = usuario;
  const { logout } = useAuth();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  // EL CELULAR ACOSTADO se reconoce por el alto (uno grande pasa de 915px
  // de ancho): va como celular, con los botones en una columna a la
  // izquierda en vez del pie (pedido del dueño, 2026-10-30), como el menú.
  const acostado = useMediaQuery("(max-height:500px) and (orientation: landscape)");
  const isFullScreen = useMediaQuery("(max-width:915px)") || acostado;
  // LAS FORMAS DE LA PANTALLA (pedido del dueño, 2026-11-05). Van por el
  // tamaño de la ventana, igual en el computador y en la tableta:
  // - Hasta 915, el celular; de 916 a 1199, igual que el celular: el
  //   formulario y debajo la hoja, con un solo desplazamiento.
  // - Desde 1200, LADO A LADO: el formulario y la hoja mitad y mitad, cada uno
  //   con su propio desplazamiento, para ir escribiendo y viendo la hoja. La
  //   hoja llega hasta el borde de abajo, con el pie al fondo.
  // - La excepción, el iPad DE PIE: pantalla claramente alargada (5/6 o más;
  //   no 4/5, para que entre el de 12,9" en Safari con sus barras, ≈1024 ×
  //   1256). Los datos y los ítems arriba, lado a lado, las dos pizarras debajo
  //   y la hoja abajo de todo.
  const alargada = useMediaQuery("(max-aspect-ratio: 5/6)");
  const desde1200 = useMediaQuery("(min-width:1200px)");
  const dePie = alargada && !isFullScreen;
  const ladoALado = desde1200 && !dePie && !isFullScreen;
  const [loading, setLoading] = useState(false);
  // null | "salir" | "logout" — qué acción está esperando confirmación
  const [pendingAction, setPendingAction] = useState(null);

  const cuenta = values.value;

  // El número del documento se asigna al abrir la pantalla y ya no cambia: es
  // lo que se ve de marca de agua en la hoja mientras se llena, así que tiene
  // que existir antes de guardar nada.
  useEffect(() => {
    if (!cuenta.cuentaCobroId) {
      dispatch(
        setFormCuentaCobro({ ...cuenta, cuentaCobroId: generarCuentaCobroId() }),
      );
    }
    // Solo interesa la primera vez; el resto del formulario cambia todo el
    // tiempo y no tiene por qué volver a entrar acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuenta.cuentaCobroId, dispatch]);

  // Si se tocó algo desde que se abrió. Sin cambios no se pregunta nada al
  // salir —no hay nada que perder— y no se escribe en la base: mismo criterio
  // que la cotización.
  //
  // Para una cuenta nueva la foto es el formulario en blanco, así que acá
  // además responde "¿escribió algo?", que es lo que evita llenar la base de
  // documentos vacíos.
  const cambios = hayCambios(cuenta, values.original, CAMPOS_INTERNOS_CC);

  // El estado al que vuelve si se descartan los cambios. Una cuenta nueva no
  // viene de ningún lado: no hay nada que restaurar.
  const statusPrevio = cuenta.statusPrevio || "pausada";

  // Qué le falta a la cuenta para poder emitirse. Se revisa al pedir el PDF y
  // no deshabilitando el botón: así el usuario ve QUÉ falta en vez de un botón
  // apagado sin explicación.
  const faltantes = () => {
    const falta = [];
    if (!cuenta.fecha) falta.push("la fecha");
    if (!cuenta.empresa?.trim()) falta.push("la empresa");
    if (!cuenta.nit?.trim()) falta.push("el NIT");
    if (!cuenta.concepto?.trim()) falta.push("el concepto");

    const items = cuenta.items || [];
    if (items.length === 0) {
      falta.push("al menos un ítem");
    } else if (items.some((item) => !item.description?.trim())) {
      falta.push("la descripción de todos los ítems");
    } else if (items.some((item) => !(Number(item.subtotal) > 0))) {
      falta.push("cantidad, días y precio en todos los ítems");
    }
    return falta;
  };

  // Único punto de guardado. Devuelve la cuenta ya guardada, o null si falló:
  // ante un error NO se sigue adelante —no se limpia ni se sale— para que el
  // trabajo no se pierda por un problema de red o de permisos.
  const guardar = async (estado) => {
    try {
      const id = await guardarCuentaCobro(cuenta, estado, usuario);
      return { ...cuenta, id, status: estado };
    } catch (error) {
      console.error(`Error al guardar la cuenta de cobro (${estado}):`, error);
      showSnackbar(
        `No se pudo guardar la cuenta de cobro: ${error.message}`,
        "error",
      );
      return null;
    }
  };

  // Al salir sin guardar hay que soltar la cuenta: abrirla la dejó marcada
  // "en proceso" a nombre de quien la abrió, y si nadie la libera queda
  // ocupada para siempre. Solo se toca el estado, no los datos: lo que se
  // escribió en esta sesión no se guarda.
  const liberar = async () => {
    if (!cuenta.id) return;
    try {
      await liberarCuentaCobro(cuenta.id, statusPrevio);
    } catch (error) {
      console.error("Error al liberar la cuenta de cobro:", error);
    }
  };

  const salirAlMenu = () => {
    dispatch(limpiarCuentaCobro());
    navigate("/adminforms");
  };

  const liberarYSalir = async () => {
    setPendingAction(null);
    setLoading(true);
    await liberar();
    setLoading(false);
    salirAlMenu();
  };

  // Emitir: guarda la cuenta como creada, baja el PDF y cierra el trabajo,
  // igual que la cotización. Ya queda registrada en la base, así que limpiar
  // el formulario no pierde nada.
  const handleDescargarPdf = async () => {
    const falta = faltantes();
    if (falta.length > 0) {
      showSnackbar(`Antes de descargar falta ${falta.join(", ")}.`, "warning");
      return;
    }

    setLoading(true);
    const guardada = await guardar("creada");
    if (!guardada) {
      setLoading(false);
      return;
    }

    VistaCcPdf({ value: guardada });
    setLoading(false);
    salirAlMenu();
  };

  const guardarYSalir = async () => {
    setPendingAction(null);
    setLoading(true);
    const guardada = await guardar("pausada");
    setLoading(false);
    if (!guardada) return;
    salirAlMenu();
  };

  const descartarYSalir = liberarYSalir;

  // Sin cambios no se pregunta nada: guardar y descartar terminarían igual,
  // así que la pregunta no aportaría. Igual hay que soltarla, porque abrirla
  // la dejó marcada como ocupada.
  const handleGuardarYSalirClick = () => {
    if (cambios) {
      setPendingAction("salir");
      return;
    }
    liberarYSalir();
  };

  const handleGuardarYCerrarSesion = async () => {
    setPendingAction(null);
    setLoading(true);
    const guardada = await guardar("pausada");
    setLoading(false);
    if (!guardada) return;
    dispatch(limpiarCuentaCobro());
    await logout();
  };

  const handleCerrarSesionSinGuardar = async () => {
    setPendingAction(null);
    await liberar();
    dispatch(limpiarCuentaCobro());
    await logout();
  };

  const handleLogoutClick = () => {
    if (cambios) {
      setPendingAction("logout");
      return;
    }
    handleCerrarSesionSinGuardar();
  };

  // Descargar PDF y Guardar y salir en el celular: solo los íconos, los mismos
  // del encabezado del computador. De pie van en una fila al pie de la pantalla,
  // como en Equipos; acostado, en una columna a la izquierda, repartidos a lo
  // alto (pedido del dueño, 2026-10-30).
  const botonesPie = (
    <>
      <Tooltip title="Descargar PDF" placement={acostado ? "right" : "top"}>
        <span>
          <IconButton onClick={handleDescargarPdf} disabled={loading} color="success" sx={{ p: 1.25 }}>
            <PictureAsPdfIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Guardar y salir" placement={acostado ? "right" : "top"}>
        <span>
          <IconButton onClick={handleGuardarYSalirClick} disabled={loading} color="success" sx={{ p: 1.25 }}>
            <DashboardIcon />
          </IconButton>
        </span>
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
        // Sin barra de navegación (ver NavBar): ni arriba ni abajo hay que
        // dejarle hueco. En el celular de pie, el pie llega al borde: sus 54px
        // son los mismos en todas las vistas (pedido del dueño, 2026-11-05).
        pb: isFullScreen ? (acostado ? 1.5 : 0) : 2,
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
            a la tienda y cerrar sesión —sin "Ir al menú": se sale por
            "Guardar y salir"—. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            sinIrAlMenu
            compacto={isFullScreen}
            vista={"Crear Cuenta de Cobro"}
            descripcion={"Genera la cuenta de cobro de un servicio"}
            icono={<ReceiptIcon />}
            cotId={cuenta.cuentaCobroId}
            // Igual que en la cotización: antes de salir pregunta por los
            // cambios sin guardar y libera la cuenta que tenía tomada.
            onCerrarSesion={handleLogoutClick}
            // En computador las acciones van en el encabezado, igual que en
            // la cotización; en celular bajan al pie de la pantalla.
            acciones={
              <>
                <Tooltip title="Descargar PDF">
                  <span>
                    <IconButton
                      onClick={handleDescargarPdf}
                      disabled={loading}
                      color="success"
                    >
                      <PictureAsPdfIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Guardar y salir">
                  <span>
                    <IconButton
                      onClick={handleGuardarYSalirClick}
                      disabled={loading}
                      color="success"
                    >
                      <DashboardIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            }
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 0.5 }}>
        {acostado && (
          <Stack justifyContent="space-evenly" sx={{ flexShrink: 0, ml: ALINEAR_CON_EL_BORDE }}>
            {botonesPie}
          </Stack>
        )}
      {ladoALado ? (
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", gap: 2, mx: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
            <CuentaDeCobro forma="acostada" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
            <VistaCcWeb llenarAlto />
          </Box>
        </Box>
      ) : dePie ? (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            mx: 2,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gridTemplateRows: "auto auto minmax(0, 1fr)",
            // Las dos pizarras lado a lado, como en la factura (pedido del
            // dueño, 2026-11-05): la cuenta debajo del formulario y el
            // depósito debajo de los ítems, que quedan al lado de los datos.
            gridTemplateAreas: '"datos items" "cuenta deposito" "hoja hoja"',
            columnGap: 3,
            rowGap: 2,
          }}
        >
          <CuentaDeCobro forma="dePie" />
          <Box sx={{ gridArea: "hoja", minHeight: 0, display: "flex" }}>
            <VistaCcWeb llenarAlto />
          </Box>
        </Box>
      ) : (
      // El celular y hasta 1199: todo uno debajo del otro, con un solo
      // desplazamiento.
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto",
        mx: isFullScreen ? 0 : 2
          }}>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <CuentaDeCobro />
            </Grid>
            <Grid item xs={12}>
              <VistaCcWeb />
            </Grid>
          </Grid>
        </Box>
      </Box>
      )}

      </Box>

      {isFullScreen && !acostado && (
        <Box sx={{ py: 0.625, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {botonesPie}
          </Stack>
        </Box>
      )}

      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)}>
        <DialogTitle>Tienes cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Si sales sin guardar, perderás los cambios realizados en esta
            sesión.
          </DialogContentText>
        </DialogContent>
        {/* El tamaño de los botones y el bajar de renglón los pone el tema
            (ver MuiDialogActions). */}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {/* Con borde y sin relleno: se ve como botón, pero el color lleno se
              reserva para las dos acciones de verdad —descartar y guardar—. */}
          <Button
            variant="outlined"
            onClick={() => setPendingAction(null)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleCerrarSesionSinGuardar
                : descartarYSalir
            }
            variant="contained"
            color="error"
            disabled={loading}
          >
            {pendingAction === "logout"
              ? "Descartar y cerrar sesión"
              : "Descartar y salir"}
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleGuardarYCerrarSesion
                : guardarYSalir
            }
            variant="contained"
            color="success"
            disabled={loading}
          >
            {pendingAction === "logout"
              ? "Guardar y cerrar sesión"
              : "Guardar y salir"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
