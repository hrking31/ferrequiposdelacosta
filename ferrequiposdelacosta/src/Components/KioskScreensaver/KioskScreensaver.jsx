import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PropTypes from "prop-types";
import { clearCart } from "../../Store/Slices/cartSlice.js";
import { clearCliente } from "../../Store/Slices/clienteSlice.js";
import { applyPendingUpdate } from "../../pwaUpdate.js";

export default function KioskScreensaver({ timeout = 60000 }) {
  const dispatch = useDispatch();
  const equipos = useSelector((state) => state.equipos.equipos || []);
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = equipos
    .filter((equipo) => equipo.images?.[0]?.url)
    .map((equipo) => equipo.images[0].url);

  // Lógica de detección de inactividad
  useEffect(() => {
    let timer;
    const activarProtector = () => {
      setIsActive(true);
      // el cliente se fue sin terminar: deja el estado limpio para el siguiente
      dispatch(clearCart());
      dispatch(clearCliente());
      // sin cliente activo: buen momento para aplicar una actualización pendiente
      applyPendingUpdate();
    };

    const resetTimer = () => {
      setIsActive(false);
      clearTimeout(timer);
      timer = setTimeout(activarProtector, timeout);
    };

    // Eventos que reinician el contador de actividad
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("keypress", resetTimer);

    timer = setTimeout(activarProtector, timeout);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      clearTimeout(timer);
    };
  }, [timeout, dispatch]);

  // Lógica del Carrusel automático
  useEffect(() => {
    if (!isActive || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [isActive, images.length]);

  if (!isActive || images.length === 0) return null;

  // Las únicas fotos que hace falta tener cargadas: la que se está viendo, la
  // ANTERIOR —que todavía se está desvaneciendo, si la quitáramos de golpe la
  // transición se cortaría— y la SIGUIENTE, para que llegue cargada a su turno
  // y no aparezca en blanco.
  //
  // Es un conjunto y no una lista porque con una o dos fotos los tres índices
  // se repiten, y no hay que dibujar la misma dos veces.
  const vecinas = new Set([
    (currentIndex - 1 + images.length) % images.length,
    currentIndex,
    (currentIndex + 1) % images.length,
  ]);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "black",
        cursor: "pointer",
      }}
      onClick={() => setIsActive(false)}
    >
      {/* SOLO TRES FOTOS VIVAS a la vez (ver `vecinas`), no el catálogo
          entero. El kiosco corre en una Raspberry Pi y cada foto a pantalla
          completa ocupa unos 8 MB de memoria ya descomprimida: con 30 equipos
          eran cientos de megas sostenidos todo el día, en una máquina que
          tiene 1 GB.

          Las que no están en la ventana se DESMONTAN, así el navegador puede
          soltar su memoria. Antes estaban todas dibujadas siempre y solo
          cambiaba cuál era visible, que para el navegador es lo mismo que
          tenerlas todas a la vista. */}
      {images.map((url, i) =>
        vecinas.has(i) ? (
          <Box
            key={i}
            component="img"
            src={url}
            // Que la decodificación no bloquee: en la Pi, decodificar una foto
            // grande frena el dibujado de todo lo demás.
            decoding="async"
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "opacity 1.5s ease-in-out",
              opacity: i === currentIndex ? 1 : 0,
            }}
          />
        ) : null,
      )}

      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "60%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Texto de invitación a la acción */}
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          left: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 3,
          px: 4,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: "primary.main",
            fontWeight: 800,
            textShadow: "0px 4px 10px rgba(0, 0, 0, 0.9)",
            mb: 2,
            fontSize: "clamp(2rem, 5vw, 4rem)",
            lineHeight: 1.1,
          }}
        >
          TODO PARA TU PROYECTO EN UN SOLO LUGAR
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: "custom.accent",
            mb: 4,
            fontWeight: 400,
            textShadow: "0px 2px 5px rgba(0,0,0,0.8)",
            fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
          }}
        >
          Selecciona tus equipos y solicita tu presupuesto ahora mismo
        </Typography>

        <Button
          variant="contained"
          size="large"
          sx={{
            py: 2,
            borderRadius: (theme) => theme.shape.pill,
            fontSize: "1.5rem",
            fontWeight: "bold",
            backgroundColor: (theme) => theme.palette.custom.accent,
            // No usa theme.shadows: el kiosco fuerza modo oscuro, y ahí la
            // escala es "none" a propósito. Acá sí hace falta la sombra porque
            // es una pieza flotante a pantalla completa, no una superficie.
            boxShadow: (theme) =>
              `0px 10px 30px ${alpha(theme.palette.common.black, 0.5)}`,
            // El latido, SOLO con transform. Es la animación más cara que
            // puede tener esta app: corre para siempre y, siendo el protector
            // de pantalla, corre justo cuando nadie usa el kiosco — o sea la
            // mayor parte del día.
            //
            // Antes también animaba el boxShadow: un halo blanco que se
            // expandía 20px. Mover o escalar algo lo resuelve la tarjeta
            // gráfica sola; cambiar una sombra obliga a la CPU a repintar los
            // píxeles, 60 veces por segundo y sobre un área más grande que el
            // botón. En un PC no se nota, en el equipo del local sí.
            //
            // Es el mismo criterio que ya siguen las otras cuatro animaciones
            // infinitas del proyecto (el ripple de ListaUsuarios, el pulseDot
            // de AdminCotizaciones, ButtonContacto y AnimatedBox): solo
            // transform y opacity. Esta era la única que se salía.
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { transform: "scale(1)" },
              "70%": { transform: "scale(1.05)" },
              "100%": { transform: "scale(1)" },
            },
            // Y se apaga para quien pidió menos movimiento en su sistema,
            // igual que las del logo de carga (ver loadingLogo.css).
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        >
          VER CATÁLOGO
        </Button>
      </Box>
    </Box>
  );
}

KioskScreensaver.propTypes = {
  timeout: PropTypes.number,
};
