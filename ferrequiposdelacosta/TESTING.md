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
2. **Fase 2 — Componentes clave**: formularios y validaciones. ← ✅ COMPLETA
3. **Fase 3 — Resto de componentes**. ← ✅ COMPLETA (con criterio: ver abajo)
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

### ✅ Register — 7 pruebas · `Register.test.jsx`
- [x] No crea la cuenta sin nombre, con correo incompleto, con contraseña de
      menos de 6 o sin rol
- [x] Adjunta los permisos que salen del **mapa de roles**, no de una lista suelta
- [x] Deja el formulario limpio para cargar al siguiente
- [x] "El correo ya está registrado" en vez del código de Firebase

### ✅ CrearEquipos — 6 pruebas · `CrearEquipos.test.jsx`
- [x] Exige nombre, descripción y al menos una foto
- [x] Sube la imagen a Storage y guarda su dirección en el equipo
- [x] Guarda `nameLowerCase` (sin él el equipo no aparece al buscarlo)
- [x] Refresca el catálogo, que vive en memoria
- [x] Guarda las variantes y no repite las iguales
- [x] Si falla la subida, avisa y **no** guarda un equipo sin imagen

### ✅ FacturaCard — 9 pruebas · `FacturaCard.test.jsx`
- [x] Muestra de qué factura se trata (y aguanta una sin número)
- [x] Con la factura abierta: agregar, devolución y editar disponibles
- [x] Editar le avisa a la pantalla con esa factura
- [x] El PDF se descarga con la factura y su cliente
- [x] Una factura **finalizada** se sigue viendo, pero sin acciones (el PDF sí)
- [x] Una factura con abonos ya no se borra de un clic, pero sí se edita

### ✅ ClienteSeguimientoCard — 7 pruebas · `ClienteSeguimientoCard.test.jsx`
- [x] Dice de quién es la deuda y por qué factura
- [x] Sin teléfono usable (códigos "SN", "NT", "N/A") no ofrece escribirle
- [x] El WhatsApp va al número del **cliente**, no al de la empresa
- [x] El texto cambia con la gestión: al que ya devolvió todo no se le habla de
      devoluciones, solo del pago
- [x] Ofrece registrar llamada, ampliar vencimiento y registrar devolución

### Fase 2: COMPLETA (2026-08-19)

Nueve pantallas, 70 pruebas. Lo que sigue es la **Fase 3** (el resto de los
componentes) y, más adelante, los flujos completos con Cypress/Playwright.

**Dos ajustes del entorno que hicieron falta:** `userEvent.setup({ delay: null })`
en el helper y `testTimeout: 20000` en `vite.config.js`. Las pruebas de
formularios largos pasaban aisladas y fallaban todas juntas por pasarse de los
5 segundos de fábrica: era lentitud, no un error.

## Fase 3 — Resto de componentes

**El criterio:** no se prueban los ~60 componentes que faltan uno por uno. Se
probó **todo lo que decide algo** —plata, permisos, qué se guarda— y se deja
fuera, a propósito, lo que solo dibuja. Una prueba de un componente que
únicamente muestra lo que le pasan no atrapa errores: los repite.

### ✅ Los tres diálogos que mueven plata — 23 pruebas

**`AmpliarVencimientoDialog.test.jsx` (8)**
- [x] No guarda una ampliación vacía
- [x] Corre la fecha y deja anotada la ampliación con su fecha anterior
- [x] Guarda el descuento hecho sobre esos días
- [x] Acumula la ampliación nueva sobre las anteriores
- [x] Anota la prórroga en la línea de tiempo
- [x] "Indefinida" y "días" son caminos excluyentes: la indefinida no inventa
      fecha ni ampliación

**`RegistrarDevolucionDialog.test.jsx` (9)**
- [x] Sin cantidad no registra nada
- [x] Devolución total: cierra la línea con la fecha de hoy, gestión "total"
- [x] Devolución parcial: **parte la línea en dos** —lo que volvió y lo que
      sigue afuera—, gestión "parcial"
- [x] No deja devolver más de lo que hay afuera
- [x] Al remanente se le puede dar más plazo en el mismo paso
- [x] Depósito: devuelto entero, o retenido con motivo obligatorio

**`AgregarEquipoDialog.test.jsx` (6)**
- [x] Sin equipos en la lista no guarda
- [x] Los nuevos entran sin pisar los del alta y quedan marcados como agregados
      después, con su lote y su fecha de entrega
- [x] Rehace el total de la factura
- [x] El pago del lote viaja **solo en el primer equipo** (contarlo en los dos
      hacía subir el pagado al doble)

### ✅ Los dos carritos — 9 pruebas
- [x] `VistaCart` (5): con el carrito vacío no manda nada; con el pedido armado
      abre WhatsApp **y** manda la solicitud; el mensaje lleva al cliente y lo
      que pidió; si el servidor falla, el WhatsApp ya salió igual
- [x] `KioskCart` (4): manda la solicitud pero **no** abre WhatsApp — el cliente
      está en el local

### ✅ Las pantallas del panel — 22 pruebas
- [x] `ListaCuentasCobro` (6): marcar como pagada es solo del administrador y
      solo sobre emitidas; es un interruptor
- [x] `AdminCotizaciones` (5): el buzón, tomar una pendiente, y eliminar solo
      para el administrador (pedirlo abre la confirmación, no borra)
- [x] `EditarEquipos` (5): guarda en el equipo correcto, rehace el nombre en
      minúsculas y vuelve a pedir el catálogo
- [x] `ListaUsuarios` (3): cambiar el rol cambia el juego de permisos, que sale
      del mapa de roles
- [x] `DatosClienteModal` (6): persona/empresa, identificación de 5 dígitos
      mínimo, teléfono solo números, y los datos quedan en el estado de la app
- [x] `AdminForms` (6): cada rol ve solo lo suyo, y a quien no puede ver cartera
      ni siquiera se le piden esas cifras

### ✅ La copia local de clientes — 7 pruebas
- [x] `clientesCache` : usa la copia cuando el sello coincide (0 lecturas),
      relee cuando cambió, se invalida a mano tras crear o borrar, y tiene sus
      salidas de emergencia (copia corrupta, vencida, base sin sello)

### Lo que queda deliberadamente sin prueba

- **Los PDF** (`VistaPdf/*`) y sus equivalentes en pantalla (`VistaWeb/*`):
  arman un documento con datos que ya vienen calculados y probados. Probarlos
  sería fijar el diseño, que cambia seguido, no la corrección.
- **Las piezas de la ficha del cliente** (`EstadoCuentaFactura`,
  `CargosAdicionales`, `RecuadroPago`, `EquipoRow`, `recuadrosCuenta`,
  `ClienteEncabezado`): reciben la cuenta **ya calculada** —esa es la regla, se
  calcula una sola vez en `FacturaCard`— y la muestran. La cuenta está probada
  en `facturaUtils.test.js`.
- **La tienda y el kiosco** (`ProductCardDetail`, `KioskProductCardDetail`,
  `Search`, `Drawer`, protector de pantalla): navegación y presentación.
- **Las vistas contenedoras** (`Vista*`): arman el layout y delegan en los
  componentes ya probados.

Si alguna de estas incorpora una decisión —una validación, un cálculo, un
permiso— ahí sí corresponde probarla.

---

_Última actualización (2026-08-19): **Fases 1, 2 y 3 COMPLETAS** — lógica,
nueve pantallas clave y todo lo que decide algo (plata, permisos, qué se
guarda). **397 pruebas pasando** en 48 archivos. Lo que sigue, cuando haga
falta: flujos completos con Cypress/Playwright._
