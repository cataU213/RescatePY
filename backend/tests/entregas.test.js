const test=require('node:test');
const assert=require('node:assert/strict');
const {validarFecha,resultado,asegurarTablaEntregas,instalarEntregas}=require('../entregas');
const ahora=Date.parse('2026-11-27T12:00:00.000Z');
test('fecha futura válida y vencimiento paraguayo',()=>{
 assert.equal(validarFecha('2026-11-27T15:00:00.000Z',{EXPIRY_DATE:'2026-11-28'},ahora),Date.parse('2026-11-27T15:00:00.000Z'));
 assert.throws(()=>validarFecha('2026-11-28T12:00:00.000Z',{EXPIRY_DATE:'2026-11-28'},ahora),/vencimiento/);
 assert.equal(validarFecha('2026-11-27T11:00:00.000Z',{},ahora),Date.parse('2026-11-27T11:00:00.000Z'));
 assert.throws(()=>validarFecha('2026-11-27T02:59:00.000Z',{},ahora),/anterior/);
 assert.throws(()=>validarFecha('2026-02-30T12:00:00.000Z',{},ahora));
 assert.throws(()=>validarFecha('',{},ahora));
});
test('resultado bilateral y discrepancias',()=>{
 for(const [d,o,r] of [[null,'SI','PENDIENTE'],['SI',null,'PENDIENTE'],['SI','SI','ENTREGADA'],['NO','NO','NO_REALIZADA'],['SI','NO','DISCREPANCIA'],['NO','SI','DISCREPANCIA']])assert.equal(resultado(d,o),r);
});
test('migración solo agrega tabla e incluye restricciones',async()=>{let consultas=[];await asegurarTablaEntregas(async s=>consultas.push(s));const sql=consultas.join(' ');assert.match(sql,/CREATE TABLE RP_ENTREGAS/);assert.match(sql,/REFERENCES RESERVAS/);assert.match(sql,/SQLCODE != -955/);assert.match(sql,/DONANTE_TELEFONO/);});
// Dobles de Oracle y Express para probar respuestas, autorización y transacciones.
function entorno({uid=10,d=null,o=null,fecha=Date.now()-1000,existe=true,pendientes=[],fallaContacto=false,fallaConsulta=false}={}){
 const rutas={},llamadas=[];let commits=0,rollbacks=0;
 const app={use(fn){rutas.middleware=fn;},get(p,...f){rutas['GET '+p]=f.at(-1);},post(p,...f){rutas['POST '+p]=f.at(-1);}};
 const c={async execute(sql,binds){llamadas.push({sql,binds});let rows=[];
  if(sql.includes('SELECT u.TIPO_CUENTA'))rows=[{TIPO_CUENTA:uid===10?'DONANTE':'ORGANIZACION'}];
  else if(sql.includes('SELECT r.DONACION_ID'))rows=existe?[{DONACION_ID:8}]:[];
  else if(sql.includes('SELECT * FROM DONACIONES'))rows=[{ID:8,USUARIO_ID:10,STATUS:'RESERVADA',FOOD:'Arroz'}];
  else if(sql.includes('SELECT * FROM RESERVAS'))rows=[{ID:7,USUARIO_SOLICITANTE_ID:20,ESTADO:'PENDIENTE',RECEIVER_NAME:'Comedor'}];
  else if(sql.includes('SELECT * FROM RP_ENTREGAS'))rows=fecha==null?[]:[{RESULTADO:'PENDIENTE',RETIRO_MS:fecha,DONANTE_RESP:d,ORGANIZACION_RESP:o}];
  return {rows};},async commit(){commits++;},async rollback(){rollbacks++;},async close(){}};
 const auth=(req,res,next)=>next();
 instalarEntregas(app,{autenticar:auth,obtenerConexion:async()=>c,obtenerTodos:async(sql,binds)=>{llamadas.push({sql,binds});if(fallaContacto&&sql.includes('o.TELEFONO'))throw Object.assign(new Error('Contacto no disponible'),{code:'ORA-00904'});if(fallaConsulta&&sql.includes('e.RETIRO_MS'))throw Object.assign(new Error('Consulta fallida'),{code:'ORA-00904'});return pendientes;}});
 const req={params:{id:'7'},usuario:{id:uid},body:{respuesta:'SI'}};
 const res={codigo:200,status(n){this.codigo=n;return this;},json(v){this.datos=v;return this;}};
 return {rutas,llamadas,req,res,get commits(){return commits;},get rollbacks(){return rollbacks;}};
}
test('primera confirmación no cierra ni contabiliza donación',async()=>{const x=entorno();await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.equal(x.commits,1);assert.ok(x.llamadas.some(q=>q.sql.includes('DONANTE_RESP=:resp')&&q.binds.estado==='PENDIENTE'));assert.ok(!x.llamadas.some(q=>q.sql.startsWith('UPDATE DONACIONES')));});
test('segunda confirmación positiva finaliza como RETIRADA',async()=>{const x=entorno({uid:20,d:'SI'});await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.equal(x.commits,1);assert.ok(x.llamadas.some(q=>q.sql.includes('ORGANIZACION_RESP=:resp')&&q.binds.estado==='ENTREGADA'));assert.ok(x.llamadas.some(q=>q.sql.startsWith('UPDATE DONACIONES')&&q.binds.final==='RETIRADA'));});
test('discrepancia cancela sin reofertar ni marcar entrega',async()=>{const x=entorno({uid:20,d:'SI'});x.req.body.respuesta='NO';await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.ok(x.llamadas.some(q=>q.binds.estado==='DISCREPANCIA'));assert.ok(x.llamadas.some(q=>q.sql.startsWith('UPDATE DONACIONES')&&q.binds.final==='CANCELADA'));});
test('dos respuestas negativas quedan como NO_REALIZADA',async()=>{const x=entorno({uid:20,d:'NO'});x.req.body.respuesta='NO';await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.ok(x.llamadas.some(q=>q.binds.estado==='NO_REALIZADA'));});
test('no permite confirmar anticipadamente ni duplicar respuesta',async()=>{for(const opts of [{fecha:Date.now()+600000},{d:'SI'}]){const x=entorno(opts);await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.equal(x.res.codigo,409);assert.equal(x.commits,0);assert.equal(x.rollbacks,1);}});
test('usuario ajeno no puede confirmar',async()=>{const x=entorno({uid:30,existe:false});await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.equal(x.res.codigo,404);assert.equal(x.commits,0);});
test('organización puede coordinar reserva anterior y notifica al donante',async()=>{const x=entorno({uid:20,fecha:null});x.req.body={fechaRetiro:new Date(Date.now()+600000).toISOString()};await x.rutas['POST /api/entregas/:id/coordinar'](x.req,x.res);assert.equal(x.commits,1);assert.ok(x.llamadas.some(q=>q.sql.startsWith('INSERT INTO RP_ENTREGAS')));assert.ok(x.llamadas.some(q=>q.sql.includes('INSERT INTO NOTIFICACIONES')&&q.binds.usuarioId===10));});
test('donante no puede coordinar y organización no puede registrar teléfono del donante',async()=>{for(const [uid,accion] of [[10,'coordinar'],[20,'contacto']]){const x=entorno({uid});await x.rutas['POST /api/entregas/:id/'+accion](x.req,x.res);assert.equal(x.res.codigo,403);assert.equal(x.commits,0);}});
test('teléfono del donante se registra y notifica al receptor',async()=>{const x=entorno({fecha:Date.now()+600000});x.req.body={telefono:'0981 123456'};await x.rutas['POST /api/entregas/:id/contacto'](x.req,x.res);assert.equal(x.commits,1);assert.ok(x.llamadas.some(q=>q.sql.includes('DONANTE_TELEFONO=:telefono')));assert.ok(x.llamadas.some(q=>q.binds.usuarioId===20&&q.sql.includes('INSERT INTO NOTIFICACIONES')));});
test('no instala middleware de bloqueo de otras funcionalidades',()=>{const x=entorno({pendientes:[{ID:7}]});assert.equal(x.rutas.middleware,undefined);});
test('consulta de entregas funciona y usa binds explícitos',async()=>{const x=entorno({pendientes:[{ID:7}]});await x.rutas['GET /api/entregas'](x.req,x.res);assert.equal(x.res.codigo,200);assert.equal(x.res.datos.entregas.length,1);assert.ok(x.llamadas.every(q=>q.binds.usuarioId===10));});
test('aviso no modal, sin salida obligatoria ni bloqueo por error',()=>{const fs=require('node:fs'),path=require('node:path');const s=fs.readFileSync(path.resolve(__dirname,'../../frontend/src/entregas-ui.js'),'utf8');assert.match(s,/createElement\('aside'\)/);assert.match(s,/Ahora no/);assert.doesNotMatch(s,/bloqueo\.showModal|logoutButton/);assert.doesNotMatch(s,/Mis respuestas|Reporte de mis entregas/);});
test('frontend fuente y distribución coinciden, sin EcoValor',()=>{const fs=require('node:fs'),path=require('node:path'),raiz=path.resolve(__dirname,'../../frontend');for(const f of ['app.js','organizacion.js','entregas-ui.js'])assert.deepEqual(fs.readFileSync(path.join(raiz,'src',f)),fs.readFileSync(path.join(raiz,'dist',f)));assert.doesNotMatch(fs.readFileSync(path.join(raiz,'index.html'),'utf8'),/ecovalor/i);});

