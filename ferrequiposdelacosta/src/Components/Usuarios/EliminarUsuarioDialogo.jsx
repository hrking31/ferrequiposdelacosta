import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { httpsCallable } from "firebase/functions";
import { functions } from "../Firebase/Firebase";
import { useAuth } from "../../Context/useAuth";
import AvatarUsuario from "./AvatarUsuario";
import { nombreDelRol, permisosDelRol } from "./usuarios";

// ELIMINAR A UNA PERSONA, con su ventana de confirmación (2026-10-28), como
// la de un equipo: muestra a quién se borra y el botón rojo se activa recién
// al escribir su correo, para que un toque en falso no se lleve una cuenta.
//
// Lo borra el servidor (deleteUser): su cuenta para entrar, su ficha con la
// lista de aparatos, su foto y su presencia. Lo que hizo —cotizaciones,
// cuentas de cobro— no lo toca.
//
// Si es uno mismo, después de borrar se cierra la sesión.
//
// `onTerminar({ mensaje, severidad, eliminado })`: la vista avisa y, si se
// borró, vuelve a la lista.
export default function EliminarUsuarioDialogo({ usuario, esTu = false, open, onClose, onTerminar, conCambios }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [escrito, setEscrito] = useState("");
  const [borrando, setBorrando] = useState(false);
  const nombre = (usuario.name || "").trim() || usuario.email || "este usuario";
  // Se confirma con el CORREO y no con el nombre (pedido del dueño,
  // 2026-10-28): es único, el nombre se puede repetir.
  const correo = (usuario.email || "").trim();
  const coincide = correo !== "" && escrito.trim().toLowerCase() === correo.toLowerCase();
  const aparatos = usuario.aparatos?.length || 0;
  // Solo quien factura hace cotizaciones y cuentas de cobro: a los demás el
  // aviso de que se quedan no les toca.
  const factura = permisosDelRol(usuario.role).some((p) => p === "cotizacion" || p === "cuentaCombro");

  useEffect(() => {
    if (open) setEscrito("");
  }, [open]);

  const eliminar = async () => {
    setBorrando(true);
    try {
      await httpsCallable(functions, "deleteUser")({ email: usuario.email });
      if (esTu) {
        await logout();
        navigate("/");
        return;
      }
      onTerminar({ mensaje: `${nombre} ya no tiene cuenta.`, severidad: "success", eliminado: true });
    } catch (error) {
      console.error(error);
      onTerminar({
        mensaje: error.message || `No se pudo eliminar a ${nombre}.`,
        severidad: "error",
        eliminado: false,
      });
    } finally {
      setBorrando(false);
    }
  };

  return (
    <Dialog open={open} onClose={borrando ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: "bold", bgcolor: "error.main", color: "error.contrastText" }}>
        ⚠️ Eliminar usuario
      </DialogTitle>

      <DialogContent sx={{ pt: "20px !important" }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
          <AvatarUsuario usuario={usuario} tamano={64} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{nombre}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {usuario.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nombreDelRol(usuario.role)}
              {aparatos > 0 && ` · sesión abierta en ${aparatos === 1 ? "1 aparato" : `${aparatos} aparatos`}`}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Se borra su cuenta para entrar, su ficha y su foto, y se le cierra la app en todos sus
          aparatos. <strong>No se puede deshacer.</strong>
        </Typography>

        {factura && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Las cotizaciones y cuentas de cobro que hizo se quedan: no se borran con la cuenta.
          </Alert>
        )}

        {esTu && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Eres tú: al eliminarte se cierra tu sesión y ya no podrás volver a entrar.
          </Alert>
        )}

        {conCambios && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tiene cambios sin guardar: también se pierden.
          </Alert>
        )}

        {/* La instrucción va afuera y la casilla en blanco, como al eliminar
            un equipo. */}
        <Typography variant="body2" sx={{ mb: 1, overflowWrap: "anywhere" }}>
          Escribe su correo <strong>{correo}</strong> para confirmar
        </Typography>

        <TextField
          name="confirmarCorreo"
          type="email"
          inputProps={{ "aria-label": "Confirmar eliminación" }}
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && coincide && !borrando) eliminar();
          }}
          autoComplete="off"
          autoFocus
          fullWidth
        />
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1.5, "& > :not(style)": { m: "0 !important" } }}>
        <Button onClick={eliminar} variant="contained" color="error" disabled={!coincide || borrando} fullWidth>
          {borrando ? "Eliminando..." : "Eliminar"}
        </Button>
        <Button onClick={onClose} variant="outlined" disabled={borrando} fullWidth>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EliminarUsuarioDialogo.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    aparatos: PropTypes.array,
  }).isRequired,
  esTu: PropTypes.bool,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onTerminar: PropTypes.func.isRequired,
  conCambios: PropTypes.bool,
};
