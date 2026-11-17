# Data cx — Servicio de Cirugía · Clínica Pueyrredon

App web para cargar pacientes desde el celular, al lado de la cama o en el pase de sala. Funciona sin señal y exporta a Excel.

Dos cosas distintas conviven acá:

1. **Las dos carpetas del páncreas** (Planilla optimizada y Resultados y experiencia). Son plantillas fijas del sistema: no se editan ni se borran, porque su Excel ya alimenta un trabajo en curso y hay que respetarlo celda por celda.
2. **El constructor.** Armás el registro que quieras — apendicectomías, hernias, lo que sea —, elegís los campos y la app genera el formulario y el Excel sola.

---

## El constructor

Inicio → **+ Nueva carpeta**. Le ponés nombre, color, y agregás campos de dos maneras:

- **Bloques ya armados:** Paciente, Apendicitis, Laboratorio de ingreso, Cirugía, Complicaciones, Evolución, Anatomía patológica, Seguimiento. Vienen con las opciones correctas (Clavien-Dindo con sus siete grados, ASA I–IV) y cada bloque arma un paso del formulario. Existen por una razón: que cargar un campo bien hecho sea más fácil que inventarlo mal.
- **Campos sueltos:** elegís cómo se carga (una opción, varias, Sí/No, número, fecha, texto, calculado), escribís las opciones y listo.

**Campos calculados.** IMC desde peso y talla, días entre dos fechas, suma de dos campos. A propósito no hay fórmulas libres: son tres cálculos concretos y predecibles. Una fórmula libre en una app clínica es una forma elegante de meter errores que nadie revisa.

**Avisos de calidad.** Mientras armás, la app te avisa —sin bloquear— si el registro no va a servir para analizar: campos de texto libre donde debería haber opciones, números sin unidad, campos duplicados, opciones vacías, falta de fecha. Un mal formulario produce una base inservible, y esto hace fácil armar buenos formularios.

**Orden.** El orden del formulario es el orden de las columnas del Excel. Movés un campo con ↑↓ y se mueve la columna.

**Renombrar es seguro.** Cada campo tiene una clave interna que no cambia nunca. Si le cambiás la etiqueta, los datos ya cargados siguen ahí: cambia el encabezado del Excel, nada más. Si lo borrás, deja de exportarse pero lo cargado no se destruye.

### Ejemplo: apendicectomías

Bloques Paciente + Apendicitis + Laboratorio + Cirugía + Complicaciones + Evolución = 32 campos en 6 pasos, sin escribir uno solo a mano. Agregás "Antibiótico postoperatorio" como opción única con tus cuatro esquemas y ya tenés 33 campos, el IMC calculándose solo, los días de internación saliendo de las fechas, y el Excel con `Leucocitos (/mm³)` en el encabezado.

El dashboard sale solo de los tipos: los Sí/No dan tasas (mortalidad, reintervención), los números medianas, las opciones distribuciones.

---

## Las dos carpetas del páncreas

Exportan respetando la estructura exacta de las planillas que ya alimentan el trabajo.

---

## 1. Ponerla en el celular

La app son archivos estáticos. Necesita estar servida por **HTTPS** para que Android/iOS la dejen instalar y funcionar offline.

