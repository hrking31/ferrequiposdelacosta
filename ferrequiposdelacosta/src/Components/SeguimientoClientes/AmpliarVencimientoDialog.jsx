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
import {
  proyectarAmpliacion,
  equipoVencido,
  ampliacionesDe,
  obtenerGestiones,
  crearRegistroGestion,
  calcularEstadoCliente,
  obtenerFechaHoyBogota,
  gruposDe,
  equiposDe,
  sigueAfuera,
} from "../ClienteDetalle/facturaUtils";
import {
  formatearMoneda,
  formatearMonedaInput,
  limpiarMonedaInput,
} from "../../Utils/formato";

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

const ESTADO_INICIAL_CAMBIO = { dias: "", descuento: "", indefinida: false };


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

  const handleCambiarDescuento = (clave, valor) => {
    setCambios((prev) => ({
      ...prev,
      [clave]: { ...ESTADO_INICIAL_CAMBIO, ...prev[clave], descuento: valor },
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
            return { ...equipo, vencimientoIndefinido: true };
          }

          const extra = Number(cambio.dias) || 0;
          if (extra <= 0) return equipo;

          // Lo que el cliente pidió es lo que queda en la bitácora; lo que la
          // fecha corre de verdad —con los días vencidos consolidados— es lo
          // que se cobra. Ver proyectarAmpliacion.
          const proyeccion = proyectarAmpliacion(equipo, extra);
          diasConcedidos = Math.max(diasConcedidos, extra);

          return {
            ...equipo,
            vencimientoIndefinido: false,
            // El registro completo de la ampliación: desde qué fecha, hasta
            // cuál, cuántos días se sumaron y qué descuento se les hizo. Se
            // acumulan todas, no solo la primera.
            ampliaciones: [
              ...ampliacionesDe(equipo),
              {
                fechaAnterior: equipo.fechaVencimiento,
                fechaNueva: proyeccion.fechaNueva,
                // Los días que la fecha corre de verdad: es lo que se cobra.
                diasAmpliados: proyeccion.dias,
                // De esos días, cuántos se le prometieron al cliente y
                // cuántos ya se habían vencido. La cuenta usa el total —son
                // todos días de alquiler— pero el registro tiene que poder
                // decir después que "5 días" fueron en realidad 4 vencidos y
                // 1 acordado.
                diasPedidos: proyeccion.diasPedidos,
                diasVencidos: proyeccion.diasVencidos,
                descuentoRealizado: Math.max(0, Number(cambio.descuento) || 0),
                fecha: hoy,
              },
            ],
            fechaVencimiento: proyeccion.fechaNueva,
          };
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
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
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
              const descuentoNumero = Math.max(0, Number(cambio.descuento) || 0);
              // La fecha en que queda el equipo y los días que se le cobran:
              // si venía vencido, el plazo nuevo arranca HOY y los días que ya
              // corrieron se consolidan en la ampliación (ver
              // proyectarAmpliacion).
              const proyeccion = proyectarAmpliacion(equipo, diasNumero);
              // Lo que valen esos días, para poder ver sobre qué monto se está
              // haciendo el descuento.
              const valorDias =
                proyeccion.dias *
                (Number(equipo.cantidadEquipos) || 0) *
                (Number(equipo.valorDia) || 0);
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0 ? proyeccion.fechaNueva : null;
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
                    <TextField
                      label="Descuento sobre esos días"
                      // Con puntos de miles mientras se escribe, como los demás
                      // campos de plata: "200.000" y no "200000", que a simple
                      // vista se confunde con 20.000 o 2.000.000. Va como texto
                      // y no como número porque un campo numérico no acepta los
                      // puntos; lo que se guarda son solo los dígitos.
                      inputProps={{ inputMode: "numeric" }}
                      value={formatearMonedaInput(cambio.descuento)}
                      onChange={(e) =>
                        handleCambiarDescuento(clave, limpiarMonedaInput(e.target.value))
                      }
                      fullWidth
                      size="small"
                      sx={{ mt: 1 }}
                      helperText={
                        valorDias > 0
                          ? `${proyeccion.dias} día${
                              proyeccion.dias === 1 ? "" : "s"
                            } = ${formatearMoneda(valorDias)}${
                              // De dónde salen esos días cuando no son solo
                              // los que se pactaron: si no se dice, el monto
                              // parece un error de cuentas.
                              proyeccion.diasVencidos > 0
                                ? ` (${proyeccion.diasVencidos} vencido${
                                    proyeccion.diasVencidos === 1 ? "" : "s"
                                  } + ${proyeccion.diasPedidos} pactado${
                                    proyeccion.diasPedidos === 1 ? "" : "s"
                                  })`
                                : ""
                            }${
                              descuentoNumero > 0
                                ? ` · queda en ${formatearMoneda(valorDias - descuentoNumero)}`
                                : ""
                            }`
                          : "Este equipo no tiene precio cargado"
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

                  <FormControlLabel
                    sx={{ mt: 0.5 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={cambio.indefinida}
                        onChange={(e) => handleCambiarIndefinida(clave, e.target.checked)}
                      />
                    }
                    label="Dejar indefinida (el cliente avisará)"
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
