// Panel de coordinación y confirmación bilateral. Los resultados se guardan en Oracle.
(() => {
    const auth=window.RescateAuth;
    const boton=document.getElementById('entregasBtn');
    const panel=document.createElement('dialog');
    panel.className='panel-organizacion panel-entregas';
    panel.innerHTML='<header><h2>Coordinar entregas</h2><button type="button" data-cerrar>×</button></header><p data-aviso></p><div data-lista aria-live="polite"></div>';
    // Aviso no modal: permite seguir utilizando todas las pantallas.
    const aviso=document.createElement('aside');
    aviso.className='aviso-entregas'; aviso.hidden=true;
    aviso.setAttribute('aria-label','Confirmaciones de entregas');
    aviso.innerHTML='<header><strong>Confirmaciones de entrega</strong><button type="button" data-cerrar-aviso aria-label="Cerrar aviso">×</button></header><p>¿Se realizó el retiro previsto? Registrá el resultado para el reporte.</p><div data-lista aria-live="polite"></div><button type="button" data-posponer>Ahora no</button>';
    document.body.append(panel,aviso);
    const zona='America/Asuncion';
    const formatear=ms=>new Intl.DateTimeFormat('es-PY',{timeZone:zona,dateStyle:'short',timeStyle:'short'}).format(new Date(Number(ms)));
    const local=ms=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;};
    // Convierte una hora de Paraguay a UTC sin depender de la zona del navegador.
    function convertir(valor){
        if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor))throw new Error('Indicá fecha y hora de retiro.');
        const objetivo=Date.parse(valor+':00Z'); let ms=objetivo;
        for(let i=0;i<3;i++) ms+=objetivo-Date.parse(local(ms)+':00Z');
        if(!Number.isFinite(ms)||local(ms)!==valor)throw new Error('Fecha u hora inválida.');
        return new Date(ms).toISOString();
    }
    window.RescateEntregas={convertir,local,abrir:()=>{if(!auth.requireAuth())return;if(!panel.open)panel.showModal();actualizar(true);}};
    const txt=(tag,t)=>{const e=document.createElement(tag);e.textContent=t;return e;};
    const propio=r=>r.ROL==='DONANTE'?r.DONANTE_RESP:r.ORGANIZACION_RESP;
    const debe=(r,ahora)=>r.ESTADO==='PENDIENTE'&&r.RESULTADO==='PENDIENTE'&&r.RETIRO_MS!=null&&Number(r.RETIRO_MS)<=ahora&&!propio(r);
    let ocupado=false,version=0,ultimaFirma='',firmaPospuesta='',reservasPropias=new Map(),verHistorial=false,firmaFilas='';
    const historial=txt('button','Ver historial de coordinación');historial.type='button';historial.onclick=()=>{verHistorial=!verHistorial;historial.textContent=verHistorial?'Ver entregas pendientes':'Ver historial de coordinación';actualizar(true);};panel.querySelector('[data-aviso]').after(historial);
    window.RescateEntregas.reservaPropia=id=>reservasPropias.get(String(id));
    function botonAccion(t,fn){const b=txt('button',t);b.type='button';b.onclick=async()=>{if(ocupado)return;ocupado=true;b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{ocupado=false;b.disabled=false;}};return b;}
    async function enviar(r,ruta,datos){await auth.api(`/entregas/${r.ID}/${ruta}`,{method:'POST',body:JSON.stringify(datos)});await actualizar(true); window.actualizarImpactoEntregas?.(); await Promise.allSettled([Promise.resolve().then(()=>auth.syncDonations()),Promise.resolve().then(()=>auth.refreshNotifications())]);}
    function ficha(r,ahora,obligatoria=false){
        const card=document.createElement('article');
        const estado=r.RESULTADO|| (r.ESTADO==='PENDIENTE'?'SIN FECHA':r.ESTADO==='RETIRADA'?'RETIRO HISTÓRICO':'CANCELADA');
        card.append(txt('h3',`${r.FOOD} · ${r.QUANTITY} ${r.UNIT}`),txt('p',`${r.ROL==='DONANTE'?'Organización: '+r.RECEIVER_NAME:'Donante: '+r.DONOR_NAME} · ${r.CITY}, ${r.ADDRESS}`),txt('p',r.RETIRO_MS?`Retiro: ${formatear(r.RETIRO_MS)} (hora Paraguay)`:'Sin fecha de retiro'),txt('p',`Resultado: ${estado.replaceAll('_',' ')}`));
        if(r.ESTADO==='PENDIENTE') {
            if(r.ROL==='DONANTE'&&r.TELEFONO_ORGANIZACION)card.append(txt('p',`Teléfono de la organización: ${r.TELEFONO_ORGANIZACION}`));
            if(r.ROL==='ORGANIZACION'&&r.DONANTE_TELEFONO)card.append(txt('p',`Teléfono del donante: ${r.DONANTE_TELEFONO}`));
            if(r.ROL==='ORGANIZACION'&&r.EMAIL_DONANTE)card.append(txt('p',`Contacto del donante: ${r.EMAIL_DONANTE}`));
        }
        if(!obligatoria){
            if(r.RETIRO_MS) card.append(txt('p',Number(r.HORARIO_ACEPTADO_MS)===Number(r.RETIRO_MS)?'Horario aceptado por el donante':'Horario pendiente de aceptación'));
            if(r.ROL==='DONANTE'&&r.ESTADO==='PENDIENTE'&&r.RETIRO_MS&&!r.DONANTE_RESP&&!r.ORGANIZACION_RESP&&Number(r.HORARIO_ACEPTADO_MS)!==Number(r.RETIRO_MS))card.append(botonAccion('Aceptar horario de entrega',()=>enviar(r,'aceptar-horario',{retiroMs:Number(r.RETIRO_MS)})));
            const chat=txt('button','Abrir chat de coordinación');chat.type='button';chat.onclick=()=>{panel.close();window.RescateSeguimiento.chat(r.ID,()=>window.RescateEntregas.abrir());};card.append(chat);
        }
        if(r.RETIRO_MS&&Number(r.RETIRO_MS)>ahora&&!propio(r))card.append(txt('p','La confirmación Sí/No se habilitará automáticamente al llegar la hora indicada.'));
        if(r.RETIRO_MS)card.append(txt('p',`Donante: ${r.DONANTE_RESP||'Sin responder'} · Organización: ${r.ORGANIZACION_RESP||'Sin responder'}`));
        if(debe(r,ahora)){
            const pregunta=r.ROL==='DONANTE'?'¿Realizaste la entrega?':'¿Recibiste los alimentos?';card.append(txt('strong',pregunta));
            for(const [resp,etiqueta] of [['SI',r.ROL==='DONANTE'?'Sí, entrega realizada':'Sí, recibí la donación'],['NO',r.ROL==='DONANTE'?'Entrega no realizada':'No recibí la donación']]){
                const b=botonAccion(etiqueta,async()=>{await enviar(r,'confirmar',{respuesta:resp});});
                if(resp==='NO')b.classList.add('entrega-no');card.append(b);
            }
        }else if(!obligatoria&&r.ROL==='ORGANIZACION'&&r.ESTADO==='PENDIENTE'&&(!r.RETIRO_MS||(r.RESULTADO==='PENDIENTE'&&Number(r.RETIRO_MS)>ahora&&!r.DONANTE_RESP&&!r.ORGANIZACION_RESP))){
            const label=txt('label','Fecha y hora de retiro (Paraguay)'); const input=document.createElement('input');input.type='datetime-local';input.required=true;input.min=local(ahora).slice(0,10)+'T00:00';input.value=local(r.RETIRO_MS?Number(r.RETIRO_MS):ahora);label.append(input);card.append(label,botonAccion(r.RETIRO_MS?'Reprogramar retiro':'Voy a retirar',async()=>{if(!input.reportValidity())return;await enviar(r,'coordinar',{fechaRetiro:convertir(input.value)});}));
        }
        if(!obligatoria&&r.ROL==='DONANTE'&&r.ESTADO==='PENDIENTE'&&r.RESULTADO==='PENDIENTE'&&Number(r.RETIRO_MS)>ahora){
            const label=txt('label','Tu teléfono de contacto (opcional, visible solo para la organización receptora)');const input=document.createElement('input');input.type='tel';input.maxLength=40;input.value=r.DONANTE_TELEFONO||'';label.append(input);card.append(label,botonAccion('Guardar teléfono',()=>enviar(r,'contacto',{telefono:input.value})));
        }
        return card;
    }
    async function actualizar(forzar=false){
        const usuario=auth.getUser();boton?.classList.toggle('campo-oculto',!usuario);
        const v=++version;
        if(!usuario){firmaFilas='';reservasPropias.clear();if(panel.open)panel.close();aviso.hidden=true;ultimaFirma='';firmaPospuesta='';return;}
        try{
            const datos=await auth.api('/entregas');if(v!==version||auth.getUser()?.id!==usuario.id)return;
            const filas=datos.entregas||[],ahora=datos.ahora,pendientes=filas.filter(r=>debe(r,ahora));
            // Si la contraparte confirmó o cambió el horario, actualiza el catálogo y el historial sin recargar la página.
            const firmaNueva=JSON.stringify(filas.map(r=>[r.ID,r.ESTADO,r.RESULTADO,r.RETIRO_MS,r.DONANTE_RESP,r.ORGANIZACION_RESP,r.HORARIO_ACEPTADO_MS]));
            const cambioFilas=firmaNueva!==firmaFilas;firmaFilas=firmaNueva;
            if(cambioFilas){Promise.resolve().then(()=>auth.syncDonations()).catch(()=>{});window.actualizarImpactoEntregas?.();}
            const prev=JSON.stringify([...reservasPropias]);reservasPropias=new Map(filas.filter(r=>r.ROL==='ORGANIZACION'&&r.ESTADO==='PENDIENTE').map(r=>[String(r.DONACION_ID),r.RETIRO_MS||0]));
            if(prev!==JSON.stringify([...reservasPropias]))window.mostrarDonaciones?.();
            if(panel.open&&(forzar||cambioFilas||JSON.stringify(pendientes.map(r=>[r.ID,r.RETIRO_MS,r.ROL]))!==ultimaFirma)){panel.querySelector('[data-aviso]').textContent='Coordiná el retiro y confirmá la entrega.';const l=panel.querySelector('[data-lista]');l.replaceChildren(...filas.filter(r=>verHistorial?r.ESTADO!=='PENDIENTE':r.ESTADO==='PENDIENTE').map(r=>ficha(r,ahora)));if(!l.children.length)l.textContent=verHistorial?'No hay entregas históricas.':'No hay entregas por coordinar.';}
            if(pendientes.length){
                const firma=JSON.stringify(pendientes.map(r=>[r.ID,r.RETIRO_MS,r.ROL]));
                if(firma!==ultimaFirma||forzar){aviso.querySelector('[data-lista]').replaceChildren(...pendientes.map(r=>ficha(r,ahora,true)));ultimaFirma=firma;}
                aviso.hidden=firma===firmaPospuesta||panel.open;
            }else{ultimaFirma='';firmaPospuesta='';aviso.hidden=true;}
        }catch(e){if(v!==version||!auth.getUser())return;
            // No se confunde un fallo de consulta con una confirmación pendiente.
            aviso.hidden=true;
            if(panel.open){panel.querySelector('[data-aviso]').textContent='No se pudieron consultar las entregas. '+e.message+' Podés seguir usando RescatePY.';panel.querySelector('[data-lista]').replaceChildren();}
            console.warn('Entregas:',e.message);
        }
    }
    boton?.addEventListener('click',()=>{document.getElementById('odsDropdown')?.classList.remove('activo');window.RescateEntregas.abrir();});panel.querySelector('[data-cerrar]').onclick=()=>panel.close();
    panel.addEventListener('close',()=>actualizar());
    const posponer=()=>{firmaPospuesta=ultimaFirma;aviso.hidden=true;};
    aviso.querySelector('[data-posponer]').onclick=posponer;aviso.querySelector('[data-cerrar-aviso]').onclick=posponer;
    document.addEventListener('rescate:sesion',e=>{
        firmaFilas='';reservasPropias.clear(); if(panel.open)panel.close();
        aviso.hidden=true;ultimaFirma='';firmaPospuesta='';actualizar(true);
    });window.addEventListener('focus',()=>{if(!ocupado)actualizar(true);});
    window.RescateEntregas.actualizar=()=>actualizar(true);
    setInterval(()=>{if(auth.getUser()&&!ocupado){actualizar();auth.refreshNotifications();}},30000);
})();
