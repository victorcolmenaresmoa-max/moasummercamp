# MOA Reading Lab · Immersive Summer Camp 2026

Workbook digital del **Reading Lab, Ruta 1 (Teachers A2/B1)**: 4 días (Identity, Clarity, Decision, Growth),
panel de moderador en tiempo real y un evaluador pedagógico con IA que analiza el workbook completo de cada docente.

> Read first. Think second. Ask AI third.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Realtime) · Anthropic API · Vercel.

---

## 1. Qué hace el sistema

| Rol | Puede |
|---|---|
| **Participante** (profesor) | Registrarse con nombre + sede, navegar los 4 días, responder textos, tablas y matrices con **autoguardado**, usar el asistente de IA (que no le escribe las respuestas), ver el estado de sus checkpoints. |
| **Moderador / Admin** (Academy Specialist) | Panel con todos los participantes, filtros por **sede** y **día**, avance en %, última actividad, ver todas las respuestas de un docente, **firmar checkpoints** (iniciales + comentario) y **generar el reporte de IA**. |

**Feature central de IA:** al terminar el Día 4, `POST /api/ai/report` lee de la base de datos *todas* las respuestas de ese docente,
las reconstruye en el orden del workbook y pide al LLM un reporte con fortalezas, áreas de mejora (cada una **con la evidencia citada**),
tres puntuaciones (uso de evidencia, profundidad pedagógica, calidad de la reflexión) y un siguiente paso. Se guarda en `ai_reports` y se muestra en el dashboard.

---

## 2. Estructura del proyecto

```
moa-reading-lab/
├── supabase/
│   ├── schema.sql              ← EJECUTAR PRIMERO en Supabase
│   └── seed_staff.sql          ← convierte usuarios en moderadores
├── middleware.ts               ← refresco de sesión + protección de rutas
└── src/
    ├── app/
    │   ├── page.tsx                              landing
    │   ├── login/ · signup/                      auth
    │   ├── lab/                                  VISTA PARTICIPANTE
    │   │   ├── layout.tsx                        header + guard
    │   │   ├── page.tsx                          mis 4 días + progreso
    │   │   └── [day]/page.tsx                    workbook del día
    │   ├── moderator/                            VISTA MODERADOR
    │   │   ├── page.tsx                          tabla de control + KPIs + filtros
    │   │   └── participant/[id]/page.tsx         detalle + checkpoints + reporte IA
    │   └── api/ai/
    │       ├── assist/route.ts                   asistente del participante
    │       └── report/route.ts                   evaluador pedagógico
    ├── components/
    │   ├── WorkbookField.tsx     renderiza cualquier campo + autoguardado
    │   ├── AiPromptCard.tsx      prompts del workbook (copiar o ejecutar)
    │   ├── ReadingText.tsx       texto de lectura con tamaño ajustable
    │   ├── CheckpointBox.tsx     checkpoint (vista participante)
    │   └── moderator/            AnswerValue · CheckpointApproval · ReportPanel · RealtimeRefresh
    └── lib/
        ├── workbook/             ★ TODO EL CONTENIDO DEL WORKBOOK (day1..day4)
        ├── ai/                   anthropic.ts (llamada) · prompts.ts (system prompts)
        └── supabase/             client · server · admin · session
```

**Idea clave:** el workbook es **datos**, no JSX (`src/lib/workbook/day*.ts`).
Añadir una pregunta = añadir un objeto al array. La UI, el dashboard, el % de avance y el prompt de la IA se actualizan solos.

Tipos de campo disponibles: `textarea`, `text`, `table` (con `fixedFirstColumn` para tablas como *Past Simple / Past Continuous…*), `matrix` (autoevaluación del Día 4), `checkgroup`, `ai_prompt`, `info`.

---

## 3. Puesta en marcha (paso a paso)

### Paso 1 — Crear el proyecto en Supabase
1. https://supabase.com → **New project** (región: East US o la más cercana a Venezuela).
2. Guarda la contraseña de la base de datos.
3. **Project Settings → API**, copia: `Project URL`, `anon public key`, `service_role key`.

### Paso 2 — Ejecutar el esquema
1. **SQL Editor → New query**.
2. Pega **todo** `supabase/schema.sql` y **Run**.
3. Verifica en **Table Editor** que existen: `profiles`, `responses`, `checkpoints`, `ai_reports`, `ai_interactions`.

Esto crea también: RLS (el participante solo ve lo suyo), el trigger que genera el perfil al registrarse,
la vista `participant_progress` y la publicación de Realtime.

### Paso 3 — Correr el proyecto en local
```bash
npm install
cp .env.example .env.local     # rellena las claves
npm run dev                    # http://localhost:3000
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # solo servidor, nunca NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
NEXT_PUBLIC_CAMP_CODE=MOA2026        # código que piden en el registro
```

