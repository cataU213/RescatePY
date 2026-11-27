const test=require('node:test');const assert=require('node:assert/strict');
const {instalar,asegurar,calificacion,texto,idVal}=require('../seguimiento');
const entregas=require('../entregas');
const futuro=()=>new Date(Date.now()+600000).toISOString();
function entorno({uid=10,rol=uid===10?'DONANTE':'ORGANIZACION',ajeno=false,estadoLote='ACTIVA',estadoOferta='PENDIENTE',estadoNecesidad='ACTIVA',duplicada=false,horarioAceptado=null,fallarAviso=false,yaAvisado=false,entrega=false}={}){
 const rutas={},sql=[];let commits=0,rollbacks=0;
 const app={get(p,...f){rutas['GET '+p]=f.at(-1);},post(p,...f){rutas['POST '+p]=f.at(-1);}};
 const d={ID:4,USUARIO_ID:10,STATUS:estadoLote,FOOD:'Arroz',QUANTITY:5,UNIT:'kg',FOOD_TYPE:'fresh',FOOD_CONDITION:'good',HYGIENE:'yes',REQUIRES_COLD:0};
 const n={ID:2,ORGANIZACION_ID:3,ESTADO:estadoNecesidad,ALIMENTO:'Arroz'};
 const o={ID:3,USUARIO_ID:20,TIPO_ORGANIZACION:'COMEDOR',NOMBRE_ORGANIZACION:'Comedor',REPRESENTANTE:'Responsable',DISTRITO:'Asunción'};
 const f={ID:6,NECESIDAD_ID:2,DONACION_ID:4,DONANTE_ID:10,ORGANIZACION_UID:20,ESTADO:estadoOferta};
 const r={ID:7,ESTADO:'PENDIENTE',USUARIO_SOLICITANTE_ID:20,USUARIO_ID:10,RECEIVER_NAME:'Comedor'};
 const ms=Date.now()+600000;
 const c={async execute(s,b){assert.doesNotMatch(s,/:uid\b/i,'UID es una palabra reservada de Oracle');sql.push({s,b});let rows=[],rowsAffected=1;
 if(fallarAviso&&s.startsWith('INSERT INTO NOTIFICACIONES'))throw new Error('Oracle: fallo de notificación');
 if(s.includes('SELECT u.ID,u.TIPO_CUENTA')||s.includes('SELECT u.TIPO_CUENTA'))rows=[{ID:uid,TIPO_CUENTA:rol}];
 else if(s.includes('SELECT * FROM DONACIONES'))rows=[d];
 else if(s.includes('SELECT n.* FROM RP_NECESIDADES'))rows=[n];
 else if(s.includes('SELECT o.* FROM ORGANIZACIONES'))rows=[o];
 else if(s.includes('SELECT ID FROM RP_OFERTAS'))rows=duplicada?[f]:[];
 else if(s.includes('SELECT * FROM RP_OFERTAS'))rows=ajeno?[]:[f];
 else if(s.includes('SELECT ID FROM USUARIOS'))rows=[{ID:10}];
 else if(s.includes('SELECT r.ID,r.ESTADO,r.USUARIO_SOLICITANTE_ID'))rows=ajeno?[]:[r];
 else if(s.includes('SELECT r.DONACION_ID'))rows=ajeno?[]:[{DONACION_ID:4}];
 else if(s.includes('SELECT * FROM RESERVAS'))rows=[r];
 else if(s.includes('SELECT * FROM RP_ENTREGAS'))rows=[{RESULTADO:'PENDIENTE',RETIRO_MS:ms,HORARIO_ACEPTADO_MS:horarioAceptado===true?ms:horarioAceptado}];
 else if(s.includes('SELECT e.RESERVA_ID,e.RETIRO_MS'))rows=[{RESERVA_ID:7,RETIRO_MS:ms,FOOD:'Arroz'}];
 else if(s.startsWith('UPDATE RP_ENTREGAS SET AVISO_PROXIMO_MS'))rowsAffected=yaAvisado?0:1;
 return {rows,rowsAffected,outBinds:{rid:[7]}};},async commit(){commits++;},async rollback(){rollbacks++;},async close(){}};
 const deps={autenticar:()=>{},obtenerConexion:async()=>c,obtenerTodos:async()=>[],oracleDriver:{BIND_OUT:3003,NUMBER:2010}};
 if(entrega)entregas.instalarEntregas(app,deps);else instalar(app,deps,entregas);
 const req={usuario:{id:uid},params:{id:'6'},body:{}};const res={codigo:200,status(n){this.codigo=n;return this;},json(d){this.datos=d;return this;}};
 return {rutas,sql,req,res,ms,get commits(){return commits;},get rollbacks(){return rollbacks;}};
}
async function llamar(x,ruta,body={},id=6){x.req.body=body;x.req.params.id=String(id);await x.rutas[ruta](x.req,x.res);return x;}
const post='/api/seguimiento/';
test('migraciones idempotentes para ofertas, chat, valoración y horario',async()=>{const q=[];await asegurar(async s=>q.push(s));await asegurar(async s=>q.push(s),true);assert.equal(q.length,5);for(const s of q)assert.match(s,/SQLCODE != -(955|1430)/);assert.ok(q.some(s=>s.includes('REFERENCES RP_NECESIDADES')));});
test('validación de valoraciones, texto e identificadores',()=>{assert.deepEqual(calificacion({plataforma:5,experiencia:4,comentario:' bien '}),{plataforma:5,experiencia:4,comentario:'bien'});for(const x of [0,6,'5',null,2.5])assert.throws(()=>calificacion({plataforma:x,experiencia:4}));assert.throws(()=>texto(' ',1000));assert.throws(()=>texto('x'.repeat(501),500));assert.throws(()=>idVal('abc'));});
test('donante ofrece lote apto a la organización de la necesidad y notifica',async()=>{const x=await llamar(entorno(),'POST '+post+'ofertas',{necesidadId:2,donacionId:4,mensaje:'Tengo arroz'});assert.equal(x.res.codigo,200);assert.equal(x.commits,1);assert.ok(x.sql.some(q=>q.s.startsWith('INSERT INTO RP_OFERTAS')&&q.b.usuarioId===10&&q.b.oid===20));assert.ok(x.sql.some(q=>q.s.startsWith('INSERT INTO NOTIFICACIONES')&&q.b.rp_user_id===20&&q.b.rp_reserva_id===null));});
test('rechaza roles incorrectos, lotes no disponibles, necesidades cerradas y duplicados',async()=>{for(const [opts,codigo] of [[{uid:20},403],[{estadoLote:'RESERVADA'},409],[{estadoNecesidad:'CERRADA'},409],[{duplicada:true},409]]){const x=await llamar(entorno(opts),'POST '+post+'ofertas',{necesidadId:2,donacionId:4});assert.equal(x.res.codigo,codigo);assert.equal(x.commits,0);assert.equal(x.rollbacks,1);}});
test('aceptar oferta reserva lote, fecha y notifica en la misma transacción',async()=>{const x=await llamar(entorno({uid:20}),'POST '+post+'ofertas/:id/responder',{respuesta:'SI',fechaRetiro:futuro()});assert.equal(x.res.codigo,200);assert.equal(x.commits,1);assert.equal(x.res.datos.reservaId,7);for(const fragmento of ['INSERT INTO RESERVAS','INSERT INTO RP_ENTREGAS','UPDATE DONACIONES SET STATUS=\'RESERVADA\'','UPDATE RP_OFERTAS SET ESTADO=\'ACEPTADA\'','INSERT INTO NOTIFICACIONES'])assert.ok(x.sql.some(q=>q.s.includes(fragmento)),fragmento);assert.ok(x.sql.some(q=>q.s.includes('FOR UPDATE')&&q.s.includes('DONACIONES')));});
test('no se acepta oferta ajena, ya respondida, o lote reservado por otro',async()=>{for(const [opts,codigo] of [[{uid:20,ajeno:true},404],[{uid:20,estadoOferta:'ACEPTADA'},409],[{uid:20,estadoLote:'RESERVADA'},409],[{uid:10},403]]){const x=await llamar(entorno(opts),'POST '+post+'ofertas/:id/responder',{respuesta:'SI',fechaRetiro:futuro()});assert.equal(x.res.codigo,codigo);assert.equal(x.commits,0);}});
test('rechazar no reserva ni consume el lote',async()=>{const x=await llamar(entorno({uid:20}),'POST '+post+'ofertas/:id/responder',{respuesta:'NO'});assert.equal(x.commits,1);assert.ok(x.sql.some(q=>q.s.includes("ESTADO='RECHAZADA'")));assert.ok(!x.sql.some(q=>q.s.includes('INSERT INTO RESERVAS')));});
test('un fallo de notificación revierte la aceptación completa',async()=>{const x=await llamar(entorno({uid:20,fallarAviso:true}),'POST '+post+'ofertas/:id/responder',{respuesta:'SI',fechaRetiro:futuro()});assert.equal(x.res.codigo,500);assert.equal(x.commits,0);assert.equal(x.rollbacks,1);});
test('chat de ambos participantes guarda mensaje y avisa a la contraparte',async()=>{for(const uid of [10,20]){const x=await llamar(entorno({uid}),'POST '+post+'chat/:id',{mensaje:'Nos vemos a las 10'},7);assert.equal(x.commits,1);assert.ok(x.sql.some(q=>q.s.includes('INSERT INTO RP_CHAT_ENTREGA')&&q.b.usuarioId===uid&&q.b.id===7));assert.ok(x.sql.some(q=>q.s.includes('INSERT INTO NOTIFICACIONES')&&q.b.rp_user_id===(uid===10?20:10)));}});
test('chat ajeno se rechaza para lectura y escritura',async()=>{for(const metodo of ['GET','POST']){const x=await llamar(entorno({uid:30,ajeno:true}),metodo+' '+post+'chat/:id',{mensaje:'Hola'},7);assert.equal(x.res.codigo,404);assert.equal(x.commits,0);}});
test('calificación se guarda para el usuario autenticado y no para otro',async()=>{const x=await llamar(entorno(),'POST '+post+'calificacion',{plataforma:5,experiencia:4,comentario:'OK',usuarioId:999});assert.equal(x.commits,1);assert.ok(x.sql.some(q=>q.s.includes('MERGE INTO RP_CALIFICACIONES')&&q.b.usuarioId===10));});
test('horario acepta únicamente donante y versión exacta; sin duplicar aviso',async()=>{for(const [opts,delta,code,avisos] of [[{uid:10,estadoLote:'RESERVADA'},0,200,1],[{uid:10,estadoLote:'RESERVADA',horarioAceptado:true},0,200,0],[{uid:10,estadoLote:'RESERVADA'},1,409,0],[{uid:20,estadoLote:'RESERVADA'},0,403,0]]){const x=entorno({...opts,entrega:true});await llamar(x,'POST /api/entregas/:id/aceptar-horario',{retiroMs:x.ms+delta},7);assert.equal(x.res.codigo,code);assert.equal(x.sql.filter(q=>q.s.startsWith('INSERT INTO NOTIFICACIONES')).length,avisos);}});
test('recordatorio próximo no se duplica y no lo genera la organización',async()=>{for(const [opts,esperado] of [[{},1],[{yaAvisado:true},0],[{uid:20},0]]){const x=await llamar(entorno(opts),'POST '+post+'recordatorios');assert.equal(x.res.datos.generados,esperado);assert.equal(x.sql.filter(q=>q.s.startsWith('INSERT INTO NOTIFICACIONES')).length,esperado);}});
test('frontend incluye acciones, reglas de rol y código fuente idéntico a distribución',()=>{const fs=require('node:fs'),p=require('node:path'),raiz=p.resolve(__dirname,'../../frontend');for(const f of ['app.js','entregas-ui.js','necesidades-ui.js','seguimiento-ui.js','auth-client.js'])assert.deepEqual(fs.readFileSync(p.join(raiz,'src',f)),fs.readFileSync(p.join(raiz,'dist',f)));const h=fs.readFileSync(p.join(raiz,'index.html'),'utf8');assert.match(h,/calificarSeguimientoBtn/);assert.match(h,/ofertasSeguimientoBtn/);assert.doesNotMatch(h,/ecovalor/i);assert.match(fs.readFileSync(p.join(raiz,'src/necesidades-ui.js'),'utf8'),/Tengo este excedente/);assert.match(fs.readFileSync(p.join(raiz,'src/auth-client.js'),'utf8'),/abrirAyudarBtn.*tipoCuenta === "DONANTE"/);});

