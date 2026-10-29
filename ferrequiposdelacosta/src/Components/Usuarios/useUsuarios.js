import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase/Firebase";

// EL PERSONAL, para la pantalla de Usuarios: cada ficha de `users` con los
// aparatos donde tiene la sesión abierta (users/{uid}/aparatos), el más
// reciente arriba. Se lee al abrir la pantalla y otra vez con `recargar`
// (después de crear, guardar, eliminar o cerrar una sesión).
//
// `cargando` vale también al recargar; la vista muestra el logo solo si
// todavía no hay nadie en la lista.
export default function useUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const fichas = await getDocs(collection(db, "users"));
      const conAparatos = await Promise.all(
        fichas.docs.map(async (ficha) => {
          const usuario = { id: ficha.id, ...ficha.data() };
          // Si los aparatos no se pueden leer, la persona se muestra igual.
          try {
            const aparatos = await getDocs(collection(db, "users", ficha.id, "aparatos"));
            usuario.aparatos = aparatos.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort(
                (a, b) => (b.ultimoUso?.toMillis?.() ?? 0) - (a.ultimoUso?.toMillis?.() ?? 0),
              );
          } catch (errorAparatos) {
            console.error("No se pudieron leer los aparatos:", errorAparatos);
            usuario.aparatos = [];
          }
          return usuario;
        }),
      );
      setUsuarios(conAparatos);
      setError(false);
    } catch (errorUsuarios) {
      console.error("Error al obtener los usuarios:", errorUsuarios);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { usuarios, cargando, error, recargar };
}
