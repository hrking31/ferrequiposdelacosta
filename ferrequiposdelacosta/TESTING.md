# Plan de pruebas (testing) — Ferrequipos de la Costa

Documento vivo para inventariar las funciones de la app e ir marcando cuáles ya
tienen prueba automatizada. Se marca `- [x]` cuando la función queda cubierta.

## Cómo se corre

- `npm test` — corre las pruebas y se queda observando (re-corre al guardar).
- `npm run test:run` — corre todo una vez y termina (para CI o revisión rápida).
- `npm run test:coverage` — informe de cobertura (qué % del código está probado).

Herramientas: **Vitest** (motor) + **React Testing Library** (componentes) +
**jsdom** (navegador simulado). Configuración en `vite.config.js` (sección
`test`) y `src/test/setup.js`.

Convención: cada prueba vive **junto al archivo** que prueba, con el mismo
nombre y sufijo `.test` (ej. `formato.js` → `formato.test.js`).

## Estrategia (orden de trabajo)

De lo más valioso y estable a lo más frágil:

1. **Fase 1 — Lógica pura**: funciones que reciben datos y devuelven datos
   (cálculos de facturas, formato, roles) y los *slices* de Redux. ← ✅ COMPLETA
2. **Fase 2 — Componentes clave**: formularios y validaciones.
3. **Fase 3 — Resto de componentes**.
4. **(Futuro) Flujos completos** con Cypress/Playwright (fuera de Vitest).

---

## Fase 1 — Lógica pura

### ✅ src/Utils/formato.js — 8/8 · pruebas en `formato.test.js`
- [x] `formatearMoneda(valor)` — importe en pesos "$ 1.234.567"; los no-números cuentan como 0
- [x] `formatearMonedaOVacio(valor)` — igual, pero devuelve `null` si no es número (campos opcionales)
- [x] `formatearMonedaInput(valor)` — agrupa miles mientras se escribe; "" para vacío o 0
- [x] `limpiarMonedaInput(texto)` — deja solo los dígitos
- [x] `formatearNit(nit)` — NIT con puntos de miles ("900.427.333")
- [x] `limpiarNit(texto)` — NIT pelado (dígitos y guion, máx 11)
- [x] `formatearFechaLegible(fechaIso)` — AAAA-MM-DD → DD/MM/AAAA
- [x] `formatearHoraLegible(horaHHMM)` — HH:MM (24h) → "2:30 p. m."

### ✅ src/Components/ClienteDetalle/facturaUtils.js — 28/28 · pruebas en `facturaUtils.test.js`
Fechas y días:
- [x] `obtenerFechaHoyBogota()` — fecha de hoy en Colombia (AAAA-MM-DD)
- [x] `obtenerFechaInicialEfectiva()` — regla de las 3pm (arranca hoy / mañana)
- [x] `calcularFechaDevolucion(fechaIso, dias)` — despacho + días − 1
- [x] `calcularVencimiento(fechaIso, dias)` — suma días completos (ampliar plazo)
- [x] `diferenciaEnDias(desdeIso, hastaIso)` — días calendario entre dos fechas

Cantidades y devoluciones:
- [x] `calcularCantidadPendiente(equipo)` — unidades sin devolver (nunca < 0)
- [x] `equipoDevueltoCompleto(equipo)` — true si no queda nada pendiente

Pagos y abonos:
- [x] `normalizarPagos(pagos, modoPagoLegado, montoLegado)` — unifica formato viejo/nuevo
- [x] `sumarAbonos(abonos)` — suma los montos de los abonos
- [x] `separarExcedentePago(pagos, total)` — recorta el sobrante y lo aísla
- [x] `sumarPagosFactura(factura)` — pago del alta + pagos de equipos agregados

Cuenta de factura y cliente:
- [x] `calcularEstadoCuenta(factura, totalMostrado)` — total/abonos/pagado/saldo (para formularios)
- [x] `calcularCuentaFactura(factura, hoyIso)` — cuenta como se MUESTRA (con ampliación)
- [x] `calcularSaldoConAbonos(factura, abonos)` — saldo crudo (sin ampliación)
- [x] `calcularCuentaCliente(facturas, hoyIso)` — resumen NETO del cliente

Ampliaciones de plazo:
- [x] `obtenerAmpliaciones(equipo)` — lista de ampliaciones (3 formatos históricos)
- [x] `obtenerHistorialVencimientos(equipo)` — fechas anteriores del equipo
- [x] `calcularAmpliacionEquipo(equipo, hoyIso)` — días/bruto/descuento/neto de un equipo
- [x] `calcularAmpliacionFactura(factura, hoyIso)` — lo anterior por factura, con IVA

