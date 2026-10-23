import { useEffect } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import KpiCard from "../KpiCard/KpiCard";
import { leerTotalesPanel } from "../../Views/AdminForms/totalesPanelDb";
import { setKpis } from "../../Store/Slices/kpisSlice";

// LA COLUMNA DE LA DERECHA del buzón de cotizaciones y de la lista de cuentas
// de cobro, solo en computador ancho (2026-10-22). Como el panel de
// Seguimiento: arriba dos tarjetas y abajo un recuadro que muestra lo de la
// lista o, si se toca una tarjeta de la lista, su vista previa.
//
// LA PRIMERA TARJETA es la del menú, el número exacto del mes. SIN LECTURAS:
// es el que el menú ya guardó al pasar por él (el slice `kpis`), y a estas
// pantallas se llega siempre desde el menú. Solo si esa memoria está vacía
// —se recargó la página estando acá— se lee la pizarra, 1 vez.
//
// LA SEGUNDA la arma cada pantalla con lo que ya tiene cargado.
const DEL_MES = {
  cotizaciones: {
    etiqueta: "COTIZACIONES",
    Icono: RequestQuoteIcon,
    color: (palette) => palette.info.main,
    clave: "cotizacionesMes",
  },
  cuentas: {
    etiqueta: "CUENTAS DE COBRO",
    Icono: ReceiptLongIcon,
    color: (palette) => palette.success.main,
    clave: "cuentasCobroMes",
  },
};

export default function PanelDocumentos({ de, segunda, titulo, icono, children }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { etiqueta, Icono, color, clave } = DEL_MES[de];
  const delMes = useSelector((state) => state.kpis[clave]);
  const faltaElDato = !delMes;

  useEffect(() => {
    if (!faltaElDato) return undefined;
    let cancelado = false;

    (async () => {
      try {
        const totales = await leerTotalesPanel();
        if (cancelado || !totales) return;
        dispatch(
          setKpis({
            cotizacionesMes: totales.cotizacionesMes,
            cotizaciones: totales.cotizacionesMes?.total,
            cuentasCobroMes: totales.cuentasCobroMes,
            cuentasCobro: totales.cuentasCobroMes?.total,
          }),
        );
      } catch (error) {
        console.error("Error al leer los totales del panel:", error);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [faltaElDato, dispatch]);

  const acento = theme.palette.custom.accent;

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
        <KpiCard
          compacto
          etiqueta={etiqueta}
          icono={<Icono />}
          color={color(theme.palette)}
          valor={delMes?.total ?? "…"}
          subtitulo="Este mes"
        />
        <KpiCard compacto {...segunda} />
      </Stack>

      {/* Se desplaza solo: una lista larga no empuja las tarjetas fuera de la
          pantalla. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: alpha(acento, 0.5),
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="overline"
          sx={{ display: "flex", alignItems: "center", gap: 0.5, lineHeight: 1.6, color: acento }}
        >
          {icono}
          {titulo}
        </Typography>
        {children}
      </Box>
    </Stack>
  );
}

PanelDocumentos.propTypes = {
  de: PropTypes.oneOf(["cotizaciones", "cuentas"]).isRequired,
  // La segunda tarjeta, con lo que la pantalla ya tiene cargado (ver KpiCard).
  segunda: PropTypes.shape({
    etiqueta: PropTypes.string.isRequired,
    icono: PropTypes.element.isRequired,
    color: PropTypes.string.isRequired,
    valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subtitulo: PropTypes.string.isRequired,
  }).isRequired,
  // El rótulo del recuadro y su ícono.
  titulo: PropTypes.string.isRequired,
  icono: PropTypes.element.isRequired,
  children: PropTypes.node,
};
