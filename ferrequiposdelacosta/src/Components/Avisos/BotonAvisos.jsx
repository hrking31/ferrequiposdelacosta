import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button, IconButton, Tooltip } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import PropTypes from "prop-types";
import {
  activarAvisos,
  avisosSoportados,
  desactivarAvisos,
  estadoAvisos,
} from "../../Utils/avisos";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

/**
 * El interruptor de los avisos que llegan con la app cerrada.
 *
 * Se activa UNA vez por aparato y por persona: el celular y el computador de la
 * oficina se activan por separado, porque el aviso va al aparato, no a la
 * cuenta.
 *
 * No se muestra si el navegador no puede recibirlos —Safari sin instalar la
 * app, sobre todo—: un botón que no puede funcionar solo genera reclamos.
 *
 * `variante="boton"` lo dibuja como botón ancho (para el pie en celular);
 * cualquier otra cosa, como ícono (para la barra de arriba en pantalla grande).
 */
export default function BotonAvisos({ variante = "icono" }) {
  const uid = useSelector((state) => state.user.uid);
  const [soportado, setSoportado] = useState(false);
  const [estado, setEstado] = useState("sin activar");
  const [trabajando, setTrabajando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    let vigente = true;
    avisosSoportados().then((puede) => {
      if (!vigente) return;
      setSoportado(puede);
      if (puede) setEstado(estadoAvisos());
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (!soportado || !uid) return null;

  const activados = estado === "activados";
  const bloqueados = estado === "bloqueados";

  const titulo = bloqueados
    ? "Los avisos están bloqueados en este navegador"
    : activados
      ? "Este equipo recibe avisos. Tocá para dejar de recibirlos"
      : "Recibir avisos aunque la app esté cerrada";

  const alTocar = async () => {
    setTrabajando(true);
    const resultado = activados ? await desactivarAvisos(uid) : await activarAvisos(uid);
    setEstado(estadoAvisos());
    setTrabajando(false);
    showSnackbar(resultado.mensaje, resultado.ok ? "success" : "warning");
  };

  const icono = activados ? <NotificationsActiveIcon /> : <NotificationsOffIcon />;

  return (
    <>
      {variante === "boton" ? (
        <Button
          onClick={alTocar}
          disabled={trabajando}
          variant="contained"
          color={activados ? "success" : "accent"}
          fullWidth
          startIcon={icono}
        >
          {activados ? "AVISOS ACTIVADOS" : "ACTIVAR AVISOS"}
        </Button>
      ) : (
        <Tooltip title={titulo}>
          <span>
            <IconButton
              onClick={alTocar}
              disabled={trabajando}
              color={activados ? "success" : "default"}
              aria-label={activados ? "Desactivar avisos" : "Activar avisos"}
            >
              {icono}
            </IconButton>
          </span>
        </Tooltip>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

BotonAvisos.propTypes = {
  variante: PropTypes.oneOf(["icono", "boton"]),
};
