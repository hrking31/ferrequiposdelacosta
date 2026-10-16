import { render, screen, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../Store/Slices/userSlice";
import presenciaReducer from "../Store/Slices/presenciaSlice";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

// EL CARNÉ DE LA SESIÓN. Las reglas leen el rol del carné, no de la ficha del
// usuario. Al abrir la app, si el carné no dice lo mismo que la ficha, hay que
// pedirle al servidor que lo reimprima y renovarlo ANTES de dejar pasar: con el
// carné viejo, las reglas lo frenarían en la primera pantalla.
const nube = vi.hoisted(() => ({
  alCambiarSesion: null,
  alCambiarFicha: null,
  sincronizarMiRol: vi.fn(() => Promise.resolve({ data: { cambio: true } })),
  renovar: vi.fn(() => Promise.resolve("carné-nuevo")),
  anotarAparato: vi.fn(() => Promise.resolve()),
  salir: vi.fn(() => Promise.resolve()),
  carne: {},
  // Cuándo inició sesión este aparato.
  entroEn: "2026-10-16T08:00:00Z",
}));

vi.mock("../Components/Firebase/Firebase", () => ({
  auth: {},
  db: {},
  functions: {},
  database: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, cb) => {
    nube.alCambiarSesion = cb;
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: nube.salir,
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  onSnapshot: (_ref, cb) => {
    nube.alCambiarFicha = cb;
    return () => {};
  },
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => nube.sincronizarMiRol,
}));

vi.mock("firebase/database", () => ({
  ref: () => ({}),
  set: vi.fn(),
  onValue: () => () => {},
}));

vi.mock("../Components/presenciaUsuarios/presenciaUsuarios", () => ({
  registrarConexion: () => () => {},
}));

vi.mock("../Utils/aparatos", () => ({
  anotarAparato: nube.anotarAparato,
  olvidarAparato: vi.fn(() => Promise.resolve()),
}));

const usuarioDeSesion = {
  uid: "u1",
  email: "aida@ferrequipos.com",
  photoURL: null,
  getIdTokenResult: () =>
    Promise.resolve({ claims: nube.carne, authTime: nube.entroEn }),
  getIdToken: nube.renovar,
  // Por defecto, al preguntarle a Firebase no cambia nada.
  reload: vi.fn(() => Promise.resolve()),
};

const ficha = (datos) => ({ exists: () => true, data: () => datos });

function QuienSoy() {
  const { user, loading, correoVerificado } = useAuth();
  if (loading) return <p>cargando</p>;
  return (
    <>
      <p>{user ? `rol: ${user.role}` : "sin sesión"}</p>
      <p>{correoVerificado ? "correo confirmado" : "correo sin confirmar"}</p>
    </>
  );
}

const montar = () => {
  const store = configureStore({
    reducer: { user: userReducer, presence: presenciaReducer },
  });
  render(
    <Provider store={store}>
      <AuthProvider>
        <QuienSoy />
      </AuthProvider>
    </Provider>,
  );
  return store;
};

const entrar = async (datosFicha) => {
  await act(async () => nube.alCambiarSesion(usuarioDeSesion));
  await act(async () => nube.alCambiarFicha(ficha(datosFicha)));
};

beforeEach(() => {
  vi.clearAllMocks();
  nube.carne = {};
});

describe("AuthContext — el carné de la sesión", () => {
  it("si el carné ya dice el rol de la ficha, no molesta al servidor", async () => {
    nube.carne = { role: "gestorEditor" };
    montar();
    await entrar({ name: "Aida", role: "gestorEditor" });

    expect(await screen.findByText("rol: gestorEditor")).toBeInTheDocument();
    expect(nube.sincronizarMiRol).not.toHaveBeenCalled();
    expect(nube.renovar).not.toHaveBeenCalled();
  });

  it("un usuario de antes, sin rol en el carné, recibe el suyo antes de pasar", async () => {
    montar();
    await entrar({ name: "Aida", role: "gestorFacturacion" });

    expect(await screen.findByText("rol: gestorFacturacion")).toBeInTheDocument();
    expect(nube.sincronizarMiRol).toHaveBeenCalledTimes(1);
    // true = pedir el carné nuevo, no el que estaba guardado.
    expect(nube.renovar).toHaveBeenCalledWith(true);
  });

  it("si le cambian el rol con la app abierta, se pone al día sin recargar", async () => {
    nube.carne = { role: "gestorEditor" };
    const store = montar();
    await entrar({ name: "Aida", role: "gestorEditor" });
    await screen.findByText("rol: gestorEditor");

    // El administrador la pasa a integral: la ficha cambia y llega sola.
    await act(async () =>
      nube.alCambiarFicha(ficha({ name: "Aida", role: "gestorIntegral" })),
    );

    expect(await screen.findByText("rol: gestorIntegral")).toBeInTheDocument();
    expect(nube.sincronizarMiRol).toHaveBeenCalledTimes(1);
    expect(nube.renovar).toHaveBeenCalledWith(true);
    expect(store.getState().user.role).toBe("gestorIntegral");
  });

  it("si confirmó el correo pero su carné guardado no lo dice, lo renueva", async () => {
    // Las reglas exigen el correo confirmado y lo leen del carné: uno guardado
    // de antes de confirmar las haría fallar aunque la cuenta ya esté bien.
    nube.carne = { role: "gestorEditor", email_verified: false };
    usuarioDeSesion.emailVerified = true;
    montar();
    await entrar({ name: "Aida", role: "gestorEditor" });

    await screen.findByText("rol: gestorEditor");
    expect(nube.renovar).toHaveBeenCalledWith(true);
    // El rol ya estaba bien: no hace falta molestar al servidor.
    expect(nube.sincronizarMiRol).not.toHaveBeenCalled();
    delete usuarioDeSesion.emailVerified;
  });

  it("al entrar, anota este aparato en la lista de sesiones abiertas", async () => {
    nube.carne = { role: "gestorEditor" };
    montar();
    await entrar({ name: "Aida", role: "gestorEditor" });

    await screen.findByText("rol: gestorEditor");
    expect(nube.anotarAparato).toHaveBeenCalledWith("u1", { forzar: true });
  });
});

describe("AuthContext — el correo confirmado al recargar", () => {
  it("si confirmó en otra pestaña, al recargar se entera solo", async () => {
    // Lo guardado en el navegador dice "sin confirmar", pero Firebase ya lo
    // tiene confirmado: así le pasó al dueño el 2026-10-16 con F5.
    nube.carne = { role: "administrador" };
    usuarioDeSesion.emailVerified = false;
    usuarioDeSesion.reload.mockImplementationOnce(() => {
      usuarioDeSesion.emailVerified = true;
      return Promise.resolve();
    });
    montar();
    await entrar({ name: "Hernando", role: "administrador" });

    expect(await screen.findByText("correo confirmado")).toBeInTheDocument();
    expect(nube.renovar).toHaveBeenCalledWith(true);
    delete usuarioDeSesion.emailVerified;
  });

  it("si de verdad no confirmó, sigue pidiéndolo", async () => {
    nube.carne = { role: "administrador" };
    usuarioDeSesion.emailVerified = false;
    montar();
    await entrar({ name: "Hernando", role: "administrador" });

    await screen.findByText("rol: administrador");
    expect(screen.getByText("correo sin confirmar")).toBeInTheDocument();
    delete usuarioDeSesion.emailVerified;
  });
});

describe("AuthContext — cerrar todas las sesiones", () => {
  const horaDelCierre = (iso) => ({ toMillis: () => new Date(iso).getTime() });

  it("si el administrador las cerró después de que entró, sale en el momento", async () => {
    nube.carne = { role: "gestorEditor" };
    montar();
    await entrar({
      name: "Aida",
      role: "gestorEditor",
      sesionesCerradasEn: horaDelCierre("2026-10-16T10:00:00Z"),
    });

    await waitFor(() => expect(nube.salir).toHaveBeenCalled());
    expect(screen.queryByText("rol: gestorEditor")).not.toBeInTheDocument();
  });

  it("si volvió a entrar después del cierre, sigue normal", async () => {
    nube.carne = { role: "gestorEditor" };
    nube.entroEn = "2026-10-16T11:00:00Z";
    montar();
    await entrar({
      name: "Aida",
      role: "gestorEditor",
      sesionesCerradasEn: horaDelCierre("2026-10-16T10:00:00Z"),
    });

    expect(await screen.findByText("rol: gestorEditor")).toBeInTheDocument();
    expect(nube.salir).not.toHaveBeenCalled();
    nube.entroEn = "2026-10-16T08:00:00Z";
  });
});

describe("AuthContext — cuando algo falla", () => {
  it("si el servidor no responde, la app arranca igual", async () => {
    nube.sincronizarMiRol.mockRejectedValueOnce(new Error("sin conexión"));
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    montar();
    await entrar({ name: "Aida", role: "administrador" });

    await waitFor(() =>
      expect(screen.getByText("rol: administrador")).toBeInTheDocument(),
    );
    consola.mockRestore();
  });
});
