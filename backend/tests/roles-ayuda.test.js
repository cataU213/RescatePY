const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '../../');
const leer = rel => fs.readFileSync(path.join(raiz,rel),'utf8');
const app = leer('frontend/src/app.js');
const auth = leer('frontend/src/auth-client.js');
const funciones = app.slice(app.indexOf('function puedePublicarAyuda('), app.indexOf('/* Abre formulario de ayuda no alimentaria. */'));
const contexto = vm.createContext({window:{}});
vm.runInContext(funciones, contexto);
const donante = {id:10,tipoCuenta:'DONANTE'};
const org = {id:11,tipoCuenta:'ORGANIZACION'};
// Verifica la política del formulario real, sin depender de Oracle.
test('ambos perfiles pueden publicar artículos, invitados no',()=>{
    assert.equal(contexto.puedePublicarAyuda(donante),true);
    assert.equal(contexto.puedePublicarAyuda(org),true);
    assert.equal(contexto.puedePublicarAyuda(null),false);
});
test('organización puede donar juguetes pero no usar categoría alimentaria',()=>{
    assert.equal(contexto.categoriaAyudaPermitida('Juguetes',org),true);
    assert.equal(contexto.categoriaAyudaPermitida('Alimento no perecedero',org),false);
    assert.equal(contexto.categoriaAyudaPermitida('Alimento no perecedero',donante),true);
});
test('las ayudas nuevas solo se gestionan por su autor',()=>{
    const ayuda={ownerId:11,ownerRole:'ORGANIZACION'};
    assert.equal(contexto.puedeGestionarAyuda(ayuda,org),true);
    assert.equal(contexto.puedeGestionarAyuda(ayuda,donante),false);
    assert.equal(contexto.puedeGestionarAyuda(ayuda,{...org,id:12}),false);
});
test('se conserva el comportamiento previo para ayudas antiguas sin propietario',()=>{
    assert.equal(contexto.puedeGestionarAyuda({},donante),true);
    assert.equal(contexto.puedeGestionarAyuda({},org),false);
});
test('menú, categorías y distribución conservan los permisos solicitados',()=>{
    assert.match(auth,/getElementById\("abrirDonacionBtn"\)\?\.classList\.toggle\("campo-oculto", esOrganizacion\)/);
    assert.match(auth,/getElementById\("abrirAyudarBtn"\)\?\.classList\.remove\("campo-oculto"\)/);
    assert.match(auth,/getElementById\("necesidadesOrganizacionBtn"\).*?!esOrganizacion/);
    assert.match(auth,/getElementById\("necesidadesDonanteBtn"\).*?!== "DONANTE"/);
    assert.match(auth,/getElementById\("misReservasBtn"\).*?!== "ORGANIZACION"/);
    assert.match(leer('frontend/index.html'),/option value="Juguetes"/);
    assert.doesNotMatch(leer('frontend/index.html'),/ecovalor/i);
    for(const f of ['app.js','auth-client.js']) assert.equal(leer('frontend/src/'+f),leer('frontend/dist/'+f));
});