**Opción rápida (recomendada):** subí la carpeta entera a Netlify Drop (https://app.netlify.com/drop), Vercel o GitHub Pages. Arrastrás la carpeta, te da una URL, listo. Es gratis y no requiere cuenta paga.

**Para probar en la compu:**

```bash
cd panc-app
python3 -m http.server 8080
# abrí http://localhost:8080
```

**Instalar en el teléfono (Agregar a pantalla de inicio):**

- **iPhone (Safari):** abrí la URL → botón Compartir (cuadrado con flecha) → *Agregar a pantalla de inicio* → Agregar.
- **Android (Chrome):** abrí la URL → menú ⋮ → *Instalar aplicación* o *Agregar a pantalla de inicio*.

Después de la primera carga, el service worker guarda todo. Podés abrirla en modo avión y cargar pacientes igual.

## 2. Cómo se usa

- **Inicio:** dos tarjetas, una por carpeta, con el contador de registros.
- **Dentro de cada carpeta:** `+ Nuevo registro`, buscador por nombre/ID, filtro por año, y los botones de Excel. El 📊 arriba a la derecha abre el control de calidad.
- **Formulario:** dividido en pasos. Barra de progreso arriba, `Anterior / Guardar / Siguiente` fija abajo. Cada campo muestra a la derecha su **columna de Excel** (`A`, `BW`, `CJ–CK`), así siempre sabés a dónde va lo que cargás.
- **Todo es opcional.** Al pie de cada paso aparece “Faltan N campos” con un link a cada uno. Nunca te bloquea el guardado.
- **Autoguardado:** cada vez que tocás algo se guarda un borrador. Si se cierra el navegador, el formulario a medio llenar vuelve solo.
- **Valores especiales:** debajo de cada campo hay un botón chico, `Sin dato o no aplica…`. Se despliega solo si lo tocás, y escribe en el Excel exactamente los textos que ya usa la base: `Sin datos`, `No corresponde`, `Irresecable`, `Metastásico` (en la Carpeta 2: `S/D`, `NO CORRESP`, `IRRESECABLE`, `METASTÁSICO`). `Irresecable` y `Metastásico` aparecen recién desde el paso donde se habla del tumor: describen el tumor, no la edad ni el ASA. Elegido uno, el campo lo muestra con una × para volver atrás.
- **Duplicar:** dentro de un registro guardado, `⋯` → Duplicar. Copia todo y borra la fecha, para reoperaciones del mismo paciente.
- **Precarga cruzada:** si escribís un nombre que ya existe en la otra carpeta, la app ofrece traer edad, sexo, ASA, IMC, fecha, tiempo quirúrgico, internación y seguimiento. Los registros quedan **separados**.

## 3. Exportar

Dentro de cada carpeta:

- **Exportar a Excel** → genera el archivo completo desde cero.
  `Carpeta1_Planilla_Optimizada_AAAA-MM-DD.xlsx` / `Carpeta2_Resultados_Experiencia_AAAA-MM-DD.xlsx`
- **Anexar a un archivo** → te pide el .xlsx existente, busca la última fila con datos y agrega los registros nuevos abajo, sin tocar el resto.
- **Exportar todo** (desde Inicio) → un libro con las dos hojas.

En el celular, el archivo cae en Descargas y desde ahí lo compartís por WhatsApp o mail con el botón de siempre.

Lo que se respeta al exportar, sin excepción:

- Nombre de hoja: `Base de Datos Cirugía Pancreáti` y `BASE DE DATOS 2022`.
- Encabezados **literales**, con mayúsculas, tildes, espacios de más y erratas incluidas (`AMILASA EN DRENEJE`, `DIFERENCIACÓN`, `COMPROMISO ` con espacio final, `5 DÍA`, `PD +ESPL`).
- Los 55 merges del encabezado de 3 filas de la Carpeta 2, con los datos arrancando en la fila 4.
- Filas separadoras por año, reinsertadas automáticamente ordenando por fecha de cirugía. En modo anexar, los años que ya existen en el archivo no se duplican.
- Fechas: se guardan ISO adentro, salen `09 Enero 2018` (Carpeta 1) y `09 ENERO 2018` (Carpeta 2).
- `Tamaño tumoral` sale como `30 mm`; `Seguimiento` como `3 meses` / `3 MESES`.

**Verificado contra tus archivos.** Tres pruebas automáticas:

1. **Encabezados:** idénticos celda por celda en las dos hojas. 55/55 merges preservados.
2. **Anexar:** probado sobre la planilla real. Agregó en la fila 102, después de `ROMERO ANTONIO MARIA`, sin tocar nada de lo anterior.
3. **Ida y vuelta:** importé tus dos planillas completas (91 pacientes cada una) y las volví a exportar, comparando celda por celda contra el original.

| | Celdas idénticas | |
|---|---|---|
| Carpeta 1 | 3233 / 3240 | **99.78%** |
| Carpeta 2 | 8718 / 8730 | **99.86%** |

Los 19 desvíos son, todos, lugares donde la planilla original se contradice a sí misma y la app normaliza: `28 Julio  de 2020` → `28 Julio 2020` (doble espacio y un "de" que aparece 5 veces sobre 91), `6 m` → `6 mm`, `HTA/ DBT` → `HTA/DBT`, un ASA cargado como `l` minúscula. Ninguno cambia el dato; si preferís que se respeten hasta los typos, decime y los preservo tal cual.

## 3b. Varios cargadores (sin nube)

Para que carguen varios y termine todo en un mismo Excel, sin servidor:

1. **Armás la carpeta una vez** y tocás *Compartir plantilla*: baja un archivo `.json` que le pasás a cada cargador por WhatsApp o mail.
2. **Cada uno la importa** (Ajustes → *Importar plantilla*) y carga sus pacientes con el mismo formulario exacto.
3. **Cada tanto, cada uno exporta su Excel** y se lo manda al que consolida.
4. **El que consolida toca *Fusionar un Excel***: los pacientes nuevos se agregan; los repetidos (mismo nombre y fecha de cirugía, sin importar mayúsculas ni tildes) solo **rellenan campos vacíos**. Nunca se pisa un dato ya cargado. Si dos personas cargaron distinto el mismo campo, la app lo lista como conflicto para revisarlo a mano.
5. Fusionar el mismo archivo dos veces no duplica nada.

El mismo botón sirve también para las dos carpetas del páncreas.

## 3c. Respaldo (importante)

Los datos viven en la base local del navegador, que el sistema puede llegar a vaciar si el teléfono anda corto de espacio. Por eso:

- La app pide **almacenamiento persistente** al sistema en el primer arranque (reduce mucho ese riesgo).
- **Ajustes → Respaldar todo** baja un archivo con TODO: carpetas, registros, plantillas, bloques propios y la tabla de alias. Guardalo fuera del teléfono (mail, Drive, compu).
- **Restaurar** lo levanta en este u otro teléfono. Es aditivo y no duplica: restaurar dos veces el mismo archivo deja todo igual.
- Si pasás **7 días sin respaldar** y hay registros cargados, el inicio te lo recuerda. No se puede apagar, a propósito.

## 4. Privacidad

- **No hay servidor.** Los datos viven en IndexedDB, en el teléfono. No se sincronizan, no se suben, no pasan por Anthropic ni por nadie.
- **Modo anonimizado** (Ajustes): al exportar, `Apellido y Nombre` se reemplaza por `PANC-0001` correlativo. La tabla de equivalencias queda solo en el dispositivo y se exporta aparte, a pedido (`Tabla_Equivalencias_NO_COMPARTIR`).
- Aviso de primer uso al abrir.
- **Corolario incómodo:** si perdés el teléfono, perdés los datos. Exportá seguido.

## 5. Por qué sin backend (Opción A)

Elegí la Opción A. El argumento:

- **Es un solo centro y la carga la hacés vos o un grupo chico.** El backend recién se paga solo cuando hay varios cargadores compitiendo por el mismo registro. Acá el conflicto real es entre el celular y el Excel, no entre dos médicos.
- **Datos de salud identificables + nube = otro problema.** Supabase/Firebase implican un responsable de tratamiento, un DPA, decidir región de datos y un comité que apruebe. Es una conversación que vale la pena tener, pero no es la que bloquea la carga de mañana.
- **El offline tiene que ser real, no un modo degradado.** Sin backend no hay cola de sincronización que falle en el pasillo del cuarto piso.
- **El destino ya es un Excel.** La fuente de verdad del trabajo es la planilla. Un backend agregaría un tercer lugar donde el dato puede estar desactualizado.

**Cuándo cambiar a la Opción B:** si empiezan a cargar tres o más personas en paralelo, o si necesitás ver los datos desde otro dispositivo. La migración es acotada — `js/db.js` es la única capa que toca el almacenamiento; hay que reemplazar `Store` por llamadas a Supabase y agregar una cola de escritura. El resto de la app no se entera.

## 6. Importar lo que ya existe

Ajustes → *Importar Carpeta 1* / *Importar Carpeta 2*. Lee el .xlsx histórico, saltea las filas de año, y convierte cada fila en un registro editable desde el celular (incluye la lectura inversa de los casilleros: si `AI = SI`, la app te muestra `Clasificación anatómica = RESEC`).

Se **agregan**, no se pisa nada. Si importás dos veces, tenés todo duplicado.

## 7. Cosas que conviene que sepas

Tres detalles donde el pedido y los archivos reales no coincidían. En todos gana el archivo, que es la regla que fijaste:

1. **`U` es `OTRO` de UBICACIÓN TUMORAL, no de IMÁGENES.** En la planilla, `ESTUDIOS` abarca `M1:T1` y `UBICACIÓN TUMORAL` abarca `U1:Y2`. Así que imágenes son TC/RMN/USE+B/PET-CT (Q–T) y la ubicación tiene cinco opciones: OTRO, VB, CABEZA, CUERPO, COLA.
2. **`AM` es `NEO` (fila 1) + `QT` (fila 3)**, no `NEOQT` en una sola celda. El control en la app es un toggle; el encabezado sale en dos niveles.
3. **`BB` dice `COMPLICACIONES POSOPERATORIAS`**, no `COMPLICACIONES POSOP.`

Y estas convenciones salieron de mirar qué hace la base, no de suponer:

- **Casilleros de la Carpeta 2:** no todos los grupos se comportan igual, y la app respeta cada uno:
  - *Imágenes, reconstrucción, hemorragia, clasificación:* la elegida recibe `SI` y las hermanas `NO`.
  - *Ubicación tumoral, resección, Dindo-Clavien:* solo se marca la elegida; las hermanas quedan **en blanco**, que es lo que hace la planilla (`NO` no aparece nunca en esas columnas).
  - *ECOG y Sexo:* escriben el valor (`2`, `F`) en su columna y dejan las otras en blanco.
  - Si el grupo entero quedó sin tocar, va todo vacío: vacío = no sabemos, `NO` = sabemos que no.
- **`U` (OTRO de ubicación) es texto libre, no un casillero.** En la base dice `DUODENO`, `ESTÓMAGO`, `BAZO/COLON`. La app le da un campo de texto propio.
- **Detalles adentro del casillero.** La planilla no siempre escribe `SI`: escribe `SI (LAT)` en reconstrucción venosa, `SI, SIN PP` en resección, `FÍSTULA A` o `SEROMA` en Dindo-Clavien, `SI, 2 DÍAS DESP` en reingreso. Al importar, la app guarda ese texto, te lo muestra debajo del campo, y lo devuelve intacto al exportar mientras no cambies la selección. Si la cambiás, el detalle viejo se descarta (que es lo correcto).
- **Un `S/D` suelto** dentro de un grupo por lo demás respondido también se conserva en su columna.
- **Fístula `Bioquímica`** se marca en la columna `A` (`BB`), que es lo que hace la base actual. Si preferís que quede en blanco, se cambia en `xlsxio.js`, caso `'fistula'`.
- **Campos con chip + valor numérico** (bilirrubina, sangrado, Wirsung): si cargás los dos, sale `Elevada (1.9)`. Si cargás uno solo, sale ese solo — que es el formato que ya tiene la base.

**Limitación honesta del modo anexar:** SheetJS conserva datos, fórmulas y merges, pero no los colores ni las fuentes del archivo original. Si la planilla tiene formato que te importa, exportá el archivo nuevo y pegá las filas a mano, o revisá el resultado antes de reemplazar el original. En cualquier caso: **guardá una copia antes de anexar**.

## 8. Archivos

```
index.html              arranque
manifest.webmanifest    instalación en pantalla de inicio
sw.js                   caché offline (cache-first)
css/styles.css          todo el diseño
js/schemas.js           los 36 + 97 campos y su mapeo exacto a columnas
js/db.js                IndexedDB (Dexie), borradores, alias
js/xlsxio.js            exportación, anexado e importación
js/app.js               pantallas, formularios, dashboard
vendor/                 Dexie y SheetJS locales (sin CDN: tiene que andar sin señal)
```

Sin build, sin npm, sin nada que compilar: son archivos que se copian a un servidor y andan.
