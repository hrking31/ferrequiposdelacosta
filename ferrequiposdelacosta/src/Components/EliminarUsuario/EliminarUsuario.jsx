// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { signInWithEmailAndPassword, deleteUser } from "firebase/auth";
// import { doc, deleteDoc } from "firebase/firestore";
// import { db, auth } from "../Firebase/Firebase";
// import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
// import {
//   Box,
//   Button,
//   TextField,
//   Snackbar,
//   Alert,
//   Typography,
//    useTheme,
// } from "@mui/material";

// export default function EliminarUsuario() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();
//   const theme = useTheme();
//   const [snackbar, setSnackbar] = useState({
//     open: false,
//     message: "",
//     severity: "info",
//   });

//   const handleDelete = async () => {
//     if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?"))
//       return;
//     setLoading(true);
//     try {
//       const userCredential = await signInWithEmailAndPassword(
//         auth,
//         email,
//         password
//       );
//       const user = userCredential.user;
//       console.log("UID:", user.uid);

//       const userRef = doc(db, "users", userCredential.user.uid);
//       await deleteDoc(userRef);

//       await deleteUser(user);

//       setSnackbar({
//         open: true,
//         message: "Usuario eliminado con éxito",
//         severity: "success",
//       });

//       navigate("/home");
//     } catch (error) {
//       setSnackbar({ open: true, message: error.message, severity: "error" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) return <LoadingLogo />;

//   return (
//     <Box
//       maxWidth={400}
//       mx="auto"
//       p={3}
//       display="flex"
//       flexDirection="column"
//       gap={2}
//     >
//       <Typography variant="h5">Ingresa Datos del Usuario.</Typography>

//       <TextField
//         label="email"
//         type="email"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         fullWidth
//         required
//       />

//       <TextField
//         label="Contraseña"
//         type="password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         fullWidth
//         required
//       />

//       <Button variant="danger" onClick={handleDelete}>
//         Eliminar Usuario
//       </Button>

//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={4000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//         anchorOrigin={{ vertical: "top", horizontal: "center" }}
//         sx={{
//           "&.MuiSnackbar-root": {
//             position: "fixed",
//             top: "50% !important",
//             left: "50% !important",
//             transform: "translate(-50%, -50%)",
//             zIndex: 1300,
//           },
//         }}
//       >
//         <Alert
//           // onClose={handleCloseSnackbar}
//           severity={snackbar.severity}
//           variant="filled"
//           sx={{
//             width: "100%",
//             bgcolor: (theme) =>
//               theme.palette[snackbar.severity]?.main ||
//               theme.palette.primary.main,
//             color: (theme) =>
//               theme.palette[snackbar.severity]?.contrastText ||
//               theme.palette.primary.contrastText,
//           }}
//         >
//           {snackbar.message}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// }

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../Firebase/Firebase";
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
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false); // para mostrar alerta de confirmación
  const navigate = useNavigate();
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const deleteUserCloud = httpsCallable(functions, "deleteUser");

  const handleDeleteConfirmed = async () => {
    setConfirming(false);
    setLoading(true);
    try {
      await deleteUserCloud({ email });

      setSnackbar({
        open: true,
        message: "Usuario eliminado con éxito",
        severity: "success",
      });
      setEmail("");
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: error.message || "Error al eliminar el usuario",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setSnackbar({
        open: true,
        message: "Por favor, ingresa un correo.",
        severity: "error",
      });
      return;
    }
    setConfirming(true);
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
      <Typography variant="h5">Ingrese el correo del usuario.</Typography>

      <TextField
        label="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        required
      />

      <Button color="error" variant="contained" onClick={handleDelete}>
        Eliminar Usuario
      </Button>

      {/* Confirmación de eliminación */}
      <Snackbar
        open={confirming}
        onClose={() => setConfirming(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "&.MuiSnackbar-root": {
            position: "fixed",
            top: "50% !important",
            left: "50% !important",
            transform: "translate(-50%, -50%)",
            zIndex: 1300,
            width: "90%",
            maxWidth: "400px",
          },
        }}
      >
        <Alert
          severity="warning"
          variant="filled"
          sx={{
            width: "100%",
            bgcolor: theme.palette.warning.main,
            color: theme.palette.warning.contrastText,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Box display="flex" flexDirection="column" gap={1.5}>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.primary.dark,
              }}
            >
              ¿Estás seguro de que quieres eliminar este usuario?
            </Typography>

            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button
                variant="danger"
                size="small"
                onClick={() => setConfirming(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                size="small"
                onClick={handleDeleteConfirmed}
              >
                Confirmar
              </Button>
            </Box>
          </Box>
        </Alert>
      </Snackbar>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            bgcolor:
              theme.palette[snackbar.severity]?.main ||
              theme.palette.primary.main,
            color:
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