test('consulta inicial de lotes y calificación usa parámetros Oracle válidos',async()=>{for(const ruta of ['lotes','calificacion','ofertas']){const x=await llamar(entorno(),'GET '+post+ruta);assert.equal(x.res.codigo,200);assert.ok(x.sql.some(q=>q.b?.usuarioId===10));}});

test('menú sin Tu ayuda cerca y acceso a ofertas desde necesidades',()=>{const fs=require('node:fs'),p=require('node:path'),raiz=p.resolve(__dirname,'../../frontend');assert.doesNotMatch(fs.readFileSync(p.join(raiz,'index.html'),'utf8'),/id="abrirAyudaCercaBtn"/);const n=fs.readFileSync(p.join(raiz,'src/necesidades-ui.js'),'utf8');assert.match(n,/data-mis-ofertas/);assert.match(n,/Tus ofertas:/);const ui=fs.readFileSync(p.join(raiz,'src/seguimiento-ui.js'),'utf8');assert.ok(ui.indexOf("button('Guardar calificación'")<ui.indexOf("const datos=await api('/calificacion')"));});

test('chat y calificación se preparan incluso si una migración anterior falla',async()=>{const q=[];await assert.rejects(asegurar(async s=>{q.push(s);if(s.includes('CREATE TABLE RP_CHAT_ENTREGA'))throw new Error('DDL de prueba');}));assert.ok(q.some(s=>s.includes('CREATE TABLE RP_CALIFICACIONES')));assert.ok(q.some(s=>s.includes('AVISO_PROXIMO_MS')));});
test('lectura de chat verifica participante y usa límite Oracle',async()=>{const x=await llamar(entorno(),'GET '+post+'chat/:id',{},7);assert.equal(x.res.codigo,200);assert.ok(x.sql.some(q=>q.s.includes('ROWNUM <= 200')&&q.b.id===7));});

