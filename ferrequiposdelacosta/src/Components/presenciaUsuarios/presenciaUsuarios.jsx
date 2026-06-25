import { ref, set, onDisconnect } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";

export const registrarConexion = async (uid) => {
  const userRef = ref(database, `usuariosConectados/${uid}`);

  await set(userRef, {
    online: true,
    timestamp: Date.now(),
  });

  await onDisconnect(userRef).set({
    online: false,
    timestamp: Date.now(),
  });
};
