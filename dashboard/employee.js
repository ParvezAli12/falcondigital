/* AUTH */
const sess=JSON.parse(sessionStorage.getItem('fd_session')||'null');
if(!sess||sess.role!=='employee') window.location.href='login.html';
const myId=sess.id, myName=sess.name, myEmpRole=sess.empRole;

/* STORAGE */
const getOrders=()=>JSON.parse(localStorage.getItem('fd_orders')||'[]');
const getTargets=()=>JSON.parse(localStorage.getItem('fd_targets')||'{}');
const getCommSet=()=>JSON.parse(localStorage.getItem('fd_commission_settings')||'{}');
const saveOrders=d=>localStorage.setItem('fd_orders',JSON.stringify(d));

/* HELPERS */
const fmtD=iso=>new Date(iso).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'});
const fmtR=n=>'Rs. '+Number(n||0).toLocaleString();
const pc=s=>({Completed:'p-done',Pending:'p-pend','In Progress':'p-prog',Cancelled:'p-canc'}[s]||'p-pend');
const mk=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;
const ml=(y,m)=>new Date(y,m,1).toLocaleDateString('en-PK',{month:'long',year:'numeric'});

function myCommRate(){
  const cs=getCommSet();
  return cs[myId]!==undefined?cs[myId]:10;
}
function calcComm(val){
  return Math.round(val*(myCommRate()/100));
}

/* SIDEBAR TOGGLE */
function toggleSidebar(){
  const s=document.querySelector('.sidebar');
  const o=document.getElementById('sidebar-overlay');
  const t=document.getElementById('mob-toggle');
  s.classList.toggle('open');
  o.classList.toggle('open');
  t.classList.toggle('open');
  document.body.style.overflow=s.classList.contains('open')?'hidden':'';
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.getElementById('mob-toggle').classList.remove('open');
  document.body.style.overflow='';
}

/* TABS */
function showTab(name,el){
  closeSidebar();
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l=>l.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  el.classList.add('active');
  const titles={home:'My Dashboard','new-order':'Log New Order','my-orders':'My Orders','my-targets':'My Targets','my-commission':'My Commission'};
  document.getElementById('top-title').textContent=titles[name]||name;
  if(name==='my-orders') renderMyOrders();
  if(name==='my-targets') renderMyTargets();
  if(name==='my-commission') renderMyCommission();
}

/* INIT */
(function init(){
  const now=new Date();
  document.getElementById('top-date').textContent=now.toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const hr=now.getHours();
  const greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  document.getElementById('top-greet').textContent=greet+', '+myName+'!';
  document.getElementById('sb-name').textContent=myName;
  document.getElementById('sb-role').textContent=myEmpRole||'Sales Executive';
  document.getElementById('sb-av').textContent=myName.charAt(0).toUpperCase();
  renderHome();
})();

/* HOME */
function renderHome(){
  const orders=getOrders().filter(o=>o.empId===myId);
  const done=orders.filter(o=>o.status==='Completed');
  const totalRev=done.reduce((s,o)=>s+Number(o.value),0);
  const comm=calcComm(totalRev);
  const rate=orders.length?Math.round(done.length/orders.length*100):0;

  document.getElementById('home-stats').innerHTML=`
    <div class="scard" style="--ac:var(--blue)"><div class="scard-icon">📋</div><div class="scard-val">${orders.length}</div><div class="scard-lbl">Total Orders</div></div>
    <div class="scard" style="--ac:var(--green)"><div class="scard-icon">✅</div><div class="scard-val">${done.length}</div><div class="scard-lbl">Completed</div></div>
    <div class="scard" style="--ac:var(--gold)"><div class="scard-icon">💰</div><div class="scard-val">${fmtR(totalRev)}</div><div class="scard-lbl">Total Revenue</div></div>
    <div class="scard" style="--ac:var(--purple)"><div class="scard-icon">💜</div><div class="scard-val">${fmtR(comm)}</div><div class="scard-lbl">Commission</div></div>`;

  const recent=[...orders].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  document.getElementById('home-recent').innerHTML=recent.length
    ?recent.map(o=>{const c=o.status==='Completed'?calcComm(Number(o.value)):0;return`<tr>
      <td style="color:var(--gray)">${fmtD(o.date)}</td>
      <td><strong>${o.clientName}</strong></td>
      <td>${o.service}</td>
      <td style="color:var(--green);font-weight:700">${fmtR(o.value)}</td>
      <td style="color:var(--purple)">${o.status==='Completed'?fmtR(c):'—'}</td>
      <td><span class="pill ${pc(o.status)}">${o.status}</span></td>
    </tr>`;}).join('')
    :'<tr><td colspan="6" class="empty"><div class="empty-ic">📭</div>No orders yet — log your first one!</td></tr>';

  setTimeout(()=>{
    const circ=239,off=circ-(rate/100)*circ;
    document.getElementById('ring-c').style.strokeDashoffset=off;
    document.getElementById('ring-t').textContent=rate+'%';
  },200);

  const allEmps=JSON.parse(localStorage.getItem('fd_employees')||'[]').filter(e=>e.active);
  const allOrders=getOrders();
  const ranked=allEmps.map(e=>({id:e.id,rev:allOrders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0)})).sort((a,b)=>b.rev-a.rev);
  const myRank=ranked.findIndex(e=>e.id===myId)+1;
  document.getElementById('my-rank').textContent=myRank>0?`#${myRank} / ${allEmps.length}`:'—';
  document.getElementById('my-comm-total').textContent=fmtR(comm);
}

