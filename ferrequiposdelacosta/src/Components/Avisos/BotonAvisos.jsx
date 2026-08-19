import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button, IconButton, Tooltip } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PropTypes from "prop-types";
import {
  activarAvisos,
  avisosSoportados,
  estadoAvisos,
  revisarAyudante,
} from "../../Utils/avisos";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

/**
 * El botón para empezar a recibir avisos con la app cerrada.
 *
 * Aparece SOLO mientras haga falta: en cuanto este aparato queda registrado, el
 * botón desaparece y no vuelve. Un interruptor permanente para algo que se hace
 * una vez es un botón que estorba todos los días.
 *
 * Vuelve a aparecer cuando de verdad hace falta activarlos de nuevo:
 *
 *   · en otro aparato (cada uno se registra por su cuenta),
 *   · si otra persona inicia sesión en este mismo equipo,
 *   · si se borran los datos del navegador o se reinstala la app.
 *
 * Tampoco se muestra donde no puede funcionar —Safari sin instalar la app—:
 * un botón que no puede cumplir solo genera reclamos.
 *
 * `variante="boton"` lo dibuja como botón ancho (para el pie en celular);
 * cualquier otra cosa, como ícono (para la barra de arriba en pantalla grande).
 */
export default function BotonAvisos({ variante = "icono" }) {
  const uid = useSelector((state) => state.user.uid);
  const [soportado, setSoportado] = useState(false);
  // Arranca en "ya está" para que el botón no aparezca y desaparezca de golpe
  // mientras se averigua el estado real.
  const [yaActivados, setYaActivados] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    let vigente = true;

    avisosSoportados().then((puede) => {
      if (!vigente) return;
      setSoportado(puede);
      if (!puede) return;

      setYaActivados(estadoAvisos(uid) === "activados");
      // De paso se revisa si hay una versión nueva del ayudante que recibe los
      // avisos: el navegador no lo hace solo, y sin esto un cambio desplegado
      // tarda días en llegar a un teléfono que ya los tenía activados.
      revisarAyudante(uid);
    });

    return () => {
      vigente = false;
    };
  }, [uid]);

  // El aviso de resultado vive acá adentro, así que el componente sigue montado
  // mientras esté abierto: si desapareciera junto con el botón, la persona
  // nunca llegaría a leer que quedó activado.
  if (!soportado || !uid || (yaActivados && !snackbar.open)) return null;

  const alTocar = async () => {
    setTrabajando(true);
    const resultado = await activarAvisos(uid);
    setYaActivados(estadoAvisos(uid) === "activados");
    setTrabajando(false);
    showSnackbar(resultado.mensaje, resultado.ok ? "success" : "warning");
  };

  return (
    <>
      {!yaActivados &&
        (variante === "boton" ? (
          <Button
            onClick={alTocar}
            disabled={trabajando}
            variant="contained"
            color="accent"
            fullWidth
            startIcon={<NotificationsActiveIcon />}
          >
            ACTIVAR AVISOS
          </Button>
        ) : (
          <Tooltip title="Recibir avisos aunque la app esté cerrada">
            <span>
              <IconButton
                onClick={alTocar}
                disabled={trabajando}
                aria-label="Activar avisos"
              >
                <NotificationsActiveIcon />
              </IconButton>
            </span>
          </Tooltip>
        ))}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

BotonAvisos.propTypes = {
  variante: PropTypes.oneOf(["icono", "boton"]),
};
