import { useState } from "react";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

// CONFIRMAR EL CORREO (2026-10-16). Las reglas no dejan leer ni guardar nada
// a quien no confirmó que su correo es suyo, así que las pantallas protegidas
// muestran esta hasta que lo haga (ver ProtectedRoutes.jsx). Se pide una sola
// vez por persona; también es requisito del inicio de sesión en dos pasos.
//
// El correo no sale solo al entrar: lo pide la persona con el botón. Así no
// se manda uno cada vez que abre la app sin haber confirmado todavía.
export default function VistaConfirmarCorreo() {
  const { user, logout, enviarVerificacion, confirmarCorreo } = useAuth();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    closeSnackbar();
    setOcupado(true);
    try {
      await enviarVerificacion();
      showSnackbar(
        "Listo: le enviamos el correo. Si no lo ve, revise la carpeta de spam.",
        "success",
      );
    } catch (error) {
      showSnackbar(
        error?.code === "auth/too-many-requests"
          ? "Ya le enviamos varios. Espere unos minutos antes de pedir otro."
          : "No se pudo enviar el correo. Inténtelo de nuevo.",
      );
    } finally {
      setOcupado(false);
    }
  };

  const yaConfirme = async () => {
    closeSnackbar();
    setOcupado(true);
    try {
      const listo = await confirmarCorreo();
      if (!listo) {
        showSnackbar(
          "Todavía no aparece confirmado. ¿Tocó el enlace que le llegó al correo?",
        );
      }
    } catch {
      showSnackbar("No se pudo revisar. Inténtelo de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" gutterBottom>
          Confirme su correo
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Para entrar al panel, confirme que <strong>{user?.email}</strong> es
          suyo. Se hace una sola vez.
        </Typography>

        <Box component="ol" sx={{ pl: 3, mb: 3, "& li": { mb: 1 } }}>
          <li>Toque «Enviarme el correo».</li>
          <li>Abra el correo y toque el enlace.</li>
          <li>Vuelva acá y toque «Ya confirmé».</li>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
          }}
        >
          <Button variant="contained" onClick={enviar} disabled={ocupado}>
            Enviarme el correo
          </Button>
          <Button variant="success" onClick={yaConfirme} disabled={ocupado}>
            Ya confirmé
          </Button>
          <Button variant="text" onClick={logout} disabled={ocupado}>
            Cerrar sesión
          </Button>
        </Box>
      </Paper>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Container>
  );
}
