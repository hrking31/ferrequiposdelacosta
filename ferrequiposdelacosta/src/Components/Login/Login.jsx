import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, IconButton, InputBase, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import LogoFerrequipos from "../../assets/LogoFerrequipos.svg";

// Vive DENTRO del carné de la puerta del personal (ver PuertaCarne y
// VistaAcceso, 2026-11-07): el logo, los datos y el botón, y debajo del
// código de barras el enlace para recuperar la clave. Antes era un formulario
// suelto en una tarjeta, y antes todavía un diálogo del menú de la tienda.
//
// El carné es blanco también en modo oscuro (es el objeto de la marca), así
// que adentro los colores son fijos, de día: con los del tema, de noche los
// botones saldrían amarillos sobre blanco.
const TINTA = "#0F172A";
const SUAVE = "#475569";
const AZUL = "#283890";
const VERDE = "#16A34A";

// Los campos como los renglones impresos de un carné: el nombre del dato en
// letra chica y lo escrito encima de una raya punteada, sin cajas.
function Renglon({ id, etiqueta, adorno, ...props }) {
  return (
    <Box sx={{ display: "grid", gap: "1px" }}>
      <Box
        component="label"
        htmlFor={id}
        sx={{
          font: '700 9.5px "Montserrat", sans-serif',
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: SUAVE,
        }}
      >
        {etiqueta}
      </Box>
      <InputBase
        id={id}
        endAdornment={adorno}
        {...props}
        sx={{
          color: TINTA,
          borderBottom: "1.5px dashed #B8C0D0",
          "&.Mui-focused": { borderBottom: `2px solid ${AZUL}` },
          "& input": {
            height: 30,
            p: "2px 0",
            font: '600 15.5px "Open Sans", sans-serif',
            color: TINTA,
          },
          // El autocompletado del navegador pinta el campo de amarillo o celeste.
          "& input:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 100px #FFFFFF inset",
            WebkitTextFillColor: TINTA,
          },
        }}
      />
    </Box>
  );
}

Renglon.propTypes = {
  id: PropTypes.string.isRequired,
  etiqueta: PropTypes.string.isRequired,
  adorno: PropTypes.node,
};

