# MOA Reading Lab · Immersive Summer Camp 2026

Workbook digital del **Reading Lab MOA 2026** con dos rutas: **Ruta 1 (Teachers A2/B1)** y **Ruta 2 (Teachers B2/C1)**, cada una con 4 días,
panel de moderador en tiempo real y un evaluador pedagógico con IA que analiza el workbook completo de cada docente.

> Read first. Think second. Ask AI third.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Realtime) · Google Gemini · Vercel.

---

## 1. Puesta en marcha (15 minutos)

### Paso 1 — Base de datos

En **Supabase Dashboard > SQL Editor > New query**, ejecuta los archivos **en este orden**:

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/schema.sql` | Tablas, RLS, triggers, vista de progreso, realtime |
| 2 | `supabase/migration_01_day_access.sql` | **Bloqueo de días** por el moderador |
| 3 | `supabase/seed_staff.sql` | Convierte usuarios en moderadores/admin |

> **Los tres archivos son idempotentes**: puedes re-ejecutarlos las veces que quieras sin romper nada,
> y en cualquier orden. `schema.sql` detecta si la tabla `day_access` ya existe y, en ese caso,
> **no toca las políticas de bloqueo de días** (verás el aviso *"day_access existe: se conservan
> las políticas de bloqueo de días"*). Así, volver a ejecutar el schema sobre una base ya migrada
> nunca reabre los cuatro días por accidente.

### Paso 2 — Variables de entorno

Copia `.env.example` a `.env.local` y rellena. En Vercel, las mismas en
*Project Settings > Environment Variables*.

| Variable | Dónde se saca |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | La misma pantalla. **Solo servidor**, nunca con prefijo `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Opcional. Por defecto `gemini-2.5-flash` |
| `NEXT_PUBLIC_CAMP_CODE` | El código que dicta el moderador en el aula |

### Paso 3 — Local y despliegue

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # comprobación de tipos
npm run build        # build de producción
```

Para desplegar: sube el repo a GitHub, impórtalo en Vercel, pega las variables de entorno y listo.

### Paso 4 — Crear los moderadores

1. Que se registren en `/signup` como cualquier docente (o créalos en *Authentication > Users*).
2. Edita los correos en `supabase/seed_staff.sql` y ejecútalo.

El rol staff **nunca** se asigna desde el cliente: el trigger `handle_new_user()` siempre crea `participant`.

---

## 2. Bloqueo de días — cómo funciona

El objetivo: que nadie prepare el Día 3 en su casa. El candado tiene **dos muros**.

**Muro 1 (interfaz).** El panel del docente pinta los días cerrados en gris con un candado
y no son clicables. Si alguien escribe `/lab/3` a mano, ve una pantalla de bloqueo que
no revela ni el texto de lectura ni las preguntas.

**Muro 2 (base de datos, el que de verdad importa).** Las políticas RLS de `responses`
llaman a `public.day_is_open()` en cada `INSERT` y `UPDATE`. Aunque alguien llame a la API
de Supabase directamente desde la consola del navegador, **Postgres rechaza la escritura**.
Un bloqueo que solo vive en React no es un bloqueo.

### Prioridad de las reglas

```
excepción individual  >  regla de su sede  >  regla global  >  cerrado
```

El staff nunca está bloqueado (necesita ver los 4 días para revisar).

### Para el moderador (sin tocar SQL)

- **`/moderator`** → tarjeta *"Apertura de días"*: abre y cierra cada día para **todas las sedes**,
  solo **Mérida** o solo **El Vigía**. Útil cuando una sede va más rápida que la otra.
- **Ficha de un docente** → *"Acceso a los días de este docente"*: excepción individual
  para quien faltó a una sesión y necesita recuperar. El botón `↺` quita la excepción
  y devuelve el control a la regla general.

El cambio llega a la pantalla de cada docente **al instante**, por realtime. Nadie refresca nada.

### Fin de día

Al terminar un día **no hay botón "continuar al Day siguiente"**. El único camino es
*"Volver a mi panel"*, con el progreso del día. El ritmo del camp lo marca el aula, no la app.

Estado inicial tras la migración: **Día 1 abierto, Días 2–4 cerrados**.

---

## 3. El reporte de IA

`POST /api/ai/report` lee de la base de datos *todas* las respuestas del docente, las reconstruye
en el orden del workbook y pide a Gemini un reporte con fortalezas, áreas de mejora (cada una
**con la evidencia citada**), tres puntuaciones y un siguiente paso. Se guarda en `ai_reports`.

### El error "la IA no devolvió JSON" — qué pasaba y cómo se arregló

Tres causas se sumaban:

1. **`gemini-2.5-flash` es un modelo con razonamiento.** Los tokens de "pensamiento" se
   descuentan de `maxOutputTokens`. Con el límite de 2500 que había, el modelo gastaba el
   presupuesto pensando y devolvía texto vacío o un JSON cortado a la mitad (`finishReason: MAX_TOKENS`).
2. **Se pedía `responseMimeType: 'text/plain'`**, así que el modelo era libre de escribir
   preámbulos ("Aquí tienes el reporte:") o vallas ` ```json `.
