import { useState } from "react";
import { Box, Button, Paper, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
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
  const theme = useTheme();
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

  const acento = theme.palette.custom.accent;

  return (
    <Box
      sx={{
        minHeight: "calc(100dvh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          borderTop: `4px solid ${acento}`,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(acento, 0.12),
          }}
        >
          <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 38, color: acento }} />
        </Box>

        <Typography variant="h5" gutterBottom>
          Confirme su correo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Para entrar al panel, confirme que este correo es suyo.
        </Typography>

        <Typography
          sx={{
            my: 2.5,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: "action.hover",
            fontWeight: 600,
            wordBreak: "break-all",
          }}
        >
          {user?.email}
        </Typography>

        <Stack spacing={1.25}>
          <Button
            variant="contained"
            fullWidth
            onClick={enviar}
            disabled={ocupado}
          >
            Enviarme el correo
          </Button>
          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={yaConfirme}
            disabled={ocupado}
          >
            Ya confirmé
          </Button>
          <Button variant="text" fullWidth onClick={logout} disabled={ocupado}>
            Cerrar sesión
          </Button>
        </Stack>
      </Paper>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
