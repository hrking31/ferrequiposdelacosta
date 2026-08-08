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
import {
  calcularCuentaFactura,
  calcularEstadoFactura,
  ESTADO_FACTURA_INFO,
  formatearFechaLegible,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

// Elegir con casillas qué facturas de un cliente entran en algo: el reporte en
// PDF (ver ReporteFacturasDialog) o la cuenta de cobro (ver ClienteDetalle).
// Las finalizadas no llegan hasta acá —las filtra quien abre el diálogo—, así
// que este componente solo se ocupa de la selección y le entrega la lista
// elegida a `onConfirmar`.
export default function SeleccionarFacturasDialog({
  open,
  onClose,
  facturas = [],
  titulo,
  descripcion,
  aviso,
  textoVacio,
  textoConfirmar,
  onConfirmar,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  // Arranca con todas marcadas: lo usual es querer todas y desmarcar la
  // excepción, no al revés.
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

  const handleConfirmar = () => {
    // Se entregan en el mismo orden en que se muestran, no en el que se fueron
    // marcando: así el documento sale ordenado como la lista.
    onConfirmar(facturas.filter((factura) => seleccionadas.has(factura.id)));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ color: acento }}>{titulo}</DialogTitle>
      <DialogContent>
        {facturas.length === 0 ? (
          <DialogContentText>{textoVacio}</DialogContentText>
        ) : (
          <>
            <DialogContentText sx={{ mb: aviso ? 0.5 : 1 }}>
              {descripcion}
            </DialogContentText>

            {aviso && (
              <DialogContentText sx={{ mb: 1, color: "warning.main" }}>
                {aviso}
              </DialogContentText>
            )}

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
            onClick={handleConfirmar}
            disabled={seleccionadas.size === 0}
          >
            {textoConfirmar}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

SeleccionarFacturasDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  facturas: PropTypes.array,
  titulo: PropTypes.string.isRequired,
  descripcion: PropTypes.string.isRequired,
  aviso: PropTypes.string,
  textoVacio: PropTypes.string.isRequired,
  textoConfirmar: PropTypes.string.isRequired,
  onConfirmar: PropTypes.func.isRequired,
};
