// ⚠️  VISTA TEMPORAL — BORRAR DESPUÉS DE USARLA (junto con su ruta en App.jsx).
//
// Le pone la marca `cerrada` a las facturas que ya existían antes de que el
// campo se inventara. Es OBLIGATORIO correrla antes de que las pantallas
// empiecen a pedir "solo las facturas abiertas": una factura sin la marca no
// aparece en esa consulta, así que las viejas desaparecerían de la vista.
//
// POR QUÉ UNA PANTALLA Y NO UN SCRIPT
//
// En este PC no se pueden crear claves de cuenta de servicio (lo impide una
// política de la organización), así que ningún script de Node con
// firebase-admin puede conectarse. Corriendo acá adentro, en `npm run dev` y
// con la sesión del administrador, las reglas ya permiten leer y escribir: no
// hace falta credencial de nada.
//
// Cómo se usa: `npm run dev`, entrar con el administrador, ir a
// /sembrarcerrada, apretar REVISAR (no escribe nada, solo cuenta) y después
// APLICAR. Correrla dos veces es inofensivo: solo toca las que están mal.
import { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { facturaCerrada } from "../../Components/ClienteDetalle/facturaUtils";

export default function VistaSembrarCerrada() {
  const [trabajando, setTrabajando] = useState(false);
  const [informe, setInforme] = useState(null);
  const [error, setError] = useState("");

  const recorrer = async (aplicar) => {
    setTrabajando(true);
    setError("");
    setInforme(null);

    try {
      const clientesSnap = await getDocs(collection(db, "clientes"));

      let facturas = 0;
      let correctas = 0;
      const porCorregir = [];

      for (const clienteSnap of clientesSnap.docs) {
        const facturasSnap = await getDocs(
          collection(db, "clientes", clienteSnap.id, "facturas"),
        );

        for (const facturaSnap of facturasSnap.docs) {
          facturas += 1;
          const datos = facturaSnap.data();
          const cerrada = facturaCerrada(datos);

          if (datos.cerrada === cerrada) {
            correctas += 1;
            continue;
          }

          porCorregir.push({
            clienteId: clienteSnap.id,
            facturaId: facturaSnap.id,
            cerrada,
          });
        }
      }

      if (aplicar && porCorregir.length > 0) {
        // De a 400 porque un lote de Firestore no admite más de 500.
        for (let desde = 0; desde < porCorregir.length; desde += 400) {
          const tanda = porCorregir.slice(desde, desde + 400);
          const lote = writeBatch(db);

          tanda.forEach(({ clienteId, facturaId, cerrada }) => {
            lote.update(
              doc(db, "clientes", clienteId, "facturas", facturaId),
              { cerrada },
            );
          });

          await lote.commit();
        }
      }

      setInforme({
        aplicado: aplicar,
        clientes: clientesSnap.size,
        facturas,
        correctas,
        corregidas: porCorregir.length,
        cerradas: porCorregir.filter((f) => f.cerrada).length,
      });
    } catch (fallo) {
      console.error("Error al sembrar la marca de cerrada:", fallo);
      setError(fallo.message || "No se pudo completar");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Marcar facturas cerradas
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Herramienta temporal. Revisá primero: eso no escribe nada, solo cuenta
        cuántas facturas les falta la marca. Después aplicá.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          disabled={trabajando}
          onClick={() => recorrer(false)}
        >
          Revisar
        </Button>
        <Button
          variant="contained"
          disabled={trabajando}
          onClick={() => recorrer(true)}
        >
          Aplicar
        </Button>
      </Stack>

      {trabajando && <Typography>Recorriendo...</Typography>}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {informe && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {informe.aplicado ? "Listo" : "Revisión (no se escribió nada)"}
          </Typography>
          <Typography variant="body2">
            Clientes: {informe.clientes}
          </Typography>
          <Typography variant="body2">
            Facturas encontradas: {informe.facturas}
          </Typography>
          <Typography variant="body2">
            Ya estaban bien: {informe.correctas}
          </Typography>
          <Typography variant="body2">
            {informe.aplicado ? "Corregidas" : "Por corregir"}:{" "}
            {informe.corregidas} ({informe.cerradas} quedan como cerradas)
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
