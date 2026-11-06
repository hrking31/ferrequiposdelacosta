import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, Typography } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LogoVertical from "../../assets/LogoFerrequiposVertical.svg";

// EL CIERRE DEL KIOSKO (pedido del dueño, 2026-11-06): al enviar la solicitud,
// una tarjeta blanca con el logo vertical antes de volver a la tienda. Lo
// último que ve quien estuvo frente a la tableta es la marca y la promesa de
// que le escriben. Vuelve sola a los `segundos`, o al primer toque.
//
// La tarjeta es blanca siempre, aunque el kiosko vaya en modo oscuro: el logo
// es "para fondo claro" y sobre el azul de la noche su azul se pierde.
export default function KioskGracias({ telefono = "", segundos = 8, onTerminar }) {
  const [quedan, setQuedan] = useState(segundos);
  // En una referencia: quien la usa le pasa una función nueva en cada dibujo,
  // y si el reloj dependiera de ella volvería a empezar cada vez.
  const terminar = useRef(onTerminar);
  terminar.current = onTerminar;
  const yaTermino = useRef(false);

  const salir = () => {
    if (yaTermino.current) return;
    yaTermino.current = true;
    terminar.current();
  };

  useEffect(() => {
    if (quedan <= 0) {
      salir();
      return undefined;
    }
    const reloj = setTimeout(() => setQuedan((q) => q - 1), 1000);
    return () => clearTimeout(reloj);
  }, [quedan]);

  return (
    <Box
      onClick={salir}
      role="button"
      aria-label="Volver a la tienda"
      sx={{
        position: "fixed",
        inset: 0,
        // Por encima de la barra; por debajo del protector de pantalla.
        zIndex: (theme) => theme.zIndex.modal,
        bgcolor: "background.default",
        display: "grid",
        placeItems: "center",
        p: 3,
        cursor: "pointer",
      }}
    >
      <Box
        sx={(theme) => ({
          width: "min(560px, 100%)",
          bgcolor: "common.white",
          color: theme.palette.grey[900],
          borderRadius: 5,
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 5 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          textAlign: "center",
          boxShadow: theme.shadows[16],
        })}
      >
        <Box component="img" src={LogoVertical} alt="Ferrequipos" sx={{ width: "42%", height: "auto", mb: 1 }} />

        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: "inherit" }}>
          ¡Listo! Tu solicitud llegó
        </Typography>

        <Typography sx={{ color: (theme) => theme.palette.grey[700], maxWidth: "32ch" }}>
          Te escribimos por WhatsApp para confirmar precios y entrega.
        </Typography>

        {telefono && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontWeight: 700,
              color: (theme) => theme.palette.success.dark,
            }}
          >
            <WhatsAppIcon fontSize="small" />
            <Typography component="span" sx={{ fontWeight: 700, color: "inherit" }}>
              Al {telefono}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, color: (theme) => theme.palette.grey[600] }}>
          <CircularProgress
            variant="determinate"
            value={(quedan / segundos) * 100}
            size={26}
            thickness={5}
            sx={{ color: (theme) => theme.palette.grey[800] }}
          />
          <Typography variant="body2" sx={{ color: "inherit" }}>
            {quedan > 0 ? `Volvemos a la tienda en ${quedan} s` : "Volviendo a la tienda…"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

KioskGracias.propTypes = {
  telefono: PropTypes.string,
  segundos: PropTypes.number,
  onTerminar: PropTypes.func.isRequired,
};
