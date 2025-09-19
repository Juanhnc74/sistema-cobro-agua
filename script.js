// ===== Mostrar/Ocultar contraseña =====
const toggleBtn = document.getElementById("togglePass");
const passwordInput = document.getElementById("loginPass");

toggleBtn.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleBtn.innerHTML = "<span>🙈</span>";
    } else {
        passwordInput.type = "password";
        toggleBtn.innerHTML = "<span>👁️</span>";
    }
});

// ===== Login =====
document.getElementById("btnLogin").addEventListener("click", async () => {
    const usuario = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();
    const loginMsg = document.getElementById("loginMsg");

    if (!usuario || !password) {
        loginMsg.innerText = "Por favor ingresa usuario y contraseña";
        loginMsg.style.color = "red";
        return;
    }

    const formData = new FormData();
    formData.append("usuario", usuario);
    formData.append("password", password);

    try {
        let response = await fetch("backend/login.php", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        let result = await response.json();

        if (result.status === "ok") {
            loginMsg.innerText = result.message;
            loginMsg.style.color = "green";

            // Mostrar la aplicación y ocultar login
            document.getElementById("loginView").classList.add("hidden");
            document.getElementById("loginContainer").classList.add("hidden");
            document.getElementById("app").classList.remove("hidden");
        } else {
            loginMsg.innerText = result.message;
            loginMsg.style.color = "red";
        }

    } catch (error) {
        console.error("Error:", error);
        loginMsg.innerText = "Error de conexión al servidor";
        loginMsg.style.color = "red";
    }
});

// ===== Logout =====
document.getElementById("btnLogout").addEventListener("click", () => {
    // Ocultar la aplicación
    document.getElementById("app").classList.add("hidden");

    // Mostrar la pantalla de login
    document.getElementById("loginContainer").classList.remove("hidden");
    document.getElementById("loginView").classList.remove("hidden");

    // Limpiar campos y mensajes
    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    document.getElementById("loginMsg").innerText = "";
});


let users = JSON.parse(localStorage.getItem('pro_users') || '[]');       // {num,name,calle,tel,tarifa}
let payments = JSON.parse(localStorage.getItem('pro_payments') || '[]'); // {folio,userNum,dateISO,year,months[],rate,total,hydrant}

// utilidades básicas
const $ = id => document.getElementById(id);
const toast = (msg) => { 
  const t = $('toast'); 
  t.textContent = msg; 
  t.classList.remove('hidden'); 
  setTimeout(()=>t.classList.add('hidden'), 2600); 
};
const saveAll = () => {
  localStorage.setItem('pro_users', JSON.stringify(users));
  localStorage.setItem('pro_payments', JSON.stringify(payments));
};

// ===== Login =====
/*$('togglePass').addEventListener('click', ()=>{
  const i = $('loginPass');
  i.type = i.type === 'password' ? 'text' : 'password';
});
$('btnLogin').addEventListener('click', ()=>{
  const u = $('loginUser').value.trim();
  const p = $('loginPass').value.trim();
  if(u === ADMIN_USER && (p === PASS_A || p === PASS_B)){
    enterApp();
  } else {
    $('loginMsg').textContent = 'Usuario o contraseña incorrectos';
  }
});
$('btnLogout').addEventListener('click', ()=> location.reload()); */

// ===== Navegación vistas =====
const views = Array.from(document.querySelectorAll('.view'));
document.querySelectorAll('.side-btn[data-view]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.side-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.view;
    views.forEach(se => se.classList.toggle('active', se.id === v));
    if(v==='debtors') renderDebtors();
    if(v==='history') renderHistory(); // vacío hasta que busque
    if(v==='reports') clearReports();
  });
});

// ===== Inicio de App =====
function enterApp(){
  $('loginContainer').classList.add('hidden');
  $('app').classList.remove('hidden');
  initUI();
  renderStats();
}

