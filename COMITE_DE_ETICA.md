# Registro clínico del Servicio de Cirugía — descripción del manejo de datos

*Documento de apoyo para el Comité de Ética y Docencia. Una página. Lo técnico verificable está en el código, que es abierto y puede auditarse.*

## Qué es

Una aplicación web instalada en los teléfonos del personal del servicio, para registrar en forma prospectiva variables clínicas de pacientes quirúrgicos (datos demográficos, quirúrgicos, evolución y seguimiento), con el fin de análisis retrospectivos y producción científica del servicio.

## Dónde viven los datos

**Exclusivamente en el dispositivo de cada cargador.** La aplicación no tiene servidor, no usa servicios en la nube, no transmite datos por internet. Funciona sin conexión. Técnicamente: los datos se almacenan en la base local del navegador (IndexedDB) del teléfono, protegida por el bloqueo del propio dispositivo.

El único movimiento de datos ocurre cuando un usuario decide **exportar un archivo Excel** y compartirlo por el medio que el servicio disponga. La consolidación entre cargadores se hace transfiriendo esos archivos entre dispositivos del servicio, sin intermediarios.

## Identificación y anonimización

- La aplicación registra apellido y nombre para permitir el seguimiento longitudinal del paciente.
- Dispone de un **modo anonimizado**: al exportar, el nombre se reemplaza por un código correlativo (PANC-0001). La tabla que vincula código y nombre **permanece únicamente en el dispositivo** y solo se exporta por acción deliberada del usuario, en un archivo separado y rotulado como no compartible.
- Propuesta operativa: los archivos que circulen fuera del servicio (análisis estadístico, colaboradores, publicación) se exportan siempre en modo anonimizado. El archivo con nombres queda en el dispositivo del investigador responsable.

## Quién accede

Los teléfonos del personal del servicio autorizado por el investigador responsable. No hay cuentas, contraseñas de terceros ni proveedores externos con acceso a los datos. La estructura de los formularios (qué variables se recaban) la define el investigador responsable y se distribuye como plantilla a los demás cargadores.

## Minimización y calidad

- Se recaban solo las variables definidas en cada registro, con categorías cerradas y unidades explícitas.
- Ningún campo es obligatorio: no se fuerza la carga de datos que no existen.
- La aplicación audita el diseño de cada registro (evita texto libre innecesario, exige unidades) para que la base sea analizable sin retrabajos.

## Conservación y respaldo

Los datos se conservan mientras el dispositivo los conserve; el respaldo es la exportación periódica a Excel bajo resguardo del investigador responsable. La eliminación es inmediata y completa desde la propia aplicación ("Borrar todo lo de este dispositivo").

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Pérdida o robo del teléfono | Bloqueo del dispositivo + exportación periódica como respaldo. Los datos no son legibles sin desbloquear el teléfono. |
| Circulación de archivos con nombres | Modo anonimizado por defecto para todo archivo que salga del servicio. |
| Acceso de terceros vía internet | No aplica: no hay transmisión de datos. |
| Carga de datos por personal no autorizado | La app se instala solo en dispositivos autorizados por el investigador responsable. |

## En una frase

Los datos de los pacientes nunca abandonan los dispositivos del servicio, salvo como archivo Excel exportado deliberadamente, y todo archivo que circule fuera del servicio puede y debe ir anonimizado.