const botonVerde = {
  height: 46,
  borderRadius: "8px",
  bgcolor: VERDE,
  color: "#FFFFFF",
  font: '700 15px "Montserrat", sans-serif',
  letterSpacing: ".06em",
  boxShadow: "none",
  "&:hover": { bgcolor: "#15803D", boxShadow: "none" },
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login, recuperarClave, prepararSegundoPaso, entrarConCodigo } = useAuth();
  const [user, setUser] = useState({ email: "", password: "" });
  // El segundo paso (2026-10-16): con la contraseña bien, Firebase pide el
  // código de la aplicación del celular. Acá se guarda lo necesario para
  // pedirlo, mientras tanto se muestra el campo del código en vez de los de
  // correo y contraseña, dentro del mismo carné.
  const [segundoPaso, setSegundoPaso] = useState(null);
  const [codigo, setCodigo] = useState("");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");
  const [, setIsSubmitting] = useState(false);
  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const handleChange = ({ target: { name, value } }) =>
    setUser((prev) => ({ ...prev, [name]: value }));

  const alEntrar = () => navigate("/adminforms");

  const handleCodigo = async (event) => {
    event.preventDefault();
    closeSnackbar();
    if (!/^\d{6}$/.test(codigo)) {
      showSnackbar("Escribe los 6 números que muestra la aplicación.");
      return;
    }
    try {
      await entrarConCodigo(segundoPaso, codigo);
      alEntrar();
    } catch (error) {
      if (error.code === "auth/invalid-verification-code") {
        showSnackbar("Código incorrecto. Escribe el que muestra ahora la aplicación.");
      } else if (
        [
          "auth/totp-challenge-timeout",
          "auth/code-expired",
          "auth/missing-multi-factor-session",
          "auth/invalid-multi-factor-session",
        ].includes(error.code)
      ) {
        // El permiso para el segundo paso dura unos minutos.
        setSegundoPaso(null);
        showSnackbar("Pasó mucho tiempo. Vuelve a escribir tu contraseña.");
      } else {
        showSnackbar("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    closeSnackbar();
    setIsSubmitting(true);

    try {
      await login(user.email, user.password);
      alEntrar();
    } catch (error) {
      if (error.code === "auth/multi-factor-auth-required") {
        setCodigo("");
        setSegundoPaso(prepararSegundoPaso(error));
      } else if (error.code === "auth/wrong-password") {
        showSnackbar("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        showSnackbar("Usuario no registrado");
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-email"
      ) {
        showSnackbar("Correo o contraseña incorrectos");
      } else {
        showSnackbar("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Firebase manda un correo con su propia página para poner la clave nueva.
  // La respuesta es la misma exista o no la cuenta: así nadie puede usar esto
  // para averiguar qué correos están registrados.
  const handleOlvido = async () => {
    closeSnackbar();
    const email = user.email.trim();
    if (!email) {
      showSnackbar("Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?»");
      return;
    }
    try {
      await recuperarClave(email);
      showSnackbar(
        "Si el correo está registrado, te llegará un enlace para poner una contraseña nueva.",
        "success",
      );
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        showSnackbar(
          "Si el correo está registrado, te llegará un enlace para poner una contraseña nueva.",
          "success",
        );
      } else if (error.code === "auth/invalid-email") {
        showSnackbar("Ese correo no tiene un formato válido");
      } else {
        showSnackbar("No se pudo enviar el correo. Inténtalo de nuevo.");
      }
    }
  };

  return (
    <>
      <Box sx={{ p: "14px 26px 12px", display: "grid", gap: "14px" }}>
        {/* El logo recortado al dibujo: el archivo trae margen alrededor. */}
        <Box
          component="svg"
          viewBox="44 0 218 259"
          role="img"
          aria-label="Ferrequipos de la Costa"
          sx={{ justifySelf: "center", height: 88, width: "auto", display: "block", mt: "4px" }}
        >
          <image href={LogoFerrequipos} x="0.4" y="1" width="316.5" height="270" />
        </Box>

        <Typography
          component="h1"
          sx={{
            justifySelf: "center",
            textAlign: "center",
            font: '700 17px "Montserrat", sans-serif',
            letterSpacing: ".02em",
            color: TINTA,
            mb: "4px",
          }}
        >
          {segundoPaso ? "Código de tu celular" : "Acceso del personal"}
        </Typography>

        {segundoPaso ? (
          <Box component="form" onSubmit={handleCodigo} sx={{ display: "grid", gap: "14px" }}>
            <Typography sx={{ font: '400 13px "Open Sans", sans-serif', color: SUAVE, textAlign: "center", mt: -1 }}>
              Abre la aplicación de códigos y escribe los 6 números de Ferrequipos de la Costa.
            </Typography>
            <Renglon
              id="codigo"
              etiqueta="Código de 6 números"
              name="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }}
              autoFocus
              required
            />
            <Button type="submit" variant="contained" sx={botonVerde}>
              ENTRAR
            </Button>
            <Button
              variant="text"
              onClick={() => setSegundoPaso(null)}
              sx={{ justifySelf: "center", color: AZUL, mt: -1 }}
            >
              Volver
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: "14px" }}>
            <Renglon
              id="correo"
              etiqueta="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              value={user.email}
              onChange={handleChange}
              required
            />
            <Renglon
              id="clave"
              etiqueta="Contraseña"
              type={passwordType}
              name="password"
              autoComplete="current-password"
              value={user.password}
              onChange={handleChange}
              required
              adorno={
                <IconButton
                  size="small"
                  aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => dispatch(togglePasswordVisibility())}
                  sx={{ color: AZUL }}
                >
                  {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                </IconButton>
              }
            />
            <Button type="submit" variant="contained" sx={{ ...botonVerde, mt: "2px" }}>
              ACCESO
            </Button>
          </Box>
        )}
      </Box>

      {/* El pie del carné: un código de barras de adorno y, debajo, en letra
          muy chica, el enlace para recuperar la clave. */}
      <Box sx={{ display: "grid", justifyItems: "center", gap: "2px", p: "6px 24px 10px" }}>
        <Box
          aria-hidden="true"
          sx={{
            width: "100%",
            height: 26,
            opacity: 0.8,
            background:
              "repeating-linear-gradient(90deg, #0F172A 0 2px, transparent 2px 4px, #0F172A 4px 7px, transparent 7px 9px, #0F172A 9px 10px, transparent 10px 14px, #0F172A 14px 17px, transparent 17px 19px)",
            maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          }}
        />
        {!segundoPaso && (
          <Button
            variant="text"
            onClick={handleOlvido}
            sx={{
              minHeight: 0,
              p: "2px 4px",
              color: AZUL,
              font: '400 10.5px "Open Sans", sans-serif',
              textTransform: "none",
            }}
          >
            ¿Olvidaste tu contraseña?
          </Button>
        )}
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}
