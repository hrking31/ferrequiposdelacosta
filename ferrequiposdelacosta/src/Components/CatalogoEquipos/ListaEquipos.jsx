import { useState } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import { usePantallaCompacta } from "../../Utils/pantalla";
import MiniaturaEquipo from "./MiniaturaEquipo";
import { filtrarCatalogo } from "./catalogoEquipos";

// LA LISTA DEL CATÁLOGO de Equipos y de Crear equipo (pedido del dueño,
// 2026-10-26): en Equipos, tocar un equipo lo abre; en Crear, solo se mira,
// para no repetir uno. Cada uno con la miniatura de su
// portada y la letra un poco más chica; el abierto, marcado con el lápiz.
//
// `enPanel`: dentro del recuadro de la columna (PanelDocumentos), con su
// buscador pegado arriba al desplazar. Sin eso ocupa la pantalla (celular o
// computador angosto), con renglones más altos para el dedo.
//
// El buscador lleva al lado el contador de las demás pantallas (Clientes,
// Seguimiento): "3 de 19". En el celular, como allá: el buscador con
// `accion` (el menú) y, debajo, qué lista es y cuántos se ven.
export default function ListaEquipos({
  equipos,
  idElegido,
  onElegir,
  accion,
  enPanel = false,
  contadorDebajo = false,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const esCelular = usePantallaCompacta();
  const [busqueda, setBusqueda] = useState("");
  const visibles = filtrarCatalogo(equipos, busqueda);
  const enDosRenglones = contadorDebajo || (esCelular && !enPanel);

  const buscador = (
    <BuscadorFiltro value={busqueda} onChange={setBusqueda} placeholder="Buscar equipo..." />
  );
  const contador = (
    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
      {visibles.length} de {equipos.length}
      {enPanel || esCelular ? "" : " equipos"}
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
              {accion}
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Lista de equipos
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
      </Box>

      <Stack spacing={enPanel ? 0.5 : 1}>
        {visibles.map((equipo) => {
          const elegido = equipo.id === idElegido;
          // Sin `onElegir` (Crear equipo) los renglones solo se miran.
          const Renglon = onElegir ? ButtonBase : Box;
          return (
            <Renglon
              key={equipo.id}
              {...(onElegir && {
                onClick: () => onElegir(equipo),
                "aria-current": elegido ? "true" : undefined,
              })}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: enPanel ? 1.25 : 1.5,
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                borderLeft: "3px solid",
                borderLeftColor: elegido ? acento : "transparent",
                bgcolor: elegido ? alpha(acento, 0.12) : enPanel ? "transparent" : "background.paper",
                textAlign: "left",
                ...(onElegir && { "&:hover": { bgcolor: alpha(acento, elegido ? 0.16 : 0.06) } }),
              }}
            >
              <MiniaturaEquipo equipo={equipo} ancho={enPanel ? 40 : 56} />
              <Typography
                noWrap
                title={equipo.name}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: enPanel ? "0.8rem" : "0.875rem",
                  fontWeight: elegido ? 700 : 500,
                  color: elegido ? acento : "text.primary",
                }}
              >
                {equipo.name || "Sin nombre"}
              </Typography>
              {elegido && <EditIcon sx={{ fontSize: 16, color: acento }} />}
            </Renglon>
          );
        })}
        {visibles.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
            Ningún equipo coincide con &quot;{busqueda.trim()}&quot;.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

ListaEquipos.propTypes = {
  equipos: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string }))
    .isRequired,
  idElegido: PropTypes.string,
  // Tocar un equipo. Sin esto, la lista solo se mira (Crear equipo).
  onElegir: PropTypes.func,
  // Un botón al lado del buscador (en el celular, el del menú).
  accion: PropTypes.node,
  enPanel: PropTypes.bool,
  // "Lista de equipos" y el contador debajo del buscador en cualquier
  // pantalla, no solo en el celular (la ventana del menú, pedido del dueño,
  // 2026-10-28).
  contadorDebajo: PropTypes.bool,
};
