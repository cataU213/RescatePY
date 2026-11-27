# 🌱 RescatePY

### Plataforma web para la gestión solidaria de donaciones

RescatePY permite publicar donaciones, solicitar reservas y gestionar
notificaciones entre usuarios mediante una aplicación web con autenticación
y control de permisos.

---

## 🚀 Accesos rápidos

<p align="left">

  <!-- Repositorio -->
  <a href="https://github.com/cataU213/RescatePY" title="Ver código">
    <img
      src="https://cdn.simpleicons.org/github/ffffff"
      width="48"
      height="48"
      alt="GitHub"
    />
  </a>
  &nbsp;&nbsp;&nbsp;

  <!-- Node.js -->
  <a href="https://nodejs.org/en/docs" title="Documentación Node.js">
    <img
      src="https://cdn.simpleicons.org/nodedotjs/5FA04E"
      width="48"
      height="48"
      alt="Node.js"
    />
  </a>
  &nbsp;&nbsp;&nbsp;

  <!-- Oracle -->
 <!-- Oracle: abre la documentación oficial -->
<a href="https://docs.oracle.com/en/database/" title="Oracle Database">
  <img
    src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/oracle/oracle-original.svg"
    width="48"
    height="48"
    alt="Oracle"
  />
</a>

</p>

---

## 🛠️ Tecnologías utilizadas

<p align="left">

  <!-- HTML5 -->
  <a href="https://developer.mozilla.org/es/docs/Web/HTML" title="Documentación HTML">
    <img
      src="https://cdn.simpleicons.org/html5/E34F26"
      width="42"
      height="42"
      alt="HTML5"
    />
  </a>
  &nbsp;&nbsp;

  <!-- CSS -->
  <a href="https://developer.mozilla.org/es/docs/Web/CSS" title="Documentación CSS">
    <img
      src="https://cdn.simpleicons.org/css/663399"
      width="42"
      height="42"
      alt="CSS"
    />
  </a>
  &nbsp;&nbsp;

  <!-- JavaScript -->
  <a href="https://developer.mozilla.org/es/docs/Web/JavaScript" title="Documentación JavaScript">
    <img
      src="https://cdn.simpleicons.org/javascript/F7DF1E"
      width="42"
      height="42"
      alt="JavaScript"
    />
  </a>
  &nbsp;&nbsp;

  <!-- Node.js -->
  <a href="https://nodejs.org/en/docs" title="Documentación Node.js">
    <img
      src="https://cdn.simpleicons.org/nodedotjs/5FA04E"
      width="42"
      height="42"
      alt="Node.js"
    />
  </a>
  &nbsp;&nbsp;

  <!-- Express -->
  <a href="https://expressjs.com/" title="Documentación Express">
    <img
      src="https://cdn.simpleicons.org/express/ffffff"
      width="42"
      height="42"
      alt="Express"
    />
  </a>
  &nbsp;&nbsp;

  <!-- Oracle -->
  <!-- Oracle: abre la documentación oficial -->
<a href="https://docs.oracle.com/en/database/" title="Oracle Database">
  <img
    src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/oracle/oracle-original.svg"
    width="48"
    height="48"
    alt="Oracle"
  />
</a>
  &nbsp;&nbsp;

  <!-- JWT -->
  <a href="https://jwt.io/" title="Información sobre JWT">
    <img
      src="https://cdn.simpleicons.org/jsonwebtokens/D63AFF"
      width="42"
      height="42"
      alt="JWT"
    />
  </a>

</p>

---

## ✨ Funcionalidades

- Registro de usuarios.
- Inicio de sesión mediante JWT.
- Publicación de donaciones.
- Edición y eliminación únicamente por el propietario.
- Reserva de donaciones por otros usuarios.
- Notificaciones al propietario cuando alguien solicita una donación.
- Confirmación de retiro.
- Persistencia de información mediante Oracle Database.

---

## ☁️ Despliegue e infraestructura

RescatePY se encuentra desplegado en servicios en la nube:

🚀 **Render**  
Aloja y mantiene en ejecución la aplicación web y el backend desarrollado con Node.js y Express.

☁️ **Oracle Cloud Infrastructure (OCI)**  
Aloja la base de datos Oracle utilizada por el sistema.

🐙 **GitHub**  
Se utiliza para el control de versiones y almacenamiento del código fuente.

> 💡 **Nota:** La aplicación puede demorar algunos segundos en cargar inicialmente debido al tiempo de activación del servicio alojado en Render.
---
## 🧩 Arquitectura

```text
Frontend
HTML + CSS + JavaScript
        │
        ▼
Backend
Node.js + Express
        │
        ▼
Oracle Database





## 📄 Validación documental con OCR

El módulo de documentos para comedores permite cargar archivos PDF, PNG y JPG desde el menú ODS. El backend utiliza Tesseract para extraer texto, guarda los originales y resultados en Oracle y compara RUC/CI con los datos institucionales registrados. La salida es una ayuda de revisión y no una aprobación oficial automática.

Para instalación y uso, consultá [`backend/README-OCR.md`](backend/README-OCR.md).


## Registro de comedores con OCR

La carga documental se realiza directamente en el formulario **Registrarme → COMEDOR**.
El formulario requiere al menos una evidencia PDF, JPG o PNG y permite hasta cinco archivos
de hasta 12 MB cada uno. El backend guarda los originales en Oracle BLOB, el texto OCR en
CLOB y consolida el expediente en APROBADO, NO_VERIFICABLE o RECHAZADO.

- APROBADO: RUC y CI reconocidos coinciden con los datos registrados y la confianza OCR
  promedio alcanza el umbral configurado.
- NO_VERIFICABLE: falta información legible o no se alcanza la evidencia necesaria. Se permite
  iniciar sesión para completar el expediente.
- RECHAZADO: se detectan identificadores incompatibles con alta confianza; se bloquea el login.

La comparación OCR es una comprobación interna de consistencia. No sustituye la consulta
a los registros oficiales de DNIT ni certifica por sí sola la autenticidad del documento.