Reparto de un abono:
- [x] `ordenarFacturasConSaldo(facturas, hoyIso)` — facturas con saldo, mayor a menor
- [x] `repartirEntreFacturas(facturasConSaldo, monto)` — reparte el abono entre ellas

Estados:
- [x] `calcularEstadoFactura(factura, hoyIso)` — pendiente/activa/vencida/cobro/finalizada
- [x] `calcularEstadoCliente(facturas, hoyIso)` — el estado más urgente del cliente

Gestión (seguimiento):
- [x] `obtenerGestiones(factura)` — línea de tiempo de gestiones
- [x] `contarLlamadasSinRespuesta(factura)` — cuántas llamadas sin contestar
- [x] `calcularGestionFactura(factura, estado)` — la gestión vigente
- [x] `facturaEnSeguimiento(factura, hoyIso)` — true si está vencida o en cobro
- [x] `etiquetaVencimiento(indice)` — "1er vencimiento", "2do vencimiento"…

Pendientes de este módulo (menor prioridad):
- [ ] `obtenerHoraBogotaHHMM()` — hora de Colombia HH:MM (solo formato)
- [ ] `crearRegistroGestion(tipo, datos)` — sella un registro con fecha/hora
- [ ] `agruparLotesAgregados(equipos)` — agrupa equipos agregados en lotes
- Constantes (`MODOS_PAGO`, `ESTADO_FACTURA_INFO`, etc.): son datos, no requieren prueba.

### ✅ src/Components/RolesPermisos/RolesPermisos.jsx — pruebas en `RolesPermisos.test.js`
- [x] Invariantes del mapa de permisos (las mismas que replican las reglas de Firestore):
  solo el admin gestiona usuarios; gestorEditor = equipos; gestorFacturacion = clientes/cartera;
  gestorIntegral = ambos sin usuarios; el admin incluye todo lo de los demás.

### ✅ Redux slices — src/Store/Slices/ — 11/11 · cada uno con su `.test.js`
Reducers probados como funciones puras (`reducer(estado, acción)`):
- [x] cartSlice.js — agregar/quitar/actualizar líneas, variantes, vaciar
- [x] clienteSlice.js — set/actualizar cliente y dirección, limpiar
- [x] cotizacionSlice.js — cotización en curso + persistencia en localStorage
- [x] cuentacobroSlice.js — cuenta de cobro + persistencia en localStorage
- [x] detailSlice.js — reducers del detalle (el thunk de Firestore queda fuera)
- [x] equiposSlice.js — fases del thunk fetchEquiposData (pending/fulfilled/rejected)
- [x] searchSlice.js — fases de fetchEquipos + limpiar búsqueda
- [x] userSlice.js — merge de datos y limpieza (login/logout)
- [x] presenciaSlice.js — mapa de usuarios en línea
- [x] installAppSlice.js — mostrar/ocultar aviso de instalación
- [x] passwordSlice.js — alternar visibilidad de la contraseña

### ✅ Hooks — src/Hooks/, src/Theme/, src/Context/ — con `renderHook`
- [x] useSnackbar.js — abrir/cerrar avisos, severidad por defecto
- [x] useColorMode.js — lee el ColorModeContext (probado con Provider)
- [x] useAuth.js — lee el authContext (probado con Provider)

---

## Fase 2 — Componentes clave (formularios y validaciones)

### El andamiaje (hecho el 2026-08-19)

Ninguna pantalla se dibuja sola: leen el estado, saben en qué ruta están y
toman colores del tema. Eso vive en **`src/test/utils.jsx`**:

- **`renderConProviders(ui, opciones)`** — envuelve en Redux + Router + tema, en
  el mismo orden de `main.jsx` (el tema lee la ruta para forzar el oscuro del
  kiosco, así que va por dentro del Router). Acepta `ruta` y `estadoInicial`, y
  devuelve `store` y `usuario` (userEvent, que teclea y hace clic como una
  persona en vez de empujar valores).
- **`crearStore()`** en `Store.js` — cada prueba arma su propio estado y arranca
  de cero, del mismo mapa de reducers que usa la app.
- **`window.matchMedia`** en `setup.js` — jsdom no lo trae y el tema lo consulta
  al arrancar; sin eso no se dibuja ninguna pantalla.

**Al probar un componente con Firebase**, se reemplaza el módulo por un doble
(`vi.mock("firebase/firestore")`) donde `doc`/`collection` devuelven la ruta
como texto: la prueba no toca la base, pero afirma **a qué documento** se
escribió y **qué** se escribió.

**Trampas ya pagadas, para no repetirlas:**

