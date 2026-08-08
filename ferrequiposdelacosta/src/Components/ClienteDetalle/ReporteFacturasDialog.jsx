import PropTypes from "prop-types";
import SeleccionarFacturasDialog from "./SeleccionarFacturasDialog";
import generarReporteFacturasPdf from "../VistaPdf/VistaReporteClientePdf";

// Elegir qué facturas del cliente entran en el reporte en PDF. Las finalizadas
// ya no vienen en `facturas` —las filtra quien abre este diálogo—. La lista con
// casillas es la misma que usa "Pasar a cuenta de cobro": vive en
// SeleccionarFacturasDialog y acá solo se le dice qué hacer con lo elegido.
export default function ReporteFacturasDialog({ open, onClose, cliente, facturas }) {
  return (
    <SeleccionarFacturasDialog
      open={open}
      onClose={onClose}
      facturas={facturas}
      titulo="Reporte de facturas"
      descripcion="Elegí qué facturas van en el PDF."
      textoVacio="Este cliente no tiene facturas para incluir en el reporte (las finalizadas no entran en la lista)."
      textoConfirmar="Generar PDF"
      onConfirmar={(seleccionadas) =>
        generarReporteFacturasPdf({ cliente, facturas: seleccionadas })
      }
    />
  );
}

ReporteFacturasDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  facturas: PropTypes.array,
};
