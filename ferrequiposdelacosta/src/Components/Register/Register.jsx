import { useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import {
  Box,
  TextField,
  Button,
  Snackbar,
  Alert,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tooltip,
  IconButton,
  useTheme,
} from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import RolesPermisos from "../RolesPermisos/RolesPermisos";

export default function Register() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [user, setUser] = useState({ name: "", email: "", password: "" });
  const [roleSeleccionado, setRoleSeleccionado] = useState("");
  const [generoSeleccionado, setGeneroSeleccionado] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const [loading, setLoading] = useState(false);

  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = ({ target: { name, value } }) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSnackbar({ open: false, message: "", severity: "error" });

    const permisos = RolesPermisos[roleSeleccionado];

    if (!user.name.trim()) {
      setSnackbar({
        open: true,
        message: "Por favor, ingrese un nombre válido.",
        severity: "error",
      });
      return;
    }

    if (!isValidEmail(user.email)) {
      setSnackbar({
        open: true,
        message: "Formato de correo no válido",
        severity: "error",
      });
      return;
    }

    if (user.password.length < 6) {
      setSnackbar({
        open: true,
        message: "La contraseña debe tener al menos 6 caracteres",
        severity: "error",
      });
      return;
    }

    if (!roleSeleccionado) {
      setSnackbar({
        open: true,
        message: "Por favor, selecciona un rol",
        severity: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const newUserCredential = await signup(user.email, user.password);
      const uid = newUserCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: user.name,
        genero: generoSeleccionado,
        email: user.email,
        role: roleSeleccionado,
        permisos,
      });

      setSnackbar({
        open: true,
        message: "Usuario registrado con éxito",
        severity: "success",
      });

      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setSnackbar({
          open: true,
          message: "El correo ya está registrado",
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Error al crear la cuenta: " + error.message,
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo />;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      maxWidth={400}
      mx="auto"
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Registro
      </Typography>

      <TextField
        label="Nombre"
        name="name"
        type="text"
        value={user.name}
        onChange={handleChange}
        fullWidth
      />

      <FormControl fullWidth>
        <InputLabel id="genero-label">Género</InputLabel>
        <Select
          labelId="genero-label"
          label="Género"
          name="genero"
          value={generoSeleccionado || ""}
          onChange={(e) => setGeneroSeleccionado(e.target.value)}
        >
          <MenuItem value="" disabled>
            Selecciona un Género
          </MenuItem>

          <MenuItem value="femenino">
            <Box component="span">Femenino</Box>
          </MenuItem>

          <MenuItem value="masculino">
            <Box component="span">Masculino</Box>
          </MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Correo"
        name="email"
        type="email"
        value={user.email}
        onChange={handleChange}
        fullWidth
      />

      <TextField
        label="Contraseña"
        name="password"
        type={passwordType}
        value={user.password}
        onChange={handleChange}
        fullWidth
        InputProps={{
          style: { color: theme.palette.text.primary },
          endAdornment: (
            <IconButton onClick={() => dispatch(togglePasswordVisibility())}>
              {passwordVisible ? (
                <FaEyeSlash color={theme.palette.primary.main} />
              ) : (
                <FaEye color={theme.palette.primary.main} />
              )}
            </IconButton>
          ),
        }}
      />

      <FormControl fullWidth>
        <InputLabel id="rol-label">Rol</InputLabel>
        <Select
          labelId="rol-label"
          name="role"
          value={roleSeleccionado || ""}
          onChange={(e) => setRoleSeleccionado(e.target.value)}
          label="Rol"
        >
          <MenuItem value="" disabled>
            Selecciona un Rol
          </MenuItem>

          <MenuItem value="administrador">
            <Tooltip title="Acceso Total" placement="right">
              <Box component="span">Administrador</Box>
            </Tooltip>
          </MenuItem>

          <MenuItem value="gestorEditor">
            <Tooltip title="Crear, Edita o Elimina Equipos" placement="right">
              <Box component="span">Gestor Editor</Box>
            </Tooltip>
          </MenuItem>

          <MenuItem value="gestorFacturacion">
            <Tooltip title="Cotizaciones y Cuentas de Cobro" placement="right">
              <Box component="span">Gestor Facturación</Box>
            </Tooltip>
          </MenuItem>

          <MenuItem value="gestorIntegral">
            <Tooltip title="Editor y Facturación" placement="right">
              <Box component="span">Gestor Integral</Box>
            </Tooltip>
          </MenuItem>
        </Select>
      </FormControl>

      <Button variant="success" type="submit" fullWidth>
        Registrar
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "&.MuiSnackbar-root": {
            position: "fixed",
            top: "50% !important",
            left: "50% !important",
            transform: "translate(-50%, -50%)",
            zIndex: 1300,
          },
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            bgcolor: (theme) =>
              theme.palette[snackbar.severity]?.main ||
              theme.palette.primary.main,
            color: (theme) =>
              theme.palette[snackbar.severity]?.contrastText ||
              theme.palette.primary.contrastText,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
