import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Box,
  useTheme,
  Divider,
  Snackbar,
  Alert,
  MenuItem,
  FormControl,
} from "@mui/material";
import { departamentosYMunicipios } from "../RolesPermisos/RolesPermisos";
import {
  setCliente,
  actualizarDireccion,
  actualizarCliente,
} from "../../Store/Slices/clienteSlice";

const DatosClienteModal = ({
  open,
  onClose,
  onSuccess = () => {},
  modoAdmin = false,
  modoCliente = false,
  modoDireccion = false,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const cliente = useSelector((state) => state.cliente);

  const estadoInicialCliente = {
    tipo: "",
    nombre: "",
    telefono: "",
    identificacion: "",
    deposito: true,
    iva: true,
  };

  const estadoInicialDireccion = {
    departamento: "",
    municipio: "",
    detalle: "",
    barrio: "",
    otrosDatos: "",
  };

  const clienteInicial = {
    tipo: "",
    nombre: "",
    telefono: "",
    identificacion: "",
    deposito: true,
    iva: true,
    direccion: { ...estadoInicialDireccion },
  };

  const [clienteLocal, setClienteLocal] = useState(estadoInicialCliente);
  const [direccion, setDireccion] = useState(estadoInicialDireccion);

  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const direccionVacia = cliente.direccion
    ? Object.values(cliente.direccion).every((valor) => valor.trim?.() === "")
    : true;

  const clienteVacio = ["nombre", "identificacion", "tipo", "telefono"].every(
    (campo) => (cliente[campo] ?? "").trim() === "",
  );

  const validarCampos = () => {
    const errores = {};
    if (modoCliente && clienteVacio) {
      if (!clienteLocal.tipo?.trim())
        errores.tipo = "Este campo es obligatorio.";

      if (!clienteLocal.nombre?.trim())
        errores.nombre = "Este campo es obligatorio.";

      if (!clienteLocal.identificacion?.trim()) {
        errores.identificacion = "Este campo es obligatorio.";
      } else if (!/^\d{5,20}$/.test(clienteLocal.identificacion?.trim())) {
        errores.identificacion =
          "Debe contener solo números (mínimo 5 dígitos).";
      }
      if (!clienteLocal.telefono?.trim()) {
        errores.telefono = "Este campo es obligatorio.";
      } else if (!/^\d{7,15}$/.test(clienteLocal.telefono?.trim())) {
        errores.telefono = "Debe contener solo números.";
      }
    } else if (modoDireccion && direccionVacia) {
      if (!direccion.detalle?.trim()) {
        errores.detalle = "La dirección es obligatoria.";
      }

      if (!direccion.barrio?.trim()) {
        errores.barrio = "Barrio es obligatoria.";
      }

      if (!direccion.otrosDatos?.trim()) {
        errores.otrosDatos = "Este campo es obligatorio.";
      }

      if (!direccion.departamento?.trim()) {
        errores.departamento = "Debe seleccionar un departamento.";
      }

      if (!direccion.municipio?.trim()) {
        errores.municipio = "Debe seleccionar un municipio.";
      }
    } else {
      if (modoAdmin) {
        if (!clienteLocal.tipo?.trim())
          errores.tipo = "Este campo es obligatorio.";

        if (!clienteLocal.nombre?.trim())
          errores.nombre = "Este campo es obligatorio.";

        if (!clienteLocal.identificacion?.trim()) {
          errores.identificacion = "Este campo es obligatorio.";
        } else if (!/^\d{5,20}$/.test(clienteLocal.identificacion?.trim())) {
          errores.identificacion =
            "Debe contener solo números (mínimo 5 dígitos).";
        }
        if (!clienteLocal.telefono?.trim()) {
          errores.telefono = "Este campo es obligatorio.";
        } else if (!/^\d{7,15}$/.test(clienteLocal.telefono?.trim())) {
          errores.telefono = "Debe contener solo números.";
        }
        if (!direccion.detalle?.trim()) {
          errores.detalle = "La dirección es obligatoria.";
        }

        if (!direccion.barrio?.trim()) {
          errores.barrio = "Barrio es obligatoria.";
        }

        if (!direccion.otrosDatos?.trim()) {
          errores.otrosDatos = "Este campo es obligatorio.";
        }

        if (!direccion.departamento?.trim()) {
          errores.departamento = "Debe seleccionar un departamento.";
        }

        if (!direccion.municipio?.trim()) {
          errores.municipio = "Debe seleccionar un municipio.";
        }
      }
    }

    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = () => {
    if (!validarCampos()) return;
    let datos;

    if (modoCliente && !clienteVacio) {
      const camposModificados = {};

      if (clienteLocal.nombre.trim()) {
        camposModificados.nombre = clienteLocal.nombre.trim();
      }

      if (clienteLocal.telefono.trim()) {
        camposModificados.telefono = clienteLocal.telefono.trim();
      }

      if (clienteLocal.identificacion.trim()) {
        camposModificados.identificacion = clienteLocal.identificacion.trim();
      }

      if (clienteLocal.tipo.trim()) {
        camposModificados.tipo = clienteLocal.tipo.trim();
      }

      if (Object.keys(camposModificados).length > 0) {
        dispatch(actualizarCliente(camposModificados));

        const clienteActualizado = {
          ...cliente,
          ...camposModificados,
        };

        localStorage.setItem(
          "datosCliente",
          JSON.stringify(clienteActualizado),
        );
      }
    } else if (modoCliente) {
      const datosCliente = {
        ...cliente,
        ...clienteLocal,
      };
      dispatch(setCliente(datosCliente));
      localStorage.setItem("datosCliente", JSON.stringify(datosCliente));
    } else if (modoDireccion && !direccionVacia) {
      const direccionAnterior = cliente.direccion || {};
      const camposModificados = {};

      Object.keys(direccion).forEach((campo) => {
        const nuevoValor = direccion[campo]?.trim();
        const valorAnterior = direccionAnterior[campo]?.trim();

        if (nuevoValor && nuevoValor !== valorAnterior) {
          camposModificados[campo] = nuevoValor;
        }
      });

      if (Object.keys(camposModificados).length > 0) {
        dispatch(actualizarDireccion(camposModificados));

        const direccionActualizada = {
          ...cliente.direccion,
          ...camposModificados,
        };

        const clienteActualizado = {
          ...cliente,
          direccion: direccionActualizada,
        };

        localStorage.setItem(
          "datosCliente",
          JSON.stringify(clienteActualizado),
        );
      }
    } else if (modoDireccion) {
      const datosDireccion = {
        ...cliente.direccion,
        detalle: direccion.detalle,
        barrio: direccion.barrio,
        otrosDatos: direccion.otrosDatos,
        municipio: direccion.municipio,
        departamento: direccion.departamento,
      };
      const nuevoCliente = {
        ...cliente,
        direccion: datosDireccion,
      };
      dispatch(setCliente(nuevoCliente));
      localStorage.setItem("datosCliente", JSON.stringify(nuevoCliente));
    } else {
      datos = {
        ...clienteLocal,
        direccion,
      };
      dispatch(setCliente(datos));
      localStorage.setItem("datosCliente", JSON.stringify(datos));
    }

    setSnackbar({
      open: true,
      message: "Datos guardados correctamente",
      severity: "success",
    });

    if (onSuccess) {
      onSuccess();
    }
    setDireccion(estadoInicialDireccion);
    setClienteLocal(estadoInicialCliente);
    setErrors({});
    if (onClose) {
      onClose();
    }
  };

  const handleEliminarDatos = () => {
    if (modoCliente) {
      const clienteGuardado =
        JSON.parse(localStorage.getItem("datosCliente")) || {};
      const direccionActual = clienteGuardado.direccion;

      if (!direccionActual || Object.keys(direccionActual).length === 0) {
        dispatch(setCliente(clienteInicial));
        localStorage.setItem("datosCliente", JSON.stringify(clienteInicial));
      } else {
        const nuevoCliente = {
          ...clienteInicial,
          direccion: direccionActual,
        };
        dispatch(setCliente(nuevoCliente));
        localStorage.setItem("datosCliente", JSON.stringify(nuevoCliente));
      }

      setClienteLocal(estadoInicialCliente);
      setErrors({});
    } else if (modoDireccion) {
      const clienteGuardado =
        JSON.parse(localStorage.getItem("datosCliente")) || {};

      const nuevoCliente = {
        nombre: clienteGuardado.nombre || "",
        identificacion: clienteGuardado.identificacion || "",
        tipo: clienteGuardado.tipo || "",
        direccion: { ...estadoInicialDireccion },
      };

      dispatch(setCliente(nuevoCliente));
      localStorage.setItem("datosCliente", JSON.stringify(nuevoCliente));

      setDireccion({ ...estadoInicialDireccion });
      setErrors({});
    }

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

  const getLabelNombre = () => {
    const tipoActivo = clienteLocal.tipo || cliente.tipo;
    return tipoActivo === "persona" ? "Nombre" : "Razón social";
  };
  const getLabelID = () => {
    const tipoActivo = clienteLocal.tipo || cliente.tipo;

    return tipoActivo === "persona" ? "Cédula" : "NIT";
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            bgcolor: "background.default",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 400,
            maxHeight: "90vh",
            boxShadow: 24,
            p: 4,
            gap: 2,
            // border: "2px solid blue",
          }}
        >
          {modoAdmin && (
            <Typography variant="h5" gutterBottom>
              Ingresar datos del Cliente
            </Typography>
          )}

          {modoCliente && (
            <Typography variant="h5" gutterBottom>
              {clienteVacio ? "Ingresar datos" : "Editar datos"}
            </Typography>
          )}

          {modoCliente && !clienteVacio && (
            <Box>
              <Typography variant="subtitle1">
                {(clienteLocal.tipo || cliente.tipo) === "persona"
                  ? "Cliente actual:"
                  : "Datos empresa:"}
              </Typography>

              <Typography variant="body2">
                {getLabelNombre()}: {cliente.nombre}
              </Typography>

              <Typography variant="body2">
                {getLabelID()}: {cliente.identificacion}
              </Typography>

              <Typography variant="body2">
                Teléfono: {cliente.telefono}
              </Typography>

              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {(modoAdmin || modoCliente) && (
            <Box>
              <FormControl
                component="fieldset"
                error={!!errors.tipo}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2">Tipo de cliente</Typography>
                <RadioGroup
                  row
                  value={clienteLocal.tipo}
                  onChange={(e) =>
                    setClienteLocal({ ...clienteLocal, tipo: e.target.value })
                  }
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

                {errors.tipo && (
                  <Typography variant="caption" color="error">
                    {errors.tipo}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                margin="normal"
                label={getLabelNombre()}
                value={clienteLocal.nombre}
                onChange={(e) =>
                  setClienteLocal({ ...clienteLocal, nombre: e.target.value })
                }
                error={!!errors.nombre}
                helperText={errors.nombre}
              />

              <TextField
                fullWidth
                margin="normal"
                label={getLabelID()}
                value={clienteLocal.identificacion}
                onChange={(e) =>
                  setClienteLocal({
                    ...clienteLocal,
                    identificacion: e.target.value,
                  })
                }
                error={!!errors.identificacion}
                helperText={errors.identificacion}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Teléfono"
                value={clienteLocal.telefono}
                onChange={(e) =>
                  setClienteLocal({ ...clienteLocal, telefono: e.target.value })
                }
                error={!!errors.telefono}
                helperText={errors.telefono}
              />
            </Box>
          )}

          {modoDireccion && (
            <Box>
              <Typography variant="h5">
                {direccionVacia ? "Ingrese direccion" : " Editar dirección"}
              </Typography>

              {!direccionVacia && (
                <>
                  <Typography variant="subtitle1">Direccion actual:</Typography>

                  <Typography variant="body2">
                    Direccion: {cliente.direccion.detalle}
                  </Typography>

                  <Typography variant="body2">
                    Barrio: {cliente.direccion.barrio}
                  </Typography>

                  <Typography variant="body2">
                    Otros: {cliente.direccion.otrosDatos}
                  </Typography>

                  <Typography variant="body2">
                    Departamento: {cliente.direccion.departamento}
                  </Typography>

                  <Typography variant="body2">
                    Municipio: {cliente.direccion.municipio}
                  </Typography>

                  <Divider sx={{ my: 2 }} />
                </>
              )}
            </Box>
          )}

          {(modoDireccion || modoAdmin) && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <TextField
                label="Dirección"
                value={direccion.detalle}
                onChange={(e) =>
                  setDireccion({ ...direccion, detalle: e.target.value })
                }
                fullWidth
                placeholder="Ej: Calle 123 #45-67"
                error={!!errors.detalle}
                helperText={errors.detalle}
              />

              <TextField
                label="Barrio"
                value={direccion.barrio}
                onChange={(e) =>
                  setDireccion({ ...direccion, barrio: e.target.value })
                }
                fullWidth
                placeholder="Ej. La Concepción
"
                error={!!errors.barrio}
                helperText={errors.barrio}
              />

              <TextField
                label="Otros datos (Ej: bodega, edificio, obra)"
                value={direccion.otrosDatos}
                onChange={(e) =>
                  setDireccion({ ...direccion, otrosDatos: e.target.value })
                }
                fullWidth
                placeholder="Ej: Bodega 5, Edificio Torre Sur"
                error={!!errors.otrosDatos}
                helperText={errors.otrosDatos}
              />

              <TextField
                select
                label="Departamento"
                value={direccion.departamento}
                onChange={(e) =>
                  setDireccion({ ...direccion, departamento: e.target.value })
                }
                fullWidth
                error={!!errors.departamento}
                helperText={errors.departamento}
              >
                {Object.keys(departamentosYMunicipios).map((dep) => (
                  <MenuItem key={dep} value={dep}>
                    {dep}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Municipio"
                value={direccion.municipio}
                onChange={(e) =>
                  setDireccion({ ...direccion, municipio: e.target.value })
                }
                fullWidth
                disabled={!direccion.departamento}
                error={!!errors.municipio}
                helperText={errors.municipio}
              >
                {direccion.departamento &&
                departamentosYMunicipios[direccion.departamento]?.length > 0 ? (
                  departamentosYMunicipios[direccion.departamento].map(
                    (mun) => (
                      <MenuItem key={mun} value={mun}>
                        {mun}
                      </MenuItem>
                    ),
                  )
                ) : (
                  <MenuItem disabled>Seleccione un departamento</MenuItem>
                )}
              </TextField>
            </Box>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 2 }}
          >
            <Button
              variant="danger"
              onClick={() => {
                setDireccion(estadoInicialDireccion);
                setClienteLocal(estadoInicialCliente);
                setErrors({});
                onClose();
                onSuccess();
              }}
            >
              Cancelar
            </Button>

            <Button variant="success" onClick={handleGuardar}>
              Guardar
            </Button>

            {!modoAdmin && (
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
