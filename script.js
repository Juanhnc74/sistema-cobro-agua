// ===== Configuración y almacenamiento =====
const ADMIN_USER = 'admin';
const PASS_A = 'aguapotable2027';
const PASS_B = 'administracion2027';
const MAX_YEAR = 2030;

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
$('togglePass').addEventListener('click', ()=>{
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
$('btnLogout').addEventListener('click', ()=> location.reload());

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
function renderStats(){
  // Total usuarios
  $('statUsers').textContent = String(users.length);
  $('panelUsers').textContent = String(users.length);

  // Recaudado del mes corriente
  const now = new Date();
  const ym = now.toISOString().slice(0,7); // yyyy-mm
  const total = payments
    .filter(p => p.dateISO.slice(0,7) === ym)
    .reduce((acc, p) => acc + Number(p.total||0), 0);
  $('statMonth').textContent = money(total);
  $('panelMonth').textContent = money(total);

  // Deudores (>=3)
  const count = countDebtors();
  $('panelDeudores').textContent = String(count);
}

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
function onRegister(e){
  e.preventDefault();
  const num = $('r_num').value.trim();
  const name = $('r_name').value.trim();
  const calle = $('r_calle').value.trim();
  const tel = $('r_tel').value.trim();
  const tarifa = $('r_tarifa').value;

  if(!num || !name || !calle || !tel) { toast('Completa todos los campos.'); return; }
  if(users.some(u => u.num.toLowerCase() === num.toLowerCase())) { toast('Número de usuario ya existente.'); return; }
  if(!/^\d{10}$/.test(tel)){ toast('El teléfono debe tener 10 dígitos.'); return; }

  users.push({ num, name, calle, tel, tarifa });
  saveAll();
  $('formRegister').reset();
  $('regMsg').textContent = 'Usuario guardado correctamente.';
  renderStats();
  renderManageList();
  toast('Usuario registrado ✅');
}

// ====== Gestionar (listado + edición + paginado) ======
let pageIndex = 0;
const pageSize = 8;
const maxPage = ()=> Math.max(0, Math.ceil(getFilteredUsers().length / pageSize) - 1);

function getFilteredUsers(){
  const q = $('m_search').value?.trim().toLowerCase() || '';
  const mode = $('filterMode').value;
  let list = users.filter(u => 
    u.num.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
  );
  if(mode==='deudores'){
    list = list.filter(u => monthsOwed(u.num) >= 3);
  }
  return list;
}

function renderManageList(){
  const list = getFilteredUsers();
  if(pageIndex > maxPage()) pageIndex = maxPage();
  const start = pageIndex * pageSize;
  const chunk = list.slice(start, start + pageSize);

  $('userList').innerHTML = chunk.map(u=>{
    const isDeb = monthsOwed(u.num) >= 3;
    return `<li data-num="${u.num}">
      <div><strong>#${u.num}</strong> — ${u.name}<br><span class="small">${u.calle} • ${u.tel}</span></div>
      <div>${isDeb ? '<span class="owed">Deuda 3+</span>' : '<span class="paid">Al día</span>'}</div>
    </li>`;
  }).join('') || `<li><div>No hay resultados</div></li>`;

  $('pageInfo').textContent = `${Math.min(maxPage()+1, pageIndex+1)} / ${maxPage()+1}`;

  // click en usuario
  document.querySelectorAll('#userList li[data-num]').forEach(li=>{
    li.addEventListener('click', ()=> showUserDetail(li.dataset.num));
  });
}

function showUserDetail(num){
  const u = users.find(x=>x.num===num);
  if(!u) return;
  $('userDetail').classList.remove('hidden');
  $('d_num').value = u.num;
  $('d_name').value = u.name;
  $('d_calle').value = u.calle;
  $('d_tel').value = u.tel;
  $('d_tarifa').value = u.tarifa;

  $('btnSaveUser').onclick = ()=>{
    u.name = $('d_name').value.trim();
    u.calle = $('d_calle').value.trim();
    u.tel = $('d_tel').value.trim();
    u.tarifa = $('d_tarifa').value;
    if(!u.name || !u.calle || !/^\d{10}$/.test(u.tel)){ toast('Datos inválidos.'); return; }
    saveAll();
    renderManageList();
    toast('Cambios guardados ✅');
  };

  $('btnDeleteUser').onclick = ()=>{
    if(!checkAdminPassword()) return;
    if(confirm('¿Eliminar usuario y todos sus pagos?')){
      payments = payments.filter(p=>p.userNum!==u.num);
      users = users.filter(x=>x.num!==u.num);
      saveAll();
      $('userDetail').classList.add('hidden');
      renderManageList();
      renderStats();
      toast('Usuario eliminado');
    }
  };
}

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
let selectedUser = null;

function handlePaySearch(){
  const q = $('p_search').value.trim().toLowerCase();
  const u = users.find(u => u.num.toLowerCase()===q || u.name.toLowerCase().includes(q));
  if(u) setSelectedUser(u);
}

function setSelectedUser(u){
  selectedUser = u;
  $('selText').textContent = `#${u.num} — ${u.name}`;
  // Pre-set tarifa
  const rate = tarifaMap[u.tarifa] || 90;
  $('p_rate').value = String(rate);
  calcTotal();
}

function buildMonths(){
  const box = $('monthsGrid');
  box.innerHTML = '';
  MONTHS.forEach((m, idx)=>{
    const id = `m_${idx}`;
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" id="${id}" data-month="${idx}" /> ${m}`;
    box.appendChild(label);
  });
}
function toggleAllMonths(){
  const on = $('p_all').checked;
  $('monthsGrid').querySelectorAll('input[type="checkbox"]').forEach(cb=> cb.checked = on);
  calcTotal();
}
function selectedMonths(){
  const arr = [];
  $('monthsGrid').querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    if(cb.checked) arr.push(+cb.dataset.month);
  });
  return arr.sort((a,b)=>a-b);
}
function calcTotal(){
  const months = selectedMonths();
  const rate = Number($('p_rate').value || 0);
  const includeHydrant = $('p_hidrante').checked;
  let total = rate * months.length;
  if(includeHydrant) total += 20 * months.length; // hidrante por mes (si así lo requieres)
  $('payInfo').textContent = months.length
    ? `Meses: ${months.map(i=>MONTHS[i]).join(', ')} — Total: ${money(total)}`
    : `Selecciona meses.`;
  return total;
}

