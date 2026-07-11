import { ref, set, onValue, onDisconnect } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";

export const registrarConexion = (uid) => {
  const userRef = ref(database, `usuariosConectados/${uid}`);
  const connectedRef = ref(database, ".info/connected");

  return onValue(connectedRef, (snapshot) => {
    if (!snapshot.val()) return;

    onDisconnect(userRef)
      .set({
        online: false,
        timestamp: Date.now(),
      })
      .then(() =>
        set(userRef, {
          online: true,
          timestamp: Date.now(),
        }),
      )
      .catch((error) => {
        console.error(
          "Error crítico de seguridad en RTDB (Reglas bloqueadas):",
          error,
        );
      });
  });
};
