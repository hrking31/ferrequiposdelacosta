import { createContext, useContext, useEffect, useState } from "react";
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

export const authContext = createContext();

export const useAuth = () => {
  const context = useContext(authContext);
  return context;
};

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
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

            await registrarConexion(currentUser.uid);

            setUser(fullUserData);
            dispatch(setUserData(fullUserData));
          } else {
            setUser(currentUser);
          }
        } else {
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

    return () => unsubscribe();
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
  }, [dispatch, user?.uid]);

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
