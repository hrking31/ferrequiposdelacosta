import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import Login from "./Login";

// La puerta de entrada al panel. Lo que importa acá no es Firebase —eso lo
// resuelve el contexto de autenticación— sino lo que ve la persona: que al
// entrar bien la lleve al panel, y que cuando algo falla se le diga en
// castellano qué pasó, en vez del código en inglés que devuelve el servidor.
//
// El login se reemplaza por un doble: cada prueba decide si acepta o con qué
// error rechaza.
const entrar = ({
  login = vi.fn(),
  recuperarClave = vi.fn(),
  prepararSegundoPaso = vi.fn(() => "RESOLVER"),
  entrarConCodigo = vi.fn(() => Promise.resolve()),
  onClose,
} = {}) =>
  renderConProviders(
    <authContext.Provider
      value={{ login, recuperarClave, prepararSegundoPaso, entrarConCodigo }}
    >
      <Routes>
        <Route path="/" element={<Login onClose={onClose} />} />
        <Route path="/adminforms" element={<p>Panel de administración</p>} />
      </Routes>
    </authContext.Provider>,
  );

// Los campos son obligatorios, y MUI le agrega un "*" al texto de la
// etiqueta. Por eso se buscan por coincidencia parcial y no exacta.
const llenarYEntrar = async (usuario) => {
  await usuario.type(
    screen.getByLabelText(/Dirección de correo electrónico/),
    "aida@ferrequipos.com",
  );
  await usuario.type(screen.getByLabelText(/Contraseña/), "secreta123");
  await usuario.click(screen.getByRole("button", { name: "ACCESO" }));
};

describe("Login — cuando entra bien", () => {
  it("le pasa el correo y la contraseña tal cual, y lo lleva al panel", async () => {
    const login = vi.fn(() => Promise.resolve());
    const { usuario } = entrar({ login });

    await llenarYEntrar(usuario);

    expect(login).toHaveBeenCalledWith("aida@ferrequipos.com", "secreta123");
    expect(await screen.findByText("Panel de administración")).toBeInTheDocument();
  });

  it("cierra el cartel de login si lo abrieron desde uno", async () => {
    const alCerrar = vi.fn();
    const { usuario } = entrar({ login: vi.fn(() => Promise.resolve()), onClose: alCerrar });

    await llenarYEntrar(usuario);

    expect(alCerrar).toHaveBeenCalled();
  });
});

describe("Login — cuando falla, lo dice en castellano", () => {
  // Cada código que devuelve Firebase tiene su frase. Sin esta traducción, al
  // usuario le llegaría "auth/wrong-password".
  const casos = [
    ["auth/wrong-password", "Contraseña incorrecta"],
    ["auth/user-not-found", "Usuario no registrado"],
    ["auth/invalid-credential", "Correo o contraseña incorrectos"],
    ["auth/invalid-email", "Correo o contraseña incorrectos"],
    ["auth/network-request-failed", "Error al iniciar sesión. Inténtalo de nuevo."],
  ];

  it.each(casos)("con %s muestra: %s", async (codigo, mensaje) => {
    const login = vi.fn(() => Promise.reject(Object.assign(new Error("x"), { code: codigo })));
    const { usuario } = entrar({ login });

    await llenarYEntrar(usuario);

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  });

  it("si no entra, se queda donde está: no lo manda al panel", async () => {
    const login = vi.fn(() =>
      Promise.reject(Object.assign(new Error("x"), { code: "auth/wrong-password" })),
    );
    const { usuario } = entrar({ login });

    await llenarYEntrar(usuario);

    expect(await screen.findByText("Contraseña incorrecta")).toBeInTheDocument();
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });
});

