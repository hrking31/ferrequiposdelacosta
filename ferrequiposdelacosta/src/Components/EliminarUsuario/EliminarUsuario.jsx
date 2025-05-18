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
} from "@mui/material";

export default function EliminarUsuario() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleDelete = async () => {
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
      mt={5}
      p={3}
      borderRadius={2}
      boxShadow={3}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Typography variant="h6">Ingresa Datos del Usuario.</Typography>
      <TextField
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tucorreo@compañia.ltd"
        fullWidth
        required
        margin="normal"
      />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="******"
        fullWidth
        required
        margin="normal"
      />
      <Button variant="contained" color="error" onClick={handleDelete}>
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