### Paso 4 — Crear los moderadores
1. Regístrate en `/signup` con el correo del moderador (o créalo en **Authentication → Users**).
2. Abre `supabase/seed_staff.sql`, cambia los correos y ejecútalo en el SQL Editor.
3. Al entrar, ese usuario verá **/moderator**.

> Por seguridad, el rol nunca se asigna desde el cliente: el trigger siempre crea `participant`.

### Paso 5 — Desactivar la confirmación de correo (recomendado para el camp)
**Authentication → Providers → Email → Confirm email: OFF**.
Así los profesores entran de inmediato el día 1 sin depender de su bandeja de entrada.

### Paso 6 — Subir a GitHub
```bash
git init
git add .
git commit -m "MOA Reading Lab 2026"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/moa-reading-lab.git
git push -u origin main
```

### Paso 7 — Desplegar en Vercel
1. https://vercel.com → **Add New → Project** → importa el repo.
2. **Environment Variables**: pega las 5 variables del `.env.local` (Production y Preview).
3. **Deploy**.
4. En Supabase → **Authentication → URL Configuration**, añade tu dominio de Vercel a *Site URL* y *Redirect URLs*.

---

## 4. Esquema de datos (resumen)

```
profiles(id→auth.users, full_name, email, campus[merida|el_vigia], role[participant|moderator|admin], group_name)
responses(user_id, day 1-4, section_id, field_key UNIQUE por usuario, field_label, value jsonb)
checkpoints(user_id, day, checkpoint_number, status, items_checked, moderator_id, moderator_initials, comments, approved_at)
ai_reports(user_id, model, summary, strengths jsonb, growth_areas jsonb, evidence_use, pedagogical_depth, reflection_depth, next_step)
ai_interactions(user_id, day, section_id, prompt, response)   ← cómo usó la IA cada docente
vista participant_progress(...)                               ← alimenta el dashboard
```

`responses.value` es `jsonb` y admite las cuatro formas del workbook:

| Tipo de campo | Valor guardado |
|---|---|
| textarea / text | `{"text": "..."}` |
| table | `{"rows": [["Challenge","Lesson","Habit"], ...]}` |
| matrix | `{"Reflection": "I already do this", ...}` |
| checkgroup | `{"checked": ["specific","realistic"]}` |

**Por qué una fila por campo y no un JSON gigante por día:** permite autoguardado sin conflictos entre pestañas,
métricas de avance con `count(*)`, y que el moderador vea respuestas parciales en tiempo real.

---

## 5. Los dos prompts de IA

Están aislados en `src/lib/ai/prompts.ts` para que los edites sin tocar la lógica:

* **`TUTOR_SYSTEM`** — asistente del participante. Explica vocabulario e ideas en inglés A2/B1 y **se niega** a escribir la reflexión o a resumir el texto para saltarse la lectura.
* **`EVALUATOR_SYSTEM`** — evaluador pedagógico. Recibe el workbook completo (`buildWorkbookTranscript`) más el historial de uso de IA, aplica la rúbrica del workbook (Básico / Esperado / Excelente) y devuelve **JSON estricto**. Regla explícita: cada fortaleza y cada área de mejora debe citar el día y la parte; los errores de gramática inglesa no bajan la nota pedagógica.

Cambiar de proveedor (OpenAI, Gemini) = reescribir **solo** `callLLM` en `src/lib/ai/anthropic.ts`.

---

## 6. Checklist antes del camp

- [ ] `schema.sql` ejecutado y tablas visibles.
- [ ] Moderadores con `role = 'moderator'` (Paso 4).
- [ ] Confirmación de correo desactivada.
- [ ] Variables de entorno en Vercel (incluida `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] Prueba end-to-end: registrar un profesor de prueba → responder Día 1 → verlo aparecer en `/moderator` → firmar el Checkpoint 1 → generar el reporte de IA.
- [ ] Código del camp (`NEXT_PUBLIC_CAMP_CODE`) comunicado a los moderadores de Mérida y El Vigía.
- [ ] Plan B sin internet: cada página del workbook se puede imprimir (`Ctrl+P`, los controles llevan `no-print`).

## 7. Ideas para después del camp

* Exportar el workbook de cada docente a PDF (evidencia formal del MOA Summit).
* Reporte agregado por sede: qué áreas de mejora se repiten en Mérida vs. El Vigía.
* Ruta 2 (otro nivel/perfil): basta con añadir `day5.ts…` o un segundo array `WORKBOOK_ROUTE_2`.

---

MOA Education · Immersive Summer Camp 2026 · Building Confident English Teachers