describe("Login — el segundo paso (código del celular)", () => {
  const pideCodigo = () =>
    vi.fn(() =>
      Promise.reject(
        Object.assign(new Error("x"), { code: "auth/multi-factor-auth-required" }),
      ),
    );

  it("con la contraseña bien, pide el código en vez de entrar", async () => {
    const { usuario } = entrar({ login: pideCodigo() });

    await llenarYEntrar(usuario);

    expect(await screen.findByText("Código de su celular")).toBeInTheDocument();
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("con el código, entra al panel", async () => {
    const entrarConCodigo = vi.fn(() => Promise.resolve());
    const { usuario } = entrar({ login: pideCodigo(), entrarConCodigo });

    await llenarYEntrar(usuario);
    await usuario.type(await screen.findByLabelText(/Código de 6 números/), "123456");
    await usuario.click(screen.getByRole("button", { name: "ENTRAR" }));

    expect(entrarConCodigo).toHaveBeenCalledWith("RESOLVER", "123456");
    expect(await screen.findByText("Panel de administración")).toBeInTheDocument();
  });

  it("con un código equivocado, lo dice y deja intentar de nuevo", async () => {
    const entrarConCodigo = vi.fn(() =>
      Promise.reject(Object.assign(new Error("x"), { code: "auth/invalid-verification-code" })),
    );
    const { usuario } = entrar({ login: pideCodigo(), entrarConCodigo });

    await llenarYEntrar(usuario);
    await usuario.type(await screen.findByLabelText(/Código de 6 números/), "999999");
    await usuario.click(screen.getByRole("button", { name: "ENTRAR" }));

    expect(
      await screen.findByText("Código incorrecto. Escriba el que muestra ahora la aplicación."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de 6 números/)).toBeInTheDocument();
  });

  it("si se demoró mucho, vuelve a pedir la contraseña", async () => {
    const entrarConCodigo = vi.fn(() =>
      Promise.reject(Object.assign(new Error("x"), { code: "auth/totp-challenge-timeout" })),
    );
    const { usuario } = entrar({ login: pideCodigo(), entrarConCodigo });

    await llenarYEntrar(usuario);
    await usuario.type(await screen.findByLabelText(/Código de 6 números/), "123456");
    await usuario.click(screen.getByRole("button", { name: "ENTRAR" }));

    expect(
      await screen.findByText("Pasó mucho tiempo. Vuelva a escribir su contraseña."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACCESO" })).toBeInTheDocument();
  });
});

describe("Login — ¿Olvidó su contraseña?", () => {
  const ENVIADO =
    "Si el correo está registrado, le llegará un enlace para poner una contraseña nueva.";
  const olvido = (usuario) =>
    usuario.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));

  it("sin correo escrito, pide que lo escriba primero", async () => {
    const recuperarClave = vi.fn();
    const { usuario } = entrar({ recuperarClave });

    await olvido(usuario);

    expect(
      await screen.findByText("Escriba su correo arriba y vuelva a tocar «¿Olvidó su contraseña?»"),
    ).toBeInTheDocument();
    expect(recuperarClave).not.toHaveBeenCalled();
  });

  it("manda el enlace al correo escrito", async () => {
    const recuperarClave = vi.fn(() => Promise.resolve());
    const { usuario } = entrar({ recuperarClave });

    await usuario.type(
      screen.getByLabelText(/Dirección de correo electrónico/),
      "aida@ferrequipos.com",
    );
    await olvido(usuario);

    expect(recuperarClave).toHaveBeenCalledWith("aida@ferrequipos.com");
    expect(await screen.findByText(ENVIADO)).toBeInTheDocument();
  });

  it("si el correo no existe, dice lo mismo: no delata qué cuentas hay", async () => {
    const recuperarClave = vi.fn(() =>
      Promise.reject(Object.assign(new Error("x"), { code: "auth/user-not-found" })),
    );
    const { usuario } = entrar({ recuperarClave });

    await usuario.type(
      screen.getByLabelText(/Dirección de correo electrónico/),
      "nadie@ferrequipos.com",
    );
    await olvido(usuario);

    expect(await screen.findByText(ENVIADO)).toBeInTheDocument();
  });
});

describe("Login — el ojo de la contraseña", () => {
  it("la muestra y la vuelve a ocultar", async () => {
    const { usuario } = entrar();

    const campo = screen.getByLabelText(/Contraseña/);
    expect(campo).toHaveAttribute("type", "password");

    // El ojo es el único botón que no envía el formulario.
    const ojo = screen.getAllByRole("button").find((boton) => boton.type !== "submit");

    await usuario.click(ojo);
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute("type", "text");

    await usuario.click(ojo);
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute("type", "password");
  });
});
