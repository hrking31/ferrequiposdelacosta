import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import generarReporteFacturasPdf from "../VistaPdf/VistaReporteClientePdf";
import {
  calcularCuentaFactura,
  calcularEstadoFactura,
  ESTADO_FACTURA_INFO,
  formatearFechaLegible,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

// Elegir qué facturas del cliente entran en el reporte. Las finalizadas ya no
// vienen en `facturas` —las filtra quien abre este diálogo— así que acá solo
// se decide, de las que sí importan, cuáles quedan.
export default function ReporteFacturasDialog({ open, onClose, cliente, facturas }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  // Arranca con todas marcadas: lo usual es querer el reporte completo y
  // desmarcar la excepción, no al revés.
  useEffect(() => {
    if (!open) return;
    setSeleccionadas(new Set(facturas.map((factura) => factura.id)));
  }, [open, facturas]);

  const alternarFactura = (facturaId) => {
    setSeleccionadas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(facturaId)) {
        siguiente.delete(facturaId);
      } else {
        siguiente.add(facturaId);
      }
      return siguiente;
    });
  };

  const todasMarcadas = facturas.length > 0 && seleccionadas.size === facturas.length;
  const algunaMarcada = seleccionadas.size > 0;

  const alternarTodas = () => {
    setSeleccionadas(
      todasMarcadas ? new Set() : new Set(facturas.map((factura) => factura.id)),
    );
  };

  const handleGenerar = () => {
    const facturasSeleccionadas = facturas.filter((factura) =>
      seleccionadas.has(factura.id),
    );
    generarReporteFacturasPdf({ cliente, facturas: facturasSeleccionadas });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ color: acento }}>Reporte de facturas</DialogTitle>
      <DialogContent>
        {facturas.length === 0 ? (
          <DialogContentText>
            Este cliente no tiene facturas para incluir en el reporte (las
            finalizadas no entran en la lista).
          </DialogContentText>
        ) : (
          <>
            <DialogContentText sx={{ mb: 1 }}>
              Elegí qué facturas van en el PDF.
            </DialogContentText>

            <ListItemButton onClick={alternarTodas} dense sx={{ borderRadius: 1, px: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={todasMarcadas}
                  indeterminate={algunaMarcada && !todasMarcadas}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText
                primary="Seleccionar todas"
                primaryTypographyProps={{ fontWeight: "bold" }}
              />
            </ListItemButton>
            <Divider sx={{ my: 0.5 }} />

            <List dense sx={{ maxHeight: 320, overflowY: "auto" }}>
              {facturas.map((factura) => {
                const cuenta = calcularCuentaFactura(factura);
                const estadoInfo = ESTADO_FACTURA_INFO[calcularEstadoFactura(factura)];
                const saldoTexto =
                  cuenta.saldoAFavor > 0
                    ? `A favor ${formatearMoneda(cuenta.saldoAFavor)}`
                    : `Saldo ${formatearMoneda(cuenta.saldoPendiente)}`;

                return (
                  <ListItem key={factura.id} disablePadding>
                    <ListItemButton onClick={() => alternarFactura(factura.id)} dense>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={seleccionadas.has(factura.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Factura ${factura.numeroFactura ?? "s/n"} · ${formatearFechaLegible(factura.fecha) || ""}`}
                        secondary={`${estadoInfo?.label || ""} · ${formatearMoneda(cuenta.total)} · ${saldoTexto}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
        <Button variant="contained" color="error" onClick={onClose}>
          Cancelar
        </Button>
        {facturas.length > 0 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleGenerar}
            disabled={seleccionadas.size === 0}
          >
            Generar PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

ReporteFacturasDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  facturas: PropTypes.array,
};
