import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useDispatch, useSelector } from "react-redux";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { setUserData } from "../../Store/Slices/userSlice";
import { useAuth } from "../../Context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";

export default function Login({onClose}) {
  const [user, setUser] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const theme = useTheme();

  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const dispatch = useDispatch();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    onClose();
    setError("");

    try {
      const userCredential = await login(user.email, user.password);
      const { uid, email } = userCredential.user;

      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const { name, genero, role, permisos } = userDoc.data();

        dispatch(setUserData({ uid, email, name, genero, role, permisos }));

        navigate("/adminforms");
      } else {
        setError("No se encontró información del usuario en Firestore.");
      }
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      } else {
        setError("Error al iniciar sesión");
      }
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
