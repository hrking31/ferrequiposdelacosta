// import { createContext, useContext, useEffect, useState } from "react";
// import { auth } from "../Components/Firebase/Firebase";
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   onAuthStateChanged,
//   signOut,
// } from "firebase/auth";

// export const authContext = createContext();

// export const useAuth = () => {
//   const context = useContext(authContext);
//   return context;
// };

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const signup = (email, password) =>
//     createUserWithEmailAndPassword(auth, email, password);

//   const login = async (email, password) =>
//     signInWithEmailAndPassword(auth, email, password);

//   const logout = () => signOut(auth);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   return (
//     <authContext.Provider value={{ signup, login, user, logout, loading }}>
//       {children}
//     </authContext.Provider>
//   );
// }

import { createContext, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { auth, db } from "../Components/Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { setUserData, clearUserData } from "../Store/Slices/userSlice";

export const authContext = createContext();

export const useAuth = () => {
  const context = useContext(authContext);
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const dispatch = useDispatch();

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    await signOut(auth);
    dispatch(clearUserData());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);

          const userRef = doc(db, "users", currentUser.uid);

          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const profile = userDoc.data();

            dispatch(
              setUserData({
                uid: currentUser.uid,
                email: currentUser.email,
                name: profile.name || "",
                genero: profile.genero || "",
                role: profile.role || "",
                permisos: profile.permisos || [],
              }),
            );
          }
        } else {
          setUser(null);
          dispatch(clearUserData());
        }
      } catch (error) {
        console.error("Error cargando perfil del usuario:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <authContext.Provider
      value={{
        signup,
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