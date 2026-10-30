import PropTypes from "prop-types";
import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DevicesIcon from "@mui/icons-material/Devices";
import Seccion from "../FormularioEquipo/Seccion";
import AvatarUsuario from "./AvatarUsuario";
import AparatosUsuario from "./AparatosUsuario";
import MenuDelRol from "./MenuDelRol";
import { coloresDeUsuarios } from "./piezasUsuarios";
import { rolDe } from "./usuarios";

// Un dato de DATOS: el nombre chico y gris arriba, el valor abajo.
function Dato({ nombre, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {nombre}
      </Typography>
      <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{children}</Typography>
    </Box>
  );
}

Dato.propTypes = { nombre: PropTypes.string.isRequired, children: PropTypes.node };

const GENEROS = { femenino: "Femenino", masculino: "Masculino" };

// LA FICHA DE UNA PERSONA (2026-10-28), como la de un equipo: lo que tiene
// guardado, para mirarlo antes de editarlo o eliminarlo.
// - El carné: su cara con el aro de conexión, nombre, correo, rol y estado.
// - DATOS (azul), ROL (naranja, con lo que ve en el menú) y SESIONES ABIERTAS
//   (verde), con la papelera por aparato, cerrar todas y quitar los dos pasos.
//
// `conBotones`: EDITAR y ELIMINAR al pie del carné; en el celular van en el
// pie de la pantalla. `llenarAlto`: en el computador (desde 916px), el carné
// a la izquierda y los recuadros a la derecha, al alto de la pantalla.
//
// `enDosPisos` (con `llenarAlto`): de 960 a 1032px, como la ficha de un
// equipo (pedido del dueño, 2026-10-29): arriba el carné y DATOS, mitad y
// mitad; abajo ROL, angosto y con su menú de a dos, y SESIONES al lado, del
// mismo alto; y EDITAR y ELIMINAR al final. Se desplaza si no cabe.
export default function FichaUsuario({
  usuario,
  conexion,
  esTu = false,
  onEditar,
  onEliminar,
  onCerrarSesionAparato,
  onCerrarSesiones,
  onQuitarDosPasos,
  conBotones = true,
  llenarAlto = false,
  enDosPisos = false,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const colores = coloresDeUsuarios(theme);
  const rol = rolDe(usuario.role);
  const aparatos = usuario.aparatos || [];
  const nombre = usuario.name || usuario.email || "este usuario";

  const etiquetas = (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      justifyContent={llenarAlto ? "center" : "flex-start"}
    >
      <Chip
        size="small"
        icon={<VerifiedUserIcon />}
        label={rol?.nombre || "Sin rol"}
        sx={{ fontWeight: 700, bgcolor: alpha(acento, 0.1), color: acento, "& .MuiChip-icon": { color: acento } }}
      />
      <Chip
        size="small"
        label={conexion.largo}
        sx={{
          fontWeight: 700,
          bgcolor: conexion.enLinea ? alpha(theme.palette.success.main, 0.12) : "action.hover",
          color: conexion.enLinea ? "success.dark" : "text.secondary",
        }}
      />
    </Stack>
  );

  const botones = conBotones && (
    <Stack spacing={1.25} sx={{ width: "100%", mt: "auto", pt: 2 }}>
      <Button variant="contained" color="accent" startIcon={<EditIcon />} onClick={onEditar} fullWidth>
        EDITAR
      </Button>
      <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={onEliminar} fullWidth>
        ELIMINAR
      </Button>
    </Stack>
  );

  const carne = llenarAlto ? (
    <Box
      sx={{
        // En dos pisos, la mitad del ancho (ver abajo).
        width: enDosPisos ? "auto" : 300,
        minWidth: 0,
        flexShrink: 0,
        boxSizing: "border-box",
        p: 3,
        pt: 4,
        borderRadius: 3,
        bgcolor: "background.elevated",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1.5,
        overflowY: "auto",
      }}
    >
      <AvatarUsuario usuario={usuario} tamano={132} enLinea={conexion.enLinea} anillo />
      <Typography
        variant="h5"
        sx={{ mt: 1.5, fontWeight: 800, color: acento, lineHeight: 1.2, overflowWrap: "anywhere" }}
      >
        {nombre}
        {esTu && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>
            (tú)
          </Typography>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5, overflowWrap: "anywhere" }}>
        {usuario.email}
      </Typography>
      {etiquetas}
      {/* En dos pisos van al final de la ficha. */}
      {!enDosPisos && botones}
    </Box>
  ) : (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        p: 1.75,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderTop: "3px solid",
        borderTopColor: acento,
      }}
    >
      <AvatarUsuario usuario={usuario} tamano={72} enLinea={conexion.enLinea} anillo />
      <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography sx={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800, fontSize: "1.2rem", color: acento, lineHeight: 1.2 }}>
          {nombre}
          {esTu && " (tú)"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
          {usuario.email}
        </Typography>
        {etiquetas}
      </Box>
    </Box>
  );

  // En dos pisos, DATOS va al lado del carné: un dato por renglón y al alto
  // del carné.
  const seccionDatos = (
    <Seccion titulo="DATOS" icono={<PersonIcon />} color={colores.datos} crece={enDosPisos}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: llenarAlto && !enDosPisos ? "repeat(3, minmax(0, 1fr))" : "1fr",
          gap: llenarAlto ? 2 : 1,
        }}
      >
        <Dato nombre="Nombre">{usuario.name || "Sin nombre"}</Dato>
        <Dato nombre="Correo">{usuario.email}</Dato>
        <Dato nombre="Género">{GENEROS[usuario.genero] || "Sin elegir"}</Dato>
      </Box>
    </Seccion>
  );

  const seccionRol = (
    <Seccion titulo="ROL" icono={<VerifiedUserIcon />} color={colores.rol}>
      <Typography variant="body2" sx={{ mt: -0.5, mb: 1.5 }}>
        <strong>{rol?.nombre || "Sin rol"}</strong>
        {rol && ` · ${rol.descripcion}`}
      </Typography>
      <MenuDelRol rol={usuario.role} compacto={!llenarAlto || enDosPisos} columnas={enDosPisos ? 2 : 3} />
    </Seccion>
  );

  const seccionSesiones = (
    <Seccion
      titulo="SESIONES ABIERTAS"
      icono={<DevicesIcon />}
      color={colores.sesiones}
      encoge={llenarAlto && !enDosPisos}
    >
      <AparatosUsuario
        nombre={nombre}
        aparatos={aparatos}
        onCerrarSesionAparato={onCerrarSesionAparato}
        onCerrarSesiones={onCerrarSesiones}
        onQuitarDosPasos={onQuitarDosPasos}
      />
    </Seccion>
  );

  const recuadros = (
    <>
      {seccionDatos}
      {seccionRol}
      {seccionSesiones}
    </>
  );

  // El recuadro grande de la ficha en el computador.
  const marco = {
    height: "100%",
    boxSizing: "border-box",
    p: 3,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    borderTop: "3px solid",
    borderTopColor: acento,
    borderRadius: 2,
    display: "flex",
  };

  if (enDosPisos) {
    return (
      <Box sx={{ ...marco, flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {/* Mitad y mitad, y del mismo alto: el del más alto. */}
        <Box sx={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 3 }}>
          {carne}
          <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column" }}>{seccionDatos}</Box>
        </Box>
        {/* ROL angosto (su menú de a dos) y SESIONES con el resto. */}
        <Box sx={{ flexShrink: 0, display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: 2 }}>
          {seccionRol}
          {seccionSesiones}
        </Box>
        {conBotones && (
          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button variant="contained" color="accent" startIcon={<EditIcon />} onClick={onEditar} fullWidth>
              EDITAR
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={onEliminar} fullWidth>
              ELIMINAR
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  if (llenarAlto) {
    return (
      <Box sx={{ ...marco, gap: 3 }}>
        {carne}
        {/* Sin barra para desplazar (pedido del dueño, 2026-10-28): si no
            cabe, se achican las sesiones y solo su lista se desplaza. */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
          {recuadros}
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ pb: 1.5 }}>
      {carne}
      {recuadros}
      {botones}
    </Stack>
  );
}

FichaUsuario.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    genero: PropTypes.string,
    role: PropTypes.string,
    aparatos: PropTypes.array,
  }).isRequired,
  // Lo que da estadoConexion (ver usuarios.js).
  conexion: PropTypes.shape({ enLinea: PropTypes.bool, largo: PropTypes.string }).isRequired,
  esTu: PropTypes.bool,
  onEditar: PropTypes.func.isRequired,
  onEliminar: PropTypes.func.isRequired,
  onCerrarSesionAparato: PropTypes.func.isRequired,
  onCerrarSesiones: PropTypes.func.isRequired,
  onQuitarDosPasos: PropTypes.func.isRequired,
  conBotones: PropTypes.bool,
  llenarAlto: PropTypes.bool,
  enDosPisos: PropTypes.bool,
};
