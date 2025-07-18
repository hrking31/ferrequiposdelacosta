// import { useState } from "react";
// import { useDispatch } from "react-redux";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   FormLabel,
// } from "@mui/material";
// import { setCliente } from "../../Store/Slices/clienteSlice";

// const DatosClienteModal = ({ open, onClose }) => {
//   const dispatch = useDispatch();
//   const [tipo, setTipo] = useState("persona");
//   const [nombre, setNombre] = useState("");
//   const [id, setId] = useState("");
//   const [direccion, setDireccion] = useState("");

//   const [errors, setErrors] = useState({});

//   const validarCampos = () => {
//     let errores = {};

//     if (!nombre.trim()) {
//       errores.nombre = "Este campo es obligatorio.";
//     }

//     if (!id.trim()) {
//       errores.id = "Este campo es obligatorio.";
//     } else if (!/^\d{5,20}$/.test(id.trim())) {
//       errores.id = "Debe contener solo números (mínimo 5 dígitos).";
//     }

//     if (!direccion.trim()) {
//       errores.direccion = "Este campo es obligatorio.";
//     }

//     setErrors(errores);

//     return Object.keys(errores).length === 0;
//   };

//    const handleGuardar = () => {
//     if (!validarCampos()) return;

//     const datos = {
//       tipo,
//       nombre,
//       identificacion: id,
//       direccion,
//     };

//     dispatch(setCliente(datos));
//     localStorage.setItem("datosCliente", JSON.stringify(datos));
//     onClose();
//   };

//   const getLabelNombre = () =>
//     tipo === "persona" ? "Nombre completo" : "Razón social";
//   const getLabelID = () => (tipo === "persona" ? "Cédula" : "NIT");

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>Datos del Cliente</DialogTitle>
//       <DialogContent dividers>
//         <FormLabel component="legend">Tipo de cliente</FormLabel>
//         <RadioGroup row value={tipo} onChange={(e) => setTipo(e.target.value)}>
//           <FormControlLabel
//             value="persona"
//             control={<Radio />}
//             label="Persona"
//           />
//           <FormControlLabel
//             value="empresa"
//             control={<Radio />}
//             label="Empresa"
//           />
//         </RadioGroup>

//         <TextField
//           fullWidth
//           margin="normal"
//           label={getLabelNombre()}
//           value={nombre}
//           onChange={(e) => setNombre(e.target.value)}
//           error={!!errors.nombre}
//           helperText={errors.nombre}
//         />

//         <TextField
//           fullWidth
//           margin="normal"
//           label={getLabelID()}
//           value={id}
//           onChange={(e) => setId(e.target.value)}
//           error={!!errors.id}
//           helperText={errors.id}
//         />

//         <TextField
//           fullWidth
//           margin="normal"
//           label="Dirección"
//           value={direccion}
//           onChange={(e) => setDireccion(e.target.value)}
//           error={!!errors.direccion}
//           helperText={errors.direccion}
//         />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancelar</Button>
//         <Button variant="contained" onClick={handleGuardar}>
//           Guardar
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default DatosClienteModal;

import { useState } from "react";
import { useDispatch } from "react-redux";
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
} from "@mui/material";
import { setCliente } from "../../Store/Slices/clienteSlice";

const DatosClienteModal = ({ open, onClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [tipo, setTipo] = useState("persona");
  const [nombre, setNombre] = useState("");
  const [id, setId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [errors, setErrors] = useState({});

  const validarCampos = () => {
    let errores = {};

    if (!nombre.trim()) {
      errores.nombre = "Este campo es obligatorio.";
    }

    if (!id.trim()) {
      errores.id = "Este campo es obligatorio.";
    } else if (!/^\d{5,20}$/.test(id.trim())) {
      errores.id = "Debe contener solo números (mínimo 5 dígitos).";
    }

    if (!direccion.trim()) {
      errores.direccion = "Este campo es obligatorio.";
    }

    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = () => {
    if (!validarCampos()) return;

    const datos = {
      tipo,
      nombre,
      identificacion: id,
      direccion,
    };

    dispatch(setCliente(datos));
    localStorage.setItem("datosCliente", JSON.stringify(datos));
    onClose();
  };

  const getLabelNombre = () =>
    tipo === "persona" ? "Nombre completo" : "Razón social";
  const getLabelID = () => (tipo === "persona" ? "Cédula" : "NIT");

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
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
        }}
      >
        <Typography variant="h5" gutterBottom>
          Datos del Cliente
        </Typography>

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

        <TextField
          fullWidth
          margin="normal"
          label="Dirección"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          error={!!errors.direccion}
          helperText={errors.direccion}
        />

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
          <Button variant="danger" onClick={onClose}>
            Cancelar
          </Button>

          <Button variant="success" onClick={handleGuardar}>
            Guardar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DatosClienteModal;