/* SUBMIT ORDER */
function submitOrder(){
  const client=document.getElementById('f-client').value.trim();
  const service=document.getElementById('f-service').value;
  const value=document.getElementById('f-value').value;
  if(!client||!service||!value) return alert('Please fill: Client Name, Service, and Order Value');
  const orders=getOrders();
  orders.push({
    id:'ord_'+Date.now(),empId:myId,empName:myName,
    date:new Date().toISOString(),
    clientName:client,
    clientContact:document.getElementById('f-contact').value.trim(),
    service,
    platform:document.getElementById('f-platform').value,
    value:parseFloat(value),
    status:document.getElementById('f-status').value,
    package:document.getElementById('f-package').value.trim(),
    adBudget:document.getElementById('f-budget').value?parseFloat(document.getElementById('f-budget').value):null,
    notes:document.getElementById('f-notes').value.trim()
  });
  saveOrders(orders);
  const t=document.getElementById('toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
  clearForm();
}

function clearForm(){
  ['f-client','f-contact','f-value','f-package','f-budget','f-notes'].forEach(id=>document.getElementById(id).value='');
  ['f-service','f-platform'].forEach(id=>document.getElementById(id).selectedIndex=0);
  document.getElementById('f-status').value='Pending';
}

/* MY ORDERS */
function renderMyOrders(){
  const f=document.getElementById('ord-filter')?.value||'';
  let orders=getOrders().filter(o=>o.empId===myId);
  if(f) orders=orders.filter(o=>o.status===f);
  orders.sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById('my-orders-body').innerHTML=orders.length
    ?orders.map(o=>{const comm=o.status==='Completed'?calcComm(Number(o.value)):0;return`<tr>
      <td style="color:var(--gray);font-size:0.72rem">#${o.id.slice(-4).toUpperCase()}</td>
      <td style="color:var(--gray)">${fmtD(o.date)}</td>
      <td><strong>${o.clientName}</strong>${o.clientContact?`<div style="font-size:0.7rem;color:var(--gray)">${o.clientContact}</div>`:''}</td>
      <td>${o.service}</td>
      <td>${o.platform||'—'}</td>
      <td style="font-size:0.78rem;color:var(--gray)">${o.package||'—'}</td>
      <td style="color:var(--green);font-weight:700">${fmtR(o.value)}</td>
      <td style="color:var(--purple)">${o.status==='Completed'?fmtR(comm):'—'}</td>
      <td><span class="pill ${pc(o.status)}">${o.status}</span></td>
      <td style="font-size:0.75rem;color:var(--gray);max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.notes||'—'}</td>
    </tr>`;}).join('')
    :'<tr><td colspan="10" class="empty"><div class="empty-ic">📭</div>No orders found</td></tr>';
}

/* MY TARGETS */
function renderMyTargets(){
  const targets=getTargets();
  const orders=getOrders();
  const now=new Date();
  const grid=document.getElementById('my-targets-grid');
  const months=[];
  for(let i=0;i<3;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({key:mk(d.getFullYear(),d.getMonth()),label:ml(d.getFullYear(),d.getMonth())});
  }
  grid.innerHTML=months.map(m=>{
    const t=targets[`${myId}_${m.key}`]||{revenue:0,orders:0};
    const aRev=orders.filter(o=>o.empId===myId&&o.status==='Completed'&&o.date.startsWith(m.key)).reduce((s,o)=>s+Number(o.value),0);
    const aOrd=orders.filter(o=>o.empId===myId&&o.date.startsWith(m.key)).length;
    const rPct=t.revenue>0?Math.min(Math.round(aRev/t.revenue*100),100):0;
    const oPct=t.orders>0?Math.min(Math.round(aOrd/t.orders*100),100):0;
    const noTarget=!t.revenue&&!t.orders;
    return`<div class="scard" style="--ac:var(--blue);padding:1.4rem;">
      <div style="font-weight:700;margin-bottom:1rem;font-size:0.9rem">${m.label}</div>
      ${noTarget?'<div style="color:var(--gray);font-size:0.82rem">No target set by owner yet</div>':`
      <div class="tgt-bar">
        <div class="tgt-row"><span>💰 Revenue</span><span>${fmtR(aRev)} / ${fmtR(t.revenue)}</span></div>
        <div class="prog-bar"><div class="prog-fill ${aRev>=t.revenue&&t.revenue>0?'over':''}" style="width:${rPct}%"></div></div>
        <div style="font-size:0.67rem;color:${aRev>=t.revenue&&t.revenue>0?'var(--green)':'var(--gray)'};margin-top:0.2rem">${aRev>=t.revenue&&t.revenue>0?'🎉 Achieved!':rPct+'% of target'}</div>
      </div>
      <div class="tgt-bar" style="margin-top:0.7rem">
        <div class="tgt-row"><span>📋 Orders</span><span>${aOrd} / ${t.orders}</span></div>
        <div class="prog-bar"><div class="prog-fill ${aOrd>=t.orders&&t.orders>0?'over':''}" style="width:${oPct}%"></div></div>
        <div style="font-size:0.67rem;color:${aOrd>=t.orders&&t.orders>0?'var(--green)':'var(--gray)'};margin-top:0.2rem">${aOrd>=t.orders&&t.orders>0?'🎉 Achieved!':oPct+'% of target'}</div>
      </div>`}
    </div>`;
  }).join('');
}

/* MY COMMISSION */
function renderMyCommission(){
  const orders=getOrders().filter(o=>o.empId===myId);
  const done=orders.filter(o=>o.status==='Completed');
  const totalRev=done.reduce((s,o)=>s+Number(o.value),0);
  const totalComm=calcComm(totalRev);
  const rate=myCommRate();
  document.getElementById('comm-stats').innerHTML=`
    <div class="scard" style="--ac:var(--green)"><div class="scard-icon">💰</div><div class="scard-val">${fmtR(totalRev)}</div><div class="scard-lbl">Total Sales</div></div>
    <div class="scard" style="--ac:var(--purple)"><div class="scard-icon">💜</div><div class="scard-val">${fmtR(totalComm)}</div><div class="scard-lbl">Commission Earned</div></div>
    <div class="scard" style="--ac:var(--blue)"><div class="scard-icon">📊</div><div class="scard-val">${rate}%</div><div class="scard-lbl">My Rate</div></div>
    <div class="scard" style="--ac:var(--gold)"><div class="scard-icon">✅</div><div class="scard-val">${done.length}</div><div class="scard-lbl">Completed Orders</div></div>`;

  document.getElementById('comm-orders-body').innerHTML=done.length
    ?[...done].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o=>`<tr>
      <td style="color:var(--gray)">${fmtD(o.date)}</td>
      <td><strong>${o.clientName}</strong></td>
      <td>${o.service}</td>
      <td style="color:var(--green);font-weight:700">${fmtR(o.value)}</td>
      <td><span class="comm-badge">${rate}%</span></td>
      <td style="color:var(--purple);font-weight:700">${fmtR(calcComm(Number(o.value)))}</td>
    </tr>`).join('')
    :'<tr><td colspan="6" class="empty"><div class="empty-ic">💜</div>No completed orders yet</td></tr>';
}

function logout(){ sessionStorage.clear(); window.location.href='login.html'; }
