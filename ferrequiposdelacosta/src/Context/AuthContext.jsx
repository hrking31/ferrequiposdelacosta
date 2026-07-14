import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { auth, db } from "../Components/Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
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
import { applyIfAvailable } from "../pwaUpdate.js";

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const detenerPresenciaRef = useRef(null);

  const detenerPresencia = () => {
    if (detenerPresenciaRef.current) {
      detenerPresenciaRef.current();
      detenerPresenciaRef.current = null;
    }
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // punto de corte natural: si ya había una actualización esperando,
    // se aprovecha el propio login para aplicarla
    applyIfAvailable();
    return result;
  };

  const logout = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const profile = userDoc.data();

            const fullUserData = {
              uid: currentUser.uid,
              email: currentUser.email,
              name: profile.name || "",
              genero: profile.genero || "",
              role: profile.role || "",
              permisos: profile.permisos || [],
              photoURL: profile.photoURL || currentUser.photoURL || null,
            };

            detenerPresencia();
            detenerPresenciaRef.current = registrarConexion(currentUser.uid);

            setUser(fullUserData);
            dispatch(setUserData(fullUserData));
          } else {
            setUser(currentUser);
          }
        } else {
          detenerPresencia();
          setUser(null);
          dispatch(clearUserData());
        }
      } catch (error) {
        console.error("Error cargando perfil del usuario:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
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
