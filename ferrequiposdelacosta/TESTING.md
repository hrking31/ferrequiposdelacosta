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
   (cálculos de facturas, formato, roles) y los *slices* de Redux. ← en curso
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

### ⬜ src/Components/RolesPermisos/RolesPermisos.jsx — mapa de roles y permisos
- [ ] (se detalla al abordar el módulo)

### ⬜ Redux slices — src/Store/Slices/
Reducers y selectores (lógica de estado, fácil de probar). Se detallará cada uno:
- [ ] cartSlice.js
- [ ] clienteSlice.js
- [ ] cotizacionSlice.js
- [ ] cuentacobroSlice.js
- [ ] detailSlice.js
- [ ] equiposSlice.js
- [ ] searchSlice.js
- [ ] userSlice.js
- [ ] presenciaSlice.js
- [ ] installAppSlice.js
- [ ] passwordSlice.js

### ⬜ Hooks — src/Hooks/, src/Theme/, src/Context/
- [ ] useSnackbar.js
- [ ] useColorMode.js
- [ ] useAuth.js

---

## Fase 2 — Componentes clave (formularios y validaciones)

Se detallará al llegar. Candidatos: `ClienteFormDialog`, `FacturaFormDialog`,
`AbonoDialog`, `CrearEquipos`, `Login`, `Register`.

## Fase 3 — Resto de componentes

El inventario del resto de los ~70 componentes `.jsx` se irá completando por
grupos.

---

_Última actualización: Fase 1 en curso — `formato.js` (8/8) y `facturaUtils.js` (28/28) cubiertos. Siguen los slices de Redux, RolesPermisos y los hooks._