3. **No había reintentos.** Cualquier hipo de la API (un 429 por saturación) rompía la generación entera.

Lo que hace ahora `src/lib/ai/llm.ts`:

- **Modo JSON nativo**: `responseMimeType: 'application/json'` + `responseSchema` (en `src/lib/ai/schema.ts`).
  El modelo queda obligado *por gramática* a devolver esa forma. El fallo deja de ser posible por construcción.
- **`thinkingConfig.thinkingBudget = 0`** en modelos flash: todo el presupuesto va a la respuesta.
- **Reintentos** con presupuesto creciente (4000 → 8000 tokens) y *backoff* exponencial.
- **Parser tolerante**: quita vallas, extrae el bloque balanceado respetando strings y escapes,
  y **repara JSON truncado** cerrando llaves y corchetes colgantes.
- **Timeout** con `AbortController` para que la ruta no se cuelgue.
- **`normalizeReport()`**: pase lo que pase, produce algo que la base de datos acepta
  (puntuaciones fuera de rango, campos ausentes, `strengths` como lista de strings…).
- **Errores en español y accionables**: *"Falta GEMINI_API_KEY"*, *"La IA está saturada"*,
  *"El workbook solo tiene 3 respuestas con contenido"* — en vez del genérico de antes.

Si el reporte sigue fallando, el mensaje en pantalla te dice exactamente qué revisar.

---

## 4. Rendimiento y tiempo real

| Antes | Ahora |
|---|---|
| `createClient()` en **cada campo** del workbook → ~25 clientes de Supabase por página, cada uno con su socket y su timer de refresco de token | **Un singleton** por pestaña |
| Teclear una letra re-renderizaba los 25 campos | `WorkbookField` con `memo`: cada campo es independiente |
| Un canal realtime por tabla, `router.refresh()` en cada evento | Hook `useRealtime`: **un canal por pantalla**, refrescos agrupados con *debounce*, pausa en segundo plano y resincronización al volver a la pestaña |
| Autosave escribía aunque el valor no hubiera cambiado | Compara antes de escribir: menos tráfico y menos eventos realtime |
| `beforeunload` (poco fiable en móvil) | `pagehide` + `visibilitychange` |
| Búsqueda de docentes filtrada en JavaScript | Filtrada en Postgres con `ilike` |
| Sin estados de carga | `loading.tsx` con skeletons en las tres rutas pesadas |

Todo se actualiza solo: progreso del docente en el panel del moderador, firma de checkpoints
en la pantalla del docente y apertura de días. **Nadie necesita refrescar.**

---

## 5. Identidad visual

Paleta extraída del logo y el key visual de MOA:

| Color | Hex | Uso |
|---|---|---|
| Teal | `#16808E` | Color madre: fondos, botones primarios |
| Sun | `#F9D05E` | Acento, llamadas a la acción |
| Coral | `#E62864` | Energía, áreas de mejora |
| Plum | `#501B49` | Contraste, estados bloqueados |

Las figuras del key visual (la onda del logo, estrella, *squiggle*, arco, comillas, píldora
y engranaje) están en `src/components/brand/Moa.tsx` como **SVG inline**: cero peticiones de red,
escalan perfecto y heredan color con clases de Tailwind.

Tipografía: **Poppins** para títulos (geométrica y redondeada, como el wordmark "moa") y
**Nunito Sans** para lectura larga. Se cargan por `<link>` con `preconnect` y `display=swap`
— *no* con `next/font`, porque ese descarga las fuentes en tiempo de build y una compilación
sin salida a internet falla. Si el CDN no respondiera, el stack del sistema mantiene el diseño intacto.

---

## 6. Estructura

