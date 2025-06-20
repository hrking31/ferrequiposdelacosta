import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../Firebase/Firebase";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import {
  Box,
  Button,
  TextField,
  Snackbar,
  Alert,
  Typography,
   useTheme,
} from "@mui/material";

export default function EliminarUsuario() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?"))
      return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("UID:", user.uid);

      const userRef = doc(db, "users", userCredential.user.uid);
      await deleteDoc(userRef);

      await deleteUser(user);

      setSnackbar({
        open: true,
        message: "Usuario eliminado con éxito",
        severity: "success",
      });

      navigate("/home");
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo />;

  return (
    <Box
      maxWidth={400}
      mx="auto"
      p={3}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Typography variant="h6">Ingresa Datos del Usuario.</Typography>
      <TextField
        label="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        required
        size="small"
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
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        required
        size="small"
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
      <Button variant="danger" onClick={handleDelete}>
        Eliminar Usuario
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// recordar mostrar la notificaciones de alrt en la pantalla de login, validar correos
