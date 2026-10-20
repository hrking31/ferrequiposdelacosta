import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TimelineIcon from "@mui/icons-material/Timeline";
import KpiCard from "../KpiCard/KpiCard";
import DetalleEquiposActivos from "../KpiCard/DetalleEquiposActivos";
import HistorialEquipo from "../ClienteDetalle/HistorialEquipo";
import { EncabezadoHistoria } from "./HistorialEquipoDialog";
import { leerTotalesPanel } from "../../Views/AdminForms/totalesPanelDb";
import { setKpis } from "../../Store/Slices/kpisSlice";
import { formatearMoneda } from "../../Utils/formato";

// LA COLUMNA DE LA DERECHA DE SEGUIMIENTO, solo en computador: arriba los dos
// números del menú —equipos afuera y plata por cobrar— y abajo la historia del
// equipo que se eligió en la lista, o el detalle de los equipos afuera.
//
// Los números salen de la misma pizarra que lee el menú (1 lectura) y quedan
// guardados en el mismo lugar, así que las dos pantallas no pueden mostrar
// cifras distintas.
export default function PanelSeguimiento({ elegido, hoy }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const kpisGuardados = useSelector((state) => state.kpis);
  const [totales, setTotales] = useState({
    equiposActivos: kpisGuardados.equiposActivos,
    equiposPorTipo: kpisGuardados.equiposPorTipo,
    pagosPendientes: kpisGuardados.pagosPendientes,
  });
  // EL DETALLE DE EQUIPOS ACTIVOS va en el mismo recuadro de la historia: se
  // abre tocando el número y se va solo en cuanto se elige otro equipo en la
  // lista. Se guarda qué elección había al abrirlo; si cambió —otro equipo, o
  // el mismo tocado de nuevo— se vuelve a la historia. `undefined` = cerrado.
  const [detalleAbiertoCon, setDetalleAbiertoCon] = useState(undefined);
  const elegidoAhora = elegido ?? null;
  const verDetalle = detalleAbiertoCon !== undefined && detalleAbiertoCon === elegidoAhora;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const frescos = await leerTotalesPanel();
        if (cancelado || !frescos) return;
        const numeros = {
          equiposActivos: frescos.equiposActivos,
          equiposPorTipo: frescos.equiposPorTipo,
          pagosPendientes: frescos.pagosPendientes,
        };
        setTotales(numeros);
        dispatch(setKpis(numeros));
      } catch (error) {
        console.error("Error al leer los totales del panel:", error);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [dispatch]);

  const colorHistoria = theme.palette.custom.accent;

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
        <KpiCard
          compacto
          etiqueta="EQUIPOS ACTIVOS"
          icono={<LocalShippingIcon />}
          color={theme.palette.warning.main}
          valor={totales.equiposActivos ?? "…"}
          subtitulo="En alquiler"
          onClick={() => setDetalleAbiertoCon(verDetalle ? undefined : elegidoAhora)}
        />
        <KpiCard
          compacto
          etiqueta="PAGOS PENDIENTES"
          icono={<ErrorOutlineIcon />}
          color={theme.palette.error.main}
          valor={
            totales.pagosPendientes === null || totales.pagosPendientes === undefined
              ? "…"
              : formatearMoneda(totales.pagosPendientes)
          }
          subtitulo="Por cobrar"
        />
      </Stack>

      {/* La historia, en un recuadro que se desplaza solo: con muchos hitos
          no empuja los números fuera de la pantalla. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: alpha(colorHistoria, 0.5),
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="overline"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            lineHeight: 1.6,
            color: colorHistoria,
          }}
        >
          {verDetalle ? (
            <>
              <LocalShippingIcon fontSize="small" />
              Equipos activos
            </>
          ) : (
            <>
              <TimelineIcon fontSize="small" />
              Historia del equipo
            </>
          )}
        </Typography>

        {verDetalle ? (
          <DetalleEquiposActivos equiposPorTipo={totales.equiposPorTipo} />
        ) : elegido ? (
          <>
            <EncabezadoHistoria
              equipo={elegido.equipo}
              numeroFactura={elegido.numeroFactura}
              nombreCliente={elegido.nombreCliente}
            />
            <HistorialEquipo equipo={elegido.equipo} hoy={hoy} />
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 6 }}
          >
            Haz clic en un equipo para ver su historia.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

PanelSeguimiento.propTypes = {
  // El equipo elegido, ya buscado en la lista vigente: null si no hay ninguno.
  elegido: PropTypes.shape({
    equipo: PropTypes.object.isRequired,
    numeroFactura: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nombreCliente: PropTypes.string,
  }),
  hoy: PropTypes.string,
};
