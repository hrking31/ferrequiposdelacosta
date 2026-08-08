import { Typography, Link } from "@mui/material";

// Aviso legal que Google exige cuando reCAPTCHA trabaja invisible (sin el
// badge a la vista): hay que informar que el sitio usa reCAPTCHA y enlazar su
// Política de Privacidad y sus Términos. Se usa en el pie de página (Footer) y
// en el menú lateral (Drawer), debajo del copyright.
export default function RecaptchaNotice() {
  return (
    <Typography
      variant="caption"
      sx={{
        display: "block",
        textAlign: "center",
        color: "inherit",
        opacity: 0.7,
        px: 2,
        mt: 0.5,
        lineHeight: 1.4,
      }}
    >
      Este sitio está protegido por reCAPTCHA y se aplican la{" "}
      <Link
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        color="inherit"
        underline="always"
      >
        Política de Privacidad
      </Link>{" "}
      y los{" "}
      <Link
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        color="inherit"
        underline="always"
      >
        Términos del Servicio
      </Link>{" "}
      de Google.
    </Typography>
  );
}