test('un fallo de contacto no impide consultar ni confirmar entregas',async()=>{const x=entorno({pendientes:[{ID:7}],fallaContacto:true});await x.rutas['GET /api/entregas'](x.req,x.res);assert.equal(x.res.codigo,200);assert.equal(x.res.datos.entregas.length,1);await x.rutas['POST /api/entregas/:id/confirmar'](x.req,x.res);assert.equal(x.commits,1);});
test('un fallo Oracle informa código y no instala bloqueo general',async()=>{const x=entorno({pendientes:[{ID:7}],fallaConsulta:true});await x.rutas['GET /api/entregas'](x.req,x.res);assert.equal(x.res.codigo,500);assert.equal(x.res.datos.codigo,'ORA-00904');assert.equal(x.rutas.middleware,undefined);});

test('reporte agregado no publica datos personales y consulta Oracle',async()=>{const x=entorno({pendientes:[{TOTAL:3}]});await x.rutas['GET /api/impacto-entregas']({},x.res);assert.equal(x.res.codigo,200);assert.equal(x.res.datos.publicadas,3);assert.ok(x.llamadas.some(q=>q.sql.includes('GROUP BY e.RESULTADO')));assert.ok(x.llamadas.some(q=>q.sql.includes('WHERE EXISTS')));assert.ok(x.llamadas.every(q=>!q.sql.includes('EMAIL')));});
test('reporte solo en Inteligencia social, sin botones duplicados en organización',()=>{const fs=require('node:fs'),path=require('node:path'),raiz=path.resolve(__dirname,'../../frontend/src');const app=fs.readFileSync(path.join(raiz,'app.js'),'utf8'),org=fs.readFileSync(path.join(raiz,'organizacion.js'),'utf8');assert.match(app,/fetch\('\/api\/impacto-entregas'/);assert.match(app,/modalSocial/);assert.doesNotMatch(org,/data-necesidades|data-disponibles/);assert.match(org,/data-entregas/);});