// ===== UI Inicial =====
function initUI(){
  // Año por defecto
  const now = new Date();
  $('p_year').value = Math.min(now.getFullYear(), MAX_YEAR);

  // Meses
  buildMonths();

  // Buscadores
  $('quickSearch').addEventListener('input', quickSearch);
  $('m_search').addEventListener('input', renderManageList);
  $('h_search').addEventListener('input', ()=> renderHistory());
  $('p_search').addEventListener('input', handlePaySearch);

  // Paginación gestión
  $('prevPage').addEventListener('click', ()=>{ pageIndex=Math.max(0,pageIndex-1); renderManageList(); });
  $('nextPage').addEventListener('click', ()=>{ pageIndex=Math.min(maxPage(),pageIndex+1); renderManageList(); });

  // Filtros
  $('filterMode').addEventListener('change', ()=>{ pageIndex=0; renderManageList(); });

  // Registro usuario
  $('formRegister').addEventListener('submit', onRegister);
  $('clearRegister').addEventListener('click', ()=> $('formRegister').reset());

  // Pagos
  $('p_all').addEventListener('change', toggleAllMonths);
  $('calcTotal').addEventListener('click', calcTotal);
  $('doPay').addEventListener('click', doPay);
  $('p_rate').addEventListener('change', calcTotal);
  $('p_hidrante').addEventListener('change', calcTotal);
  $('p_year').addEventListener('change', ()=>{
    if(+$('p_year').value > MAX_YEAR){ $('p_year').value = MAX_YEAR; toast('El último año permitido es 2030.'); }
  });

  // Historial
  $('h_print').addEventListener('click', printHistory);
  $('h_csv').addEventListener('click', exportHistoryCSV);

  // Reportes (con contraseña)
  $('repDay').addEventListener('click', ()=> runReport('day'));
  $('repMonth').addEventListener('click', ()=> runReport('month'));
  $('repYear').addEventListener('click', ()=> runReport('year'));
  $('repPrint').addEventListener('click', printReport);
  $('repCSV').addEventListener('click', exportReportCSV);

  // Primera renderización
  renderManageList();
  renderDebtors();
}

// ====== Helpers de dinero / meses ======
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const tarifaMap = { domestica:90, hidrante:20, comercial:150 };

function money(n){ 
  const v = Number(n);
  if(!isFinite(v)) return '$0';
  return '$' + v.toLocaleString('es-MX', {maximumFractionDigits:2});
}

// ====== Panel / estadísticas ======
async function updateDashboard() {
    try {
        const response = await fetch("backend/get_dashboard.php");
        const data = await response.json();

        if(data.status === "ok") {
            document.getElementById("panelMonth").textContent = "$" + data.total_mes;
            document.getElementById("panelUsers").textContent = data.total_usuarios;
            document.getElementById("panelDeudores").textContent = data.total_deudores;
        }
    } catch (error) {
        console.error("Error al actualizar dashboard:", error);
    }
}

// Llamar al cargar la página
updateDashboard();


function countDebtors(){
  let cnt = 0;
  for(const u of users){
    const owed = monthsOwed(u.num);
    if(owed >= 3) cnt++;
  }
  return cnt;
}

function monthsOwed(userNum){
  // Cuenta meses no pagados del año actual (aprox). Para deudores +3 usamos los últimos 12 meses.
  const today = new Date();
  const y = today.getFullYear();
  // Meses pagados (últimos 12 meses)
  const paidSet = new Set();
  for(const p of payments.filter(p=>p.userNum===userNum && p.year>=y-1)){
    for(const m of p.months) paidSet.add(`${p.year}-${m}`);
  }
  // últimos 12 meses exactos
  let owed = 0;
  for(let i=0;i<12;i++){
    const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
    const yy = d.getFullYear();
    const mm = d.getMonth(); // 0..11
    if(!paidSet.has(`${yy}-${mm}`)) owed++;
  }
  return owed;
}

