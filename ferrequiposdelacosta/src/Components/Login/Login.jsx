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
  Alert,
  useTheme,
} from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { useAuth } from "../../Context/AuthContext";

export default function Login({ onClose }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(user.email, user.password);

      if (typeof onClose === "function") {
        onClose();
      }

      navigate("/adminforms");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      } else if (error.code === "auth/invalid-credential") {
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-email"
      ) {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      maxWidth={400}
      mx="auto"
      p={2}
      display="flex"
      flexDirection="column"
      gap={2}
      sx={{ bgcolor: "background.default" }}
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" sx={{ mt: 2 }}>
              Iniciar sesión en mi cuenta
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mt: 2, color: "#b22222" }}>
                {error}
              </Alert>
            )}
          </Grid>
          <Grid item xs={12}>
            <TextField
              type="email"
              name="email"
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
                    {passwordVisible ? (
                      <FaEyeSlash
                        color={
                          theme.palette.mode === "light"
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary
                        }
                      />
                    ) : (
                      <FaEye
                        color={
                          theme.palette.mode === "light"
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary
                        }
                      />
                    )}
                  </IconButton>
                ),
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button type="submit" variant="success">
            ACCESO
          </Button>
        </Box>
      </form>
    </Box>
  );
}
