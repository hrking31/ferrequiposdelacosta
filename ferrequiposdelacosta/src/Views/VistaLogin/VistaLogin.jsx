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
import { db } from "../../Components/Firebase/Firebase";

export default function Login() {
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
      mt={5}
      p={3}
      borderRadius={2}
      boxShadow={3}
      display="flex"
      flexDirection="column"
      gap={2}
      bgcolor={(theme) => theme.palette.background.paper}
      border={(theme) =>
        `1px solid ${
          theme.palette.mode === "dark" ? "#444" : "rgba(0,0,0,0.12)"
        }`
      }
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" color="text.primary" sx={{ mt: 3 }}>
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
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "primary.main",
                  },
                  "&:hover fieldset": {
                    borderColor: "primary.light",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.dark",
                  },
                  "& input:-webkit-autofill": {
                    boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                    WebkitTextFillColor: theme.palette.text.primary,
                  },
                },
              }}
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
              fullWidth
              InputProps={{
                style: { color: theme.palette.text.primary },
                endAdornment: (
                  <IconButton
                    onClick={() => dispatch(togglePasswordVisibility())}
                  >
                    {passwordVisible ? (
                      <FaEyeSlash color={theme.palette.primary.main} />
                    ) : (
                      <FaEye color={theme.palette.primary.main} />
                    )}
                  </IconButton>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "primary.main",
                  },
                  "&:hover fieldset": {
                    borderColor: "primary.light",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.dark",
                  },
                  "& input:-webkit-autofill": {
                    boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                    WebkitTextFillColor: theme.palette.text.primary,
                  },
                },
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