```
moasummercamp/
├── supabase/
│   ├── schema.sql                    ← 1º
│   ├── migration_01_day_access.sql   ← 2º  bloqueo de días
│   └── seed_staff.sql                ← 3º
├── middleware.ts                     refresco de sesión + protección de rutas
└── src/
    ├── app/
    │   ├── page.tsx                              landing
    │   ├── login/ · signup/                      auth
    │   ├── lab/                                  VISTA PARTICIPANTE
    │   │   ├── page.tsx                          mis 4 días (con candados)
    │   │   └── [day]/page.tsx                    workbook del día
    │   ├── moderator/                            VISTA STAFF
    │   │   ├── page.tsx                          dashboard + apertura de días
    │   │   └── participant/[id]/page.tsx         ficha del docente
    │   └── api/ai/
    │       ├── assist/route.ts                   asistente del participante
    │       └── report/route.ts                   evaluador pedagógico
    ├── components/
    │   ├── brand/Moa.tsx                         logo y figuras de marca
    │   ├── DayLocked.tsx · DayFinish.tsx         candado y cierre de día
    │   ├── LabRealtime.tsx                       desbloqueo en vivo
    │   └── moderator/
    │       ├── DayAccessControl.tsx              interruptor de días
    │       └── ParticipantDayOverride.tsx        excepciones individuales
    └── lib/
        ├── ai/{llm,schema,prompts}.ts            IA
        ├── access.ts                             qué días veo
        ├── useRealtime.ts · useAutosave.ts
        └── workbook/day{1..4}.ts                 CONTENIDO del camp
```

**El contenido del workbook es data, no JSX** (`src/lib/workbook/day*.ts`). Para cambiar una
pregunta editas un objeto; no tocas ningún componente.

---

## 7. Guion para el día del camp

1. **Antes de empezar** — entra en `/moderator`, confirma que solo el **Day 1** está abierto.
2. **Al empezar la sesión** — si toca otro día, ábrelo desde *"Apertura de días"*.
   Las pantallas de los docentes se desbloquean solas.
3. **Durante** — el panel muestra en vivo quién avanza y quién está atascado.
   Entra en la ficha de un docente para leer sus respuestas y **firmar checkpoints**.
4. **Al terminar el día** — cierra el día. Lo ya escrito se conserva y sigue visible para ellos.
5. **Tras el Day 4** — genera el **reporte de IA** de cada docente para el MOA Summit.

---

## 8. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Un docente ve *"Día cerrado"* al escribir | El moderador cerró el día a mitad de sesión. Ábrelo otra vez. |
| Los 4 días salen abiertos desde el principio | No se ejecutó `migration_01_day_access.sql`. Ejecútalo; el schema no lo sobreescribe. |
| *"Falta GEMINI_API_KEY"* | La variable no está en Vercel, o se añadió sin volver a desplegar. |
| El reporte da error 400 | El workbook tiene menos de 5 respuestas con contenido. Es intencional: no se evalúa un workbook vacío. |
| Un moderador no ve el panel | No se ejecutó `seed_staff.sql`, o el correo no coincide. Comprueba con la consulta `select` del final de ese archivo. |
| El panel no se actualiza solo | Revisa que las tablas estén en la publicación `supabase_realtime` (lo hacen `schema.sql` y la migración 01). |


---

## 9. Cómo se verificó

Antes de entregar, el SQL se ejecutó contra un **PostgreSQL 16 real** (no solo revisión a ojo),
simulando el `auth.uid()` de Supabase, con tres usuarios de prueba: Ana (Mérida), Luis (El Vigía)
y un moderador. Resultados:

| Prueba | Resultado |
|---|---|
| Ana escribe en el Día 1 (abierto) | ✅ Funciona |
| Ana escribe en el Día 3 (cerrado) | ✅ **Rechazado por la RLS** |
| Ana intenta escribir haciéndose pasar por Luis | ✅ Rechazado |
| Ana intenta abrirse el Día 3 ella misma | ✅ Rechazado: *"Solo el staff puede abrir o cerrar días"* |
| El moderador abre el Día 2 solo en El Vigía | ✅ Luis lo ve, Ana no |
| Excepción individual para Ana (faltó a la sesión) | ✅ Ana ve el Día 2 sin afectar a su sede |
| Excepción que *cierra* un día a una persona | ✅ Manda sobre la regla global |
| El moderador nunca queda bloqueado | ✅ Ve los 4 días |
| Re-ejecutar los dos scripts | ✅ Sin errores, sin filas duplicadas |
| Re-ejecutar `schema.sql` sobre base migrada | ✅ El candado sigue activo |

El parser de JSON de la IA se probó con 10 respuestas rotas típicas de un LLM (vallas markdown,
preámbulos, comas colgantes, llaves dentro de strings, JSON cortado a media clave y cortado
dentro de un string): **las 9 recuperables se reparan**; la que no contiene JSON devuelve `null`,
que es lo que dispara el reintento.

El proyecto también se descomprimió en limpio, se instalaron las dependencias desde cero y se
ejecutaron `tsc --noEmit`, `next lint` y `next build` sin errores ni warnings.
