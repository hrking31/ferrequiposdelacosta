import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const obtenerNombreCliente = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const ESTADO_INICIAL = {
  tipo: "persona",
  nombres: "",
  apellido: "",
  razonSocial: "",
  telefono: "",
  direccion: "",
};

const formatTelefono = (telefono) => telefono.replace(/\D/g, "").substring(0, 15);

export default function ClienteFormDialog({ open, onClose, onGuardado, onEliminado, cliente }) {
  const theme = useTheme();
  const pantallaChica = useMediaQuery(theme.breakpoints.down("sm"));
  const esEdicion = Boolean(cliente);
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [facturasCount, setFacturasCount] = useState(null);
  const [cargandoConteo, setCargandoConteo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (cliente) {
      setForm({
        tipo: cliente.tipo || "persona",
        nombres: cliente.nombres || "",
        apellido: cliente.apellido || "",
        razonSocial: cliente.razonSocial || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
      });
    } else {
      setForm(ESTADO_INICIAL);
    }
  }, [open, cliente]);

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleChangeTelefono = (e) => {
    setForm((prev) => ({ ...prev, telefono: formatTelefono(e.target.value) }));
  };

  const validar = () => {
    const errores = {};
    if (form.tipo === "persona") {
      if (!form.nombres.trim()) errores.nombres = "Este campo es obligatorio.";
      if (!form.apellido.trim()) errores.apellido = "Este campo es obligatorio.";
    } else if (!form.razonSocial.trim()) {
      errores.razonSocial = "Este campo es obligatorio.";
    }
    if (form.telefono && form.telefono.length < 7) {
      errores.telefono = "Debe tener al menos 7 dígitos.";
    }
    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const data = {
        tipo: form.tipo,
        nombres: form.tipo === "persona" ? form.nombres.trim() : "",
        apellido: form.tipo === "persona" ? form.apellido.trim() : "",
        razonSocial: form.tipo === "empresa" ? form.razonSocial.trim() : "",
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
      };

      if (esEdicion) {
        await updateDoc(doc(db, "clientes", cliente.id), data);
        showSnackbar("Cliente actualizado correctamente.", "success");
      } else {
        const clienteRef = doc(collection(db, "clientes"));
        await setDoc(clienteRef, {
          ...data,
          estado: "inactivo",
        });
        showSnackbar("Cliente creado correctamente.", "success");
      }

      onGuardado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al guardar el cliente: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirConfirmacion = async () => {
    setConfirmarOpen(true);
    setCargandoConteo(true);
    try {
      const facturasSnap = await getDocs(collection(db, "clientes", cliente.id, "facturas"));
      setFacturasCount(facturasSnap.size);
    } catch (error) {
      showSnackbar(`Error al revisar las facturas del cliente: ${error.message}`, "error");
      setFacturasCount(0);
    } finally {
      setCargandoConteo(false);
    }
  };

  const handleCerrarConfirmacion = () => {
    if (eliminando) return;
    setConfirmarOpen(false);
    setFacturasCount(null);
  };

  const handleEliminarDefinitivo = async () => {
    setEliminando(true);
    try {
      const batch = writeBatch(db);
      const facturasSnap = await getDocs(collection(db, "clientes", cliente.id, "facturas"));
      facturasSnap.forEach((facturaDoc) => batch.delete(facturaDoc.ref));
      batch.delete(doc(db, "clientes", cliente.id));
      await batch.commit();

      showSnackbar("Cliente eliminado correctamente.", "success");
      setConfirmarOpen(false);
      setFacturasCount(null);
      onEliminado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al eliminar el cliente: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCerrar}
        fullWidth
        maxWidth="xs"
        fullScreen={pantallaChica}
      >
        <DialogTitle>{esEdicion ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl>
              <FormLabel id="tipo-cliente-label">Tipo de cliente</FormLabel>
              <RadioGroup
                row
                aria-labelledby="tipo-cliente-label"
                value={form.tipo}
                onChange={handleChange("tipo")}
              >
                <FormControlLabel value="persona" control={<Radio />} label="Persona" />
                <FormControlLabel value="empresa" control={<Radio />} label="Empresa" />
              </RadioGroup>
            </FormControl>

            {form.tipo === "persona" ? (
              <>
                <TextField
                  label="Nombres"
                  value={form.nombres}
                  onChange={handleChange("nombres")}
                  error={!!errors.nombres}
                  helperText={errors.nombres}
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Apellido"
                  value={form.apellido}
                  onChange={handleChange("apellido")}
                  error={!!errors.apellido}
                  helperText={errors.apellido}
                  fullWidth
                />
              </>
            ) : (
              <TextField
                label="Razón social"
                value={form.razonSocial}
                onChange={handleChange("razonSocial")}
                error={!!errors.razonSocial}
                helperText={errors.razonSocial}
                fullWidth
                autoFocus
              />
            )}

            <TextField
              label="Teléfono"
              value={form.telefono}
              onChange={handleChangeTelefono}
              error={!!errors.telefono}
              helperText={errors.telefono}
              fullWidth
            />

            <TextField
              label="Dirección"
              value={form.direccion}
              onChange={handleChange("direccion")}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {esEdicion && (
            <Button
              variant="danger"
              onClick={handleAbrirConfirmacion}
              disabled={guardando}
              sx={{ mr: "auto" }}
            >
              Eliminar Cliente
            </Button>
          )}
          <Button onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : esEdicion ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmarOpen} onClose={handleCerrarConfirmacion} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar Cliente</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            ¿Seguro que querés eliminar a <strong>{obtenerNombreCliente(cliente)}</strong>? Esta
            acción no se puede deshacer.
          </Typography>
          <Alert severity="warning">
            {cargandoConteo
              ? "Revisando las facturas del cliente..."
              : facturasCount > 0
                ? `Se eliminarán también sus ${facturasCount} factura${facturasCount === 1 ? "" : "s"} registrada${facturasCount === 1 ? "" : "s"}.`
                : "Este cliente no tiene facturas registradas."}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCerrarConfirmacion} disabled={eliminando}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleEliminarDefinitivo}
            disabled={eliminando || cargandoConteo}
          >
            {eliminando ? "Eliminando..." : "Sí, eliminar definitivamente"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

ClienteFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onGuardado: PropTypes.func,
  onEliminado: PropTypes.func,
  cliente: PropTypes.object,
};
