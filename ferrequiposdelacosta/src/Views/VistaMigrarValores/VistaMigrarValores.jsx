// PANTALLA TEMPORAL — se borra cuando la conversión esté hecha.
//
// Mueve los valores de cada factura al nodo `valores`: subtotal, IVA, total,
// transporte y depósito, que hasta ahora vivían sueltos en la raíz del
// documento mezclados con las listas y las marcas de estado.
//
// Solo existe en desarrollo (ver la ruta en App.jsx). Se abre en localhost,
// que igual está conectado a la base de VERDAD: es el mismo camino que se usó
// para pasar las cotizaciones a Firestore.
//
// Dos pasos a propósito. "Revisar" solo lee y cuenta; "Convertir" escribe. La
// conversión es idempotente: una factura ya convertida se salta, así que se
// puede correr las veces que haga falta sin miedo.
import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

// Los ocho que se mudan. `tipoPago`, `numeroFactura`, `fecha` y `cerrada` se
// quedan en la raíz: no son lo que la factura vale.
const CAMPOS = [
  "subtotal",
  "iva",
  "aplicaIva",
  "valorTotal",
  "transporte",
  "valorTransporte",
  "deposito",
  "depositoResuelto",
];

// Firestore admite 500 operaciones por lote; se deja margen.
const TAMANIO_LOTE = 400;

export default function VistaMigrarValores() {
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  // Recorre clientes → facturas y devuelve, por cada una, qué campos sueltos
  // le quedan en la raíz.
  const recorrer = async () => {
    const clientesSnap = await getDocs(collection(db, "clientes"));
    const pendientes = [];
    let total = 0;

    for (const clienteDoc of clientesSnap.docs) {
      const facturasSnap = await getDocs(
        collection(db, "clientes", clienteDoc.id, "facturas"),
      );
      facturasSnap.docs.forEach((facturaDoc) => {
        total += 1;
        const datos = facturaDoc.data();
        const sueltos = CAMPOS.filter((campo) => datos[campo] !== undefined);
        if (sueltos.length > 0) {
          pendientes.push({
            clienteId: clienteDoc.id,
            facturaId: facturaDoc.id,
            numero: datos.numeroFactura ?? "s/n",
            datos,
            sueltos,
          });
        }
      });
      setProgreso(`Leídas ${total} facturas...`);
    }

    return { total, pendientes, clientes: clientesSnap.size };
  };

  const revisar = async () => {
    setTrabajando(true);
    setError("");
    setResultado(null);
    try {
      const { total, pendientes, clientes } = await recorrer();
      setResultado({
        modo: "revision",
        clientes,
        total,
        porConvertir: pendientes.length,
        detalle: pendientes.map((p) => `${p.numero}: ${p.sueltos.join(", ")}`),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(false);
      setProgreso("");
    }
  };

  const convertir = async () => {
    setTrabajando(true);
    setError("");
    setResultado(null);
    try {
      const { total, pendientes, clientes } = await recorrer();

      let escritas = 0;
      for (let i = 0; i < pendientes.length; i += TAMANIO_LOTE) {
        const tanda = pendientes.slice(i, i + TAMANIO_LOTE);
        const batch = writeBatch(db);

        tanda.forEach(({ clienteId, facturaId, datos, sueltos }) => {
          // Lo que ya estuviera en el nodo manda: es lo que hace el lector, y
          // así correr esto dos veces no pisa nada.
          const valores = { ...(datos.valores ?? {}) };
          sueltos.forEach((campo) => {
            if (valores[campo] === undefined) valores[campo] = datos[campo];
          });

          const cambios = { valores };
          sueltos.forEach((campo) => {
            cambios[campo] = deleteField();
          });

          batch.update(
            doc(db, "clientes", clienteId, "facturas", facturaId),
            cambios,
          );
        });

        await batch.commit();
        escritas += tanda.length;
        setProgreso(`Convertidas ${escritas} de ${pendientes.length}...`);
      }

      setResultado({
        modo: "conversion",
        clientes,
        total,
        convertidas: escritas,
        yaEstaban: total - pendientes.length,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(false);
      setProgreso("");
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Organizar los valores de las facturas
      </Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        Mueve subtotal, IVA, total, transporte y depósito al nodo{" "}
        <strong>valores</strong> de cada factura. Primero <em>Revisar</em>, que
        solo lee y no cambia nada. Se puede repetir: lo ya convertido se salta.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={revisar} disabled={trabajando}>
          Revisar
        </Button>
        <Button variant="contained" onClick={convertir} disabled={trabajando}>
          Convertir
        </Button>
      </Stack>

      {trabajando && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption">{progreso}</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {resultado?.modo === "revision" && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2">
            {resultado.clientes} clientes · {resultado.total} facturas
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Por convertir: <strong>{resultado.porConvertir}</strong>
          </Typography>
          <Box sx={{ mt: 2, maxHeight: 320, overflow: "auto" }}>
            {resultado.detalle.map((linea) => (
              <Typography key={linea} variant="caption" component="div">
                {linea}
              </Typography>
            ))}
          </Box>
        </Paper>
      )}

      {resultado?.modo === "conversion" && (
        <Alert severity="success">
          Listo: {resultado.convertidas} facturas convertidas
          {resultado.yaEstaban > 0 &&
            `, ${resultado.yaEstaban} ya estaban organizadas`}
          . Total revisadas: {resultado.total}.
        </Alert>
      )}
    </Box>
  );
}
