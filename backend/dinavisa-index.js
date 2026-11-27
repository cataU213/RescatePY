function update(){
    $('#loading').fadeIn(1000);
    xajax_update(xajax.getFormValues("form"));
}

function selCategoria(){
    base = $("#base").val();
    xajax_selCategoria(base);
}

function search(){
    //$('#loading').fadeIn(1000);
    document.getElementById('page').value = 1;
    setTimeout(function(){
            toastr.success('<span style="color:#FFF;">Aguarde, buscando informaciÃ³n.</span>');	
    },20) ;

    xajax_search(xajax.getFormValues("form"));
}

function previous(){
    page = new Number(document.getElementById('page').value);
    if(page > 1)
        page = page - 1;

    document.getElementById('page').value = page;
    
    $('#loading').fadeIn(1000);
    setTimeout(function(){
            toastr.success('<span style="color:#FFF;">Aguarde, buscando informaciÃ³n.</span>');	
    },20) ;

    xajax_search(xajax.getFormValues("form"));
}

function next(){
    page = new Number(document.getElementById('page').value);
    page_limit = new Number(document.getElementById('page-limit').value);
    page = page + 1;

    //alert(page);
    document.getElementById('page').value = page;
    $('#loading').fadeIn(1000);
    setTimeout(function(){
            toastr.success('<span style="color:#FFF;">Aguarde, buscando informaciÃ³n.</span>');	
    },20) ;

    xajax_search(xajax.getFormValues("form"));
}

function informacion(id){
    $('#loading').fadeIn(1000);
    xajax_informacion(id);
}

function archivos(name){
    xajax_archivos(name);
}