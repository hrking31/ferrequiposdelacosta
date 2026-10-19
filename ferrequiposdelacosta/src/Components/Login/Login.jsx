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
  const { login, recuperarClave, prepararSegundoPaso, entrarConCodigo } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  // El segundo paso (2026-10-16): con la contraseña bien, Firebase pide el
  // código de la aplicación del celular. Acá se guarda lo necesario para
  // pedirlo, mientras tanto se muestra el campo del código en vez del de la
  // contraseña.
  const [segundoPaso, setSegundoPaso] = useState(null);
  const [codigo, setCodigo] = useState("");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [, setIsSubmitting] = useState(false);
  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const alEntrar = () => {
    if (typeof onClose === "function") {
      onClose();
    }
    navigate("/adminforms");
  };

  const handleCodigo = async (event) => {
    event.preventDefault();
    closeSnackbar();
    if (!/^\d{6}$/.test(codigo)) {
      showSnackbar("Escriba los 6 números que muestra la aplicación.");
      return;
    }
    try {
      await entrarConCodigo(segundoPaso, codigo);
      alEntrar();
    } catch (error) {
      if (error.code === "auth/invalid-verification-code") {
        showSnackbar("Código incorrecto. Escriba el que muestra ahora la aplicación.");
      } else if (
        [
          "auth/totp-challenge-timeout",
          "auth/code-expired",
          "auth/missing-multi-factor-session",
          "auth/invalid-multi-factor-session",
        ].includes(error.code)
      ) {
        // El permiso para el segundo paso dura unos minutos.
        setSegundoPaso(null);
        showSnackbar("Pasó mucho tiempo. Vuelva a escribir su contraseña.");
      } else {
        showSnackbar("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    closeSnackbar();
    setIsSubmitting(true);

    try {
      await login(user.email, user.password);
      alEntrar();
    } catch (error) {
      if (error.code === "auth/multi-factor-auth-required") {
        setCodigo("");
        setSegundoPaso(prepararSegundoPaso(error));
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
      {segundoPaso ? (
        <form onSubmit={handleCodigo}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" sx={{ mt: 2 }}>
                Código de su celular
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Abra la aplicación de códigos y escriba los 6 números de
                Ferrequipos de la Costa.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="codigo"
                label="Código de 6 números"
                value={codigo}
                onChange={(e) =>
                  setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }}
                autoFocus
                fullWidth
                required
              />
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 3 }}>
            <Button variant="text" onClick={() => setSegundoPaso(null)}>
              Volver
            </Button>
            <Button type="submit" variant="contained" color="success">
              ENTRAR
            </Button>
          </Box>
        </form>
      ) : (
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
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}

Login.propTypes = {
  onClose: PropTypes.func,
};