function doPay(){
  if(!selectedUser){ toast('Selecciona un usuario.'); return; }
  const year = Number($('p_year').value || 0);
  if(!year || year > MAX_YEAR){ toast(`El año debe ser válido (hasta ${MAX_YEAR}).`); return; }
  const months = selectedMonths();
  if(months.length===0){ toast('Selecciona al menos un mes.'); return; }
  const rate = Number($('p_rate').value || 0);
  const includeHydrant = $('p_hidrante').checked;

  // Evitar meses duplicados
  const alreadyPaid = payments.filter(p=>p.userNum===selectedUser.num && p.year===year)
                              .flatMap(p=>p.months);
  const duplicate = months.filter(m=> alreadyPaid.includes(m));
  if(duplicate.length){
    toast(`Ya existen pagos para: ${duplicate.map(i=>MONTHS[i]).join(', ')}`);
    return;
  }

  // Total
  const total = calcTotal();
  if(!isFinite(total) || total<=0){ toast('Total inválido.'); return; }

  // Registrar pago
  const folio = genFolio();
  const dateISO = new Date().toISOString();
  payments.push({ folio, userNum: selectedUser.num, dateISO, year, months, rate, total, hydrant: includeHydrant });
  saveAll();
  renderStats();
  toast('Pago registrado ✅');

  // Preparar WhatsApp
  const waMsg = buildWhatsAppReceipt(selectedUser, folio, dateISO, months, year, total, includeHydrant);
  $('waShare').href = `https://wa.me/52${selectedUser.tel}?text=${encodeURIComponent(waMsg)}`;

  // Imprimir recibo doble (sin bloquear: ventana creada sin esperar)
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
