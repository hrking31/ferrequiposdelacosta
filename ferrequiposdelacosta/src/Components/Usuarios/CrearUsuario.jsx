import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import KeyIcon from "@mui/icons-material/Key";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { httpsCallable } from "firebase/functions";
import { functions } from "../Firebase/Firebase";
import { usePantallaCompacta } from "../../Utils/pantalla";
import { REQUISITOS_CLAVE, faltanEnLaClave } from "../../Utils/requisitosClave";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import Seccion from "../FormularioEquipo/Seccion";
import AvatarUsuario from "./AvatarUsuario";
import ElegirGenero from "./ElegirGenero";
import ElegirRol from "./ElegirRol";
import MenuDelRol from "./MenuDelRol";
import { coloresDeUsuarios } from "./piezasUsuarios";
import { generarClave, nombreDelRol, permisosDelRol } from "./usuarios";
import BOTONES_MENU from "../RolesPermisos/botonesMenu";

const VACIO = { name: "", email: "", password: "", genero: "", role: "" };

const esCorreo = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

// CREAR UNA PERSONA (2026-10-28), en la pantalla de Usuarios, como Crear
// equipo: recuadros de color y, al lado, cómo va a quedar.
// - DATOS: nombre, correo (con el que entra) y género;
// - CONTRASEÑA: los requisitos se van marcando mientras se escribe, con una
//   barra que se llena; GENERAR pone una que los cumple todos y la deja
//   a la vista para dictársela;
// - ROL: las cuatro tarjetas;
// - MENÚ: su saludo y los botones de su menú, como lo verá al entrar.
//
// Crear y Limpiar viven afuera (encabezado o pie) y llegan por
// `idFormulario`. `onCambio` le pasa a la vista lo escrito, para el renglón de
// muestra de la lista.
export default function CrearUsuario({ idFormulario, anchoCompleto = false, onCambio, onTerminar }) {
  const theme = useTheme();
  const colores = coloresDeUsuarios(theme);
  const esCelular = usePantallaCompacta();
  const [form, setForm] = useState(VACIO);
  const [verClave, setVerClave] = useState(false);
  const [creando, setCreando] = useState(false);

  const poner = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const cumplidos = REQUISITOS_CLAVE.map(({ cumple }) => cumple(form.password));
  const cuantosCumple = cumplidos.filter(Boolean).length;
  const colorBarra =
    cuantosCumple <= 2
      ? theme.palette.error.main
      : cuantosCumple < REQUISITOS_CLAVE.length
        ? theme.palette.warning.main
        : theme.palette.success.main;
  const botonesDelRol = BOTONES_MENU.filter((b) => permisosDelRol(form.role).includes(b.permiso)).length;

  useEffect(() => {
    onCambio({ name: form.name, email: form.email, role: form.role });
  }, [form.name, form.email, form.role, onCambio]);

  const crear = async (event) => {
    event.preventDefault();
    const avisar = (mensaje) => onTerminar({ mensaje, severidad: "error" });
    if (!form.name.trim()) return avisar("Escribe el nombre.");
    if (!esCorreo(form.email.trim())) return avisar("El correo no tiene un formato válido.");
    const faltan = faltanEnLaClave(form.password);
    if (faltan.length > 0) return avisar(`A la contraseña le falta: ${faltan.join(", ")}.`);
    if (!form.role) return avisar("Elige un rol.");

    setCreando(true);
    try {
      const { data } = await httpsCallable(functions, "createUser")({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        genero: form.genero,
        // Los permisos no viajan: el servidor los calcula a partir del rol.
        role: form.role,
      });
      onTerminar({ mensaje: `${form.name.trim()} ya puede entrar.`, severidad: "success", uid: data?.uid });
    } catch (error) {
      console.error(error);
      onTerminar({ mensaje: error.message || "No se pudo crear la cuenta.", severidad: "error" });
      setCreando(false);
    }
  };

  if (creando) return <LoadingLogo height="40vh" text="Creando usuario..." />;

  // En el computador ancho, lo de adentro de un recuadro se reparte el alto
  // que le da la grilla, con aire entre una cosa y otra.
  const repartir = anchoCompleto ? { flex: 1, justifyContent: "space-evenly" } : undefined;

  const datos = (
    <Seccion titulo="DATOS" icono={<PersonIcon />} color={colores.datos}>
      <Stack spacing={2} sx={repartir}>
        <TextField
          name="name"
          label="Nombre completo"
          autoComplete="off"
          value={form.name}
          onChange={(e) => poner("name")(e.target.value)}
          fullWidth
        />
        <TextField
          name="email"
          type="email"
          label="Correo"
          autoComplete="off"
          value={form.email}
          onChange={(e) => poner("email")(e.target.value)}
          fullWidth
        />
        <ElegirGenero valor={form.genero} onChange={poner("genero")} />
      </Stack>
    </Seccion>
  );

  const clave = (
    <Seccion titulo="CONTRASEÑA" icono={<KeyIcon />} color={colores.clave}>
      <Stack spacing={1.5} sx={repartir}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            name="password"
            label="Contraseña"
            type={verClave ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => poner("password")(e.target.value)}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setVerClave((v) => !v)}
                    aria-label={verClave ? "Ocultar la contraseña" : "Ver la contraseña"}
                    edge="end"
                    sx={{ color: "custom.accent" }}
                  >
                    {verClave ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Genera una contraseña segura que cumple todos los requisitos">
            <Button
              variant="outlined"
              startIcon={<AutoFixHighIcon />}
              onClick={() => {
                poner("password")(generarClave());
                setVerClave(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              GENERAR
            </Button>
          </Tooltip>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${REQUISITOS_CLAVE.length}, 1fr)`, gap: 0.5 }}>
          {REQUISITOS_CLAVE.map(({ texto }, i) => (
            <Box
              key={texto}
              sx={{ height: 6, borderRadius: 3, bgcolor: i < cuantosCumple ? colorBarra : "action.hover" }}
            />
          ))}
        </Box>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gridTemplateColumns: esCelular ? "1fr 1fr" : "1fr",
            gap: anchoCompleto ? 1.5 : 0.75,
          }}
        >
          {REQUISITOS_CLAVE.map(({ texto }, i) => (
            <Box
              component="li"
              key={texto}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.85rem",
                fontWeight: cumplidos[i] ? 700 : 500,
                color: cumplidos[i] ? "success.dark" : "text.secondary",
              }}
            >
              {cumplidos[i] ? (
                <CheckCircleIcon sx={{ fontSize: 18 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
              )}
              {texto}
            </Box>
          ))}
        </Box>
      </Stack>
    </Seccion>
  );

  const rol = (
    <Seccion titulo="ROL" icono={<VerifiedUserIcon />} color={colores.rol}>
      <ElegirRol valor={form.role} onChange={poner("role")} columnas={esCelular ? 1 : 2} llenar={anchoCompleto} />
    </Seccion>
  );

  const muestra = (
    <Seccion titulo="MENÚ" icono={<DashboardIcon />} color={colores.muestra}>
      <Stack spacing={anchoCompleto ? 2 : 1.5} sx={anchoCompleto ? { flex: 1 } : undefined}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(colores.muestra, 0.06),
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <AvatarUsuario usuario={{ id: "nuevo", name: form.name, email: form.email }} tamano={48} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {form.genero === "femenino" ? "Bienvenida," : form.genero === "masculino" ? "Bienvenido," : "Hola,"}
            </Typography>
            <Typography noWrap sx={{ fontWeight: 700 }}>
              {form.name.trim() || "Sin nombre"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {form.role ? nombreDelRol(form.role) : "Sin rol"}
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {form.role
            ? `Su menú: ${botonesDelRol} de ${BOTONES_MENU.length} botones`
            : "Elige un rol para ver su menú"}
        </Typography>
        <MenuDelRol rol={form.role} compacto={esCelular} llenar={anchoCompleto} />
      </Stack>
    </Seccion>
  );

  return (
    <form
      id={idFormulario}
      onSubmit={crear}
      onReset={(e) => {
        e.preventDefault();
        setForm(VACIO);
        setVerClave(false);
      }}
      style={anchoCompleto ? { minHeight: "100%", display: "flex" } : undefined}
    >
      {anchoCompleto ? (
        // Dos columnas al alto de la pantalla, en una grilla de dos por dos
        // para que los de arriba (DATOS, ROL) midan lo mismo y los de abajo
        // (CONTRASEÑA, MENÚ) también, hasta el pie (pedido del dueño,
        // 2026-10-28).
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: "auto 1fr",
            gap: 2,
            pb: 2,
          }}
        >
          {datos}
          {rol}
          {clave}
          {muestra}
        </Box>
      ) : (
        <Stack spacing={2} sx={{ pt: 1, pb: 2, flex: 1 }}>
          {datos}
          {clave}
          {rol}
          {muestra}
        </Stack>
      )}
    </form>
  );
}

CrearUsuario.propTypes = {
  idFormulario: PropTypes.string.isRequired,
  anchoCompleto: PropTypes.bool,
  onCambio: PropTypes.func.isRequired,
  // ({ mensaje, severidad, uid }): la vista avisa y, si se creó (`uid`),
  // vuelve a leer la lista y abre su ficha.
  onTerminar: PropTypes.func.isRequired,
};
