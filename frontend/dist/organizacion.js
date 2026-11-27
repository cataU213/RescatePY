// Panel privado: los datos y las acciones se consultan en Oracle.
(() => {
    const boton = document.getElementById('misReservasBtn');
    const panel = document.createElement('dialog');
    panel.className = 'panel-organizacion';
    panel.innerHTML = '<header><h2>Mi organización</h2><button type="button" data-cerrar>×</button></header><p data-org></p><div class="org-metricas"></div><button type="button" data-entregas>Coordinar retiro / confirmar recepción</button><button type="button" data-actualizar>Actualizar</button><h3>Mis reservas e historial</h3><div data-lista aria-live="polite"></div>';
    document.body.append(panel);
    const lista = panel.querySelector('[data-lista]');
    const metricas = panel.querySelector('.org-metricas');
    const texto = (tag, contenido) => { const el = document.createElement(tag); el.textContent = contenido; return el; };
    async function actualizar() {
        lista.textContent = 'Consultando reservas…';
        try {
            const datos = await window.RescateAuth.api('/comedor/reservas');
            const reservas = datos.reservas || [];
            panel.querySelector('[data-org]').textContent = datos.organizacion.NOMBRE_ORGANIZACION;
            const pendientes = reservas.filter(r => r.ESTADO === 'PENDIENTE');
            const retiradas = reservas.filter(r => r.ESTADO === 'RETIRADA');
            const kg = retiradas.filter(r => String(r.UNIT).toLowerCase() === 'kg').reduce((sum,r)=>sum+Number(r.QUANTITY||0),0);
            metricas.replaceChildren(...[`${pendientes.length || ""} reservas activas`, `${retiradas.length || ""} retiros confirmados`, `${kg || ""} kg retirados`, `${datos.organizacion.COMENSALES} comensales`].map(v=>texto('strong',v)));
            lista.replaceChildren();
            if (!reservas.length) lista.textContent = 'Todavía no tenés reservas.';
            for (const r of reservas) {
                const card = document.createElement('article');
                card.append(texto('h4', `${r.FOOD} · ${r.QUANTITY} ${r.UNIT}`), texto('p', `${r.DONOR_NAME} — ${r.CITY}, ${r.ADDRESS}`), texto('p', `Estado: ${r.ESTADO === 'PENDIENTE' ? 'RESERVADA' : r.ESTADO}`));
                if (r.ESTADO === 'PENDIENTE') {
                    const coordinar=texto('button','Voy a retirar / ver fecha');coordinar.type='button';coordinar.onclick=()=>{panel.close();window.RescateEntregas.abrir();};card.append(coordinar);
                    const cancelar = texto('button','Cancelar reserva'); cancelar.type='button';
                    cancelar.addEventListener('click', async () => {
                        if (!confirm('¿Cancelar esta reserva y liberar los alimentos?')) return;
                        cancelar.disabled=true;
                        try { await window.RescateAuth.api(`/comedor/reservas/${r.ID}/cancelar`,{method:'POST'}); await window.RescateAuth.syncDonations(); await actualizar(); }
                        catch(e){ alert(e.message); cancelar.disabled=false; }
                    }); card.append(cancelar);
                }
                lista.append(card);
            }
        } catch(e) { lista.textContent=e.message; metricas.replaceChildren(); }
    }
    boton?.addEventListener('click',()=>{ if(!panel.open) panel.showModal(); actualizar(); });
    panel.querySelector('[data-cerrar]').onclick=()=>panel.close();
    panel.querySelector('[data-actualizar]').onclick=actualizar;
    panel.querySelector('[data-entregas]').onclick=()=>{panel.close();window.RescateEntregas.abrir();};
    document.addEventListener('rescate:sesion', e=>{if(e.detail?.tipoCuenta !== 'ORGANIZACION' && panel.open) panel.close();});
})();
