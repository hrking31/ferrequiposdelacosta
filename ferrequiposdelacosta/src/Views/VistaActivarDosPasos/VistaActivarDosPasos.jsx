import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PhonelinkLockOutlinedIcon from "@mui/icons-material/PhonelinkLockOutlined";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

// ACTIVAR LOS DOS PASOS (2026-10-16). Obligatorio: las pantallas protegidas
// muestran esta hasta que la persona lo active (ver ProtectedRoutes.jsx y
// Utils/dosPasos.js). Va con el mismo estilo que la de confirmar el correo.
//
// Primero se escanea el código cuadrado con la aplicación de códigos del
// celular, y después se escriben los 6 números que muestra: así se comprueba
// que quedó bien antes de activarlo.

// Lo que se le dice a la persona según lo que respondió Firebase.
const mensajeDeError = (error) => {
  switch (error?.code) {
    case "auth/invalid-verification-code":
      return "Ese código no coincide. Escriba el que muestra ahora la aplicación, antes de que cambie.";
    case "auth/requires-recent-login":
      return "Por seguridad, cierre sesión, vuelva a entrar y active los dos pasos enseguida.";
    case "auth/operation-not-allowed":
      return "Los dos pasos todavía no están encendidos en Firebase. Avísele al administrador.";
    case "auth/unverified-email":
      return "Primero tiene que confirmar su correo.";
    default:
      return "No se pudo. Inténtelo de nuevo.";
  }
};

function Tarjeta({ children }) {
  const theme = useTheme();
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
          <PhonelinkLockOutlinedIcon sx={{ fontSize: 38, color: acento }} />
        </Box>
        {children}
      </Paper>
    </Box>
  );
}

Tarjeta.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function VistaActivarDosPasos() {
  const { dosPasos, activarDosPasos, logout } = useAuth();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [ocupado, setOcupado] = useState(false);
  const [activacion, setActivacion] = useState(null);
  const [codigo, setCodigo] = useState("");

  // Ya los tiene activados, pero esta sesión es de antes: no hay nada que
  // activar, solo volver a entrar con clave y código.
  if (dosPasos === "reentrar") {
    return (
      <Tarjeta>
        <Typography variant="h5" gutterBottom>
          Vuelva a entrar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sus dos pasos ya están activos. Cierre sesión y entre de nuevo con su
          contraseña y el código de la aplicación.
        </Typography>
        <Button variant="contained" fullWidth onClick={logout}>
          Cerrar sesión
        </Button>
      </Tarjeta>
    );
  }

  const empezar = async () => {
    closeSnackbar();
    setOcupado(true);
    try {
      setActivacion(await activarDosPasos.empezar());
    } catch (error) {
      console.error(error);
      showSnackbar(mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const activar = async (event) => {
    event.preventDefault();
    closeSnackbar();
    if (!/^\d{6}$/.test(codigo)) {
      showSnackbar("Escriba los 6 números que muestra la aplicación.");
      return;
    }
    setOcupado(true);
    try {
      // Si queda "activo", la puerta deja pasar sola; si queda "reentrar",
      // esta misma pantalla pasa a pedir que vuelva a entrar.
      await activarDosPasos.terminar(activacion.secreto, codigo);
    } catch (error) {
      console.error(error);
      showSnackbar(mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Tarjeta>
      <Typography variant="h5" gutterBottom>
        Active los dos pasos
      </Typography>

      {!activacion ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Para entrar al panel, además de su contraseña se le pedirá un
            código de su celular. Necesita una aplicación de códigos, como
            Google Authenticator (en iPhone ya viene incluida).
          </Typography>
          <Stack spacing={1.25}>
            <Button variant="contained" fullWidth onClick={empezar} disabled={ocupado}>
              Empezar
            </Button>
            <Button variant="text" fullWidth onClick={logout} disabled={ocupado}>
              Cerrar sesión
            </Button>
          </Stack>
        </>
      ) : (
        <form onSubmit={activar}>
          <Typography variant="body2" color="text.secondary">
            Escanee este código con la aplicación de códigos de su celular y
            escriba los 6 números que le muestre.
          </Typography>

          <Box
            sx={{
              my: 2.5,
              mx: "auto",
              p: 1.5,
              width: "fit-content",
              borderRadius: 2,
              // Siempre sobre blanco: en modo oscuro un código cuadrado claro
              // sobre fondo oscuro muchos celulares no lo leen.
              bgcolor: "#fff",
            }}
          >
            <QRCodeSVG value={activacion.enlace} size={180} />
          </Box>

          {/* En el mismo celular no se puede escanear: el enlace abre la
              aplicación de códigos directamente, y si no, la clave a mano. */}
          <Button
            variant="text"
            size="small"
            href={activacion.enlace}
            sx={{ mb: 1 }}
          >
            Abrir en la aplicación del celular
          </Button>
          <Typography variant="caption" color="text.secondary" component="p">
            ¿No puede escanear? Escriba esta clave en la aplicación:
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              mb: 2.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: "action.hover",
              fontFamily: "monospace",
              fontWeight: 600,
              wordBreak: "break-all",
              letterSpacing: 1,
            }}
          >
            {activacion.clave}
          </Typography>

          <TextField
            label="Código de 6 números"
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Stack spacing={1.25}>
            <Button type="submit" variant="contained" color="success" fullWidth disabled={ocupado}>
              Activar
            </Button>
            <Button variant="text" fullWidth onClick={logout} disabled={ocupado}>
              Cerrar sesión
            </Button>
          </Stack>
        </form>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Tarjeta>
  );
}
