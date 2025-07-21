import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Typography,
  Box,
  useTheme,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import { setCliente } from "../../Store/Slices/clienteSlice";
import SelectorUbicacion from "../../Components/SelectorUbicacion/selectorubicacion.jsx";

const DatosClienteModal = ({ open, onClose, modoEdicion = false }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const cliente = useSelector((state) => state.cliente);
  const [tipo, setTipo] = useState("persona");
  const [nombre, setNombre] = useState("");
  const [id, setId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [errors, setErrors] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (modoEdicion && cliente?.nombre) {
      setTipo(cliente.tipo || "persona");
      setNombre(cliente.nombre || "");
      setId(cliente.identificacion || "");
      setDireccion(cliente.direccion || "");
    }
  }, [modoEdicion, cliente]);

  const validarCampos = () => {
    const errores = {};

    if (!nombre.trim()) errores.nombre = "Este campo es obligatorio.";
    if (!id.trim()) {
      errores.id = "Este campo es obligatorio.";
    } else if (!/^\d{5,20}$/.test(id.trim())) {
      errores.id = "Debe contener solo números (mínimo 5 dígitos).";
    }
    if (!modoEdicion && !direccion.trim()) {
      errores.direccion = "Este campo es obligatorio.";
    }

    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = () => {
    if (!validarCampos()) return;

    let datos;

    if (modoEdicion) {
      datos = {
        ...cliente,
        tipo,
        nombre,
        identificacion: id,
      };
    } else {
      datos = {
        tipo,
        nombre,
        identificacion: id,
        direccion,
      };
    }

    dispatch(setCliente(datos));
    localStorage.setItem("datosCliente", JSON.stringify(datos));

    setSnackbar({
      open: true,
      message: "Datos guardados correctamente",
      severity: "success",
    });

    onClose();
  };

  const handleEliminarDatos = () => {
    const clienteGuardado =
      JSON.parse(localStorage.getItem("datosCliente")) || {};
    const direccionActual = clienteGuardado.direccion || "";

    const nuevoCliente = {
      direccion: direccionActual,
    };

    dispatch(setCliente(nuevoCliente));
    localStorage.setItem("datosCliente", JSON.stringify(nuevoCliente));

    setNombre("");
    setId("");
    setTipo("persona");

    setSnackbar({
      open: true,
      message: "Datos eliminados correctamente",
      severity: "info",
    });
    onClose();
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getLabelNombre = () =>
    tipo === "persona" ? "Nombre completo" : "Razón social";
  const getLabelID = () => (tipo === "persona" ? "Cédula" : "NIT");

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.default",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 400,
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            // border: "2px solid blue",
          }}
        >
          <Typography variant="h5" gutterBottom>
            {modoEdicion ? "Editar datos del Cliente" : "Datos del Cliente"}
          </Typography>

          {cliente?.nombre && modoEdicion && (
            <Box mb={2}>
              <Typography variant="subtitle1" color="text.secondary">
                <strong>Cliente actual:</strong>
              </Typography>

              <Typography variant="body2">
                {getLabelNombre()}: {cliente.nombre}
              </Typography>

              <Typography variant="body2">
                {getLabelID()}: {cliente.identificacion}
              </Typography>

              <Divider sx={{ my: 1 }} />
            </Box>
          )}

          <FormLabel component="legend">Tipo de cliente</FormLabel>
          <RadioGroup
            row
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="persona"
              control={
                <Radio
                  sx={{
                    color: theme.palette.custom.secondary,
                    "&.Mui-checked": {
                      color: theme.palette.custom.secondary,
                    },
                  }}
                />
              }
              label="Persona"
            />
            <FormControlLabel
              value="empresa"
              control={
                <Radio
                  sx={{
                    color: theme.palette.custom.secondary,
                    "&.Mui-checked": {
                      color: theme.palette.custom.secondary,
                    },
                  }}
                />
              }
              label="Empresa"
            />
          </RadioGroup>

          <TextField
            fullWidth
            margin="normal"
            label={getLabelNombre()}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!!errors.nombre}
            helperText={errors.nombre}
          />

          <TextField
            fullWidth
            margin="normal"
            label={getLabelID()}
            value={id}
            onChange={(e) => setId(e.target.value)}
            error={!!errors.id}
            helperText={errors.id}
          />

          {!modoEdicion && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <TextField
                fullWidth
                margin="normal"
                label="Dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                error={!!errors.direccion}
                helperText={errors.direccion}
              />
              <SelectorUbicacion />
            </Box>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 2 }}
          >
            <Button variant="danger" onClick={onClose}>
              Cancelar
            </Button>

            <Button variant="success" onClick={handleGuardar}>
              Guardar
            </Button>

            {modoEdicion && (
              <Button variant="danger" onClick={handleEliminarDatos}>
                Eliminar
              </Button>
            )}
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DatosClienteModal;
