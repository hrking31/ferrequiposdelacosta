import { useState } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import { usePantallaCompacta } from "../../Utils/pantalla";
import AvatarUsuario from "./AvatarUsuario";
import { estadoConexion, filtrarUsuarios, nombreDelRol } from "./usuarios";

// LA LISTA DEL PERSONAL de la pantalla de Usuarios (2026-10-28), como la del
// catálogo de Equipos: buscador con su contador y, por persona, su cara con
// el punto de conexión, su nombre, su rol y desde cuándo no se conecta. La
// elegida, marcada con el borde y, si se está editando, con el lápiz.
//
// `onNuevo`: arriba, la zona punteada NUEVO USUARIO (la de "Agregar foto" de
// Equipos). Mientras se crea uno, `nuevo` la cambia por su renglón de muestra,
// que se va llenando con lo que se escribe.
//
// `enPanel`: dentro del recuadro de la columna (PanelDocumentos), con el
// buscador pegado arriba. Sin eso ocupa la pantalla (celular), con renglones
// más altos para el dedo, y `accion` (nuevo y menú) al lado del buscador.
export default function ListaUsuarios({
  usuarios,
  presencia,
  miUid,
  idElegido,
  editando = false,
  onElegir,
  onNuevo,
  nuevo,
  accion,
  enPanel = false,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const esCelular = usePantallaCompacta();
  const [busqueda, setBusqueda] = useState("");
  const visibles = filtrarUsuarios(usuarios, busqueda);
  const enDosRenglones = esCelular && !enPanel;
  const avatar = enPanel ? 40 : 48;

  const buscador = (
    <BuscadorFiltro value={busqueda} onChange={setBusqueda} placeholder="Buscar usuario..." />
  );
  const contador = (
    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
      {visibles.length} de {usuarios.length}
    </Typography>
  );

  return (
    <Box>
      <Box
        sx={{
          position: "sticky",
          // El recuadro (PanelDocumentos) tiene 12px de relleno: así queda
          // pegado al borde de arriba.
          top: enPanel ? -12 : 0,
          zIndex: 1,
          bgcolor: enPanel ? "background.paper" : "background.default",
          pt: enPanel ? 1.5 : 1,
          pb: 1.5,
        }}
      >
        {enDosRenglones ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
              {accion}
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Lista de usuarios
              </Typography>
              {contador}
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {buscador}
            {accion}
            {contador}
          </Stack>
        )}

        {nuevo ? (
          // El que se está creando, arriba de todos.
          <Box
            sx={{
              mt: 1.25,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 2,
              border: `2px dashed ${acento}`,
              bgcolor: alpha(acento, 0.08),
            }}
          >
            <AvatarUsuario usuario={{ id: "nuevo", name: nuevo.name, email: nuevo.email }} tamano={avatar} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: "0.875rem", fontWeight: 700, color: acento }}>
                {nuevo.name.trim() || "Sin nombre"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {nuevo.role ? nombreDelRol(nuevo.role) : "Sin rol"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.5, color: acento }}>
              NUEVO
            </Typography>
          </Box>
        ) : (
          onNuevo && (
            <ButtonBase
              onClick={onNuevo}
              sx={{
                mt: 1.25,
                width: "100%",
                height: 46,
                gap: 1,
                borderRadius: 2,
                border: `2px dashed ${alpha(acento, 0.45)}`,
                bgcolor: alpha(acento, 0.04),
                color: acento,
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: 0.5,
                "&:hover": { bgcolor: alpha(acento, 0.08), borderColor: acento },
              }}
            >
              <PersonAddAlt1Icon fontSize="small" />
              NUEVO USUARIO
            </ButtonBase>
          )
        )}
      </Box>

      <Stack spacing={enPanel ? 0.5 : 1}>
        {visibles.map((usuario) => {
          const elegido = usuario.id === idElegido;
          const conexion = estadoConexion(presencia[usuario.id], usuario.genero);
          return (
            <ButtonBase
              key={usuario.id}
              onClick={() => onElegir(usuario)}
              aria-current={elegido ? "true" : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1.5,
                py: enPanel ? 0.75 : 1.25,
                px: enPanel ? 1 : 1.5,
                borderRadius: 1.5,
                borderLeft: "3px solid",
                borderLeftColor: elegido ? acento : "transparent",
                bgcolor: elegido ? alpha(acento, 0.12) : enPanel ? "transparent" : "background.paper",
                textAlign: "left",
                "&:hover": { bgcolor: alpha(acento, elegido ? 0.16 : 0.06) },
              }}
            >
              <AvatarUsuario usuario={usuario} tamano={avatar} enLinea={conexion.enLinea} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: enPanel ? "0.875rem" : "0.95rem",
                    fontWeight: elegido ? 700 : 600,
                    color: elegido ? acento : "text.primary",
                  }}
                >
                  {usuario.name || usuario.email || "Sin nombre"}
                  {usuario.id === miUid && " · tú"}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" noWrap>
                  {nombreDelRol(usuario.role)}
                </Typography>
              </Box>
              {elegido && editando ? (
                <EditIcon sx={{ fontSize: 16, color: acento }} />
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: conexion.enLinea ? "success.dark" : "text.secondary",
                  }}
                >
                  {conexion.corto}
                </Typography>
              )}
            </ButtonBase>
          );
        })}
        {visibles.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
            {usuarios.length === 0
              ? "Todavía no hay usuarios."
              : <>Nadie coincide con &quot;{busqueda.trim()}&quot;.</>}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

ListaUsuarios.propTypes = {
  usuarios: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, name: PropTypes.string, email: PropTypes.string }),
  ).isRequired,
  // usuariosConectados de la presencia: { [uid]: { online, timestamp } }.
  presencia: PropTypes.object.isRequired,
  miUid: PropTypes.string,
  idElegido: PropTypes.string,
  editando: PropTypes.bool,
  onElegir: PropTypes.func.isRequired,
  onNuevo: PropTypes.func,
  nuevo: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string, role: PropTypes.string }),
  accion: PropTypes.node,
  enPanel: PropTypes.bool,
};