test('mensaje persiste aunque falle aviso auxiliar',async()=>{const x=await llamar(entorno({fallarAviso:true}),'POST '+post+'chat/:id',{mensaje:'Hola'},7);assert.equal(x.res.codigo,200);assert.equal(x.res.datos.notificado,false);assert.equal(x.commits,1);assert.equal(x.rollbacks,0);});
test('bandeja de chats restringe a los participantes',async()=>{const x=await llamar(entorno(),'GET '+post+'chats');assert.equal(x.res.codigo,200);assert.ok(x.sql.some(q=>q.s.includes('AS CONTRAPARTE')&&q.s.includes('r.USUARIO_SOLICITANTE_ID=:usuarioId OR d.USUARIO_ID=:usuarioId')&&q.b.usuarioId===10));});

test('consulta de cuenta y aviso usan binds explícitos no reservados',async()=>{const x=await llamar(entorno(),'POST '+post+'chat/:id',{mensaje:'Hola'},7);const cuenta=x.sql.find(q=>q.s.includes('SELECT u.ID,u.TIPO_CUENTA'));assert.match(cuenta.s,/:rp_actor_id\b/);assert.deepEqual(cuenta.b,{rp_actor_id:10});const aviso=x.sql.find(q=>q.s.startsWith('INSERT INTO NOTIFICACIONES'));assert.match(aviso.s,/:rp_user_id,:rp_reserva_id,:rp_mensaje/);assert.deepEqual(aviso.b,{rp_user_id:20,rp_reserva_id:7,rp_mensaje:'Tenés un nuevo mensaje en el chat de coordinación de entrega.'});});
