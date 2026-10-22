// EL PAGO DE LA ENTREGA (2026-10-22). El despacho salió "contra entrega": el
// cliente paga al recibir el equipo en la obra y la plata llega a la oficina
// después, con el personal de entrega. Acá se registra cuando llega, como lo
// que es —el pago de ESE despacho— y no como un abono.
//
// La diferencia importa por el depósito: el pago de un despacho cubre PRIMERO
// su depósito (ver calcularDeposito). Anotada como abono, la plata de la 0773
// dejó el depósito sin reconocer y los $100.000 terminaron como saldo a favor.
//
// Es el mismo formulario de pago que al crear la factura: tipo, medios y
// valor. Lo que se entrega de más queda como abono, igual que allá.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  GRUPO_INICIAL,
  IVA,
  abonosDe,
  adicionalesDe,
  datosFactura,
  formatearFechaLegible,
  gruposDe,
  separarExcedentePago,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";
import PagosMediosField from "./PagosMediosField";

const TIPOS_PAGO = {
  total: "Pago total",
  parcial: "Parcial",
  // Entregó de más: lo que sobra queda como abono.
  conAbono: "Pago con abono",
};

const numero = (valor) => Number(valor) || 0;

// Lo que el cliente tenía que pagar al recibir ESTE despacho: sus días
// pactados con su IVA, el flete y el depósito. Es la misma cuenta que hace el
// formulario al crear la factura (ver valorTotalCalculado).
const cobroDeLaEntrega = (grupo) => {
  const equipos = grupo?.equipos ?? [];
  const valorDe = (equipo) =>
    numero(equipo.cantidadEquipos) * numero(equipo.diasAlquilados) * numero(equipo.valorDia);
  const alquiler = equipos.reduce((total, equipo) => total + valorDe(equipo), 0);
  const iva = equipos.reduce(
    (total, equipo) => total + (equipo.aplicaIva ? valorDe(equipo) * IVA : 0),
    0,
  );
  const adicionales = adicionalesDe(grupo);
  const transporte = numero(adicionales.valorTransporte);
  const deposito = numero(adicionales.valorDeposito);
  return { alquiler, iva, transporte, deposito, total: alquiler + iva + transporte + deposito };
};

const ESTADO_INICIAL = { tipoPago: "total", pagos: [{ medio: "", monto: "" }] };

export default function RegistrarPagoEntregaDialog({
  open,
  onClose,
  cliente,
  factura,
  grupo,
  onGuardado,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setForm(ESTADO_INICIAL);
    setError("");
  }, [open]);

  const cobro = cobroDeLaEntrega(grupo);
  const pagado = form.pagos.reduce((total, pago) => total + numero(pago.monto), 0);

  // Con "Pago total" el primer medio se completa solo con lo que falte: es
  // todo lo que hay que cobrar. En los otros dos lo escribe quien carga.
  useEffect(() => {
    if (form.tipoPago !== "total") return;
    setForm((previo) => {
      const otros = previo.pagos
        .slice(1)
        .reduce((total, pago) => total + numero(pago.monto), 0);
      const restante = Math.max(0, Math.round(cobro.total - otros));
      const primero = previo.pagos[0] || { medio: "", monto: "" };
      if (numero(primero.monto) === restante) return previo;
      return { ...previo, pagos: [{ ...primero, monto: restante }, ...previo.pagos.slice(1)] };
    });
  }, [form.tipoPago, form.pagos, cobro.total]);

  const handleCambiarTipoPago = (e) => {
    const tipoPago = e.target.value;
    setForm((previo) => ({
      tipoPago,
      pagos:
        tipoPago === "total" ? previo.pagos : previo.pagos.map((pago) => ({ ...pago, monto: "" })),
    }));
  };

  const handleGuardar = async () => {
    const validos = form.pagos.filter((pago) => pago.medio && numero(pago.monto) > 0);
    if (validos.length === 0) {
      setError("Elegí el medio de pago y el valor que llegó.");
      return;
    }
    setError("");

    // Lo que se entregó de más no es pago del despacho: queda como abono,
    // con la fecha del despacho, igual que al crear la factura.
    const { pagos, excedente, medio } = separarExcedentePago(form.pagos, cobro.total);
    const grupos = gruposDe(factura).map((cada) =>
      cada.grupo === grupo.grupo
        ? { ...cada, pagos: { tipoPago: form.tipoPago, medios: pagos } }
        : cada,
    );
    const abonos =
      excedente > 0
        ? [
            ...abonosDe(factura),
            { fecha: grupo.fechaSolicitud, medio, monto: excedente, tipo: "sistema" },
          ]
        : null;

    setGuardando(true);
    try {
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        grupos,
        ...(abonos ? { abonos } : {}),
      });
      showSnackbar("Pago de la entrega registrado.", "success");
      onGuardado?.();
      onClose();
    } catch (errorAlGuardar) {
      showSnackbar(`Error al registrar el pago: ${errorAlGuardar.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const renglon = (rotulo, valor, clase) => (
    <Box className={clase ? `fila ${clase}` : "fila"}>
      <Typography variant="body2" fontWeight={clase ? "bold" : undefined}>
        {rotulo}
      </Typography>
      <Typography variant="body2" fontWeight={clase ? "bold" : undefined}>
        {formatearMoneda(valor)}
      </Typography>
    </Box>
  );

  const despacho = `${grupo?.grupo === GRUPO_INICIAL ? "Despacho del" : "Agregado el"} ${formatearFechaLegible(
    grupo?.fechaSolicitud,
  )}`;

  return (
    <>
      <Dialog open={open} onClose={guardando ? undefined : onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>Registrar pago de la entrega</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Factura {datosFactura(factura).numeroFactura ?? "s/n"} · {despacho}
          </Typography>

          {/* Lo que tenía que pagar al recibirlo, para ver qué cubre la
              plata. El depósito va primero de lo que se pague. */}
          <Paper variant="totales" sx={{ mb: 2 }}>
            {renglon("Alquiler", cobro.alquiler)}
            {cobro.iva > 0 && renglon("IVA (19%)", cobro.iva)}
            {cobro.transporte > 0 && renglon("Transporte", cobro.transporte)}
            {cobro.deposito > 0 && renglon("Depósito", cobro.deposito)}
            {renglon("Paga al recibir", cobro.total, "total")}
          </Paper>

          <FormControl fullWidth size="small">
            <InputLabel id="pago-entrega-tipo-label" htmlFor="pago-entrega-tipo-input">
              Tipo de pago
            </InputLabel>
            <Select
              labelId="pago-entrega-tipo-label"
              inputProps={{ id: "pago-entrega-tipo-input" }}
              label="Tipo de pago"
              value={form.tipoPago}
              onChange={handleCambiarTipoPago}
            >
              {Object.entries(TIPOS_PAGO).map(([valor, rotulo]) => (
                <MenuItem key={valor} value={valor}>
                  {rotulo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <PagosMediosField
              pagos={form.pagos}
              onChange={(pagos) => setForm((previo) => ({ ...previo, pagos }))}
              idPrefix="pago-entrega"
              apilado
            />
          </Box>

          {form.tipoPago === "parcial" && pagado > 0 && pagado < cobro.total && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Queda debiendo {formatearMoneda(cobro.total - pagado)}
            </Typography>
          )}
          {pagado > cobro.total && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Sobran {formatearMoneda(pagado - cobro.total)}: quedan como abono
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar pago"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

RegistrarPagoEntregaDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  grupo: PropTypes.object,
  onGuardado: PropTypes.func,
};
