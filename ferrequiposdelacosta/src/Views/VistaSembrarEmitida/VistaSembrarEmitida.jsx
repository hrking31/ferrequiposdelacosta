// ⚠️  VISTA TEMPORAL — SE BORRA AL TERMINAR. No la enlaza ningún menú.
//
// Le pone el campo `emitida` a las cuentas de cobro que ya estaban guardadas
// antes de que ese campo existiera. Sin él, esas cuentas no aparecen en la
// consulta del recuadro del menú —que ahora pregunta por `emitida`— y el
// número del mes saldría más bajo del real.
//
// POR QUÉ ES UNA PANTALLA Y NO UN SCRIPT: en esta PC no se pueden crear
// claves de cuenta de servicio (lo bloquea una política de la organización),
// así que un script de Node con firebase-admin no es viable. Corriendo esto
// en localhost con la sesión del administrador, las reglas ya permiten leer
// y escribir, y no hace falta credencial alguna.
//
// Es el mismo patrón que se usó para migrar las cotizaciones a Firestore.
//
// CÓMO SE USA
//   1. npm run dev, entrar como administrador
//   2. ir a /vistasembraremitida a mano (no hay botón que lleve acá)
//   3. "Revisar" primero: no escribe nada, solo cuenta qué haría
//   4. "Marcar" para escribir
//   5. borrar esta carpeta y su ruta en App.jsx
//
// Correrla dos veces es inofensivo: saltea las que ya tienen el campo.
import { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { COLECCION } from "../../Components/CuentaDeCobro/cuentasCobroDb";

// Qué cuentas ya estaban emitidas, con la regla VIEJA —la que miraba el
// estado—. Es la única forma de saberlo en las guardadas de antes: no tienen
// el campo nuevo, así que hay que deducirlo de dónde quedaron.
//
// La segunda parte cubre a la que alguien tenga abierta justo ahora: su
// estado dice "enProceso" solo mientras dure esa sesión.
const seEmitio = (cuenta) =>
  cuenta.status === "creada" ||
  cuenta.status === "pagada" ||
  (cuenta.status === "enProceso" &&
    (cuenta.statusPrevio === "creada" || cuenta.statusPrevio === "pagada"));

export default function VistaSembrarEmitida() {
  const [trabajando, setTrabajando] = useState(false);
  const [informe, setInforme] = useState(null);
  const [error, setError] = useState("");

  const recorrer = async (escribir) => {
    setTrabajando(true);
    setError("");
    setInforme(null);

    try {
      const snap = await getDocs(collection(db, COLECCION));

      const total = snap.docs.length;
      // Las que hay que tocar: ya emitidas y todavía sin el campo.
      const aMarcar = snap.docs.filter((docSnap) => {
        const datos = docSnap.data();
        return datos.emitida !== true && seEmitio(datos);
      });
      const yaTenian = snap.docs.filter(
        (docSnap) => docSnap.data().emitida === true,
      ).length;

      if (escribir && aMarcar.length > 0) {
        // En tandas de 400: un batch de Firestore aguanta 500 operaciones.
        const TANDA = 400;
        for (let desde = 0; desde < aMarcar.length; desde += TANDA) {
          const batch = writeBatch(db);
          aMarcar.slice(desde, desde + TANDA).forEach((docSnap) => {
            batch.update(docSnap.ref, { emitida: true });
          });
          await batch.commit();
        }
      }

      setInforme({
        escribio: escribir,
        total,
        yaTenian,
        marcadas: aMarcar.length,
        borradores: total - yaTenian - aMarcar.length,
      });
    } catch (e) {
      console.error("Error al sembrar el campo emitida:", e);
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Sembrar el campo &quot;emitida&quot;
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Vista temporal. Le pone la marca de emitida a las cuentas de cobro
        guardadas antes de que ese campo existiera, para que el recuadro del
        menú las siga contando. Correrla dos veces no hace daño.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ my: 3 }}>
        <Button
          variant="outlined"
          disabled={trabajando}
          onClick={() => recorrer(false)}
        >
          Revisar (no escribe)
        </Button>
        <Button
          variant="contained"
          disabled={trabajando}
          onClick={() => recorrer(true)}
        >
          Marcar
        </Button>
      </Stack>

      {trabajando && <Typography>Trabajando…</Typography>}

      {error && (
        <Typography color="error">
          Error: {error}
        </Typography>
      )}

      {informe && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight="bold" gutterBottom>
            {informe.escribio ? "Listo, ya se escribió" : "Solo revisión"}
          </Typography>
          <Typography variant="body2">
            Cuentas en total: {informe.total}
          </Typography>
          <Typography variant="body2">
            Ya tenían la marca: {informe.yaTenian}
          </Typography>
          <Typography variant="body2">
            {informe.escribio ? "Marcadas ahora" : "Faltan marcar"}:{" "}
            {informe.marcadas}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Borradores (no se tocan): {informe.borradores}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
