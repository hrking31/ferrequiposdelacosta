// LAS ACCIONES DE LA FICHA DEL CLIENTE, en un solo lugar porque se dibujan en
// dos: en computador van dentro de la tarjeta del cliente, y en celular bajan
// al pie de la pantalla —donde llega el pulgar—, ocupando el renglón que antes
// tenían MENU y CERRAR SESION.
//
// El orden es el del trabajo: volver al listado, crear una factura, cobrar
// (abono), los dos documentos que salen de sus facturas, y editar al cliente.
import PropTypes from "prop-types";
import { IconButton, Stack, Tooltip } from "@mui/material";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import EditIcon from "@mui/icons-material/Edit";

export default function BotonesCliente({
  hayFacturasParaReporte,
  onVolver,
  onCrearFactura,
  onRegistrarAbono,
  onDescargarReporte,
  onPasarACuentaCobro,
  onEditarCliente,
  // En el pie los seis se reparten el ancho; dentro de la tarjeta van
  // pegados a la derecha, como estaban.
  repartidos = false,
  // En computador la vista ya tiene su propia carpeta para volver, arriba a
  // la derecha, así que ahí esta no va.
  conVolver = true,
}) {
  // Sin recuadro: el ícono solo, del acento del tema. El marco servía cuando
  // los botones iban apretados dentro de la tarjeta, para agruparlos; acá
  // abajo cada uno tiene su propio espacio y el borde solo hacía ruido.
  //
  // El color sale del tema —custom.accent—, no escrito a mano: así sigue al
  // modo día/noche solo.
  //
  // En el pie van GRANDES: 44px es lo mínimo que hay que darle a un dedo, y
  // acá abajo es donde se tocan. El relleno de más no estira nada porque la
  // franja que los contiene compensa con menos aire: 44 + 5 + 5 = los mismos
  // 54px que medía con los botones chicos. Dentro de la tarjeta —computador,
  // con mouse— siguen chicos, que es lo que entra al lado del nombre.
  const tamano = repartidos ? "medium" : "small";
  const botonSx = { color: "custom.accent", ...(repartidos && { p: 1.25 }) };

  return (
    <Stack
      direction="row"
      alignItems="center"
      // Repartidos, cada uno cae bajo el dedo sin apuntar; juntos, se aprietan
      // entre sí.
      justifyContent={repartidos ? "space-between" : "flex-end"}
      spacing={repartidos ? 0 : 1}
      sx={{ flexShrink: 0, width: repartidos ? "100%" : "auto" }}
    >
      {conVolver && (
        <Tooltip title="Volver a Clientes">
          <IconButton size={tamano} onClick={onVolver} sx={botonSx}>
            <FolderSharedIcon fontSize={tamano} />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Crear factura">
        <IconButton size={tamano} onClick={onCrearFactura} sx={botonSx}>
          <ReceiptLongIcon fontSize={tamano} />
        </IconButton>
      </Tooltip>

      {/* EL ABONO, en los dos lados y a propósito.
          En cartera porque el momento en que entra la plata suele ser la
          llamada de cobro. Y acá porque hay un cliente que ese botón no
          alcanza: el que paga por su cuenta ANTES de que se le venza. Esa
          factura no está en cartera —no hay nada que cobrar todavía— y su
          plata no tenía por dónde entrar.
          El abono es del CLIENTE, no de una factura: baja su deuda y la app lo
          reparte entre las facturas con saldo, de la más antigua a la más
          nueva. */}
      <Tooltip
        title={
          hayFacturasParaReporte
            ? "Registrar abono"
            : "Este cliente no tiene facturas con saldo"
        }
      >
        {/* El span es necesario para que el tooltip funcione con el botón
            deshabilitado: un botón así no emite eventos de mouse. */}
        <span>
          <IconButton
            size={tamano}
            onClick={onRegistrarAbono}
            disabled={!hayFacturasParaReporte}
            sx={botonSx}
          >
            <AttachMoneyIcon fontSize={tamano} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Descargar facturas en PDF">
        <span>
          <IconButton
            size={tamano}
            onClick={onDescargarReporte}
            disabled={!hayFacturasParaReporte}
            sx={botonSx}
          >
            <PictureAsPdfIcon fontSize={tamano} />
          </IconButton>
        </span>
      </Tooltip>

      {/* Misma lista de facturas que el reporte, pero en vez de un PDF arma la
          cuenta de cobro y lleva a su pantalla. */}
      <Tooltip title="Pasar facturas a cuenta de cobro">
        <span>
          <IconButton
            size={tamano}
            onClick={onPasarACuentaCobro}
            disabled={!hayFacturasParaReporte}
            sx={botonSx}
          >
            <RequestQuoteIcon fontSize={tamano} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Editar cliente">
        <IconButton size={tamano} onClick={onEditarCliente} sx={botonSx}>
          <EditIcon fontSize={tamano} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

BotonesCliente.propTypes = {
  hayFacturasParaReporte: PropTypes.bool,
  onVolver: PropTypes.func.isRequired,
  onCrearFactura: PropTypes.func.isRequired,
  onRegistrarAbono: PropTypes.func.isRequired,
  onDescargarReporte: PropTypes.func.isRequired,
  onPasarACuentaCobro: PropTypes.func.isRequired,
  onEditarCliente: PropTypes.func.isRequired,
  repartidos: PropTypes.bool,
  conVolver: PropTypes.bool,
};
