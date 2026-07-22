import { useState } from "react";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import {
  Box,
  TextField,
  Button,
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
import { httpsCallable } from "firebase/functions";
import { functions } from "../../Components/Firebase/Firebase";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import RolesPermisos from "../RolesPermisos/RolesPermisos";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function Register() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [user, setUser] = useState({ name: "", email: "", password: "" });
  const [roleSeleccionado, setRoleSeleccionado] = useState("");
  const [generoSeleccionado, setGeneroSeleccionado] = useState("");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [loading, setLoading] = useState(false);

  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const createUser = httpsCallable(functions, "createUser");

  const handleChange = ({ target: { name, value } }) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    closeSnackbar();

    const permisos = RolesPermisos[roleSeleccionado];

    if (!user.name.trim()) {
      showSnackbar("Por favor, ingrese un nombre válido.");
      return;
    }

    if (!isValidEmail(user.email)) {
      showSnackbar("Formato de correo no válido");
      return;
    }

    if (user.password.length < 6) {
      showSnackbar("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!roleSeleccionado) {
      showSnackbar("Por favor, selecciona un rol");
      return;
    }

    try {
      setLoading(true);
      await createUser({
        email: user.email,
        password: user.password,
        name: user.name,
        genero: generoSeleccionado,
        role: roleSeleccionado,
        permisos,
      });

      showSnackbar("Usuario registrado con éxito", "success");

      setUser({ name: "", email: "", password: "" });
      setRoleSeleccionado("");
      setGeneroSeleccionado("");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        showSnackbar("El correo ya está registrado");
      } else {
        showSnackbar("Error al crear la cuenta: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo text="Creando usuario..." />;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      maxWidth={400}
      mx="auto"
      p={3}
      pt={{ xs: 6, sm: 3 }}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Registrar Nuevo Personal
      </Typography>

      <TextField
        label="Nombre"
        name="name"
        type="text"
        autoComplete="off"
        value={user.name}
        onChange={handleChange}
        fullWidth
      />

      <FormControl fullWidth>
        <InputLabel id="genero-label" htmlFor="genero-input">
          Género
        </InputLabel>
        <Select
          labelId="genero-label"
          inputProps={{ id: "genero-input" }}
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
        autoComplete="off"
        value={user.email}
        onChange={handleChange}
        fullWidth
      />

      <TextField
        label="Contraseña"
        name="password"
        type={passwordType}
        autoComplete="new-password"
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
        <InputLabel id="rol-label" htmlFor="rol-input">
          Rol del Usuario
        </InputLabel>
        <Select
          labelId="rol-label"
          inputProps={{ id: "rol-input" }}
          name="role"
          value={roleSeleccionado || ""}
          onChange={(e) => setRoleSeleccionado(e.target.value)}
          label="Rol del Usuario"
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
            <Tooltip title="Cotizaciones, Cuentas de Cobro y Cartera" placement="right">
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

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