// ====== Registro de usuarios ======
document.getElementById("formRegister").addEventListener("submit", async function(e) {
    e.preventDefault();

    const numero_usuario = document.getElementById("r_num").value.trim();
    const nombre         = document.getElementById("r_name").value.trim();
    const direccion      = document.getElementById("r_calle").value.trim();
    const telefono       = document.getElementById("r_tel").value.trim();
    const tarifa         = document.getElementById("r_tarifa").value;

    if(!numero_usuario || !nombre || !direccion || !telefono) {
        toast("Completa todos los campos.");
        return;
    }
    if(!/^\d{10}$/.test(telefono)) {
        toast("El teléfono debe tener 10 dígitos.");
        return;
    }

    const formData = new FormData();
    formData.append("numero_usuario", numero_usuario);
    formData.append("nombre", nombre);
    formData.append("direccion", direccion);
    formData.append("telefono", telefono);
    formData.append("tarifa", tarifa);

    try {
        const response = await fetch("backend/register_user.php", {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        const regMsg = document.getElementById("regMsg");
        regMsg.textContent = result.message;
        regMsg.style.color = result.status === "ok" ? "green" : "red";

        if(result.status === "ok") {
            document.getElementById("formRegister").reset();
            toast("Usuario registrado ✅");

            // ✅ Actualizar el dashboard automáticamente
            updateDashboard();

            // Opcional: actualizar la lista de usuarios
            renderManageList();
        }

    } catch (error) {
        console.error("Error:", error);
        toast("Error en la conexión al servidor.");
    }
});


// ====== Gestionar (listado + edición + paginado) ======
let pageIndex = 0;
const pageSize = 8;

async function fetchUsers(){
    const q = $('m_search').value?.trim() || '';
    const mode = $('filterMode').value;
    const res = await fetch(`backend/get_users.php?q=${encodeURIComponent(q)}&mode=${mode}`);
    const data = await res.json();
    return data.status==="ok" ? data.users : [];
}

async function renderManageList(){
    const list = await fetchUsers();
    const maxPage = Math.max(0, Math.ceil(list.length / pageSize)-1);
    if(pageIndex > maxPage) pageIndex = maxPage;

    const start = pageIndex * pageSize;
    const chunk = list.slice(start, start + pageSize);

    $('userList').innerHTML = chunk.map(u=>{
        return `<li data-id="${u.id}">
            <div><strong>#${u.numero_usuario}</strong> — ${u.nombre}<br><span class="small">${u.direccion} • ${u.telefono}</span></div>
            <div><span class="paid">Al día</span></div>
        </li>`;
    }).join('') || `<li><div>No hay resultados</div></li>`;

    $('pageInfo').textContent = `${pageIndex+1} / ${maxPage+1}`;

    document.querySelectorAll('#userList li[data-id]').forEach(li=>{
        li.onclick = ()=> showUserDetail(li.dataset.id);
    });
}

async function showUserDetail(id){
    const users = await fetchUsers();
    const u = users.find(x=>x.id==id);
    if(!u) return;

    $('userDetail').classList.remove('hidden');
    $('d_num').value = u.numero_usuario;
    $('d_name').value = u.nombre;
    $('d_calle').value = u.direccion;
    $('d_tel').value = u.telefono;
    $('d_tarifa').value = u.tarifa;

    $('btnSaveUser').onclick = async ()=>{
        const form = new FormData();
        form.append('id', id);
        form.append('nombre', $('d_name').value.trim());
        form.append('direccion', $('d_calle').value.trim());
        form.append('telefono', $('d_tel').value.trim());
        form.append('tarifa', $('d_tarifa').value);

        const res = await fetch('backend/update_user.php',{method:'POST', body:form});
        const data = await res.json();
        toast(data.message);
        renderManageList();
    };

    $('btnDeleteUser').onclick = async ()=>{
        if(!confirm('¿Eliminar usuario y todos sus pagos?')) return;
        const form = new FormData();
        form.append('id', id);
        const res = await fetch('backend/delete_user.php',{method:'POST',body:form});
        const data = await res.json();
        toast(data.message);
        $('userDetail').classList.add('hidden');
        renderManageList();
    };
}

// ====== Gestionar pago ====== 2.0

const searchInput = document.getElementById('p_search');
const selText = document.getElementById('selText');
let selectedUserId = null;

searchInput.addEventListener('input', debounce(async () => {
    const q = searchInput.value.trim();
    if(!q) return;

    const res = await fetch(`backend/search_users.php?q=${encodeURIComponent(q)}`);
    const users = await res.json();

    const list = document.createElement('div');
    list.classList.add('search-results');
    list.innerHTML = '';
    users.forEach(u => {
        const item = document.createElement('div');
        item.textContent = `${u.nombre} - ${u.telefono}`;
        item.addEventListener('click', () => {
            selText.textContent = u.nombre;
            selectedUserId = u.id;
            document.querySelectorAll('.search-results').forEach(e=>e.remove());
        });
        list.appendChild(item);
    });

    document.querySelector('.search-shell').appendChild(list);
}, 300));

function debounce(fn, delay=300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(()=>fn(...args), delay);
    }
}
const monthsGrid = document.getElementById('monthsGrid');
const yearInput = document.getElementById('p_year');
const rateSelect = document.getElementById('p_rate');
const allCheckbox = document.getElementById('p_all');
const hidranteCheckbox = document.getElementById('p_hidrante');
const calcBtn = document.getElementById('calcTotal');
const doPayBtn = document.getElementById('doPay');
const payInfo = document.getElementById('payInfo');

const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function renderMonths(){
    monthsGrid.innerHTML = '';
    months.forEach(m=>{
        const lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" value="${m}"> ${m}`;
        monthsGrid.appendChild(lbl);
    });
}

yearInput.value = new Date().getFullYear();
renderMonths();

allCheckbox.addEventListener('change', ()=>{
    const checked = allCheckbox.checked;
    monthsGrid.querySelectorAll('input').forEach(i=>i.checked = checked);
});

calcBtn.addEventListener('click', ()=>{
    const tarifa = parseFloat(rateSelect.value);
    const hidrante = hidranteCheckbox.checked ? 20 : 0;
    const selectedMonths = Array.from(monthsGrid.querySelectorAll('input:checked')).map(i=>i.value);
    const total = (tarifa + hidrante) * selectedMonths.length;
    payInfo.textContent = `Meses: ${selectedMonths.join(', ')} | Total: $${total.toFixed(2)}`;
});

doPayBtn.addEventListener('click', async ()=>{
    if(!selectedUserId){
        alert('Selecciona un usuario primero');
        return;
    }
    const selectedMonths = Array.from(monthsGrid.querySelectorAll('input:checked')).map(i=>i.value);
    const data = {
        usuario_id: selectedUserId,
        anio: parseInt(yearInput.value),
        tarifa: parseFloat(rateSelect.value),
        meses: selectedMonths,
        hidrante: hidranteCheckbox.checked
    };
    const res = await fetch('backend/register_payment.php', {
        method: 'POST',
        body: JSON.stringify(data),
        headers:{'Content-Type':'application/json'}
    });
    const result = await res.json();
    alert(result.msg);
});



// Paginación
$('prevPage').onclick = ()=>{ pageIndex--; renderManageList(); };
$('nextPage').onclick = ()=>{ pageIndex++; renderManageList(); };

// Buscador y filtro
$('m_search').oninput = renderManageList;
$('filterMode').onchange = renderManageList;

// Inicializar
renderManageList();


// ====== Búsqueda rápida (barra superior) ======
function quickSearch(){
  const q = $('quickSearch').value.trim().toLowerCase();
  if(!q) return;
  const found = users.find(u => u.num.toLowerCase()===q || u.name.toLowerCase().includes(q));
  if(found){
    // Cambiar a vista pagos y preseleccionar
    switchView('payments');
    setSelectedUser(found);
  }
}
function switchView(id){
  document.querySelectorAll('.side-btn').forEach(b=>{
    if(b.dataset.view){ b.classList.toggle('active', b.dataset.view===id); }
  });
  views.forEach(v => v.classList.toggle('active', v.id===id));
}

// ====== Pagos ======

async function doPay(){
    if(!selectedUser){ toast('Selecciona un usuario.'); return; }

    const year = Number($('p_year').value || 0);
    if(!year || year > MAX_YEAR){ toast(`El año debe ser válido (hasta ${MAX_YEAR}).`); return; }

    const months = selectedMonths();
    if(months.length===0){ toast('Selecciona al menos un mes.'); return; }

    const rate = Number($('p_rate').value || 0);
    const includeHydrant = $('p_hidrante').checked;
    const total = calcTotal();

    // Enviar datos al backend
    const formData = new FormData();
    formData.append("numero_usuario", selectedUser.numero_usuario); // debe coincidir con tu campo en BD
    formData.append("anio", year);
    formData.append("meses", JSON.stringify(months)); // array de meses
    formData.append("tarifa", rate);
    formData.append("hidrante", includeHydrant ? 1 : 0);
    formData.append("monto", total);

    try {
        const response = await fetch("backend/register_payment.php", {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        if(result.status === "ok"){
            toast("Pago(s) registrado(s) ✅");
            renderStats(); // actualizar KPIs
        } else {
            toast(result.message || "Error al registrar pago.");
        }
    } catch(err){
        console.error(err);
        toast("Error de conexión con el servidor.");
    }

    // Preparar WhatsApp y abrir recibo
    const folio = result.folio || `F-${Date.now()}`; // si el backend devuelve folio, úsalo
    const dateISO = new Date().toISOString();
    const waMsg = buildWhatsAppReceipt(selectedUser, folio, dateISO, months, year, total, includeHydrant);
    $('waShare').href = `https://wa.me/52${selectedUser.telefono}?text=${encodeURIComponent(waMsg)}`;

    openReceiptWindow(selectedUser, { folio, dateISO, year, months, rate, total, hydrant: includeHydrant });

    // Limpiar selección
    $('p_all').checked = false;
    $('monthsGrid').querySelectorAll('input[type="checkbox"]').forEach(cb=> cb.checked = false);
    $('payInfo').textContent = '';
}


function genFolio(){
  // Folio incremental basado en conteo + fecha
  const n = payments.length + 1;
  const t = Date.now().toString().slice(-4);
  return `F${n.toString().padStart(4,'0')}-${t}`;
}

function openReceiptWindow(user, pay){
  const win = window.open('', '_blank');
  if(!win){ toast('Permite pop-ups para imprimir.'); return; }

  const date = new Date(pay.dateISO);
  const fmtDate = date.toLocaleString('es-MX',{dateStyle:'medium', timeStyle:'short'});

  const header = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px">
      <img src="logo.jpg" style="height:60px;border-radius:8px"/>
      <div>
        <div style="font-size:18px; font-weight:700; color:#800000">Presidencia De Comunidad De Santa Anita Huiloac</div>
        <div>Calle Jorge Ranchero Aguilar, Santa Anita Huiloac, C.P. 90407</div>
        <div>Tel: 241-4174430</div>
      </div>
    </div>`;

  const table = (title)=>`
    <div style="border:1px dashed #bbb; border-radius:10px; padding:12px; margin-bottom:8px">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <strong>${title}</strong>
        <span>Folio: <b>${pay.folio}</b></span>
      </div>
      <div style="margin-top:6px">Fecha: ${fmtDate}</div>
      <div style="margin-top:6px">Usuario: #${user.num} — ${user.name}</div>
      <div>Dirección: ${user.calle}</div>
      <div>Tel: ${user.tel}</div>
      <div>Año: ${pay.year}</div>
      <div>Meses: ${pay.months.map(i=>MONTHS[i]).join(', ')}</div>
      ${pay.hydrant ? '<div>Concepto adicional: Hidrante</div>' : ''}
      <div style="font-size:18px; margin-top:8px"><b>Total: ${money(pay.total)}</b></div>
    </div>`;

  win.document.write(`
    <html><head><title>Recibo ${pay.folio}</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:Roboto, Arial, sans-serif; padding:16px}
        .copy-sep{border-top:2px dashed #999; margin:16px 0}
      </style>
    </head><body>
      ${header}
      ${table('RECIBO - USUARIO')}
      <div class="copy-sep"></div>
      ${header}
      ${table('RECIBO - OFICINA')}
      <script>
        window.onload = function(){ window.print(); };
      <\/script>
    </body></html>
  `);
  win.document.close();
}

function buildWhatsAppReceipt(user, folio, dateISO, months, year, total, hydrant){
  const date = new Date(dateISO).toLocaleString('es-MX',{dateStyle:'medium', timeStyle:'short'});
  const lines = [
    'Recibo de pago - Agua Potable',
    'Presidencia De Comunidad De Santa Anita Huiloac',
    'Calle Jorge Ranchero Aguilar, Santa Anita Huiloac, C.P. 90407',
    'Tel: 241-4174430',
    `Folio: ${folio}`,
    `Fecha: ${date}`,
    `Usuario: #${user.num} — ${user.name}`,
    `Meses: ${months.map(i=>MONTHS[i]).join(', ')}`,
    `Año: ${year}`,
    hydrant ? 'Incluye: Hidrante' : '',
    `Total: ${money(total)}`
  ].filter(Boolean);
  return lines.join('\n');
}

// ====== Deudores (lista + WhatsApp aviso) ======
function renderDebtors(){
  const list = users
    .map(u => ({ u, owed: monthsOwed(u.num) }))
    .filter(x => x.owed >= 3)
    .sort((a,b)=> b.owed - a.owed);

  $('debtorsList').innerHTML = list.map(({u,owed})=>{
    const msg = `Hola ${u.name}, le recordamos su adeudo mayor a 3 meses de servicio de agua potable. Favor de acercarse a realizar su pago. Gracias.`;
    const wa = `https://wa.me/52${u.tel}?text=${encodeURIComponent(msg)}`;
    return `<li>
      <div><strong>#${u.num}</strong> — ${u.name}<br><span class="small">${u.calle} • ${u.tel}</span></div>
      <div class="row g12">
        <span class="owed">Adeudo ${owed} meses</span>
        <a class="btn-ghost" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </li>`;
  }).join('') || `<li><div>Sin deudores con 3+ meses 🎉</div></li>`;
}

// ====== Historial (solo por búsqueda) ======
let historyQueryUser = null;

function renderHistory(){
  const q = $('h_search').value.trim().toLowerCase();
  const user = users.find(u=> u.num.toLowerCase()===q || u.name.toLowerCase()===q || u.name.toLowerCase().includes(q));
  historyQueryUser = user || null;

  const rows = (user ? payments.filter(p=>p.userNum===user.num) : []).sort((a,b)=> a.dateISO.localeCompare(b.dateISO));
  $('histBody').innerHTML = rows.map(p=>{
    const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'medium', timeStyle:'short'});
    return `<tr data-folio="${p.folio}">
      <td>${p.folio}</td>
      <td>${d}</td>
      <td>${p.year}</td>
      <td>${p.months.map(i=>MONTHS[i]).join(', ')}</td>
      <td>${money(p.total)}</td>
      <td>
        <button class="btn-ghost small" data-act="print">Imprimir</button>
        <button class="btn-danger small" data-act="del">Eliminar</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="small">Busca un usuario para ver su historial…</td></tr>`;

  // acciones
  document.querySelectorAll('#histBody tr[data-folio]').forEach(tr=>{
    const folio = tr.dataset.folio;
    tr.querySelector('[data-act="print"]').addEventListener('click', ()=>{
      const p = payments.find(x=>x.folio===folio);
      const u = users.find(x=>x.num===p.userNum);
      openReceiptWindow(u, p);
    });
    tr.querySelector('[data-act="del"]').addEventListener('click', ()=>{
      if(!checkAdminPassword()) return;
      if(confirm('¿Eliminar este pago?')){
        const idx = payments.findIndex(x=>x.folio===folio);
        if(idx>=0){
          const p = payments[idx];
          payments.splice(idx,1);
          saveAll();
          renderHistory();
          renderStats();
          toast('Pago eliminado');
        }
      }
    });
  });
}

function printHistory(){
  if(!historyQueryUser){ toast('Busca un usuario primero.'); return; }
  const user = historyQueryUser;
  const rows = payments.filter(p=>p.userNum===user.num).sort((a,b)=> a.dateISO.localeCompare(b.dateISO));
  const win = window.open('', '_blank');
  if(!win){ toast('Permite pop-ups para imprimir.'); return; }

  const total = rows.reduce((s,p)=> s+Number(p.total||0), 0);

  win.document.write(`
    <html><head><meta charset="utf-8"><title>Historial ${user.num}</title>
      <style>body{font-family:Roboto,Arial,sans-serif;padding:16px} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ddd; padding:8px; font-size:12px} th{background:#fafafa}</style>
    </head><body>
      <h3>Historial de Pagos — #${user.num} ${user.name}</h3>
      <div>${user.calle} — ${user.tel}</div>
      <table>
        <thead><tr><th>Folio</th><th>Fecha</th><th>Año</th><th>Meses</th><th>Total</th></tr></thead>
        <tbody>
          ${rows.map(p=>{
            const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'medium', timeStyle:'short'});
            return `<tr><td>${p.folio}</td><td>${d}</td><td>${p.year}</td><td>${p.months.map(i=>MONTHS[i]).join(', ')}</td><td>${money(p.total)}</td></tr>`
          }).join('')}
        </tbody>
        <tfoot><tr><th colspan="4" style="text-align:right">TOTAL</th><th>${money(total)}</th></tr></tfoot>
      </table>
      <script>window.onload=function(){window.print();};<\/script>
    </body></html>
  `);
  win.document.close();
}

function exportHistoryCSV(){
  if(!historyQueryUser){ toast('Busca un usuario primero.'); return; }
  const u = historyQueryUser;
  const rows = payments.filter(p=>p.userNum===u.num);
  let csv = 'Folio,Fecha,Año,Meses,Monto\n';
  rows.forEach(p=>{
    const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'short', timeStyle:'short'});
    csv += `"${p.folio}","${d}",${p.year},"${p.months.map(i=>MONTHS[i]).join(' ')}",${p.total}\n`;
  });
  downloadBlob(csv, `historial_${u.num}.csv`, 'text/csv;charset=utf-8;');
}

