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
import { formatearNit, limpiarNit } from "../../Utils/formato";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import DocumentoClienteCampos from "./DocumentoClienteCampos";
import {
  descartarFotos,
  enlacesDelDocumento,
  fotosQueSobran,
  subirFotosDocumento,
  tieneDocumento,
} from "./documentoCliente";

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
  nit: "", // NIT si es empresa, cédula si es persona
  telefono: "",
  direccion: "",
  obra: "",
};

const formatTelefono = (telefono) => telefono.replace(/\D/g, "").substring(0, 15);

// Las fotos del documento como las maneja el formulario: por lado, el enlace
// ya guardado (`url`), el archivo recién elegido (`archivo`) y su vista previa
// (`vista`). Se arranca de lo que el cliente ya tiene.
const fotosIniciales = (documento) => ({
  frente: { url: documento?.frente || "", archivo: null, vista: null },
  atras: { url: documento?.atras || "", archivo: null, vista: null },
});

const MENSAJE_FOTO_FALLIDA =
  "No se pudo subir la foto del documento. Revisá la señal e intentá de nuevo.";

export default function ClienteFormDialog({ open, onClose, onGuardado, onEliminado, cliente }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const esEdicion = Boolean(cliente);
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [fotos, setFotos] = useState(fotosIniciales());
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
        nit: cliente.nit || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
        obra: cliente.obra || "",
      });
    } else {
      setForm(ESTADO_INICIAL);
    }
    setFotos(fotosIniciales(cliente?.documento));
  }, [open, cliente]);

  // La vista previa de una foto elegida es un enlace que vive en la memoria
  // del navegador: se suelta cuando se reemplaza o se quita.
  const soltarVista = (foto) => {
    if (foto?.vista) URL.revokeObjectURL(foto.vista);
  };

  const handleElegirFoto = (lado, archivo) => {
    soltarVista(fotos[lado]);
    const vista = URL.createObjectURL(archivo);
    setFotos((prev) => ({ ...prev, [lado]: { ...prev[lado], archivo, vista } }));
  };

  // Quitar deja el lado vacío. La foto que ya estaba guardada no se borra
  // acá: recién al guardar, cuando el cliente ya no apunte a ella.
  const handleQuitarFoto = (lado) => {
    soltarVista(fotos[lado]);
    setFotos((prev) => ({ ...prev, [lado]: { url: "", archivo: null, vista: null } }));
  };

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleChangeTelefono = (e) => {
    setForm((prev) => ({ ...prev, telefono: formatTelefono(e.target.value) }));
  };

  // El NIT/cédula se guarda pelado (dígitos y guion) y se muestra con puntos,
  // igual que en la cotización y la cuenta de cobro.
  const handleChangeNit = (e) => {
    setForm((prev) => ({ ...prev, nit: limpiarNit(e.target.value) }));
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

  // GUARDAR, CON FOTOS. Primero se suben las fotos y después se escribe el
  // cliente con sus enlaces, todo en el mismo toque:
  //
  //   - Sin fotos nuevas no se sube nada y se guarda como siempre.
  //   - Si una foto no sube (se cayó la señal en la obra), el cliente NO se
  //     guarda: sale el aviso y el formulario queda abierto, con lo escrito y
  //     las fotos, para tocar Guardar de nuevo. Así nadie queda sin documento
  //     sin que se note.
  //
  // El cliente nuevo todavía no tiene id, y su carpeta en Storage lleva ese
  // id: se pide antes (`doc(collection(...))` lo inventa en el navegador, sin
  // escribir nada) y se usa para la carpeta y para el documento.
  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);

    const clienteRef = esEdicion
      ? doc(db, "clientes", cliente.id)
      : doc(collection(db, "clientes"));

    let documento;
    let subidas = [];
    try {
      ({ documento, subidas } = await subirFotosDocumento(clienteRef.id, fotos));
    } catch {
      showSnackbar(MENSAJE_FOTO_FALLIDA, "error");
      setGuardando(false);
      return;
    }
    // El documento se escribe si hay alguna foto, o si el cliente tenía y se
    // las quitaron (ahí queda con los dos lados vacíos). Un cliente que nunca
    // tuvo fotos no gana un campo vacío.
    const conDocumento =
      enlacesDelDocumento(documento).length > 0 || tieneDocumento(cliente);

    try {
      const data = {
        tipo: form.tipo,
        nombres: form.tipo === "persona" ? form.nombres.trim() : "",
        apellido: form.tipo === "persona" ? form.apellido.trim() : "",
        razonSocial: form.tipo === "empresa" ? form.razonSocial.trim() : "",
        nit: form.nit.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        obra: form.obra.trim(),
        ...(conDocumento && { documento }),
      };

      if (esEdicion) {
        await updateDoc(clienteRef, data);
        showSnackbar("Cliente actualizado correctamente.", "success");
      } else {
        await setDoc(clienteRef, {
          ...data,
          estado: "inactivo",
        });
        showSnackbar("Cliente creado correctamente.", "success");
      }

      // Recién ahora, con el cliente apuntando a las nuevas, se borran las
      // fotos que se cambiaron o se quitaron.
      await descartarFotos(fotosQueSobran(cliente?.documento, documento));

      onGuardado?.();
      onClose();
    } catch (error) {
      // El cliente no se guardó: las fotos que se acaban de subir no las
      // usa nadie.
      await descartarFotos(subidas);
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
      // Y las fotos de su documento: no queda la cédula de alguien que ya
      // no existe en la app. Van después del borrado y no antes, para que si
      // éste falla el cliente no quede con enlaces a fotos que ya no están.
      await descartarFotos(enlacesDelDocumento(cliente.documento));

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
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>
          {esEdicion ? "Editar Cliente" : "Nuevo Cliente"}
        </DialogTitle>
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
              label={form.tipo === "empresa" ? "NIT" : "Cédula"}
              value={formatearNit(form.nit)}
              onChange={handleChangeNit}
              fullWidth
            />

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

            <TextField
              label="Obra"
              value={form.obra}
              onChange={handleChange("obra")}
              fullWidth
            />

            <DocumentoClienteCampos
              fotos={fotos}
              onElegir={handleElegirFoto}
              onQuitar={handleQuitarFoto}
              deshabilitado={guardando}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          {esEdicion && (
            <Button
              variant="contained"
              color="error"
              onClick={handleAbrirConfirmacion}
              disabled={guardando}
              size="small"
              sx={{ mr: "auto" }}
            >
              Eliminar
            </Button>
          )}
          {/* En contorno y no en rojo: el rojo es del que BORRA, que esta
              en esta misma fila. Con los dos iguales, salir del formulario y
              eliminar al cliente se veian como la misma clase de accion.
              Mismo criterio que el dialogo de borrar usuario. */}
          <Button variant="outlined" onClick={handleCerrar} disabled={guardando} size="small">
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando} size="small">
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmarOpen} onClose={handleCerrarConfirmacion} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: acento }}>Eliminar Cliente</DialogTitle>
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
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button
            onClick={handleCerrarConfirmacion}
            disabled={eliminando}
            // Sin variant MUI lo dibuja como texto plano, sin borde ni
            // fondo: al lado del boton rojo de eliminar no parecia un boton.
            // "outlined" es la accion neutra del tema (ver MuiButton).
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
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