1. En un `Select` de MUI, `getByLabelText` encuentra **dos** elementos (el input
   oculto y el combobox) y falla. Va `getByRole("combobox", { name })` y después
   `findByRole("option", { name })`.
2. Un campo **obligatorio** lleva un `*` pegado al texto de la etiqueta, así que
   `getByLabelText("Contraseña")` no lo encuentra: hay que buscarlo por
   coincidencia parcial (`/Contraseña/`).
3. Textos que se repiten: el título dice "2 facturas con saldo" y el rótulo de
   la sección "Facturas con saldo". Una expresión floja matchea los dos; hay que
   anclarla.
4. Botones cuyo nombre cambia según el modo (`Crear Factura` / `Guardar
   Cambios`): buscarlos por los dos.
5. **Ojo con las pruebas que pasan sin comprobar nada.** Un `filter` que no
   encuentra nada devuelve una lista vacía, y `.some(...)` sobre vacío es
   `false`: la prueba pasa siempre. Pasó buscando un `aria-label` que no
   existía. Cuando se afirma que algo está bloqueado, probar **también** el caso
   en que debe estar habilitado.

### ✅ BuscadorFiltro — 5 pruebas · `BuscadorFiltro.test.jsx`
- [x] Muestra el texto y la indicación que le pasan
- [x] Avisa letra por letra mientras se escribe (filtra en vivo, no con Enter)
- [x] La X solo aparece cuando hay algo escrito
- [x] Tocar la X avisa que quedó vacío

### ✅ AbonoDialog — 6 pruebas · `AbonoDialog.test.jsx`
- [x] Dice cuántas facturas con saldo hay y las lista
- [x] Avisa cuando el cliente no debe nada, en vez de una lista vacía
- [x] Muestra el reparto antes de guardar: salda la que más debe y pasa el resto
- [x] No deja guardar sin medio de pago ni valor, y no escribe nada
- [x] Guarda en cada factura la parte que le tocó
- [x] Conserva los abonos que la factura ya tenía en vez de pisarlos

### ✅ ClienteFormDialog — 13 pruebas · `ClienteFormDialog.test.jsx`
- [x] Persona pide nombres/apellido/cédula; empresa cambia a razón social/NIT
- [x] No guarda una persona sin nombre ni una empresa sin razón social
- [x] Teléfono de menos de 7 dígitos no pasa; descarta letras al escribir
- [x] El alta guarda sin espacios de más y con estado `inactivo`
- [x] Empresa no arrastra los campos de persona, ni al revés
- [x] Editar actualiza al cliente existente en vez de crear otro
- [x] Eliminar solo aparece en edición
- [x] Antes de borrar dice cuántas facturas se lleva por delante
- [x] Al confirmar, borra facturas y cliente en una sola operación

### ✅ FacturaFormDialog — 8 pruebas · `FacturaFormDialog.test.jsx`
- [x] No deja guardar sin número de factura ni sin equipos
- [x] Dice campo por campo qué le falta a un equipo a medio llenar
- [x] Al crear: calcula la entrega (despacho + días − 1), el subtotal, nace con
      `cerrada: false` y actualiza el estado del cliente, todo en una operación
- [x] **No** guarda saldo, estado ni pagado acumulado: solo los hechos
- [x] Editar actualiza la factura existente en vez de crear otra
- [x] Lo entregado de más se guarda como **abono**, con los pagos recortados
      hasta cubrir el total
- [x] Un equipo con devolución registrada no se puede quitar; uno sin historia sí

### ✅ Login — 9 pruebas · `Login.test.jsx`
- [x] Al entrar bien pasa correo y contraseña tal cual y lleva al panel
- [x] Cierra el cartel si lo abrieron desde uno
- [x] Traduce cada código de Firebase a su frase en castellano (4 casos)
- [x] Si no entra, se queda donde está
- [x] El ojo muestra y vuelve a ocultar la contraseña

### Lo que sigue en esta fase
- [ ] `Register` — el alta de usuarios internos
- [ ] `CrearEquipos`
- [ ] `FacturaCard` / `EstadoCuentaFactura` — la tarjeta de una factura
- [ ] `ClienteSeguimientoCard` — la tarjeta de cartera y sus gestiones

## Fase 3 — Resto de componentes

El inventario del resto de los ~70 componentes `.jsx` se irá completando por
grupos.

---

_Última actualización (2026-08-19): **Fase 1 COMPLETA** y **Fase 2 en curso** —
andamiaje de render con providers + cinco pantallas probadas (BuscadorFiltro,
AbonoDialog, ClienteFormDialog, FacturaFormDialog y Login). **298 pruebas
pasando** en 32 archivos._
