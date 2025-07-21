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
  const [confirming, setConfirming] = useState(false); // para mostrar alerta de confirmación
  const navigate = useNavigate();
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleDeleteConfirmed = async () => {
    setConfirming(false);
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userRef = doc(db, "users", user.uid);
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

  const handleDelete = () => {
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
      <Typography variant="h5">Ingresa Datos del Usuario.</Typography>

      <TextField
        label="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        required
      />

      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
          },
        }}
      >
        <Alert
          severity="warning"
          variant="filled"
          action={
            <Button
              variant="success"
              size="small"
              onClick={handleDeleteConfirmed}
            >
              Confirmar
            </Button>
          }
          sx={{
            width: "100%",
            bgcolor: theme.palette.warning.main,
            color: theme.palette.warning.contrastText,
          }}
        >
          ¿Estás seguro de que quieres eliminar este usuario?
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

