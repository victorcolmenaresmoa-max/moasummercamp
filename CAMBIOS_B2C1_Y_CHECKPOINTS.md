# MOA Reading Lab — Cambios A2/B1 + B2/C1

Este paquete ya incluye los cambios pedidos. No tienes que editar el código para que aparezcan las dos rutas.

## Qué cambió

1. **Orden lógico del workbook A2/B1.** La actividad previa aparece primero y la lectura aparece después de la sección que indica `Answer BEFORE you read...`. No se cambió el contenido del workbook; solo su posición en pantalla.
2. **Nuevo workbook B2/C1.** Se añadieron los cuatro Reading Labs del PDF:
   - Day 1 — Educational Identity & Teaching Philosophy
   - Day 2 — Educational Case Studies: Leading Through Challenges
   - Day 3 — Opinion Articles on Education
   - Day 4 — Research-Informed Teaching
3. **Registro por ruta.** En `/signup` el participante debe seleccionar `A2–B1` o `B2–C1`.
4. **Panel del moderador.** Ahora muestra la ruta de cada participante y permite filtrar A2–B1/B2–C1.
5. **Checkpoint a revisión.** El participante tiene un botón `Llegué a este checkpoint · Enviar a revisión`. Al pulsarlo:
   - el checkpoint queda marcado como pendiente de revisión;
   - el panel del moderador muestra cuántos checkpoints están por revisar;
   - si Resend está configurado, se envía un correo con un botón que abre directamente el participante, el día y el checkpoint.
6. **Los usuarios existentes quedan en A2–B1** automáticamente para no cambiar su workbook actual.

---

# PASO 1 — Subir el código a GitHub

Sube todo el contenido de esta carpeta a tu repositorio como haces normalmente. No subas un archivo `.env.local` con claves reales.

---

# PASO 2 — Actualizar Supabase

Si tu proyecto YA está funcionando y ya tienes las tablas creadas, no vuelvas a comenzar desde cero.

1. Abre **Supabase**.
2. En el menú izquierdo entra a **SQL Editor**.
3. Pulsa **New query**.
4. Abre el archivo:
   `supabase/migration_02_workbook_routes_notifications.sql`
5. Copia TODO el contenido.
6. Pégalo en el SQL Editor.
7. Pulsa **Run**.
8. Debe terminar sin errores.

Esto agrega:
- `profiles.workbook_route`
- `checkpoints.submitted_at`
- `checkpoints.notification_sent_at`
- `checkpoints.submission_count`
- la nueva versión de `participant_progress`
- soporte para guardar la ruta elegida durante el registro.

### Importante
Los participantes que ya existían reciben automáticamente:
`a2_b1`

No se borran respuestas, usuarios ni checkpoints existentes.

---

# PASO 3 — Configurar los correos de checkpoint con Resend

La aplicación funciona aunque no configures Resend: el checkpoint seguirá apareciendo como pendiente en el panel. Resend solamente agrega el aviso por correo.

1. Crea una cuenta en **Resend**.
2. Verifica un dominio/remitente para MOA.
3. Crea una **API Key**.
4. Abre tu proyecto en **Vercel**.
5. Ve a **Settings → Environment Variables**.
6. Agrega estas tres variables:

`RESEND_API_KEY`
- Valor: tu API key de Resend, por ejemplo `re_xxxxx`.

`RESEND_FROM_EMAIL`
- Ejemplo: `MOA Education <reading@tudominio.com>`
- El correo debe pertenecer al dominio verificado en Resend.

`CHECKPOINT_NOTIFICATION_EMAILS`
- Coloca el correo que debe recibir los avisos.
- Puedes colocar varios separados por coma.
- Ejemplo: `academico@moa.com,moderador@moa.com`

7. Guarda las variables.
8. En Vercel haz un **Redeploy** para que la aplicación lea las nuevas variables.

El correo incluirá un enlace de este tipo:
`/moderator/participant/ID?day=2#checkpoint-3`

Al abrirlo, el moderador llega directamente al checkpoint que debe revisar.

---

# PASO 4 — Cómo se dividen las rutas al registrarse

En la pantalla de registro el participante verá:
- `A2–B1 — Route 1`
- `B2–C1 — Route 2`

Debe escoger la ruta indicada por el moderador.

La ruta queda guardada en Supabase en:
`profiles → workbook_route`

Valores posibles:
- `a2_b1`
- `b2_c1`

---

# PASO 5 — Cómo corregir un checkpoint

1. El participante completa una parte del workbook.
2. Al llegar al checkpoint pulsa **Enviar a revisión**.
3. En el panel del moderador aparecerá en **Por revisar**.
4. Si el correo está configurado, recibirás el aviso.
5. Pulsa el botón del correo o abre el participante desde el panel.
6. Marca los criterios del checkpoint.
7. Puedes elegir:
   - **Aprobar**
   - **Por mejorar**
8. Si eliges **Por mejorar**, el participante podrá volver a enviarlo a revisión.

---

# PASO 6 — Dónde editar los workbooks en el futuro

## A2/B1
Los cuatro días están aquí:
- `src/lib/workbook/day1.ts`
- `src/lib/workbook/day2.ts`
- `src/lib/workbook/day3.ts`
- `src/lib/workbook/day4.ts`

## B2/C1
Los cuatro días están aquí:
- `src/lib/workbook/b2c1/day1.ts`
- `src/lib/workbook/b2c1/day2.ts`
- `src/lib/workbook/b2c1/day3.ts`
- `src/lib/workbook/b2c1/day4.ts`

## Orden de lectura
En cada día existe una propiedad como:
`readingAfterSectionId: 'd1_part1'`

Eso significa: mostrar la lectura **después** de esa sección. Así se evita que el texto aparezca antes de una actividad que debe responderse antes de leer.

## Rutas
La lógica que decide cuál workbook recibe cada participante está en:
`src/lib/workbook/index.ts`

## Registro
La selección A2/B1 o B2/C1 está en:
`src/app/signup/page.tsx`

## Notificaciones
El endpoint que registra el checkpoint y envía el correo está en:
`src/app/api/checkpoints/submit/route.ts`

---

# Archivo SQL para futuras instalaciones nuevas

`supabase/schema.sql` ya fue actualizado para incluir las dos rutas y los campos nuevos.

Para una instalación que YA estaba funcionando usa primero la migración 02, no borres la base de datos.
