// Coordinación y doble confirmación de las entregas. No modifica las tablas anteriores.
const ZONA = 'America/Asuncion';
function fechaLocal(ms) { return new Intl.DateTimeFormat('en-CA',{timeZone:ZONA,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms)); }
function mostrarFecha(ms) { return new Intl.DateTimeFormat('es-PY',{timeZone:ZONA,dateStyle:'short',timeStyle:'short'}).format(new Date(ms)); }
function validarFecha(valor, lote, ahora=Date.now()) {
    // El formulario expresa hora paraguaya; se transporta como instante ISO UTC.
    if(typeof valor!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(valor)) throw new Error('Indicá fecha y hora de retiro.');
    const ms=Date.parse(valor);
    if(!Number.isFinite(ms)||new Date(ms).toISOString()!==valor||fechaLocal(ms)<fechaLocal(ahora)) throw new Error('La fecha de retiro no puede ser anterior al día de hoy (Paraguay).');
    const vence=lote.EXPIRY_DATE instanceof Date?lote.EXPIRY_DATE.toISOString().slice(0,10):String(lote.EXPIRY_DATE||'').slice(0,10);
    if(vence && (!/^\d{4}-\d{2}-\d{2}$/.test(vence)||fechaLocal(ms)>=vence)) throw new Error('El retiro debe ser anterior al vencimiento.');
    return ms;
}
function resultado(d,o) { return !d||!o?'PENDIENTE':d==='SI'&&o==='SI'?'ENTREGADA':d==='NO'&&o==='NO'?'NO_REALIZADA':'DISCREPANCIA'; }
async function asegurarTablaEntregas(ejecutar) {
    await ejecutar(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE RP_ENTREGAS (
      RESERVA_ID NUMBER PRIMARY KEY REFERENCES RESERVAS(ID), RETIRO_MS NUMBER(16) NOT NULL,
      DONANTE_RESP VARCHAR2(2) CHECK (DONANTE_RESP IN (''SI'',''NO'')),
      DONANTE_TELEFONO VARCHAR2(40),
      ORGANIZACION_RESP VARCHAR2(2) CHECK (ORGANIZACION_RESP IN (''SI'',''NO'')),
      DONANTE_EN TIMESTAMP WITH TIME ZONE, ORGANIZACION_EN TIMESTAMP WITH TIME ZONE,
      RESULTADO VARCHAR2(20) DEFAULT ''PENDIENTE'' NOT NULL CHECK (RESULTADO IN (''PENDIENTE'',''ENTREGADA'',''NO_REALIZADA'',''DISCREPANCIA'',''CANCELADA'')))';
      EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF; END;`);
    // Migración idempotente para instalaciones anteriores. No borra datos.
    await ejecutar(`BEGIN EXECUTE IMMEDIATE 'ALTER TABLE RP_ENTREGAS ADD (DONANTE_TELEFONO VARCHAR2(40))';
      EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1430 THEN RAISE; END IF; END;`);
    await require("./seguimiento").asegurar(ejecutar);
}
const base=`FROM RESERVAS r JOIN DONACIONES d ON d.ID=r.DONACION_ID LEFT JOIN RP_ENTREGAS e ON e.RESERVA_ID=r.ID`;
const participante=`(d.USUARIO_ID=:usuarioId OR r.USUARIO_SOLICITANTE_ID=:usuarioId)`;
async function notificar(c,uid,id,mensaje) { await c.execute(`INSERT INTO NOTIFICACIONES (USUARIO_ID,RESERVA_ID,MENSAJE,LEIDA,CREADO_EN) VALUES (:usuarioId,:id,:mensaje,0,SYSTIMESTAMP)`,{usuarioId:uid,id,mensaje}); }
async function crearCoordinacion(c,id,ms) { await c.execute(`INSERT INTO RP_ENTREGAS (RESERVA_ID,RETIRO_MS) VALUES (:id,:ms)`,{id,ms}); }
function instalarEntregas(app,{autenticar,obtenerTodos,obtenerConexion}) {
    require("./seguimiento").instalar(app,{autenticar,obtenerConexion},{validarFecha,mostrarFecha,crearCoordinacion});
    // Reporte público agregado: no expone nombres, contactos ni reservas individuales.
    app.get('/api/impacto-entregas',async(req,res)=>{try {
        const publicaciones=await obtenerTodos(`SELECT COUNT(*) AS TOTAL FROM DONACIONES`,{});
        const resultados=await obtenerTodos(`SELECT e.RESULTADO,LOWER(TRIM(d.UNIT)) AS UNIDAD,COUNT(*) AS LOTES,SUM(d.QUANTITY) AS CANTIDAD
            FROM RP_ENTREGAS e JOIN RESERVAS r ON r.ID=e.RESERVA_ID JOIN DONACIONES d ON d.ID=r.DONACION_ID
            WHERE e.RESULTADO IN ('ENTREGADA','NO_REALIZADA','DISCREPANCIA','PENDIENTE','CANCELADA') GROUP BY e.RESULTADO,LOWER(TRIM(d.UNIT))`,{});
        const alcance=await obtenerTodos(`SELECT COUNT(*) AS ORGANIZACIONES,NVL(SUM(COMENSALES),0) AS COMENSALES FROM ORGANIZACIONES o WHERE EXISTS (
            SELECT 1 FROM RESERVAS r JOIN RP_ENTREGAS e ON e.RESERVA_ID=r.ID WHERE r.USUARIO_SOLICITANTE_ID=o.USUARIO_ID AND e.RESULTADO='ENTREGADA')`,{});
        const historicas=await obtenerTodos(`SELECT COUNT(*) AS TOTAL FROM RESERVAS r WHERE r.ESTADO='RETIRADA' AND NOT EXISTS (SELECT 1 FROM RP_ENTREGAS e WHERE e.RESERVA_ID=r.ID)`,{});
        res.json({publicadas:Number(publicaciones[0]?.TOTAL||0),resultados,organizaciones:Number(alcance[0]?.ORGANIZACIONES||0),comensales:Number(alcance[0]?.COMENSALES||0),historicas:Number(historicas[0]?.TOTAL||0)});
    }catch(e){console.error('Impacto de entregas:',e);res.status(500).json({mensaje:'No se pudo consultar el impacto.'});}});
    // Las confirmaciones son informativas: nunca bloquean otras operaciones REST.
    app.get('/api/entregas',autenticar,async(req,res)=>{try {
        const uid=Number(req.usuario.id);
        const cuenta=await obtenerTodos(`SELECT ID FROM USUARIOS WHERE ID=:usuarioId AND ESTADO_CUENTA='ACTIVA'`,{usuarioId:uid});
        if(!cuenta.length)return res.status(403).json({mensaje:'Cuenta no activa.'});
        // Consulta principal sin depender de las columnas de contacto opcionales.
        const filas=await obtenerTodos(`SELECT r.ID,r.ESTADO,r.RECEIVER_NAME,d.ID AS DONACION_ID,d.FOOD,d.QUANTITY,d.UNIT,d.ADDRESS,d.CITY,d.DONOR_NAME,
           CASE WHEN d.USUARIO_ID=:usuarioId THEN 'DONANTE' ELSE 'ORGANIZACION' END AS ROL,
           e.RETIRO_MS,e.DONANTE_RESP,e.ORGANIZACION_RESP,e.RESULTADO,e.DONANTE_TELEFONO,e.HORARIO_ACEPTADO_MS
           ${base} WHERE ${participante} ORDER BY r.ID DESC`,{usuarioId:uid});
        // Si falla el contacto, las entregas y confirmaciones siguen disponibles.
        try {
            const contactos=await obtenerTodos(`SELECT r.ID,o.TELEFONO AS TELEFONO_ORGANIZACION,u.EMAIL AS EMAIL_DONANTE
                FROM RESERVAS r JOIN DONACIONES d ON d.ID=r.DONACION_ID
                LEFT JOIN ORGANIZACIONES o ON o.USUARIO_ID=r.USUARIO_SOLICITANTE_ID
                JOIN USUARIOS u ON u.ID=d.USUARIO_ID WHERE ${participante}`,{usuarioId:uid});
            const porId=new Map(contactos.map(x=>[String(x.ID),x]));
            for(const fila of filas) Object.assign(fila,porId.get(String(fila.ID))||{});
        } catch(error) { console.warn('Contacto de entregas no disponible:',error.message); }
        res.json({ahora:Date.now(),entregas:filas});
    }catch(e){console.error('Consulta de entregas:',e);res.status(500).json({mensaje:'No se pudieron consultar las entregas.',codigo:e.code||'ENTREGAS_ERROR'});}});
    // Bloquea el lote antes de modificar su reserva: mismo orden que la reserva/cancelación original.
    async function transaccion(req,res,accion) {
        let c;
        try {
            const id=Number(req.params.id),uid=Number(req.usuario.id);
            if(!Number.isSafeInteger(id)||id<=0) return res.status(400).json({mensaje:'Reserva inválida.'});
            c=await obtenerConexion();
            const cuenta=(await c.execute(`SELECT u.TIPO_CUENTA FROM USUARIOS u WHERE u.ID=:usuarioId AND u.ESTADO_CUENTA='ACTIVA' AND (u.TIPO_CUENTA='DONANTE' OR (u.TIPO_CUENTA='ORGANIZACION' AND EXISTS (SELECT 1 FROM ORGANIZACIONES o WHERE o.USUARIO_ID=u.ID AND o.ESTADO='ACTIVA')))`,{usuarioId:uid})).rows[0];
            if(!cuenta) throw Object.assign(new Error('Cuenta no activa.'),{status:403});
            const previa=(await c.execute(`SELECT r.DONACION_ID ${base} WHERE r.ID=:id AND ${participante}`,{id,usuarioId:uid})).rows[0];
            if(!previa) return res.status(404).json({mensaje:'Reserva no encontrada.'});
            const lote=(await c.execute('SELECT * FROM DONACIONES WHERE ID=:id FOR UPDATE',{id:previa.DONACION_ID})).rows[0];
            const r=(await c.execute('SELECT * FROM RESERVAS WHERE ID=:id FOR UPDATE',{id})).rows[0];
            const e=(await c.execute('SELECT * FROM RP_ENTREGAS WHERE RESERVA_ID=:id FOR UPDATE',{id})).rows[0];
            if(!lote||!r||lote.STATUS!=='RESERVADA'||r.ESTADO!=='PENDIENTE') throw Object.assign(new Error('La reserva ya fue cerrada.'),{status:409});
            // Una organización que donó antes del cambio de roles puede cerrar esa entrega histórica.
            if (Number(r.USUARIO_SOLICITANTE_ID)===uid && cuenta.TIPO_CUENTA!=='ORGANIZACION') throw Object.assign(new Error('Rol no autorizado.'),{status:403});
            await accion(c,id,uid,lote,r,e);
            await c.commit(); res.json({mensaje:'Operación registrada.'});
        }catch(e){if(c)await c.rollback().catch(()=>{});if(!e.status)console.error(e);res.status(e.status||500).json({mensaje:e.status?e.message:'No se pudo registrar la operación.'});}
        finally{if(c)await c.close().catch(()=>{});}
    }
    const fallo=(mensaje,status=409)=>{throw Object.assign(new Error(mensaje),{status});};
    // Permite coordinar reservas previas a esta actualización o cambiar antes de la cita.
    app.post('/api/entregas/:id/coordinar',autenticar,(req,res)=>transaccion(req,res,async(c,id,uid,lote,r,e)=>{
        if(Number(r.USUARIO_SOLICITANTE_ID)!==uid) fallo('Solo la organización receptora puede coordinar el retiro.',403);
        if(e&&(e.RESULTADO!=='PENDIENTE'||e.DONANTE_RESP||e.ORGANIZACION_RESP||Number(e.RETIRO_MS)<=Date.now())) fallo('La coordinación ya no puede modificarse.');
        let ms; try{ms=validarFecha(req.body?.fechaRetiro,lote);}catch(err){fallo(err.message,400);}
        if(e) await c.execute('UPDATE RP_ENTREGAS SET RETIRO_MS=:ms,HORARIO_ACEPTADO_MS=NULL,AVISO_PROXIMO_MS=NULL WHERE RESERVA_ID=:id',{ms,id}); else await crearCoordinacion(c,id,ms);
        await notificar(c,lote.USUARIO_ID,id,`${r.RECEIVER_NAME} coordina el retiro de ${lote.FOOD} para ${mostrarFecha(ms)} (hora Paraguay).`);
    }));
    // El teléfono opcional del donante se comparte solo con su organización receptora.
    app.post('/api/entregas/:id/contacto',autenticar,(req,res)=>transaccion(req,res,async(c,id,uid,lote,r,e)=>{
        if(Number(lote.USUARIO_ID)!==uid) fallo('Solo el donante puede registrar su teléfono.',403);
        if(!e||e.RESULTADO!=='PENDIENTE'||e.DONANTE_RESP||e.ORGANIZACION_RESP) fallo('La entrega no admite cambios de contacto.');
        const telefono=typeof req.body?.telefono==='string'?req.body?.telefono.trim():'';
        if(!/^[+0-9 ()-]{7,40}$/.test(telefono)||telefono.replace(/\D/g,'').length<7) fallo('Ingresá un teléfono válido.',400);
        await c.execute('UPDATE RP_ENTREGAS SET DONANTE_TELEFONO=:telefono WHERE RESERVA_ID=:id',{telefono,id});
        await notificar(c,r.USUARIO_SOLICITANTE_ID,id,`El donante de ${lote.FOOD} actualizó su contacto. Consultá Entregas y reportes.`);
    }));
    // Aceptación de la versión exacta del horario; no bloquea el resto de la aplicación.
    app.post('/api/entregas/:id/aceptar-horario',autenticar,(req,res)=>transaccion(req,res,async(c,id,uid,lote,r,e)=>{
        if(Number(lote.USUARIO_ID)!==uid) fallo('Solo el donante puede aceptar el horario.',403);
        if(!e||e.RESULTADO!=='PENDIENTE'||e.DONANTE_RESP||e.ORGANIZACION_RESP) fallo('La entrega no admite cambios.');
        if(Number(req.body?.retiroMs)!==Number(e.RETIRO_MS)) fallo('El horario cambió. Actualizá la coordinación.');
        if(Number(e.HORARIO_ACEPTADO_MS)===Number(e.RETIRO_MS)) return;
        await c.execute('UPDATE RP_ENTREGAS SET HORARIO_ACEPTADO_MS=:ms WHERE RESERVA_ID=:id',{ms:e.RETIRO_MS,id});
        await notificar(c,r.USUARIO_SOLICITANTE_ID,id,`El donante aceptó el horario de ${lote.FOOD}: ${mostrarFecha(e.RETIRO_MS)} (Paraguay).`);
    }));
    app.post('/api/entregas/:id/confirmar',autenticar,(req,res)=>transaccion(req,res,async(c,id,uid,lote,r,e)=>{
        const resp=req.body?.respuesta;
        if(!['SI','NO'].includes(resp)) fallo('Elegí sí o no.',400);
        if(!e||e.RESULTADO!=='PENDIENTE'||Number(e.RETIRO_MS)>Date.now()) fallo('La confirmación se habilita al llegar la fecha de retiro.');
        const donante=Number(lote.USUARIO_ID)===uid;
        if(!donante&&Number(r.USUARIO_SOLICITANTE_ID)!==uid) fallo('No autorizado.',403);
        if(donante?e.DONANTE_RESP:e.ORGANIZACION_RESP) fallo('Tu respuesta ya fue registrada.');
        const d=donante?resp:e.DONANTE_RESP, o=donante?e.ORGANIZACION_RESP:resp, estado=resultado(d,o);
        const columna=donante?'DONANTE':'ORGANIZACION';
        await c.execute(`UPDATE RP_ENTREGAS SET ${columna}_RESP=:resp,${columna}_EN=SYSTIMESTAMP,RESULTADO=:estado WHERE RESERVA_ID=:id`,{resp,estado,id});
        if(estado!=='PENDIENTE') {
            const final=estado==='ENTREGADA'?'RETIRADA':'CANCELADA';
            await c.execute(`UPDATE RESERVAS SET ESTADO=:final WHERE ID=:id`,{final,id});
            await c.execute(`UPDATE DONACIONES SET STATUS=:final, ${final==='RETIRADA'?'WITHDRAWN_AT':'CANCELLED_AT'}=SYSTIMESTAMP WHERE ID=:id`,{final,id:lote.ID});
        }
        await notificar(c,donante?r.USUARIO_SOLICITANTE_ID:lote.USUARIO_ID,id,estado==='PENDIENTE'?(donante?`El donante indicó ${resp==='SI'?'que entregó':'que no entregó'} ${lote.FOOD}. Confirmá la recepción.`:`La organización indicó ${resp==='SI'?'que recibió':'que no recibió'} ${lote.FOOD}. Confirmá la entrega.`):`Resultado de ${lote.FOOD}: ${estado}.`);
        if(estado!=='PENDIENTE') await notificar(c,uid,id,`Resultado de ${lote.FOOD}: ${estado}.`);
    }));
}
module.exports={asegurarTablaEntregas,instalarEntregas,validarFecha,mostrarFecha,resultado,crearCoordinacion};
