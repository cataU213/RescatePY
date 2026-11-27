// Reglas conservadoras de inocuidad declarada; no certifican el estado físico.
function validarAlimento(d, hoy = new Date()) {
    if (!Number.isFinite(Number(d.QUANTITY)) || Number(d.QUANTITY) <= 0) return "Cantidad inválida.";
    if (!["fresh", "dated", "prepared"].includes(d.FOOD_TYPE)) return "Tipo de alimento no identificado.";
    if (d.FOOD_CONDITION !== "good" || d.HYGIENE !== "yes") return "El alimento no tiene condiciones de inocuidad confirmadas.";
    if (Number(d.REQUIRES_COLD) === 1 && d.COLD_CHAIN !== "yes") return "Cadena de frío no garantizada.";
    if (d.FOOD_TYPE === "prepared" && d.PREPARED_STORAGE !== "controlled") return "Conservación de comida preparada no confirmada.";
    if (d.FOOD_TYPE === "dated" && !d.EXPIRY_DATE) return "Falta fecha de vencimiento.";
    if (d.EXPIRY_DATE) {
        const fecha = d.EXPIRY_DATE instanceof Date ? d.EXPIRY_DATE.toISOString().slice(0,10) : String(d.EXPIRY_DATE).slice(0,10);
        const actual = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Asuncion",year:"numeric",month:"2-digit",day:"2-digit"}).format(hoy);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0,10) !== fecha || fecha <= actual) return "Alimento vencido o fecha inválida.";
    }
    return null;
}
module.exports={validarAlimento};
