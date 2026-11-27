// Panel de necesidades compartidas: Oracle es la fuente de datos.
(() => {
    const auth = window.RescateAuth;
    const panel = document.createElement('dialog');
    panel.className = 'panel-organizacion panel-necesidades';
    panel.innerHTML = `<header><h2 data-titulo></h2><button type="button" data-cerrar aria-label="Cerrar">×</button></header>
      <p data-intro></p><form data-form class="campo-oculto">
      <label>Alimento necesario<input name="alimento" required maxlength="150" placeholder="Ej.: Arroz"></label>
      <label>Cantidad<input name="cantidad" type="number" min="0.001" max="999999999" step="0.001" required></label>
      <label>Unidad<select name="unidad">${['kg','g','litros','unidades','cajas','bolsas','paquetes','raciones'].map(u=>`<option>${u}</option>`).join('')}</select></label>
      <label>Observaciones<textarea name="detalle" maxlength="500" rows="3"></textarea></label>
      <button type="submit">Publicar necesidad</button><button type="button" data-cancelar-edicion hidden>Cancelar edición</button></form>
      <button type="button" data-actualizar>Actualizar listado</button><button type="button" data-mis-ofertas hidden>Mis ofertas enviadas</button><p data-estado role="status"></p><div data-lista></div>`;
    document.body.append(panel);
    const form = panel.querySelector('[data-form]');
    const lista = panel.querySelector('[data-lista]');
    const estado = panel.querySelector('[data-estado]');
    let version = 0;
    let rol = null;
    let enviando = false, editando = null;
    const cancelarEdicion=panel.querySelector('[data-cancelar-edicion]');
    function limpiar(){editando=null;form.reset();form.querySelector('[type=submit]').textContent='Publicar necesidad';cancelarEdicion.hidden=true;}
    cancelarEdicion.onclick=limpiar;
    const texto = (tag, value) => { const el = document.createElement(tag); el.textContent = value; return el; };
    const coincide = (v, r) => v === version && panel.open && auth.getUser()?.tipoCuenta === r;
    async function actualizar() {
        const r = rol, v = ++version;
        lista.replaceChildren(); estado.textContent = 'Consultando necesidades…';
        try {
            const filas = await auth.api(r === 'ORGANIZACION' ? '/comedor/necesidades' : '/donante/necesidades');
            // Consultar ofertas propias para mostrar el estado persistido de cada necesidad.
            let ofertas = []; let falloOfertas = false;
            if(r === 'DONANTE') try { ofertas = await auth.api('/seguimiento/ofertas'); } catch(e) { falloOfertas = true; }
            if (!coincide(v, r)) return;
            estado.textContent = falloOfertas ? 'No se pudo consultar el estado de tus ofertas. Podés reintentar.' : filas.length ? '' : 'No hay necesidades publicadas.';
            for (const n of filas) {
                const card = document.createElement('article');
                card.append(texto('h3', `${n.ALIMENTO} · ${n.CANTIDAD} ${n.UNIDAD}`), texto('p', `${n.NOMBRE_ORGANIZACION} · ${n.DISTRITO || 'Sin distrito'}`));
                if (n.DETALLE) card.append(texto('p', n.DETALLE));
                if (r === 'ORGANIZACION' && n.ESTADO === 'ACTIVA') {
                    const editar=texto('button','Editar'); editar.type='button';
                    editar.onclick=()=>{ if(enviando)return;editando=n.ID;for(const [campo,valor] of Object.entries({alimento:n.ALIMENTO,cantidad:n.CANTIDAD,unidad:n.UNIDAD,detalle:n.DETALLE||''}))form.elements.namedItem(campo).value=valor;form.querySelector('[type=submit]').textContent='Guardar cambios';cancelarEdicion.hidden=false;form.scrollIntoView({block:'start'});form.elements.namedItem('alimento').focus();};
                    const btn=texto('button','Eliminar');btn.type='button';btn.className='entrega-no';
                    btn.onclick=async()=>{if(enviando||!confirm('¿Eliminar esta necesidad?'))return;enviando=true;btn.disabled=true;try{await auth.api(`/comedor/necesidades/${n.ID}`,{method:'DELETE'});if(editando===n.ID)limpiar();if(panel.open&&rol===r)await actualizar();}catch(e){if(panel.open&&rol===r)estado.textContent=e.message;}finally{enviando=false;btn.disabled=false;}};
                    card.append(editar,btn);
                } else if (r === 'DONANTE') {
                    const enviadas = ofertas.filter(f=>Number(f.NECESIDAD_ID)===Number(n.ID));
                    if(enviadas.length){card.append(texto('p', 'Tus ofertas: '+enviadas.map(f=>f.ESTADO).join(', ')));const ver=texto('button','Ver mis ofertas');ver.type='button';ver.onclick=()=>{panel.close();window.RescateSeguimiento.ofertas();};card.append(ver);}
                    const btn = texto('button',enviadas.length?'Ofrecer otro lote':'Tengo este excedente'); btn.type='button';
                    btn.onclick = () => { panel.close(); window.RescateSeguimiento.ofrecer(n); }; card.append(btn);
                }
                lista.append(card);
            }
        } catch(e) { if (coincide(v,r)) estado.textContent=e.message; }
    }
    function abrir(r) {
        if (auth.getUser()?.tipoCuenta !== r) return;
        rol = r;
        panel.querySelector('[data-mis-ofertas]').hidden = r !== 'DONANTE';
        panel.querySelector('[data-titulo]').textContent = r === 'ORGANIZACION' ? 'Mis necesidades' : 'Necesidades de organizaciones';
        panel.querySelector('[data-intro]').textContent = r === 'ORGANIZACION' ? 'Publicá los alimentos que necesita tu organización. Los donantes podrán consultarlos.' : 'Consultá los alimentos que necesitan las organizaciones y publicá una donación si podés ayudar.';
        form.classList.toggle('campo-oculto', r !== 'ORGANIZACION');
        document.getElementById('odsDropdown')?.classList.remove('activo');
        if (!panel.open) panel.showModal();
        actualizar();
    }
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (enviando || auth.getUser()?.tipoCuenta !== 'ORGANIZACION') return;
        const datos = Object.fromEntries(new FormData(form)); datos.cantidad = Number(datos.cantidad);
        enviando = true; const boton = form.querySelector('[type=submit]'); boton.disabled = true;
        try { await auth.api(editando===null?'/comedor/necesidades':`/comedor/necesidades/${editando}`, {method:editando===null?'POST':'PUT',body:JSON.stringify(datos)}); limpiar(); if (panel.open && rol === 'ORGANIZACION') await actualizar(); }
        catch(e) { if (panel.open && rol === 'ORGANIZACION') estado.textContent=e.message; }
        finally { enviando=false; boton.disabled=false; }
    });
    panel.querySelector('[data-cerrar]').onclick=()=>panel.close();
    panel.querySelector('[data-actualizar]').onclick=actualizar;
    panel.querySelector('[data-mis-ofertas]').onclick=()=>{panel.close();window.RescateSeguimiento.ofertas();};
    panel.addEventListener('close',()=>{version++; lista.replaceChildren(); limpiar();});
    document.addEventListener('rescate:sesion',()=>{if(panel.open) panel.close(); version++;});
    document.getElementById('necesidadesDonanteBtn')?.addEventListener('click',()=>abrir('DONANTE'));
    document.getElementById('necesidadesOrganizacionBtn')?.addEventListener('click',()=>abrir('ORGANIZACION'));
    window.RescateNecesidades = { abrirOrganizacion:()=>abrir('ORGANIZACION') };
})();
