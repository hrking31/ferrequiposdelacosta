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
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { setUserData, clearUserData } from "../Store/Slices/userSlice";
import { setUsuariosConectados } from "../Store/Slices/presenciaSlice";
import { registrarConexion } from "../Components/presenciaUsuarios/presenciaUsuarios";
import { authContext } from "./useAuth";
import { anotarAparato, olvidarAparato } from "../Utils/aparatos";
import {
  empezarActivacion,
  entrarConCodigo,
  estadoDosPasos,
  prepararSegundoPaso,
  terminarActivacion,
} from "../Utils/dosPasos";

// CERRAR TODAS LAS SESIONES (2026-10-16). Cuando el administrador lo hace, el
// servidor deja en la ficha la hora (sesionesCerradasEn). Una sesión que se
// abrió ANTES de esa hora tiene que salir: la app la cierra en el momento.
const sesionCerradaDesdeAfuera = async (currentUser, profile) => {
  const cerradasEn = profile.sesionesCerradasEn?.toMillis?.();
  if (!cerradasEn) return false;
  const { authTime } = await currentUser.getIdTokenResult();
  return new Date(authTime).getTime() < cerradasEn;
};

// EL CARNÉ (2026-10-16). Las reglas leen el rol de la sesión (custom claims),
// no de la ficha users/{uid}. Si el carné no dice lo mismo que la ficha —un
// usuario de antes de esa fecha, o uno al que el administrador le acaba de
// cambiar el rol— el servidor lo reimprime y se pide el nuevo, ANTES de dejar
// pasar a la app: con el carné viejo las reglas lo frenarían.
//
// El carné también dice si el correo está confirmado, y las reglas lo exigen.
// Uno guardado de antes de confirmar puede seguir diciendo que no: se renueva.
//
// Si el servidor no responde, se sigue igual: mejor una app que arranca y
// quizá no puede leer algo, que una que deja a la persona afuera.
const ponerAlDiaElCarne = async (currentUser, role) => {
  try {
    const { claims } = await currentUser.getIdTokenResult();
    const rolAlDia = claims.role === role;
    const correoAlDia =
      !currentUser.emailVerified || claims.email_verified === true;
    if (rolAlDia && correoAlDia) return;

    if (!rolAlDia) await httpsCallable(functions, "sincronizarMiRol")();
    await currentUser.getIdToken(true);
  } catch (error) {
    console.error("No se pudo poner al día el carné de la sesión:", error);
  }
};

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Las reglas no dejan leer ni guardar nada sin el correo confirmado: hasta
  // entonces, las pantallas protegidas muestran la de confirmarlo.
  const [correoVerificado, setCorreoVerificado] = useState(false);
  // Si esta sesión entró con contraseña y código (ver Utils/dosPasos.js).
  const [dosPasos, setDosPasos] = useState("falta");
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

  // Los correos de Firebase (confirmar y recuperar la clave) en español.
  const recuperarClave = (email) => {
    auth.languageCode = "es";
    return sendPasswordResetEmail(auth, email);
  };

  const enviarVerificacion = () => {
    auth.languageCode = "es";
    return sendEmailVerification(auth.currentUser);
  };

  // Después de tocar el enlace del correo, la sesión abierta no se entera
  // sola: hay que releer la cuenta y pedir un carné que ya lo diga.
  const confirmarCorreo = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    await currentUser.reload();
    if (!currentUser.emailVerified) return false;
    await currentUser.getIdToken(true);
    setCorreoVerificado(true);
    return true;
  };

  // Activar los dos pasos desde VistaActivarDosPasos. Al terminar se pide un
  // carné nuevo y se mira si ya dice que entró con el segundo paso; si no, la
  // persona tiene que salir y volver a entrar (estado "reentrar").
  const activarDosPasos = {
    empezar: () => empezarActivacion(auth.currentUser),
    terminar: async (secreto, codigo) => {
      const currentUser = auth.currentUser;
      await terminarActivacion(currentUser, secreto, codigo);
      await currentUser.getIdToken(true);
      const estado = await estadoDosPasos(currentUser);
      setDosPasos(estado);
      return estado;
    },
  };

  const logout = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        detenerPerfil();
        detenerPresencia();

        try {
          await olvidarAparato(currentUser.uid);
        } catch (error) {
          console.error("No se pudo quitar el aparato de la lista:", error);
        }

        const userRef = ref(database, `usuariosConectados/${currentUser.uid}`);

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
        setCorreoVerificado(false);
        setDosPasos("falta");
        dispatch(clearUserData());
        setLoading(false);
        return;
      }

      setLoading(true);
      setCorreoVerificado(currentUser.emailVerified === true);

      // Lo guardado en el navegador puede ser de ANTES de tocar el enlace del
      // correo: al abrir la app (o recargar) se le pregunta a Firebase. Sin
      // esto, recargar no alcanzaba y había que tocar «Ya confirmé».
      if (!currentUser.emailVerified) {
        currentUser
          .reload()
          .then(async () => {
            if (!currentUser.emailVerified) return;
            await currentUser.getIdToken(true);
            setCorreoVerificado(true);
          })
          .catch((error) =>
            console.error("No se pudo revisar si confirmó el correo:", error),
          );
      }

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

              if (await sesionCerradaDesdeAfuera(currentUser, profile)) {
                detenerPerfil();
                detenerPresencia();
                try {
                  await set(ref(database, `usuariosConectados/${currentUser.uid}`), {
                    online: false,
                    timestamp: Date.now(),
                  });
                } catch {
                  // Puede que ya no tenga permiso: no importa, igual sale.
                }
                await signOut(auth);
                return;
              }

              await ponerAlDiaElCarne(currentUser, role);

              try {
                setDosPasos(await estadoDosPasos(currentUser));
              } catch (error) {
                console.error("No se pudo revisar los dos pasos:", error);
                setDosPasos("falta");
              }

              const fullUserData = {
                uid: currentUser.uid,
                email: currentUser.email,
                name: profile.name || "",
                genero: profile.genero || "",
                role,
                permisos: profile.permisos || [],
                photoURL: profile.photoURL || currentUser.photoURL || null,
              };

              // Lo que se hace una vez por entrada: la presencia y anotar este
              // aparato en la lista de sesiones abiertas.
              if (presenciaDeRef.current !== currentUser.uid) {
                detenerPresencia();
                detenerPresenciaRef.current = registrarConexion(currentUser.uid);
                presenciaDeRef.current = currentUser.uid;
                anotarAparato(currentUser.uid, { forzar: true }).catch((error) =>
                  console.error("No se pudo anotar el aparato:", error),
                );
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

  // Mientras se usa, el "último uso" del aparato se renueva al volver a la
  // pestaña (como mucho cada media hora, ver anotarAparato).
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      anotarAparato(uid).catch((error) =>
        console.error("No se pudo renovar el aparato:", error),
      );
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [uid]);

  return (
    <authContext.Provider
      value={{
        login,
        logout,
        user,
        loading,
        correoVerificado,
        confirmarCorreo,
        enviarVerificacion,
        recuperarClave,
        dosPasos,
        activarDosPasos,
        prepararSegundoPaso,
        entrarConCodigo,
      }}
    >
      {children}
    </authContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
