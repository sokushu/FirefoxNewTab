[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

# FirefoxNewTab

Una extensión ligera para la nueva pestaña de Firefox con accesos directos a sitios web, grupos, fondos personalizados y un reloj opcional. Utiliza Manifest V3 y HTML, CSS y JavaScript nativos. Se ejecuta directamente desde los archivos fuente, sin instalar dependencias ni compilar.

## Funciones

- Organiza accesos directos en una cuadrícula mediante arrastrar y soltar, con cuatro tamaños de icono y conservación de los espacios vacíos.
- Agrupa sitios en una barra lateral plegable y arrastra accesos directos entre grupos.
- Sube iconos personalizados u obtén iconos directamente de un sitio cuando los necesites.
- Elige entre 7 fondos de pantalla incluidos, una imagen local o 48 colores de fondo.
- Utiliza un tema oscuro, claro o del sistema y muestra la hora y la fecha locales si lo deseas.
- Adapta la interfaz automáticamente al idioma de Firefox y respeta la preferencia del sistema de reducir el movimiento.

## Cargar en Firefox

Para obtener iconos de sitios web se necesita Firefox 128 o posterior, ya que esta función utiliza [`optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions).

1. Descarga o clona este repositorio y conserva su estructura de archivos.
2. Abre `about:debugging#/runtime/this-firefox` en Firefox.
3. Haz clic en **Cargar complemento temporal…** y selecciona `manifest.json` en la raíz del proyecto.
4. Si aparece una solicitud, permite que la extensión sustituya la página de nueva pestaña.
5. Abre una nueva pestaña. Haz clic derecho en un área vacía para añadir tu primer sitio o abre la configuración con el engranaje de la esquina inferior derecha.

La instalación temporal termina al reiniciar Firefox; después tendrás que cargar la extensión de nuevo. Consulta la [guía de instalación temporal de Mozilla](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Accesos directos a sitios web

### Añadir y administrar sitios

La lista de sitios empieza vacía. Haz clic derecho en un área vacía del fondo para acceder a estas acciones:

| Acción | Resultado |
| --- | --- |
| Añadir icono | Añade un sitio al grupo actual. |
| Cambiar fondo de pantalla | Abre la configuración en la sección de fondos incluidos. |
| Configuración | Abre el panel de configuración. |

Introduce un nombre de hasta 50 caracteres y una dirección HTTP o HTTPS. Si omites el protocolo, se añade `https://` automáticamente. Al hacer clic en un acceso directo, el sitio se abre en la pestaña actual.

Haz clic derecho en un acceso directo o utiliza su botón de tres puntos para abrirlo, editarlo, cambiar su tamaño o eliminarlo. El botón aparece al pasar el cursor o recibir el foco del teclado y permanece visible en dispositivos táctiles. La eliminación requiere confirmación; cancelar el editor descarta los cambios sin guardar.

### Tamaños de icono y capacidad de la cuadrícula

Cada grupo dispone de una cuadrícula lógica de escritorio de **10 columnas × 6 filas**, con **60 celdas básicas** en total.

| Tamaño | Columnas × filas | Celdas básicas |
| --- | --- | --- |
| Normal | 1 × 1 | 1 |
| Icono ancho | 2 × 1 | 2 |
| Icono alto | 1 × 2 | 2 |
| Icono grande | 2 × 2 | 4 |

Un grupo admite hasta 60 accesos directos normales. Los iconos más grandes también necesitan celdas libres distribuidas con la forma adecuada. Cuando el grupo está lleno, se desactiva la opción de añadir. Al añadir, mover entre grupos o cambiar el tamaño, se comprueba el espacio disponible. Cada sitio conserva su propio tamaño.

Arrastra los accesos directos a celdas vacías o sobre otros accesos para reorganizarlos. Las posiciones y los huecos se guardan. Pulsa **Esc** o cancela el arrastre para restaurar la disposición original; arrastra cerca del borde del área de desplazamiento para alcanzar más celdas.

La cuadrícula se alinea con la esquina superior izquierda del área junto a la barra lateral y solo se desplaza cuando es necesario. Las ventanas estrechas usan menos columnas y guardan posiciones independientes para cada número de columnas. Arrastrar en una vista estrecha no sobrescribe las posiciones de escritorio, y cambiar únicamente el tamaño de la ventana no guarda posiciones nuevas. En una vista de una columna, los iconos anchos reducen temporalmente su anchura y la recuperan cuando hay espacio.

### Grupos

La barra lateral incluye inicialmente el grupo **Favoritos**. Usa **Añadir grupo** para crear más grupos, con nombres de hasta 20 caracteres. En la configuración del grupo puedes cambiar el nombre y usar texto, un emoji o una imagen local como icono.

Arrastra un sitio sobre un grupo para moverlo allí, incluso sobre su icono cuando la barra lateral está plegada. Si no hay espacio suficiente en el destino, el sitio permanece en su posición original.

Usa la flecha de la parte superior para plegar o desplegar la barra lateral. Se guardan el grupo actual y el estado plegado. Puedes renombrar o eliminar cualquier grupo, incluido el inicial, pero debe quedar al menos uno. Al eliminar un grupo, sus sitios e iconos pasan al primer grupo restante.

Los cambios de grupo usan animaciones verticales según el orden de la barra lateral. Los cambios de tamaño de los iconos y de la barra lateral también tienen transiciones suaves. Estos efectos respetan el ajuste del sistema de reducir el movimiento.

### Iconos personalizados y obtenidos de sitios

- Sube archivos PNG, JPEG, WebP, GIF, AVIF o ICO de hasta **2 MiB** para los iconos de sitios o grupos.
- Si no hay un icono personalizado, se muestra el primer carácter del nombre del sitio. **Usar icono predeterminado** restaura esta opción.
- Los iconos conservan la proporción, nunca se amplían y su lado más largo se limita a **512 px**. Se comprimen a WebP con una calidad aproximada de **0,8** y se reducen más si hace falta para cumplir el límite de **128 KiB** de datos guardados por icono.
- Los iconos PNG guardados anteriormente siguen siendo compatibles. Para mejorar un icono antiguo comprimido a 128 px, vuelve a subir la imagen original u obtén el icono de nuevo.

Introduce la dirección del sitio y haz clic en **Obtener icono**. Firefox solicitará acceso a ese sitio cuando sea necesario. La extensión lee los iconos declarados por el sitio y también prueba `/favicon.ico`; después convierte el resultado en una vista previa local. Haz clic en **Guardar** para conservarlo. Si la solicitud falla o deniegas el permiso, se mantiene el icono actual y puedes seguir subiendo imágenes locales. No se utiliza ningún servicio de iconos de terceros.

## Apariencia y fondos

Haz clic en el engranaje inferior derecho para abrir el panel de configuración. Ciérralo con su botón de cierre, haciendo clic fuera o pulsando **Esc**.

| Ajuste | Opciones y comportamiento |
| --- | --- |
| Tema | **Oscuro**, **Claro** o **Seguir el sistema**; por defecto sigue el sistema. |
| Mostrar reloj | Desactivado por defecto. Muestra la hora local en formato de 24 horas `HH:mm:ss` y una fecha adaptada al idioma; se actualiza cada segundo. |
| Fondos incluidos | 7 imágenes en dos columnas; haz clic en una miniatura para aplicarla y guardarla. |
| Imagen de fondo local | PNG, JPEG, WebP, GIF o AVIF de hasta **10 MiB**; se aplica y guarda al seleccionarla. |
| Colores de fondo | 48 colores; haz clic en una muestra para aplicarla y guardarla. |
| Fondo predeterminado | Blanco (`#ffffff`), utilizado al iniciar por primera vez o al restaurar el fondo predeterminado. |

El tema cambia los controles, menús y diálogos y conserva el fondo de pantalla o color elegido. Los títulos y el reloj usan texto oscuro sobre fondos de color claro. Las preferencias de tema, visibilidad del reloj y barra lateral plegada se sincronizan entre las nuevas pestañas abiertas de la misma extensión.

## Idioma de la interfaz

La interfaz sigue el idioma de visualización de Firefox mediante [`browser.i18n.getUILanguage()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/getUILanguage). No hay un selector de idioma independiente.

Se admiten chino simplificado, chino tradicional, inglés, japonés, coreano, español, francés, alemán y portugués, incluidas las variantes de Brasil y Portugal. Las variantes regionales utilizan la traducción correspondiente o una genérica; los idiomas no compatibles recurren al chino simplificado. Abre una nueva pestaña después de cambiar el idioma de Firefox.

Se traducen los menús, ajustes, diálogos, mensajes, etiquetas de accesibilidad, nombres de colores, nombre de la extensión, fechas y nombre del grupo predeterminado. Los títulos, URL y nombres de grupos introducidos por el usuario conservan su texto original. El reloj siempre utiliza la zona horaria local.

## Datos locales y permisos

| Almacenamiento | Contenido |
| --- | --- |
| `localStorage` | Sitios, iconos, posiciones en la cuadrícula, grupos, grupo actual, estado de la barra lateral, tema y visibilidad del reloj. |
| `IndexedDB` | Selección de fondo e imágenes de fondo locales. |

Las imágenes subidas permanecen en el navegador. La gestión de accesos directos y fondos no requiere permisos adicionales. Solo se solicita acceso a un sitio al pulsar **Obtener icono**, y denegarlo no impide subir imágenes locales. Los fondos no utilizan servicios de imágenes externos. Si el almacenamiento local no está disponible, las operaciones de gestión muestran un error.

### Compatibilidad con datos antiguos

- Los accesos directos incluidos en versiones antiguas se eliminan según sus identificadores de preajuste; se conservan los sitios añadidos por el usuario y sus iconos personalizados.
- La antigua función de carpetas se ha eliminado. Sus sitios pasan a la cuadrícula principal de su grupo y conservan nombres, URL, iconos y tamaños.
- Si los datos antiguos superan la capacidad, los sitios restantes se mantienen en **Otros sitios web**, donde pueden abrirse, editarse o eliminarse. Vuelven a la cuadrícula cuando queda espacio.

## Desarrollo

### Estructura del proyecto

| Archivos | Función |
| --- | --- |
| `manifest.json` | Metadatos, sustitución de nueva pestaña y permisos opcionales para sitios. |
| `newtab.html`, `newtab.css`, `newtab.js` | Estructura, estilos básicos, reloj y fecha. |
| `i18n.js`, `_locales/` | Traducciones de la interfaz y catálogos de mensajes de WebExtension. |
| `shortcuts.js`, `groups.js`, `sidebar.js` | Gestión de sitios, grupos y estado de la barra lateral. |
| `shortcut-layout.js`, `shortcut-grid.js` | Capacidad, reglas de colocación, medidas y arrastre. |
| `shortcut-tile-motion.js`, `shortcut-page-transition.js` | Animaciones de tamaño de iconos y cambio de grupo. |
| `shortcut-menu.js`, `background-menu.js` | Menús contextuales de accesos directos y fondo. |
| `icon-utils.js`, `shortcut-icon-fetcher.js` | Procesamiento común de iconos y obtención de iconos bajo demanda. |
| `shortcut-migrations.js` | Compatibilidad con datos guardados en versiones anteriores. |
| `background.js`, `background-presets.js`, `assets/` | Almacenamiento de fondos, lista de fondos incluidos e imágenes. |
| `settings.js` | Panel de configuración, tema y preferencias del reloj. |
| `wallpaper-picker.css`, `sidebar.css`, `ui-effects.css`, `shortcut-board.css` | Estilos del selector de fondos, barra lateral, efectos y cuadrícula. |
| `README*.md`, `LICENSE` | Documentación en 8 idiomas y texto de la licencia. |

### Editar y recargar

No es necesario instalar dependencias ni ejecutar una compilación. Tras editar los archivos fuente, pulsa **Recargar** para la extensión en `about:debugging#/runtime/this-firefox`, cierra la página de nueva pestaña anterior y abre una nueva.

Las referencias locales a CSS y JavaScript en `newtab.html` usan una versión común de recursos, `?v=...`. Actualiza estos parámetros juntos cuando cambies esos recursos. Mantén el orden de dependencias: carga `i18n.js` primero, las utilidades compartidas antes de los módulos que las usan y los módulos de grupos, cuadrícula, menús, transiciones y migración antes de `shortcuts.js`. Los módulos mantienen su estado privado en ámbitos separados y colaboran mediante interfaces explícitas o eventos. El procesamiento de iconos y las reglas de capacidad tienen una sola implementación cada uno; los estilos del selector de fondos se limitan al panel de configuración.

### Actualizar traducciones

Utiliza las mismas claves de mensaje en `_locales/*/messages.json`. Inserta valores con nombre mediante `newTabI18n.t(key, { name, count })` y traduce contenido estático con `data-i18n`, `data-i18n-title`, `data-i18n-aria-label` y `data-i18n-placeholder`. Incluye los menús dentro de las plantillas, actualiza juntos los catálogos regionales equivalentes y mantén alineadas las 8 versiones del README. Consulta la [guía de internacionalización de Mozilla](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).

## Licencia

Consulta [LICENSE](LICENSE) para ver la GNU General Public License v3.0.
