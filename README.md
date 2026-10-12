# RescatePY

Versión completa de RescatePY con:

- HTML, CSS y JavaScript
- Node.js + Express
- Oracle Database
- Registro de usuarios
- Login con JWT
- Permisos por propietario
- Reservas
- Notificaciones

## Base de datos

Esta versión usa **solamente Oracle**.

### 1. Crear el esquema

En Oracle SQL Developer podés ejecutar primero, como administrador:

```text
database/00_crear_usuario_rescatepy.sql
```

Después conectate con el usuario `RESCATEPY` y ejecutá:

```text
database/01_rescatepy_oracle.sql
```

### 2. Configurar el backend

Entrá en:

```text
backend/
```

Copiá:

```text
.env.example
```

como:

```text
.env
```

y configurá:

```env
PORT=3000
JWT_SECRET=TU_CLAVE_PRIVADA
ORACLE_USER=RESCATEPY
ORACLE_PASSWORD=TU_CLAVE_ORACLE
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1
```

### 3. Instalar dependencias

Desde `backend/`:

```powershell
npm install
```

### 4. Ejecutar

```powershell
npm start
```

Abrí:

```text
http://localhost:3000
```

## Importante

El archivo `backend/.env` no debe subirse a GitHub.

El frontend y sus estilos se conservaron sin modificaciones respecto de la versión entregada por el usuario.
