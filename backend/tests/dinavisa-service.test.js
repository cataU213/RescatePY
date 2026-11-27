const test = require("node:test");
const assert = require("node:assert/strict");
const dinavisa = require("../dinavisa-service");

test("lee un registro RE desde la tabla pública oficial", () => {
    const html = `
      <tr>
        <td>801047480/3</td>
        <td>80104748-0<br>Serendipity S.A.</td>
        <td>Asunción<br>Asunción</td>
        <td><span class="label-x-success">ACTIVO</span><br>29-09-2030</td>
        <td>Elaborador</td>
      </tr>`;
    const registros = dinavisa.analizarRegistros(html);
    assert.equal(registros.length, 1);
    assert.equal(registros[0].registroRE, "801047480/3");
    assert.equal(registros[0].ruc, "80104748-0");
    assert.equal(registros[0].razonSocial, "Serendipity S.A.");
    assert.equal(registros[0].estado, "ACTIVO");
    assert.equal(registros[0].vencimiento, "29-09-2030");
});