// ====== Reportes (con contraseña para ver/descargar) ======
function requireReportAccess(){
  const pass = prompt('Ingrese contraseña para Reportes:');
  return pass === PASS_A || pass === PASS_B;
}
function checkAdminPassword(){
  const pass = prompt('Ingrese contraseña de administrador:');
  if(pass === PASS_A || pass === PASS_B) return true;
  toast('Contraseña incorrecta.');
  return false;
}
function clearReports(){ $('repResult').innerHTML = ''; }

function runReport(mode){
  if(!requireReportAccess()) return;

  const val = $('r_date').value;
  const d = val ? new Date(val+'T00:00:00') : new Date();
  let rows = [];

  if(mode==='day'){
    const day = d.toISOString().slice(0,10);
    rows = payments.filter(p => p.dateISO.slice(0,10) === day);
    renderReport(`Reporte del día ${day}`, rows);
  } else if(mode==='month'){
    const ym = d.toISOString().slice(0,7);
    rows = payments.filter(p => p.dateISO.slice(0,7) === ym);
    renderReport(`Reporte del mes ${ym}`, rows);
  } else if(mode==='year'){
    const y = d.getFullYear();
    rows = payments.filter(p => new Date(p.dateISO).getFullYear() === y);
    renderReport(`Reporte del año ${y}`, rows);
  }
}

