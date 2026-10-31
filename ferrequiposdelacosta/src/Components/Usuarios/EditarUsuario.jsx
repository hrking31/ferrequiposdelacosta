import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, InputAdornment, Stack, TextField, Typography, useTheme } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { httpsCallable } from "firebase/functions";
import { functions } from "../Firebase/Firebase";
import { usePantallaCompacta } from "../../Utils/pantalla";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import Seccion from "../FormularioEquipo/Seccion";
import ElegirGenero from "./ElegirGenero";
import ElegirRol from "./ElegirRol";
import MenuDelRol from "./MenuDelRol";
import { coloresDeUsuarios } from "./piezasUsuarios";

const desdeUsuario = (usuario) => ({
  name: usuario.name || "",
  genero: usuario.genero || "",
  role: usuario.role || "",
});

// EDITAR A UNA PERSONA (2026-10-28), como Editar equipo:
// - DATOS: nombre y género; el correo se ve pero no se cambia (es con lo que
//   entra, y cambiarlo cambiaría su cuenta);
// - ROL: las cuatro tarjetas;
// - MENÚ, en su propio recuadro, cómo quedará: lo que GANA y lo que PIERDE
//   con el cambio;
// - un punto en cada recuadro con cambios, y la cuenta para la vista
//   (`onCambios`), que la muestra y pregunta antes de dejarlo;
// - "reset" (Deshacer) vuelve a lo guardado.
//
// Guardar lo hace el servidor (actualizarUsuario): el rol tiene que quedar
// también en el carné de la sesión, que solo él imprime, y los permisos los
// calcula él a partir del rol. Guardar y Deshacer viven afuera (encabezado o
// pie) y llegan por `idFormulario`.
export default function EditarUsuario({ usuario, idFormulario, anchoCompleto = false, onCambios, onTerminar }) {
  const theme = useTheme();
  const colores = coloresDeUsuarios(theme);
  const esCelular = usePantallaCompacta();
  const [form, setForm] = useState(() => desdeUsuario(usuario));
  const [guardando, setGuardando] = useState(false);
  const guardado = desdeUsuario(usuario);

  // Si lo guardado cambia (se guardó y la lista se volvió a leer), el
  // formulario se rehace con eso. Solo por estos campos: recargar la lista por
  // una sesión cerrada no tiene que borrar lo que se está escribiendo.
  useEffect(() => {
    setForm(desdeUsuario({ name: usuario.name, genero: usuario.genero, role: usuario.role }));
  }, [usuario.id, usuario.name, usuario.genero, usuario.role]);

  const datosCambiados = form.name !== guardado.name || form.genero !== guardado.genero;
  const rolCambiado = form.role !== guardado.role;
  const cambios = (datosCambiados ? 1 : 0) + (rolCambiado ? 1 : 0);

  useEffect(() => {
    onCambios(cambios);
  }, [cambios, onCambios]);

  const guardar = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      onTerminar({ mensaje: "El nombre no puede estar vacío.", severidad: "error" });
      return;
    }
    if (!form.role) {
      onTerminar({ mensaje: "Elige un rol.", severidad: "error" });
      return;
    }
    if (cambios === 0) {
      onTerminar({ mensaje: "No hay cambios para guardar.", severidad: "info" });
      return;
    }
    setGuardando(true);
    try {
      await httpsCallable(functions, "actualizarUsuario")({
        uid: usuario.id,
        name: form.name.trim(),
        genero: form.genero,
        role: form.role,
      });
      onTerminar({ mensaje: `${form.name.trim()} quedó guardado.`, severidad: "success", guardado: true });
    } catch (error) {
      console.error(error);
      onTerminar({ mensaje: error.message || "No se pudo guardar. Inténtelo de nuevo.", severidad: "error" });
    } finally {
      setGuardando(false);
    }
  };

  if (guardando) return <LoadingLogo height="40vh" text="Guardando..." />;

  const datos = (
    <Seccion titulo="DATOS" icono={<PersonIcon />} color={colores.datos} cambiado={datosCambiados}>
      {/* En el computador ancho, los tres en un renglón: una franja bajita. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: anchoCompleto ? "1.2fr 1.2fr 1fr" : "1fr",
          gap: 2,
          alignItems: "end",
        }}
      >
        <TextField
          name="name"
          label="Nombre completo"
          autoComplete="off"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          fullWidth
        />
        <TextField
          name="email"
          label="Correo"
          value={usuario.email || ""}
          disabled
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ElegirGenero valor={form.genero} onChange={(genero) => setForm((f) => ({ ...f, genero }))} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: anchoCompleto ? 0.5 : 1 }}>
        El correo no se cambia: es su usuario para entrar.
      </Typography>
    </Seccion>
  );

  // Una tarjeta por fila: en media pantalla, de a dos no cabían.
  const rol = (
    <Seccion titulo="ROL" icono={<VerifiedUserIcon />} color={colores.rol} cambiado={rolCambiado}>
      <ElegirRol
        valor={form.role}
        onChange={(role) => setForm((f) => ({ ...f, role }))}
        rolGuardado={guardado.role}
        columnas={1}
        llenar={anchoCompleto}
      />
    </Seccion>
  );

  const menu = (
    <Seccion titulo="MENÚ" icono={<DashboardIcon />} color={colores.muestra}>
      <MenuDelRol rol={form.role} rolAntes={guardado.role} compacto={esCelular} llenar={anchoCompleto} />
    </Seccion>
  );

  return (
    <form
      id={idFormulario}
      onSubmit={guardar}
      onReset={(e) => {
        e.preventDefault();
        setForm(guardado);
      }}
      style={anchoCompleto ? { minHeight: "100%", display: "flex", flexDirection: "column" } : undefined}
    >
      {anchoCompleto ? (
        // SIN HUECOS (la idea 1 que eligió el dueño, 2026-10-28): DATOS en
        // una franja arriba y, debajo, ROL y MENÚ lado a lado, del mismo
        // alto y hasta el pie de la pantalla; sus tarjetas y casillas crecen
        // para llenarlos.
        // Con poco aire, para que quepa en una pantalla baja (pedido del
        // dueño, 2026-10-30).
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, pb: 1 }}>
          {datos}
          <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            {rol}
            {menu}
          </Box>
        </Box>
      ) : (
        <Stack spacing={2} sx={{ pt: 1, pb: 2 }}>
          {datos}
          {rol}
          {menu}
        </Stack>
      )}
    </form>
  );
}

EditarUsuario.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    email: PropTypes.string,
    genero: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
  idFormulario: PropTypes.string.isRequired,
  anchoCompleto: PropTypes.bool,
  onCambios: PropTypes.func.isRequired,
  // ({ mensaje, severidad, guardado }): la vista avisa y, si se guardó,
  // vuelve a leer la lista.
  onTerminar: PropTypes.func.isRequired,
};
