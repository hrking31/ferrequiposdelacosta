import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { auth, db, functions } from "../Components/Firebase/Firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { onValue, ref, set } from "firebase/database";
import { database } from "../Components/Firebase/Firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { setUserData, clearUserData } from "../Store/Slices/userSlice";
import { setUsuariosConectados } from "../Store/Slices/presenciaSlice";
import { registrarConexion } from "../Components/presenciaUsuarios/presenciaUsuarios";
import { authContext } from "./useAuth";

// EL CARNÉ (2026-10-16). Las reglas leen el rol de la sesión (custom claims),
// no de la ficha users/{uid}. Si el carné no dice lo mismo que la ficha —un
// usuario de antes de esa fecha, o uno al que el administrador le acaba de
// cambiar el rol— el servidor lo reimprime y se pide el nuevo, ANTES de dejar
// pasar a la app: con el carné viejo las reglas lo frenarían.
//
// Si el servidor no responde, se sigue igual: mejor una app que arranca y
// quizá no puede leer algo, que una que deja a la persona afuera.
const ponerAlDiaElCarne = async (currentUser, role) => {
  try {
    const { claims } = await currentUser.getIdTokenResult();
    if (claims.role === role) return;
    await httpsCallable(functions, "sincronizarMiRol")();
    await currentUser.getIdToken(true);
  } catch (error) {
    console.error("No se pudo poner al día el carné de la sesión:", error);
  }
};

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const detenerPresenciaRef = useRef(null);
  const presenciaDeRef = useRef(null);
  const detenerPerfilRef = useRef(null);
  const ultimoPerfilRef = useRef("");

  const detenerPresencia = () => {
    if (detenerPresenciaRef.current) {
      detenerPresenciaRef.current();
      detenerPresenciaRef.current = null;
    }
    presenciaDeRef.current = null;
  };

  const detenerPerfil = () => {
    if (detenerPerfilRef.current) {
      detenerPerfilRef.current();
      detenerPerfilRef.current = null;
    }
    ultimoPerfilRef.current = "";
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        detenerPerfil();
        detenerPresencia();

        const userRef = ref(database, `usuariosConectados/${user.uid}`);

        await set(userRef, {
          online: false,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error al marcar como offline en RTDB:", error);
    } finally {
      await signOut(auth);
      setUser(null);
      dispatch(clearUserData());
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      detenerPerfil();

      if (!currentUser) {
        detenerPresencia();
        setUser(null);
        dispatch(clearUserData());
        setLoading(false);
        return;
      }

      setLoading(true);

      // La ficha se ESCUCHA, no se lee una sola vez: si el administrador le
      // cambia el rol a quien tiene la app abierta, el carné y los botones se
      // ponen al día en el momento, sin recargar.
      detenerPerfilRef.current = onSnapshot(
        doc(db, "users", currentUser.uid),
        async (userDoc) => {
          try {
            if (userDoc.exists()) {
              const profile = userDoc.data();
              const role = profile.role || "";

              await ponerAlDiaElCarne(currentUser, role);

              const fullUserData = {
                uid: currentUser.uid,
                email: currentUser.email,
                name: profile.name || "",
                genero: profile.genero || "",
                role,
                permisos: profile.permisos || [],
                photoURL: profile.photoURL || currentUser.photoURL || null,
              };

              if (presenciaDeRef.current !== currentUser.uid) {
                detenerPresencia();
                detenerPresenciaRef.current = registrarConexion(currentUser.uid);
                presenciaDeRef.current = currentUser.uid;
              }

              // La ficha también cambia por cosas que la app no muestra (los
              // aparatos de los avisos): solo se avisa si cambió algo visible.
              const huella = JSON.stringify(fullUserData);
              if (huella !== ultimoPerfilRef.current) {
                ultimoPerfilRef.current = huella;
                setUser(fullUserData);
                dispatch(setUserData(fullUserData));
              }
            } else {
              setUser(currentUser);
            }
          } catch (error) {
            console.error("Error cargando perfil del usuario:", error);
            setUser(null);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error escuchando el perfil del usuario:", error);
          setUser(null);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribe();
      detenerPerfil();
      detenerPresencia();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!user || !user.uid) {
      dispatch(setUsuariosConectados({}));
      return;
    }
    const usuariosRef = ref(database, "usuariosConectados");

    const unsubscribe = onValue(usuariosRef, (snapshot) => {
      if (snapshot.exists()) {
        dispatch(setUsuariosConectados(snapshot.val()));
      } else {
        dispatch(setUsuariosConectados({}));
      }
    });

    return () => unsubscribe();
  }, [dispatch, user]);

  return (
    <authContext.Provider
      value={{
        login,
        logout,
        user,
        loading,
      }}
    >
      {children}
    </authContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
