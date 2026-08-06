import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  obtenerGestiones,
  crearRegistroGestion,
  obtenerFechaHoyBogota,
  obtenerHoraBogotaHHMM,
  formatearFechaLegible,
} from "../ClienteDetalle/facturaUtils";
import { formatearHoraLegible } from "../../Utils/formato";

// Los códigos que se usaron en la migración para los clientes de los que no
// se tiene teléfono. Misma lista que en ClienteSeguimientoCard.
const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

// Anota una llamada en la línea de tiempo de UNA factura: la que está abierta
// en la tarjeta. Es el mismo criterio del mensaje de WhatsApp, que también
// habla de una sola — con varias facturas en seguimiento, ni el reclamo ni los
// números (equipos pendientes, saldo) se pueden atribuir a ninguna.
//
// El número, la fecha y la hora NO se pueden escribir: se sellan solos con el
// teléfono del cliente y el momento en que se abre este diálogo. Si se
// pudieran editar, el registro dejaría de servir para lo que existe —probar
// que a este cliente se le hizo seguimiento— porque se podrían inventar
// llamadas que nunca ocurrieron. Lo único que se elige es el resultado.
//
// Lo que decide el chip de gestión es el resultado: si el cliente NO contestó,
// la factura queda en "Sin respuesta" y suma uno al contador de insistencias.
// Si contestó, la llamada queda anotada pero el chip lo define lo que se haya
// acordado en ella (una prórroga, una devolución), que se registra aparte.
export default function RegistrarLlamadaDialog({ open, onClose, cliente, factura, onActualizado }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  // Desde el computador no se puede marcar, así que el botón de llamar no
  // aparece: ahí el diálogo sirve solo para anotar el resultado.
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setNumero(tieneTelefonoValido(cliente?.telefono) ? String(cliente.telefono) : "");
    setFecha(obtenerFechaHoyBogota());
    setHora(obtenerHoraBogotaHHMM());
  }, [open, cliente]);

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleGuardar = async (contesto) => {
    setGuardando(true);
    try {
      const gestiones = [
        ...obtenerGestiones(factura),
        crearRegistroGestion("llamada", {
          numero: numero.trim(),
          contesto,
          // Los sellados al abrir el diálogo. El respaldo es por si se abriera
          // sin pasar por el efecto: nunca debería, pero un registro con la
          // fecha en blanco rompería la línea de tiempo.
          fecha: fecha || obtenerFechaHoyBogota(),
          hora: hora || obtenerHoraBogotaHHMM(),
        }),
      ];

      // Una llamada no cambia el estado de la factura —ni el del cliente—:
      // solo deja constancia de que se gestionó. Por eso alcanza con escribir
      // la factura, sin recalcular nada.
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        gestiones,
      });

      showSnackbar(
        contesto ? "Llamada registrada." : "Llamada sin respuesta registrada.",
        "success",
      );
      onActualizado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al registrar la llamada: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const numeroMarcable = numero.replace(/\D/g, "");

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>Registrar llamada</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {/* Los tres datos son FIJOS, no campos: si se pudieran escribir a
                mano, el registro dejaría de probar que la llamada se hizo. Se
                sellan al abrir este diálogo y se guardan tal cual. */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.75}>
                {[
                  { rotulo: "Número", valor: numero || "Sin teléfono registrado" },
                  { rotulo: "Fecha", valor: formatearFechaLegible(fecha) },
                  { rotulo: "Hora", valor: formatearHoraLegible(hora) },
                ].map(({ rotulo, valor }) => (
                  <Stack
                    key={rotulo}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    gap={2}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {rotulo}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {valor}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Solo en el celular, que es donde abre el marcador. */}
            {esMovil && numeroMarcable && (
              <Button
                variant="call"
                startIcon={<PhoneIcon />}
                component="a"
                href={`tel:${numeroMarcable}`}
                fullWidth
              >
                Llamar ahora
              </Button>
            )}

            <Typography variant="body2" color="text.secondary">
              ¿El cliente contestó?
            </Typography>

            {/* A qué factura se le anota: la tarjeta puede tener varias en
                pestañas y la llamada queda solo en la que está abierta. */}
            {factura?.numeroFactura != null && (
              <Typography variant="caption" color="text.secondary">
                Queda registrada en la factura N° {factura.numeroFactura}.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        {/* Los tres en una sola fila y del mismo ancho: son tres respuestas a
            la misma pregunta, así que ninguna pesa más que las otras. El
            reparto por flex evita que "No contestó" —el más largo— empuje a
            los demás a otro renglón en pantallas angostas. */}
        <DialogActions sx={{ justifyContent: "center", gap: 1, px: 2, pb: 3, flexWrap: "nowrap" }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleCerrar}
            disabled={guardando}
            sx={{ flex: 1, whiteSpace: "nowrap", px: 1 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleGuardar(false)}
            disabled={guardando}
            sx={{ flex: 1, whiteSpace: "nowrap", px: 1 }}
          >
            No contestó
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleGuardar(true)}
            disabled={guardando}
            sx={{ flex: 1, whiteSpace: "nowrap", px: 1 }}
          >
            Contestó
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

RegistrarLlamadaDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onActualizado: PropTypes.func,
};
