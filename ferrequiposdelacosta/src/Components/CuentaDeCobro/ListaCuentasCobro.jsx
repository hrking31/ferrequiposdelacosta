import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import useSnackbar from "../../Hooks/useSnackbar";
import { abrirCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import VistaCcPdf from "../VistaPdf/VistaCcPdf";
import {
  eliminarCuentaCobro,
  escucharCuentasCobro,
  leerCuentasCobro,
  marcarCuentaEnProceso,
} from "./cuentasCobroDb";
import { calcularStatusPrevio } from "../../Utils/estadoDocumento";
import { formatearMoneda, formatearFechaLegible } from "../../Utils/formato";

// Las situaciones en que puede estar una cuenta guardada: "creada" es la que
// ya se emitió —se descargó su PDF—, "pausada" la que quedó a medias y
// "enProceso" la que alguien tiene abierta ahora mismo.
//
// Se muestran con las mismas palabras, icono y color que en el buzón de
// cotizaciones (ver AdminCotizaciones): son los mismos estados y verlos
// nombrados distinto en cada pantalla confundía.
const ESTADO_INFO = {
  creada: { label: "Emitida", Icono: CheckCircleIcon, color: "success" },
  enProceso: { label: "En Proceso", Icono: AutorenewIcon, color: "info" },
  pausada: { label: "Pausada", Icono: PauseCircleOutlineIcon, color: "default" },
};

// Lo que se cobra en una cuenta guardada. Se recalcula en vez de confiar en el
// campo `saldo` para que una guardada por una versión anterior —que no lo
// tenía— no se muestre en cero.
const saldoDe = (cuenta) =>
  Math.max(
    0,
    (Number(cuenta.total) || 0) -
      (Number(cuenta.pagado) || 0) -
      (Number(cuenta.abonos) || 0),
  );

export default function ListaCuentasCobro() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const acento = theme.palette.custom.accent;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const usuario = useSelector((state) => state.user);
  // Quién está conectado ahora, para saber si el que tiene una cuenta abierta
  // sigue trabajándola o solo la dejó colgada.
  const usuariosConectados = useSelector(
    (state) => state.presence.usuariosConectados || {},
  );

  // La primera tanda llega en vivo y se reemplaza entera con cada cambio; las
  // que trae "Cargar más" van aparte, o cada aviso del servidor las borraría.
  const [cuentas, setCuentas] = useState([]);
  const [masCuentas, setMasCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  // El último documento crudo de Firestore: con él se pide la tanda siguiente.
  const [ultimo, setUltimo] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // "todos" | "persona" | "empresa" — mismos filtros que Solicitudes de
  // Cotización, que es la otra pantalla donde se busca entre documentos.
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // La primera tanda se ESCUCHA, no se lee una vez: así, si otra persona abre
  // una cuenta, acá se ve "En Proceso" sin recargar la pantalla. Sin eso, el
  // aviso de quién la tiene llegaría tarde y dos personas podrían editarla a
  // la vez sin enterarse.
  useEffect(() => {
    const dejarDeEscuchar = escucharCuentasCobro(
      (tanda) => {
        setCuentas(tanda.cuentas);
        setUltimo(tanda.ultimo);
        setHayMas(tanda.hayMas);
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar las cuentas de cobro:", error);
        showSnackbar(
          `No se pudieron cargar las cuentas de cobro: ${error.message}`,
          "error",
        );
        setCargando(false);
      },
    );

    return dejarDeEscuchar;
    // Solo al montar: las tandas siguientes las pide el botón de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarMas = async () => {
    setCargandoMas(true);
    try {
      const tanda = await leerCuentasCobro(ultimo);
      setMasCuentas((previas) => [...previas, ...tanda.cuentas]);
      setUltimo(tanda.ultimo);
      setHayMas(tanda.hayMas);
    } catch (error) {
      console.error("Error al cargar más cuentas de cobro:", error);
      showSnackbar(`No se pudieron cargar más: ${error.message}`, "error");
    } finally {
      setCargandoMas(false);
    }
  };

  const todas = useMemo(
    () => [...cuentas, ...masCuentas],
    [cuentas, masCuentas],
  );

  // El filtro corre sobre lo que ya está cargado, no sobre la base (ver
  // BuscadorFiltro). Busca por número, cliente, NIT y concepto.
  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return todas.filter((cuenta) => {
      if (filtroTipo !== "todos" && cuenta.tipo !== filtroTipo) return false;
      if (!texto) return true;

      return [cuenta.cuentaCobroId, cuenta.empresa, cuenta.nit, cuenta.concepto]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(texto));
    });
  }, [todas, busqueda, filtroTipo]);

  // El chip activo va relleno con el color de acento. Sin fijarle el hover y
  // el foco, MUI le superpone un tinte y se ve de otro color al usarlo.
  const chipActivoSx = (activo) =>
    activo
      ? {
          bgcolor: acento,
          color: theme.palette.getContrastText(acento),
          "& .MuiChip-icon": { color: "inherit" },
          "&:hover": { bgcolor: acento },
          "&.Mui-focusVisible": { bgcolor: acento },
        }
      : undefined;

  // Reabrir: la carga tal cual en el formulario. Como trae su `id`, volver a
  // guardarla actualiza esta misma y no crea otra.
  //
  // Antes de entrar la marca "en proceso" con el nombre de quien la abre, para
  // que los demás vean que está ocupada. `statusPrevio` es a dónde vuelve si
  // esta persona sale sin guardar: hay que anotarlo ahora, porque en un segundo
  // su estado será "enProceso" y el anterior ya no se podría saber.
  const abrir = async (cuenta) => {
    const statusPrevio = calcularStatusPrevio(cuenta, "pausada");

    try {
      await marcarCuentaEnProceso(cuenta.id, statusPrevio, usuario);
    } catch (error) {
      console.error("Error al marcar la cuenta en proceso:", error);
      showSnackbar(`No se pudo abrir la cuenta: ${error.message}`, "error");
      return;
    }

    dispatch(
      abrirCuentaCobro({
        ...cuenta,
        status: "enProceso",
        statusPrevio,
        atendidoPor: usuario.name,
        atendidoPorUid: usuario.uid,
      }),
    );
    navigate("/vistacuentadecobro");
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarCuentaCobro(aEliminar.id);
      // La primera tanda se corrige sola, que está escuchando; las traídas con
      // "Cargar más" hay que sacarlas a mano.
      setMasCuentas((previas) =>
        previas.filter((cuenta) => cuenta.id !== aEliminar.id),
      );
      setAEliminar(null);
      showSnackbar("Cuenta de cobro eliminada.", "success");
    } catch (error) {
      showSnackbar(`Error al eliminar: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  if (cargando) {
    return <LoadingLogo height="40vh" text="Cargando cuentas de cobro..." />;
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Buscador, contador y filtros por tipo: el mismo juego que Solicitudes
          de Cotización. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ flexShrink: 0, pb: 2 }}
      >
        <BuscadorFiltro
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por número, cliente, NIT o concepto"
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {filtradas.length} de {todas.length} cuentas
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Chip
            label="Todos"
            clickable
            onClick={() => setFiltroTipo("todos")}
            variant={filtroTipo === "todos" ? "filled" : "outlined"}
            sx={chipActivoSx(filtroTipo === "todos")}
          />
          <Chip
            icon={<PersonIcon />}
            label="Personas"
            clickable
            onClick={() => setFiltroTipo("persona")}
            variant={filtroTipo === "persona" ? "filled" : "outlined"}
            sx={chipActivoSx(filtroTipo === "persona")}
          />
          <Chip
            icon={<BusinessIcon />}
            label="Empresas"
            clickable
            onClick={() => setFiltroTipo("empresa")}
            variant={filtroTipo === "empresa" ? "filled" : "outlined"}
            sx={chipActivoSx(filtroTipo === "empresa")}
          />
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
        {filtradas.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {todas.length === 0
              ? "Todavía no hay cuentas de cobro guardadas."
              : "Ninguna cuenta coincide con la búsqueda."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {filtradas.map((cuenta) => {
              const estado = ESTADO_INFO[cuenta.status] || ESTADO_INFO.pausada;
              const saldo = saldoDe(cuenta);

              // Se puede abrir salvo que la tenga otra persona que siga
              // conectada: ahí se esconde el botón para no pisarle el trabajo.
              // Si esa persona se desconectó, la cuenta se puede asumir.
              const laTengoYo =
                cuenta.status === "enProceso" &&
                cuenta.atendidoPorUid === usuario.uid;
              const ocupada =
                cuenta.status === "enProceso" &&
                !laTengoYo &&
                usuariosConectados[cuenta.atendidoPorUid]?.online === true;

              return (
                <Paper
                  key={cuenta.id}
                  variant="outlined"
                  sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ flexWrap: "wrap", gap: 0.5 }}
                    >
                      <Typography fontWeight="bold" sx={{ color: acento }}>
                        {cuenta.cuentaCobroId || "sin número"}
                      </Typography>
                      <Chip
                        size="small"
                        icon={<estado.Icono />}
                        label={estado.label}
                        color={estado.color}
                        variant="outlined"
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                    >
                      {cuenta.empresa || "Sin cliente"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {formatearFechaLegible(cuenta.fecha) || "sin fecha"} ·{" "}
                      {formatearMoneda(saldo)}
                    </Typography>

                    {/* Quién la tiene abierta, con el punto que late mientras
                        esa persona siga conectada. Igual que en el buzón de
                        cotizaciones. */}
                    {cuenta.status === "enProceso" && cuenta.atendidoPor && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.primary",
                          fontStyle: "italic",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          mt: 0.25,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            flexShrink: 0,
                            backgroundColor: usuariosConectados[
                              cuenta.atendidoPorUid
                            ]?.online
                              ? theme.palette.custom.online
                              : theme.palette.grey[500],
                          }}
                        />
                        <span>
                          Atendida por: <strong>{cuenta.atendidoPor}</strong>
                        </span>
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    {!ocupada && (
                      <Tooltip title={laTengoYo ? "Retomar" : "Abrir"}>
                        <IconButton size="small" onClick={() => abrir(cuenta)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Descargar PDF">
                      <IconButton
                        size="small"
                        onClick={() => VistaCcPdf({ value: cuenta })}
                      >
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setAEliminar(cuenta)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* La lista trae de a tandas: la base crece para siempre y traerla
            entera sería cada vez más lento y más caro. Ojo: el buscador de
            arriba solo ve lo que ya se cargó. */}
        {hayMas && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <Button variant="outlined" onClick={cargarMas} disabled={cargandoMas}>
              {cargandoMas ? "Cargando..." : "Cargar más"}
            </Button>
          </Box>
        )}
      </Box>

      <Dialog open={Boolean(aEliminar)} onClose={() => setAEliminar(null)}>
        <DialogTitle sx={{ color: acento }}>Eliminar cuenta de cobro</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la cuenta {aEliminar?.cuentaCobroId}? Esta
            acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setAEliminar(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminar}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
