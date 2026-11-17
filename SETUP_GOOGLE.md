# Conectar Data cx a Google Sheets — método GRATIS (10 minutos, UNA sola vez para siempre)

No hace falta Google Cloud, ni tarjeta, ni Workspace. Solo un Gmail común (idealmente una cuenta del servicio, no personal) y **una única planilla para todo el servicio**: cada carpeta de Data cx vive en una pestaña de ese libro, que **se crea sola** la primera vez que sincronizás. Configurás una vez; todas las carpetas futuras se conectan con un solo toque ("Usar la planilla del servicio").

## Los 6 pasos

1. **Crear la planilla:** entrá a https://docs.google.com/spreadsheets con la cuenta del servicio → planilla nueva → nombre: **"Data cx — Servicio de Cirugía"** (una sola para todo).

2. **Abrir el editor de script:** en esa planilla, menú **Extensiones → Apps Script**. Se abre un editor con un código de ejemplo.

3. **Pegar el código:** borrá lo que haya y pegá completo el contenido del archivo **GOOGLE_SCRIPT.gs** (viene con la app). En la primera línea, cambiá `CAMBIAME-por-una-clave-del-servicio` por una clave inventada por ustedes (ej. `cirugia-pueyrredon-2026`). Guardá (💾).

4. **Publicar:** botón azul **Implementar → Nueva implementación** → engranaje ⚙ → tipo **Aplicación web** →
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
   - **Implementar**. Google va a pedir autorización con la cuenta (aceptá, incluso si avisa "app no verificada": es tu propio script) y te da una **URL que termina en `/exec`**. Copiala.

5. **Vincular en la app:** Data cx → la carpeta → *Conectar a una planilla de Google* → pegá la **URL del script** y la **clave** → Vincular. La app crea la pestaña con el nombre de la carpeta y sube lo que tengas. **Desde acá, toda carpeta nueva se conecta con un toque** ("Usar la planilla del servicio") — los pasos 1 a 4 no se repiten nunca más.

6. **Compartir:** *Compartir plantilla* → link por WhatsApp. La URL y la clave viajan adentro del link: los demás teléfonos quedan conectados a la misma planilla sin configurar nada.

## Si "Extensiones → Apps Script" da error de Drive

Es un problema conocido de Google cuando hay **varias cuentas abiertas en el mismo navegador**: Apps Script intenta abrirse con la cuenta equivocada.

- **Arreglo rápido:** ventana de incógnito → iniciar sesión SOLO con la cuenta del servicio → abrir la planilla → Extensiones → Apps Script.
- **Plan B (evita ese camino por completo):** entrá directo a https://script.google.com con la cuenta del servicio → *Nuevo proyecto* → pegá el código de GOOGLE_SCRIPT.gs → completá **ID_PLANILLA** con el churro de letras del link de tu planilla (lo que está entre `/d/` y `/edit`) → seguí desde el paso 4 (Implementar). El resultado es idéntico.

## Uso diario

Cargás sin señal como siempre. Cuando hay señal: **Sincronizar ahora** — baja lo de los demás, fusiona sin pisar nada, sube todo. La planilla de Google es el maestro, siempre al día; el Excel se exporta cuando lo necesites para el análisis.

## Seguridad, dicho honesto

- La URL del script más la clave equivalen a una llave de la planilla. Viajan por el link de WhatsApp del grupo del servicio — el mismo círculo de confianza que ya usa esos datos. No publiques el link fuera del servicio.
- Si la clave se filtra: cambiala en el script (paso 3), volvé a implementar, y compartí la plantilla de nuevo.
- Si dos teléfonos sincronizan exactamente al mismo tiempo, gana el último en subir; la siguiente sincronización de cualquiera vuelve a juntar todo.

## ¿Y el método con Client ID (Google Cloud)?

Sigue disponible en la app como método avanzado. También es gratis (el banner de la tarjeta es una prueba opcional de Google, se puede saltear), pero requiere pelearse con la consola de Google Cloud. El de arriba hace lo mismo sin esa pelea.
