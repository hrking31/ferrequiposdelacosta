import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PlazoEquipo from "./PlazoEquipo";
import DescuentosAmpliacion from "./DescuentosAmpliacion";
import {
  ampliarEquipo,
  dejarSinFechaDeEntrega,
  descuentoExcedido,
  proyectarAmpliacion,
  equipoVencido,
  obtenerGestiones,
  crearRegistroGestion,
  calcularEstadoCliente,
  obtenerFechaHoyBogota,
  gruposDe,
  equiposDe,
  sigueAfuera,
  sinFechaDeEntrega,
  indefinidaDe,
} from "../ClienteDetalle/facturaUtils";
import { formatearFechaLegible } from "../../Utils/formato";

const ESTADO_INICIAL_CAMBIO = {
  dias: "",
  descuento: "",
  descuentoVencidos: "",
  indefinida: false,
};


export default function AmpliarVencimientoDialog({ open, onClose, cliente, factura, onActualizado }) {
  const theme = useTheme();
  const acento =
    theme.palette.custom.accent;
  const [cambios, setCambios] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
  }, [open]);

  // Cada línea se identifica por su despacho y su posición dentro de él: los
  // equipos viven repartidos en grupos, así que un número suelto no alcanza
  // para señalar una sola. Con un índice de la lista filtrada, ampliar el
  // segundo equipo le cambiaría la fecha a otro.
  const claveDe = (grupo, indice) => `${grupo?.grupo}#${indice}`;

  // A los que se les puede dar más plazo: los que están afuera Y vencidos.
  //
  // Un equipo que ya volvió no tiene vencimiento que ampliar —ofrecerlo era
  // sencillamente un error—, y uno que todavía está en fecha tampoco: darle
  // días a algo que no ha vencido es una renovación que nadie pidió. Si el
  // cliente los quiere extender, se hace cuando venzan.
  const equiposAmpliables = equiposDe(factura)
    .map(({ equipo, grupo, indice }) => ({
      equipo,
      grupo,
      indice,
      clave: claveDe(grupo, indice),
    }))
    .filter(({ equipo }) => sigueAfuera(equipo) && equipoVencido(equipo));

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleCambiarIndefinida = (clave, marcada) => {
    setCambios((prev) => ({
      ...prev,
      [clave]: { ...ESTADO_INICIAL_CAMBIO, ...prev[clave], indefinida: marcada, dias: "" },
    }));
  };

  const handleCambiarDias = (clave, valor) => {
    setCambios((prev) => ({
      ...prev,
      [clave]: { ...ESTADO_INICIAL_CAMBIO, ...prev[clave], dias: valor },
    }));
  };

  // `campo` es "descuento" (los días nuevos) o "descuentoVencidos".
  const handleCambiarDescuento = (clave, campo, valor) => {
    setCambios((prev) => ({
      ...prev,
      [clave]: { ...ESTADO_INICIAL_CAMBIO, ...prev[clave], [campo]: valor },
    }));
  };

  const handleGuardar = async () => {
    const huboCambios = Object.values(cambios).some(
      (cambio) => cambio && (cambio.indefinida || Number(cambio.dias) > 0),
    );
    if (!huboCambios) {
      showSnackbar("Marcá al menos un equipo para ampliar o dejar indefinido.", "warning");
      return;
    }

    const hayExcedido = equiposAmpliables.some(({ equipo, clave }) => {
      const cambio = cambios[clave];
      return (
        cambio &&
        !cambio.indefinida &&
        Number(cambio.dias) > 0 &&
        descuentoExcedido(proyectarAmpliacion(equipo, cambio.dias), cambio)
      );
    });
    if (hayExcedido) {
      showSnackbar("Un descuento pasa de lo que valen sus días.", "warning");
      return;
    }

    setGuardando(true);
    try {
      // Lo que se le concedió al cliente, para dejarlo anotado en la línea de
      // tiempo: los días de la ampliación más larga y si alguna línea quedó
      // sin fecha de devolución.
      let diasConcedidos = 0;
      let quedoIndefinida = false;

      const hoy = obtenerFechaHoyBogota();

      const gruposActualizados = gruposDe(factura).map((grupo) => ({
        ...grupo,
        equipos: (grupo.equipos ?? []).map((equipo, indice) => {
          const cambio = cambios[claveDe(grupo, indice)];
          if (!cambio) return equipo;

          if (cambio.indefinida) {
            quedoIndefinida = true;
            // Su tramo vencido se cierra hoy —esos días ya están cobrados— y
            // desde mañana corre uno nuevo, marcado como que corre con
            // permiso (ver dejarSinFechaDeEntrega).
            return dejarSinFechaDeEntrega(equipo, hoy);
          }

          const extra = Number(cambio.dias) || 0;
          if (extra <= 0) return equipo;

          diasConcedidos = Math.max(diasConcedidos, extra);

          // Cierra el tramo vencido que venía corriendo y anota la ampliación
          // con lo que el cliente PIDIÓ, ni un día más: los días que ya se le
          // habían vencido quedan en su propio renglón, con sus fechas, en vez
          // de disfrazarse de días ampliados (ver ampliarEquipo).
          return ampliarEquipo(
            equipo,
            {
              dias: extra,
              descuento: Math.max(0, Number(cambio.descuento) || 0),
              descuentoVencidos: Math.max(0, Number(cambio.descuentoVencidos) || 0),
            },
            hoy,
          );
        }),
      }));

      // La prórroga queda anotada en la línea de tiempo de la factura: es la
      // gestión que explica por qué se le corrió la fecha.
      const gestiones = [
        ...obtenerGestiones(factura),
        crearRegistroGestion("prorroga", {
          dias: diasConcedidos,
          indefinida: quedoIndefinida,
        }),
      ];

      // El estado del cliente resume TODAS sus facturas, así que hay que
      // releerlas: ampliar el vencimiento puede sacar esta factura de
      // "vencida" y cambiar con eso el estado del cliente entero.
      const facturasSnap = await getDocs(collection(db, "clientes", cliente.id, "facturas"));
      const todasLasFacturas = facturasSnap.docs.map((docSnap) =>
        docSnap.id === factura.id
          ? { id: docSnap.id, ...docSnap.data(), grupos: gruposActualizados, gestiones }
          : { id: docSnap.id, ...docSnap.data() },
      );

      const batch = writeBatch(db);
      batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        grupos: gruposActualizados,
        gestiones,
      });
      batch.update(doc(db, "clientes", cliente.id), {
        estado: calcularEstadoCliente(todasLasFacturas),
      });
      await batch.commit();

      showSnackbar("Vencimiento actualizado correctamente.", "success");
      onActualizado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al actualizar el vencimiento: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* Pegado ARRIBA, no centrado: mismo motivo que en
          RegistrarDevolucionDialog (las casillas que aparecen al subir los
          días corrían la flecha de debajo del puntero). */}
      <Dialog
        open={open}
        onClose={handleCerrar}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      >
        <DialogTitle sx={{ color: acento }}>Ampliar vencimiento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {equiposAmpliables.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Esta factura no tiene equipos vencidos para ampliar.
                </Typography>
              </Grid>
            )}
            {equiposAmpliables.map(({ equipo, clave }, posicion) => {
              const cambio = cambios[clave] || ESTADO_INICIAL_CAMBIO;
              const diasNumero = Number(cambio.dias);
              // La fecha en que queda el equipo y lo que valen los días nuevos
              // y los vencidos que se cierran hoy, que es la base de cada
              // descuento (ver proyectarAmpliacion).
              const proyeccion = proyectarAmpliacion(equipo, diasNumero);
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0 ? proyeccion.hasta : null;
              const yaIndefinido = sinFechaDeEntrega(equipo);
              return (
                <Grid item xs={12} key={clave}>
                  <Typography variant="body2" fontWeight="bold">
                    {equipo.cantidadEquipos} {equipo.nombre}
                  </Typography>
                  {/* La fecha del último acuerdo y, si ya pasó, los días que
                      lleva vencido. Misma línea y misma regla que en el
                      diálogo de devolución (ver PlazoEquipo): al pactar el
                      plazo nuevo hay que saber de qué tamaño es el atraso que
                      se está perdonando. */}
                  <PlazoEquipo equipo={equipo} />
                  <Box sx={{ mb: 1 }} />

                  <TextField
                    label="Días a ampliar"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={cambio.dias}
                    onChange={(e) => handleCambiarDias(clave, e.target.value)}
                    disabled={cambio.indefinida}
                    fullWidth
                    size="small"
                  />

                  {diasNumero > 0 && !cambio.indefinida && (
                    <DescuentosAmpliacion
                      proyeccion={proyeccion}
                      cantidad={Number(equipo.cantidadEquipos) || 0}
                      valorDia={Number(equipo.valorDia) || 0}
                      descuento={cambio.descuento}
                      descuentoVencidos={cambio.descuentoVencidos}
                      onCambiarDescuento={(valor) =>
                        handleCambiarDescuento(clave, "descuento", valor)
                      }
                      onCambiarDescuentoVencidos={(valor) =>
                        handleCambiarDescuento(clave, "descuentoVencidos", valor)
                      }
                    />
                  )}

                  {nuevaFecha && (
                    // custom.totalText es un amarillo pensado para la pizarra
                    // oscura de totales (fondo negro fijo); acá el fondo es el
                    // normal del diálogo, blanco en modo claro, y ese amarillo
                    // casi no se leía. El acento sí está pensado para leerse
                    // sobre superficies normales en los dos modos.
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "custom.accent" }}
                    >
                      Nueva fecha de vencimiento: {formatearFechaLegible(nuevaFecha)}
                    </Typography>
                  )}

                  {/* AL QUE YA ESTÁ SIN FECHA se le muestra la casilla marcada
                      y bloqueada: no hay nada que volver a pactar, y dejarla
                      vacía hacía parecer que el equipo tenía fecha.

                      Bloqueada y no marcada de verdad a propósito: si entrara
                      al estado como una decisión del usuario, guardar le
                      volvería a escribir el acuerdo y le correría su fecha a
                      hoy, borrando desde cuándo el cliente lo tiene sin fecha.
                      Para sacarlo de ahí se le dan días, que es lo que cierra
                      la entrega indefinida. */}
                  <FormControlLabel
                    sx={{ mt: 0.5 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={yaIndefinido || cambio.indefinida}
                        disabled={yaIndefinido}
                        onChange={(e) => handleCambiarIndefinida(clave, e.target.checked)}
                      />
                    }
                    label={
                      yaIndefinido
                        ? `Sin fecha de entrega desde el ${formatearFechaLegible(indefinidaDe(equipo).desde)}`
                        : "Dejar indefinida (el cliente avisará)"
                    }
                  />

                  {posicion < equiposAmpliables.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

AmpliarVencimientoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onActualizado: PropTypes.func,
};
