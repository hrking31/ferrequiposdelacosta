import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  IconButton,
  useTheme,
} from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PropTypes from "prop-types";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function Login({ onClose }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login, recuperarClave } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [, setIsSubmitting] = useState(false);
  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    closeSnackbar();
    setIsSubmitting(true);

    try {
      await login(user.email, user.password);

      if (typeof onClose === "function") {
        onClose();
      }

      navigate("/adminforms");
    } catch (error) {
      if (error.code === "auth/password-does-not-meet-requirements") {
        // Desde el 2026-10-16 la contraseña tiene requisitos, y las de antes
        // que no los cumplen ya no abren: hay que poner una nueva.
        showSnackbar(
          "Su contraseña ya no cumple los requisitos. Toque «¿Olvidó su contraseña?» para poner una nueva.",
        );
      } else if (error.code === "auth/wrong-password") {
        showSnackbar("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        showSnackbar("Usuario no registrado");
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-email"
      ) {
        showSnackbar("Correo o contraseña incorrectos");
      } else {
        showSnackbar("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Firebase manda un correo con su propia página para poner la clave nueva.
  // La respuesta es la misma exista o no la cuenta: así nadie puede usar esto
  // para averiguar qué correos están registrados.
  const handleOlvido = async () => {
    closeSnackbar();
    const email = user.email.trim();
    if (!email) {
      showSnackbar("Escriba su correo arriba y vuelva a tocar «¿Olvidó su contraseña?»");
      return;
    }
    try {
      await recuperarClave(email);
      showSnackbar(
        "Si el correo está registrado, le llegará un enlace para poner una contraseña nueva.",
        "success",
      );
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        showSnackbar(
          "Si el correo está registrado, le llegará un enlace para poner una contraseña nueva.",
          "success",
        );
      } else if (error.code === "auth/invalid-email") {
        showSnackbar("Ese correo no tiene un formato válido");
      } else {
        showSnackbar("No se pudo enviar el correo. Inténtalo de nuevo.");
      }
    }
  };

  return (
    // El ancho y el fondo los pone el diálogo que lo abre (ver Drawer). Acá se
    // limitaba a 400px centrados y se pintaba con el fondo de la PÁGINA, que es
    // un tono distinto al del diálogo: sobraban ~22px a cada lado y se veían
    // como dos franjas de otro color.
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" sx={{ mt: 2 }}>
              Iniciar sesión en mi cuenta
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              type="email"
              name="email"
              autoComplete="email"
              label="Dirección de correo electrónico"
              value={user.email}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              type={passwordType}
              name="password"
              autoComplete="current-password"
              label="Contraseña"
              value={user.password}
              onChange={handleChange}
              required
              InputProps={{
                style: { color: theme.palette.text.primary },
                endAdornment: (
                  <IconButton
                    onClick={() => dispatch(togglePasswordVisibility())}
                  >
                    {/* Mismo ojo que en Crear Usuario, mismo color: el acento
                        del modo. Antes acá resolvía el color a mano con un
                        condicional de claro/oscuro. */}
                    {passwordVisible ? (
                      <FaEyeSlash color={theme.palette.custom.accent} />
                    ) : (
                      <FaEye color={theme.palette.custom.accent} />
                    )}
                  </IconButton>
                ),
              }}
            />
            <Box sx={{ textAlign: "right", mt: 0.5 }}>
              <Button variant="text" size="small" onClick={handleOlvido}>
                ¿Olvidó su contraseña?
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button type="submit" variant="contained" color="success">
            ACCESO
          </Button>
        </Box>
      </form>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}

Login.propTypes = {
  onClose: PropTypes.func,
};
