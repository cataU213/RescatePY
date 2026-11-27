const test = require('node:test');
const assert = require('node:assert/strict');
const { validarNecesidad, asegurarTablaNecesidades, instalarRutasNecesidades } = require('../necesidades');
const base = {alimento:' Arroz ',cantidad:12.5,unidad:'kg',detalle:' Para almuerzo '};
test('normaliza la necesidad y no acepta identidad desde el formulario',()=>assert.deepEqual(validarNecesidad({...base,organizacionId:999}),{alimento:'Arroz',cantidad:12.5,unidad:'kg',detalle:'Para almuerzo'}));
test('rechaza valores inválidos',()=>{for(const datos of [{cantidad:0},{cantidad:-1},{cantidad:Infinity},{cantidad:'10'},{cantidad:1.2345},{unidad:'otra'},{alimento:' '},{detalle:'x'.repeat(501)}]) assert.throws(()=>validarNecesidad({...base,...datos}));});
test('DDL adicional e idempotente',async()=>{const sql=[];await asegurarTablaNecesidades(async(q)=>sql.push(q));assert.match(sql[0],/CREATE TABLE RP_NECESIDADES/);assert.match(sql[0],/SQLCODE != -955/);assert.match(sql[0],/REFERENCES ORGANIZACIONES\(ID\)/);assert.match(sql[1],/CREATE TABLE RP_OFERTAS/);});
function entorno() {
    const rutas = {}, llamadas=[];
    const app={get:(p,...h)=>rutas['GET '+p]=h,post:(p,...h)=>rutas['POST '+p]=h,put:(p,...h)=>rutas['PUT '+p]=h,delete:(p,...h)=>rutas['DELETE '+p]=h};
    const autenticar=()=>{}, exigirOrganizacion=()=>{}, exigirDonante=()=>{};
    instalarRutasNecesidades(app,{autenticar,exigirOrganizacion,exigirDonante,
        ejecutar:async(sql,binds)=>{llamadas.push({sql,binds});return {rowsAffected:1};},
        obtenerTodos:async(sql,binds)=>{llamadas.push({sql,binds});return [];}});
    const res={codigo:200,status(c){this.codigo=c;return this;},json(v){this.body=v;return this;}};
    return {rutas,llamadas,res,autenticar,exigirOrganizacion,exigirDonante};
}
test('todas las rutas nuevas requieren autenticación y rol',()=>{const e=entorno();for(const [ruta,h] of Object.entries(e.rutas)){assert.equal(h[0],e.autenticar);assert.equal(h[1],ruta.includes('/donante/')?e.exigirDonante:e.exigirOrganizacion);}});
test('publicación utiliza organización autenticada',async()=>{const e=entorno();await e.rutas['POST /api/comedor/necesidades'][2]({body:{...base,organizacionId:999},organizacion:{ID:7}},e.res);assert.equal(e.res.codigo,201);assert.equal(e.llamadas[0].binds.id,7);});
test('publicación inválida no escribe Oracle',async()=>{const e=entorno();await e.rutas['POST /api/comedor/necesidades'][2]({body:{...base,cantidad:0},organizacion:{ID:7}},e.res);assert.equal(e.res.codigo,400);assert.equal(e.llamadas.length,0);});
test('listado de organización filtra por propietario',async()=>{const e=entorno();await e.rutas['GET /api/comedor/necesidades'][2]({organizacion:{ID:7}},e.res);assert.match(e.llamadas[0].sql,/n.ORGANIZACION_ID = :id/);assert.equal(e.llamadas[0].binds.id,7);});
test('listado para donantes solo incluye necesidades activas de organizaciones activas',async()=>{const e=entorno();await e.rutas['GET /api/donante/necesidades'][2]({},e.res);assert.match(e.llamadas[0].sql,/n.ESTADO = 'ACTIVA'/);assert.match(e.llamadas[0].sql,/o.ESTADO = 'ACTIVA'/);});
test('eliminar necesidad conserva historial y exige propietario',async()=>{const e=entorno();await e.rutas['DELETE /api/comedor/necesidades/:id'][2]({params:{id:'2'},organizacion:{ID:7}},e.res);assert.match(e.llamadas[0].sql,/ORGANIZACION_ID\s*=\s*:org AND ESTADO='ACTIVA'/);assert.deepEqual(e.llamadas[0].binds,{id:2,org:7});});
test('editar necesidad usa propietario autenticado',async()=>{const e=entorno();await e.rutas['PUT /api/comedor/necesidades/:id'][2]({params:{id:'2'},body:base,organizacion:{ID:7}},e.res);assert.equal(e.res.codigo,200);assert.equal(e.llamadas[0].binds.org,7);assert.match(e.llamadas[0].sql,/ORGANIZACION_ID\s*=\s*:org/);});
test('edición inválida no escribe',async()=>{const e=entorno();await e.rutas['PUT /api/comedor/necesidades/:id'][2]({params:{id:'2'},body:{...base,cantidad:0},organizacion:{ID:7}},e.res);assert.equal(e.res.codigo,400);assert.equal(e.llamadas.length,0);});
