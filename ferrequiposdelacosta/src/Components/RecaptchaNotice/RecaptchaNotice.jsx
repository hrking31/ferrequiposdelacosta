import { Typography, Link } from "@mui/material";

// Aviso legal que Google exige cuando reCAPTCHA trabaja invisible (sin el
// badge a la vista): hay que informar que el sitio usa reCAPTCHA y enlazar su
// Política de Privacidad y sus Términos.
//
// Va SOLO en el pie de página (Footer). Estuvo además en los dos copyright del
// menú lateral, pero en la home el menú y el pie se ven en la misma pantalla:
// el aviso aparecía tres veces, y en el menú angosto —240px— la frase caía en
// cinco o seis renglones. El pie lo muestra completo y bien formado, que es lo
// que Google pide.
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
