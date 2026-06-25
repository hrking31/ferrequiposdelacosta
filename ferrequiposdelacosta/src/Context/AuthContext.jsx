import { createContext, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { auth, db } from "../Components/Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
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
    await signOut(auth);
    dispatch(clearUserData());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // console.log("AUTH STATE:", currentUser ? currentUser.uid : null);
      // console.log("AUTH USER:", currentUser?.email);
      // console.log("REDUX USER:", user);
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
            console.log("currentUser", currentUser);
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
    const usuariosRef = ref(database, "usuariosConectados");

    const unsubscribe = onValue(usuariosRef, (snapshot) => {
      dispatch(setUsuariosConectados(snapshot.val() || {}));
    });

    return () => unsubscribe();
  }, [dispatch]);

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
