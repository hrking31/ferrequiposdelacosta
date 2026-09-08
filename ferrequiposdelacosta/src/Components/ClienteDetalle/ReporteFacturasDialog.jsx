import PropTypes from "prop-types";
import SeleccionarFacturasDialog from "./SeleccionarFacturasDialog";
import generarReporteFacturasPdf from "../VistaPdf/VistaReporteClientePdf";
import generarFacturaPdf from "../VistaPdf/VistaFacturaPdf";

// Elegir qué facturas del cliente se bajan en PDF. Las finalizadas ya no
// vienen en `facturas` —las filtra quien abre este diálogo—. La lista con
// casillas es la misma que usa "Pasar a cuenta de cobro": vive en
// SeleccionarFacturasDialog y acá solo se le dice qué hacer con lo elegido.
//
// Esta es la ÚNICA puerta a los PDF de facturas: la tarjeta de cada factura
// tenía su propio botón y era el mismo documento por otro camino. Cuál de los
// dos se arma lo decide lo que se marcó, no un botón distinto:
//
//   una factura     el documento completo de esa factura, con sus equipos,
//                   el pago de cada despacho y sus cargos. Es lo que se le
//                   manda al cliente.
//
//   varias          el estado de cuenta: un renglón por factura y el saldo
//                   abajo. Con el detalle de cada una serían cinco páginas
//                   para contestar cuánto debe.
export default function ReporteFacturasDialog({ open, onClose, cliente, facturas }) {
  return (
    <SeleccionarFacturasDialog
      open={open}
      onClose={onClose}
      facturas={facturas}
      titulo="Descargar facturas en PDF"
      descripcion="Elegí una para bajar la factura completa, o varias para el estado de cuenta."
      textoVacio="Este cliente no tiene facturas para descargar (las finalizadas no entran en la lista)."
      textoConfirmar="Generar PDF"
      onConfirmar={(seleccionadas) =>
        seleccionadas.length === 1
          ? generarFacturaPdf({ factura: seleccionadas[0], cliente })
          : generarReporteFacturasPdf({ cliente, facturas: seleccionadas })
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