let lastReportRows = [];
let lastReportTitle = '';

function renderReport(title, rows){
  lastReportRows = rows;
  lastReportTitle = title;
  const total = rows.reduce((s,p)=> s+Number(p.total||0), 0);
  $('repResult').innerHTML = `
    <div class="card">
      <h3>${title}</h3>
      <div class="small">Pagos: ${rows.length} • Total: <b>${money(total)}</b></div>
      <table class="table mt10">
        <thead><tr><th>Folio</th><th>Usuario</th><th>Fecha</th><th>Año</th><th>Meses</th><th>Monto</th></tr></thead>
        <tbody>
          ${rows.map(p=>{
            const u = users.find(x=>x.num===p.userNum);
            const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'short', timeStyle:'short'});
            return `<tr>
              <td>${p.folio}</td>
              <td>#${p.userNum} ${u?u.name:''}</td>
              <td>${d}</td>
              <td>${p.year}</td>
              <td>${p.months.map(i=>MONTHS[i]).join(', ')}</td>
              <td>${money(p.total)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
function printReport(){
  if(!requireReportAccess()) return;
  if(!lastReportRows.length){ toast('Genera un reporte primero.'); return; }
  const win = window.open('', '_blank');
  if(!win){ toast('Permite pop-ups para imprimir.'); return; }
  const total = lastReportRows.reduce((s,p)=> s+Number(p.total||0), 0);
  win.document.write(`
    <html><head><meta charset="utf-8"><title>${lastReportTitle}</title>
      <style>body{font-family:Roboto,Arial,sans-serif;padding:16px} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ddd; padding:8px; font-size:12px} th{background:#fafafa}</style>
    </head><body>
      <h3>${lastReportTitle}</h3>
      <div>Total: ${money(total)} — Registros: ${lastReportRows.length}</div>
      <table>
        <thead><tr><th>Folio</th><th>Usuario</th><th>Fecha</th><th>Año</th><th>Meses</th><th>Monto</th></tr></thead>
        <tbody>
          ${lastReportRows.map(p=>{
            const u = users.find(x=>x.num===p.userNum);
            const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'short', timeStyle:'short'});
            return `<tr>
              <td>${p.folio}</td>
              <td>#${p.userNum} ${u?u.name:''}</td>
              <td>${d}</td>
              <td>${p.year}</td>
              <td>${p.months.map(i=>MONTHS[i]).join(', ')}</td>
              <td>${money(p.total)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <script>window.onload=function(){window.print();};<\/script>
    </body></html>
  `);
  win.document.close();
}
function exportReportCSV(){
  if(!requireReportAccess()) return;
  if(!lastReportRows.length){ toast('Genera un reporte primero.'); return; }
  let csv = 'Folio,Usuario,Fecha,Año,Meses,Monto\n';
  lastReportRows.forEach(p=>{
    const u = users.find(x=>x.num===p.userNum);
    const d = new Date(p.dateISO).toLocaleString('es-MX',{dateStyle:'short', timeStyle:'short'});
    csv += `"${p.folio}","#${p.userNum} ${u?u.name:''}","${d}",${p.year},"${p.months.map(i=>MONTHS[i]).join(' ')}",${p.total}\n`;
  });
  downloadBlob(csv, `reporte.csv`, 'text/csv;charset=utf-8;');
}

// ====== Utilidades de descarga ======
function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

// ====== Acciones del historial (eliminar pago ya cubierto arriba) ======

// ====== Inicializar meses seleccionables ======

// ya se llamó en initUI()

// ====== Validaciones adicionales ======
// Prevenir NaN: asegurarnos que rate y meses estén ok
// (calcTotal ya maneja Number() y meses vacíos)

// ====== Fin ======
