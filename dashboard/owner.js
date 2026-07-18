/* AUTH */
const sess = JSON.parse(sessionStorage.getItem('fd_session')||'null');
if(!sess||sess.role!=='owner') window.location.href='login.html';

/* STORAGE */
const G  = k => JSON.parse(localStorage.getItem(k)||'null');
const S  = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const getEmps    = () => G('fd_employees')||[];
const getOrders  = () => G('fd_orders')||[];
const getTargets = () => G('fd_targets')||{};
const getNotifs  = () => G('fd_notifications')||[];
const getCommSet = () => G('fd_commission_settings')||{};
const saveEmps   = d => S('fd_employees',d);
const saveOrders = d => S('fd_orders',d);
const saveTargets= d => S('fd_targets',d);
const saveNotifs = d => S('fd_notifications',d);
const saveCommSet= d => S('fd_commission_settings',d);

/* HELPERS */
const AC = ['#0057FF','#FFB800','#00D68F','#FF4560','#9B59B6','#FF6B35'];
const ec = i => AC[i%AC.length];
const ei = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const fmtD = iso => new Date(iso).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'});
const fmtR = n => 'Rs. '+Number(n||0).toLocaleString();
const pc = s => ({Completed:'p-done',Pending:'p-pend','In Progress':'p-prog',Cancelled:'p-canc'}[s]||'p-pend');
const mk = (y,m) => `${y}-${String(m+1).padStart(2,'0')}`;
const ml = (y,m) => new Date(y,m,1).toLocaleDateString('en-PK',{month:'long',year:'numeric'});
const slugName = name => String(name||'employee').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'employee';

function uniqueUsername(name,currentId=''){
  const taken=new Set(getEmps()
    .filter(e=>e.id!==currentId)
    .map(e=>String(e.username||'').toLowerCase())
    .filter(Boolean));
  let base=slugName(name), user=base, n=2;
  while(taken.has(user)) user=`${base}-${n++}`;
  return user || `employee-${Date.now().toString().slice(-4)}`;
}

function genPassword(){
  const part=Math.random().toString(36).slice(2,6);
  const code=Math.floor(1000+Math.random()*9000);
  return `FD-${part.toUpperCase()}-${code}`;
}

function migrateEmployees(){
  const emps=getEmps();
  let changed=false;
  emps.forEach(e=>{
    if(!e.username){
      e.username=uniqueUsername(e.name,e.id);
      changed=true;
    }
  });
  if(changed) saveEmps(emps);
}

function commRate(empId){
  const cs=getCommSet(); if(cs[empId]!==undefined) return cs[empId];
  const e=getEmps().find(x=>x.id===empId); return e?.commissionRate??10;
}
function calcComm(empId,rev){ return Math.round(rev*commRate(empId)/100); }

/* DATE */
document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

/* MONTH DROPDOWNS */
function fillMonths(){
  const now=new Date(); const opts=[];
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const k=mk(d.getFullYear(),d.getMonth());
    opts.push(`<option value="${k}">${ml(d.getFullYear(),d.getMonth())}</option>`);
  }
  ['tgt-month','t-month'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts.join('');});
}

/* NOTIFICATIONS */
function askNotifPerm(){ if('Notification'in window&&Notification.permission==='default') Notification.requestPermission(); }

function pushNotif(title,body,icon='📋'){
  const all=getNotifs();
  all.unshift({id:'n'+Date.now(),title,body,icon,time:new Date().toISOString(),read:false});
  saveNotifs(all.slice(0,50));
  updateNotifBadge();
  if('Notification'in window&&Notification.permission==='granted'){
    new Notification('Falcons Digital — '+title,{body,icon:'../assets/images/logo.png'});
  }
}

function updateNotifBadge(){
  const n=getNotifs().filter(x=>!x.read).length;
  const dot=document.getElementById('notif-dot');
  const sb=document.getElementById('sb-notif-badge');
  if(dot){dot.textContent=n;dot.style.display=n>0?'flex':'none';}
  if(sb){sb.textContent=n;sb.style.display=n>0?'':'none';}
}

function toggleNotifDD(){
  const dd=document.getElementById('notif-dd');
  dd.classList.toggle('open');
  if(dd.classList.contains('open')) renderNotifDD();
}

function renderNotifDD(){
  const all=getNotifs();
  const list=document.getElementById('notif-dd-list');
  if(!all.length){list.innerHTML='<div class="notif-empty">No notifications yet</div>';return;}
  list.innerHTML=all.slice(0,8).map(n=>`
    <div class="notif-row ${n.read?'':'unread'}">
      <div class="notif-row-dot ${n.read?'read':''}"></div>
      <div><div class="notif-row-txt"><strong>${n.icon} ${n.title}</strong><br>${n.body}</div>
      <div class="notif-row-time">${fmtD(n.time)}</div></div>
    </div>`).join('');
  saveNotifs(getNotifs().map(n=>({...n,read:true})));
  updateNotifBadge();
}

function clearNotifs(){ saveNotifs([]); updateNotifBadge(); renderNotifDD(); }

/* POLL for new orders every 10 seconds */
let lastCount=getOrders().length;
setInterval(()=>{
  const orders=getOrders();
  if(orders.length>lastCount){
    const emps=getEmps();
    orders.slice(lastCount).forEach(o=>{
      const e=emps.find(x=>x.id===o.empId);
      pushNotif('New Order!',`${e?.name||'Someone'} logged an order for ${o.clientName} — ${fmtR(o.value)}`,'📋');
    });
    lastCount=orders.length;
    if(document.getElementById('panel-overview').classList.contains('active')) renderOverview();
  }
},10000);

/* TAB NAV */
let curTab='overview';
function showTab(tab,el){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l=>l.classList.remove('active'));
  document.getElementById('panel-'+tab).classList.add('active');
  if(el) el.classList.add('active');
  const titles={overview:'Dashboard',orders:'All Orders',employees:'Employees',targets:'Monthly Targets',commission:'Commission Tracker',analytics:'Analytics',notifications:'Notifications'};
  document.getElementById('topbar-title').textContent=titles[tab]||tab;
  curTab=tab;
  if(tab==='overview') renderOverview();
  if(tab==='orders') renderOrders();
  if(tab==='employees') renderEmployees();
  if(tab==='targets') renderTargets();
  if(tab==='commission') renderCommission();
  if(tab==='analytics') renderAnalytics();
  if(tab==='notifications') renderNotifPage();
  if(tab==='reviews') renderReviewsTab();
  document.getElementById('notif-dd').classList.remove('open');
}

/* ── REVIEWS MANAGEMENT ── */
function getWebReviews(){ return JSON.parse(localStorage.getItem('fd_reviews')||'[]'); }
function saveWebReviews(d){ localStorage.setItem('fd_reviews',JSON.stringify(d)); }

function updateReviewBadge(){
  const pending = getWebReviews().filter(r=>!r.approved).length;
  const badge   = document.getElementById('sb-review-badge');
  if(badge){ badge.textContent=pending; badge.style.display=pending>0?'':'none'; }
}

function renderReviewsTab(){
  const reviews = getWebReviews();
  const pending  = reviews.filter(r=>!r.approved);
  const approved = reviews.filter(r=>r.approved);

  function starsHTML(n){ return '★'.repeat(n)+'☆'.repeat(5-n); }
  function fmtD2(d){ return new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}); }

  function reviewCard(r, isPending){
    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid ${isPending?'rgba(255,184,0,0.2)':'var(--border)'};border-radius:10px;padding:1.3rem;margin-bottom:0.8rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;">
            <span style="color:var(--gold);font-size:0.9rem">${starsHTML(r.rating)}</span>
            ${r.service?`<span style="font-size:0.65rem;color:var(--blue);background:rgba(0,87,255,0.1);padding:0.15rem 0.5rem;border-radius:100px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">${r.service}</span>`:''}
          </div>
          <p style="font-size:0.85rem;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:0.7rem;font-style:italic">"${r.text}"</p>
          <div style="font-size:0.8rem;font-weight:700">${r.name} ${r.role?`<span style="color:var(--gray);font-weight:400">— ${r.role}</span>`:''}</div>
          <div style="font-size:0.7rem;color:var(--gray);margin-top:0.2rem">${fmtD2(r.date)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0">
          ${isPending ? `<button class="btn-s bs-green" onclick="approveReview('${r.id}')">✓ Approve</button>` : ''}
          ${!r.featured && !isPending ? `<button class="btn-s bs-blue" onclick="featureReview('${r.id}')">★ Feature</button>` : ''}
          ${r.featured ? `<button class="btn-s bs-gold" onclick="unfeatureReview('${r.id}')">★ Unfeature</button>` : ''}
          <button class="btn-s bs-red" onclick="deleteReview('${r.id}')">✕ Delete</button>
        </div>
      </div>`;
  }

  const pendingEl  = document.getElementById('reviews-pending-list');
  const approvedEl = document.getElementById('reviews-approved-list');

  pendingEl.innerHTML  = pending.length
    ? pending.map(r => reviewCard(r, true)).join('')
    : '<div style="color:var(--gray);font-size:0.85rem;padding:1rem 0">No pending reviews 🎉</div>';

  approvedEl.innerHTML = approved.length
    ? approved.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r => reviewCard(r, false)).join('')
    : '<div style="color:var(--gray);font-size:0.85rem;padding:1rem 0">No approved reviews yet</div>';

  updateReviewBadge();
}

function approveReview(id){
  const reviews = getWebReviews();
  const r = reviews.find(x=>x.id===id);
  if(r){ r.approved=true; saveWebReviews(reviews); renderReviewsTab(); pushNotif('Review Approved',`Review from ${r.name} is now live on the website`,'⭐'); }
}

function featureReview(id){
  const reviews = getWebReviews();
  reviews.forEach(r=>{ if(r.id===id) r.featured=true; });
  saveWebReviews(reviews); renderReviewsTab();
}

function unfeatureReview(id){
  const reviews = getWebReviews();
  reviews.forEach(r=>{ if(r.id===id) r.featured=false; });
  saveWebReviews(reviews); renderReviewsTab();
}

function deleteReview(id){
  if(!confirm('Delete this review permanently?')) return;
  const reviews = getWebReviews().filter(r=>r.id!==id);
  saveWebReviews(reviews); renderReviewsTab();
}

/* OVERVIEW */
function renderOverview(){
  const orders=getOrders(),emps=getEmps();
  const rev=orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
  const comm=orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+calcComm(o.empId,Number(o.value)),0);
  document.getElementById('ov-stats').innerHTML=`
    <div class="scard" style="--ac:var(--blue)"><div class="scard-icon">💰</div><div class="scard-val">${fmtR(rev)}</div><div class="scard-lbl">Total Revenue</div></div>
    <div class="scard" style="--ac:var(--gold)"><div class="scard-icon">📋</div><div class="scard-val">${orders.length}</div><div class="scard-lbl">Total Orders</div></div>
    <div class="scard" style="--ac:var(--green)"><div class="scard-icon">✅</div><div class="scard-val">${orders.filter(o=>o.status==='Completed').length}</div><div class="scard-lbl">Completed</div></div>
    <div class="scard" style="--ac:var(--purple)"><div class="scard-icon">💜</div><div class="scard-val">${fmtR(comm)}</div><div class="scard-lbl">Commission Due</div></div>`;

  const recent=[...orders].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  document.getElementById('ov-recent').innerHTML=recent.length
    ?recent.map(o=>{const e=emps.find(x=>x.id===o.empId);return`<tr><td><strong>${o.clientName}</strong></td><td>${e?e.name:'—'}</td><td style="color:var(--green)">${fmtR(o.value)}</td><td><span class="pill ${pc(o.status)}">${o.status}</span></td></tr>`;}).join('')
    :'<tr><td colspan="4" class="empty">No orders yet</td></tr>';

  const actEmps=emps.filter(e=>e.active);
  const bars=actEmps.map(e=>({n:e.name.split(' ')[0],r:orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0)}));
  const mx=Math.max(...bars.map(b=>b.r),1);
  document.getElementById('ov-chart').innerHTML=bars.length
    ?bars.map(b=>`<div class="bar-col"><div class="bar-amt">${b.r>0?'Rs.'+(b.r/1000).toFixed(0)+'K':''}</div><div class="bar-fill" style="height:${Math.max(3,(b.r/mx)*100)}px"></div><div class="bar-name">${b.n}</div></div>`).join('')
    :'<div style="color:var(--gray);font-size:0.8rem;margin:auto">No data yet</div>';

  const ranked=actEmps.map((e,i)=>({...e,i,done:orders.filter(o=>o.empId===e.id&&o.status==='Completed').length,tot:orders.filter(o=>o.empId===e.id).length,rev:orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0)})).sort((a,b)=>b.rev-a.rev).slice(0,3);
  document.getElementById('ov-top').innerHTML=ranked.map(e=>`
    <div class="ecard">
      <div class="ecard-top"><div class="eav-lg" style="background:${ec(e.i)}">${ei(e.name)}</div><div><div class="ename">${e.name}</div><div class="erole">${e.role}</div></div></div>
      <div class="emetrics" style="grid-template-columns:repeat(3,1fr)">
        <div class="em"><div class="em-val">${e.tot}</div><div class="em-lbl">Orders</div></div>
        <div class="em"><div class="em-val" style="color:var(--green)">${e.done}</div><div class="em-lbl">Done</div></div>
        <div class="em"><div class="em-val" style="color:var(--gold);font-size:1rem">${(e.rev/1000).toFixed(0)}K</div><div class="em-lbl">Rev</div></div>
      </div>
      <div class="comm-badge">💜 Commission: ${fmtR(calcComm(e.id,e.rev))}</div>
    </div>`).join('')||'<div class="empty"><div class="empty-ic">👥</div>No employees yet</div>';
}

/* ALL ORDERS */
function renderOrders(){
  const orders=getOrders(),emps=getEmps();
  const q=(document.getElementById('order-q')?.value||'').toLowerCase();
  const fe=document.getElementById('f-emp');
  const fs=document.getElementById('f-stat');
  if(fe&&fe.options.length===1) emps.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;fe.appendChild(o);});
  let rows=[...orders].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(q) rows=rows.filter(o=>o.clientName.toLowerCase().includes(q)||o.service.toLowerCase().includes(q));
  if(fe?.value) rows=rows.filter(o=>o.empId===fe.value);
  if(fs?.value) rows=rows.filter(o=>o.status===fs.value);
  const tb=document.getElementById('orders-body');
  tb.innerHTML=rows.length?rows.map(o=>{
    const e=emps.find(x=>x.id===o.empId);
    const comm=o.status==='Completed'?calcComm(o.empId,Number(o.value)):0;
    return`<tr>
      <td style="color:var(--gray);font-size:0.72rem">#${o.id.slice(-4).toUpperCase()}</td>
      <td style="color:var(--gray)">${fmtD(o.date)}</td>
      <td>${e?`<div class="ecell"><div class="eav" style="background:${ec(emps.indexOf(e))}">${ei(e.name)}</div>${e.name}</div>`:'—'}</td>
      <td><strong>${o.clientName}</strong></td>
      <td>${o.service}</td>
      <td style="color:var(--green);font-weight:700">${fmtR(o.value)}</td>
      <td style="color:var(--purple)">${o.status==='Completed'?fmtR(comm):'—'}</td>
      <td><span class="pill ${pc(o.status)}">${o.status}</span></td>
      <td><button class="btn-s bs-blue" onclick="viewOrder('${o.id}')">View</button></td>
    </tr>`;}).join(''):'<tr><td colspan="9" class="empty">No orders found</td></tr>';
}

/* EMPLOYEES */
function renderEmployees(){
  const emps=getEmps(),orders=getOrders();
  const grid=document.getElementById('emp-grid');
  grid.innerHTML=emps.length?emps.map((e,i)=>{
    const tot=orders.filter(o=>o.empId===e.id).length;
    const done=orders.filter(o=>o.empId===e.id&&o.status==='Completed').length;
    const rev=orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
    const rate=commRate(e.id);
    return`<div class="ecard">
      <div class="ecard-top"><div class="eav-lg" style="background:${ec(i)}">${ei(e.name)}</div>
      <div><div class="ename">${e.name}</div><div class="erole">${e.role}</div>
      <div style="font-size:0.7rem;color:var(--blue);margin-top:0.2rem">Login: ${e.username||'—'}</div>
      <span class="pill ${e.active?'p-actv':'p-inac'}" style="margin-top:0.3rem;display:inline-flex">${e.active?'Active':'Inactive'}</span></div></div>
      <div class="emetrics">
        <div class="em"><div class="em-val">${tot}</div><div class="em-lbl">Orders</div></div>
        <div class="em"><div class="em-val" style="color:var(--green)">${done}</div><div class="em-lbl">Done</div></div>
        <div class="em"><div class="em-val" style="color:var(--gold);font-size:1rem">${rev>=1000?(rev/1000).toFixed(1)+'K':rev}</div><div class="em-lbl">Rev</div></div>
        <div class="em"><div class="em-val" style="color:var(--purple);font-size:1rem">${rate}%</div><div class="em-lbl">Comm</div></div>
      </div>
      <div class="comm-badge">💜 Earned: ${fmtR(calcComm(e.id,rev))}</div>
      <div class="eactions" style="margin-top:0.8rem">
        <button class="btn-s bs-red" onclick="toggleEmp('${e.id}')">${e.active?'Deactivate':'Activate'}</button>
        <button class="btn-s bs-blue" onclick="resetPass('${e.id}')">Reset Pass</button>
        <button class="btn-s bs-green" onclick="showCredentials('${e.id}')">Show Login</button>
        <button class="btn-s bs-purple" onclick="quickComm('${e.id}','${e.name}')">Set Comm%</button>
      </div>
    </div>`;}).join(''):'<div class="empty"><div class="empty-ic">👤</div>No employees yet</div>';
}

/* TARGETS */
function renderTargets(){
  const mk_sel=document.getElementById('tgt-month')?.value||mk(new Date().getFullYear(),new Date().getMonth());
  const targets=getTargets(),orders=getOrders();
  const emps=getEmps().filter(e=>e.active);
  document.getElementById('tgt-grid').innerHTML=emps.length?emps.map((e,i)=>{
    const t=targets[`${e.id}_${mk_sel}`]||{revenue:0,orders:0};
    const aRev=orders.filter(o=>o.empId===e.id&&o.status==='Completed'&&o.date.startsWith(mk_sel)).reduce((s,o)=>s+Number(o.value),0);
    const aOrd=orders.filter(o=>o.empId===e.id&&o.date.startsWith(mk_sel)).length;
    const rPct=t.revenue>0?Math.min(Math.round(aRev/t.revenue*100),100):0;
    const oPct=t.orders>0?Math.min(Math.round(aOrd/t.orders*100),100):0;
    return`<div class="ecard">
      <div class="ecard-top"><div class="eav-lg" style="background:${ec(i)}">${ei(e.name)}</div><div><div class="ename">${e.name}</div><div class="erole">${e.role}</div></div></div>
      <div class="tgt-bar">
        <div class="tgt-row"><span>💰 Revenue</span><span>${fmtR(aRev)} / ${t.revenue>0?fmtR(t.revenue):'Not set'}</span></div>
        <div class="prog-bar"><div class="prog-fill ${aRev>=t.revenue&&t.revenue>0?'over':''}" style="width:${rPct}%"></div></div>
        ${aRev>=t.revenue&&t.revenue>0?'<div class="tgt-achieved">🎉 Revenue target achieved!</div>':''}
      </div>
      <div class="tgt-bar" style="margin-top:0.7rem">
        <div class="tgt-row"><span>📋 Orders</span><span>${aOrd} / ${t.orders>0?t.orders+' orders':'Not set'}</span></div>
        <div class="prog-bar"><div class="prog-fill ${aOrd>=t.orders&&t.orders>0?'over':''}" style="width:${oPct}%"></div></div>
        ${aOrd>=t.orders&&t.orders>0?'<div class="tgt-achieved">🎉 Order target achieved!</div>':''}
      </div>
      <button class="btn-s bs-gold" style="margin-top:0.9rem" onclick="prefillTarget('${e.id}')">Edit Target</button>
    </div>`;}).join(''):'<div class="empty"><div class="empty-ic">🎯</div>No active employees</div>';
}

function prefillTarget(empId){
  const sel=document.getElementById('t-emp');
  if(sel.options.length<=1) getEmps().filter(e=>e.active).forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;sel.appendChild(o);});
  sel.value=empId;
  openM('m-set-target');
}

function saveTarget(){
  const empId=document.getElementById('t-emp').value;
  const month=document.getElementById('t-month').value;
  const rev=parseFloat(document.getElementById('t-rev').value)||0;
  const ord=parseInt(document.getElementById('t-ord').value)||0;
  if(!empId) return alert('Please select an employee');
  const t=getTargets();
  t[`${empId}_${month}`]={revenue:rev,orders:ord};
  saveTargets(t);
  closeM('m-set-target');
  renderTargets();
}

/* COMMISSION */
function renderCommission(){
  const emps=getEmps(),orders=getOrders();
  let tRev=0,tComm=0;
  emps.filter(e=>e.active).forEach(e=>{
    const r=orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
    tRev+=r; tComm+=calcComm(e.id,r);
  });
  document.getElementById('comm-summary').innerHTML=`
    <div class="comm-sum-item"><div class="comm-sum-val">${fmtR(tRev)}</div><div class="comm-sum-lbl">Total Revenue</div></div>
    <div class="comm-sum-item"><div class="comm-sum-val" style="color:var(--purple)">${fmtR(tComm)}</div><div class="comm-sum-lbl">Total Commission</div></div>
    <div class="comm-sum-item"><div class="comm-sum-val" style="color:var(--green)">${fmtR(tRev-tComm)}</div><div class="comm-sum-lbl">Net Revenue</div></div>
    <div class="comm-sum-item"><div class="comm-sum-val">${emps.filter(e=>e.active).length}</div><div class="comm-sum-lbl">Active Staff</div></div>`;

  document.getElementById('comm-body').innerHTML=emps.length?emps.map((e,i)=>{
    const done=orders.filter(o=>o.empId===e.id&&o.status==='Completed').length;
    const rev=orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
    const rate=commRate(e.id);
    return`<tr>
      <td><div class="ecell"><div class="eav" style="background:${ec(i)}">${ei(e.name)}</div><strong>${e.name}</strong></div></td>
      <td style="color:var(--gray)">${e.role}</td>
      <td><span class="comm-badge">${rate}%</span></td>
      <td>${done}</td>
      <td style="color:var(--green);font-weight:700">${fmtR(rev)}</td>
      <td style="color:var(--purple);font-weight:700">${fmtR(calcComm(e.id,rev))}</td>
      <td><span class="pill ${e.active?'p-actv':'p-inac'}">${e.active?'Active':'Inactive'}</span></td>
    </tr>`;}).join(''):'<tr><td colspan="7" class="empty">No employees yet</td></tr>';
}

function openCommSettings(){
  const emps=getEmps(),cs=getCommSet();
  document.getElementById('comm-settings-fields').innerHTML=emps.map(e=>`
    <div class="mfield"><label>${e.name} — ${e.role}</label>
    <input type="number" id="cr_${e.id}" value="${cs[e.id]!==undefined?cs[e.id]:(e.commissionRate||10)}" min="0" max="100" placeholder="Commission %"/></div>`).join('');
  openM('m-comm-settings');
}

function saveCommRates(){
  const cs={};
  getEmps().forEach(e=>{const el=document.getElementById('cr_'+e.id);if(el)cs[e.id]=parseFloat(el.value)||0;});
  saveCommSet(cs);
  closeM('m-comm-settings');
  renderCommission();
}

function quickComm(id,name){
  const r=prompt(`Commission % for ${name}:`);
  if(r===null) return;
  const cs=getCommSet();cs[id]=parseFloat(r)||0;saveCommSet(cs);renderEmployees();
}

/* ANALYTICS */
function renderAnalytics(){
  const orders=getOrders(),emps=getEmps();
  const rev=orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
  const comm=orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+calcComm(o.empId,Number(o.value)),0);
  const avg=orders.filter(o=>o.status==='Completed').length?rev/orders.filter(o=>o.status==='Completed').length:0;
  document.getElementById('an-stats').innerHTML=`
    <div class="scard" style="--ac:var(--blue)"><div class="scard-icon">💰</div><div class="scard-val">${fmtR(rev)}</div><div class="scard-lbl">Total Revenue</div></div>
    <div class="scard" style="--ac:var(--gold)"><div class="scard-icon">📊</div><div class="scard-val">${fmtR(Math.round(avg))}</div><div class="scard-lbl">Avg Order Value</div></div>
    <div class="scard" style="--ac:var(--green)"><div class="scard-icon">📈</div><div class="scard-val">${orders.length?Math.round(orders.filter(o=>o.status==='Completed').length/orders.length*100):0}%</div><div class="scard-lbl">Completion Rate</div></div>
    <div class="scard" style="--ac:var(--purple)"><div class="scard-icon">💜</div><div class="scard-val">${fmtR(comm)}</div><div class="scard-lbl">Total Commission</div></div>`;
  document.getElementById('an-body').innerHTML=emps.length?emps.map((e,i)=>{
    const tot=orders.filter(o=>o.empId===e.id).length;
    const done=orders.filter(o=>o.empId===e.id&&o.status==='Completed').length;
    const rev=orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
    const comm=calcComm(e.id,rev);
    const rate=tot?Math.round(done/tot*100):0;
    return`<tr>
      <td><div class="ecell"><div class="eav" style="background:${ec(i)}">${ei(e.name)}</div><strong>${e.name}</strong></div></td>
      <td style="color:var(--gray)">${e.role}</td><td>${tot}</td>
      <td style="color:var(--green)">${done}</td>
      <td style="color:var(--gold);font-weight:700">${fmtR(rev)}</td>
      <td style="color:var(--purple);font-weight:700">${fmtR(comm)}</td>
      <td>${rate}%</td>
      <td style="min-width:110px"><div class="prog-bar"><div class="prog-fill" style="width:${rate}%"></div></div></td>
    </tr>`;}).join(''):'<tr><td colspan="8" class="empty">No data yet</td></tr>';
}

/* NOTIFICATIONS PAGE */
function renderNotifPage(){
  const all=getNotifs();
  const feed=document.getElementById('notif-page');
  feed.innerHTML=all.length?all.map(n=>`
    <div class="ncard ${n.read?'':'unread'}">
      <div class="ncard-icon">${n.icon}</div>
      <div><div class="ncard-title">${n.title}</div><div class="ncard-body">${n.body}</div><div class="ncard-time">${fmtD(n.time)}</div></div>
    </div>`).join(''):'<div class="empty"><div class="empty-ic">🔔</div>No notifications yet. They appear automatically when employees log new orders.</div>';
  saveNotifs(all.map(n=>({...n,read:true})));
  updateNotifBadge();
}

/* ORDER DETAIL */
let viewId=null;
function viewOrder(id){
  const o=getOrders().find(x=>x.id===id); if(!o) return;
  viewId=id;
  const e=getEmps().find(x=>x.id===o.empId);
  const comm=calcComm(o.empId,Number(o.value));
  document.getElementById('order-detail-html').innerHTML=`
    <div class="od">
      <div class="od-row"><span class="od-k">Order ID</span><span class="od-v">#${o.id.slice(-6).toUpperCase()}</span></div>
      <div class="od-row"><span class="od-k">Date</span><span class="od-v">${fmtD(o.date)}</span></div>
      <div class="od-row"><span class="od-k">Employee</span><span class="od-v">${e?e.name:'Unknown'}</span></div>
      <div class="od-row"><span class="od-k">Client</span><span class="od-v">${o.clientName}</span></div>
      <div class="od-row"><span class="od-k">Contact</span><span class="od-v">${o.clientContact||'—'}</span></div>
      <div class="od-row"><span class="od-k">Service</span><span class="od-v">${o.service}</span></div>
      <div class="od-row"><span class="od-k">Platform</span><span class="od-v">${o.platform||'—'}</span></div>
      <div class="od-row"><span class="od-k">Order Value</span><span class="od-v" style="color:var(--green)">${fmtR(o.value)}</span></div>
      <div class="od-row"><span class="od-k">Commission (${commRate(o.empId)}%)</span><span class="od-v" style="color:var(--purple)">${o.status==='Completed'?fmtR(comm):'Paid on completion'}</span></div>
      <div class="od-row"><span class="od-k">Package</span><span class="od-v">${o.package||'—'}</span></div>
      <div class="od-row"><span class="od-k">Ad Budget</span><span class="od-v">${o.adBudget?fmtR(o.adBudget):'—'}</span></div>
      <div class="od-row"><span class="od-k">Status</span><span class="od-v"><span class="pill ${pc(o.status)}">${o.status}</span></span></div>
      ${o.notes?`<div class="od-row"><span class="od-k">Notes</span><span class="od-v">${o.notes}</span></div>`:''}
    </div>`;
  document.getElementById('upd-status').value=o.status;
  openM('m-order-detail');
}

function updateStatus(){
  const orders=getOrders();
  const i=orders.findIndex(o=>o.id===viewId); if(i===-1) return;
  orders[i].status=document.getElementById('upd-status').value;
  saveOrders(orders); closeM('m-order-detail'); renderOrders();
}

/* EMPLOYEE MGMT */
function updateCredentialBox(username,password){
  const box=document.getElementById('new-cred-box');
  if(!box) return;
  document.getElementById('new-cred-user').textContent=username||'—';
  document.getElementById('new-cred-pass').textContent=password||'—';
  box.classList.toggle('show',Boolean(username&&password));
}

function generateEmployeeCredentials(){
  const name=document.getElementById('ne-name').value.trim();
  const username=uniqueUsername(name);
  const password=genPassword();
  document.getElementById('ne-user').value=username;
  document.getElementById('ne-pass').value=password;
  updateCredentialBox(username,password);
}
function addEmployee(){
  const name=document.getElementById('ne-name').value.trim();
  const role=document.getElementById('ne-role').value.trim();
  let username=document.getElementById('ne-user').value.trim().toLowerCase();
  let pass=document.getElementById('ne-pass').value.trim();
  const comm=parseFloat(document.getElementById('ne-comm').value)||10;
  if(!name||!role) return alert('Please fill name and employment title');
  if(!username) username=uniqueUsername(name);
  if(!pass) pass=genPassword();
  const emps=getEmps();
  if(emps.some(e=>String(e.username||'').toLowerCase()===username)) return alert('This username is already taken. Please regenerate or edit it.');
  emps.push({id:'emp_'+Date.now(),name,username,role,password:pass,commissionRate:comm,active:true});
  saveEmps(emps);
  ['ne-name','ne-role'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ne-comm').value='10';
  updateCredentialBox(username,pass);
  pushNotif('Employee Added',`${name} joined as ${role}`,'👤');
  renderEmployees();
  alert(`Employee created.\n\nUsername: ${username}\nPassword: ${pass}`);
}

function toggleEmp(id){
  const emps=getEmps(),e=emps.find(x=>x.id===id);
  if(!e) return; e.active=!e.active; saveEmps(emps); renderEmployees();
}

function resetPass(id){
  const generated=genPassword();
  const np=prompt('Enter new password:',generated); if(!np) return;
  const emps=getEmps(),e=emps.find(x=>x.id===id);
  if(e){e.password=np;saveEmps(emps);alert(`Password updated for ${e.name}.\n\nUsername: ${e.username}\nPassword: ${np}`);}
}

function showCredentials(id){
  const e=getEmps().find(x=>x.id===id);
  if(e) alert(`${e.name} login credentials\n\nUsername: ${e.username}\nPassword: ${e.password}`);
}

/* EXPORT EXCEL */
function exportExcel(){
  const orders=getOrders(),emps=getEmps();
  const rows=[['Order ID','Date','Employee','Client','Contact','Service','Platform','Value (Rs.)','Commission (Rs.)','Status','Package','Ad Budget','Notes']];
  orders.forEach(o=>{
    const e=emps.find(x=>x.id===o.empId);
    rows.push(['#'+o.id.slice(-6).toUpperCase(),fmtD(o.date),e?e.name:'',o.clientName,o.clientContact||'',o.service,o.platform||'',Number(o.value),o.status==='Completed'?calcComm(o.empId,Number(o.value)):0,o.status,o.package||'',o.adBudget||'',o.notes||'']);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:14},{wch:18},{wch:20},{wch:16},{wch:26},{wch:12},{wch:14},{wch:16},{wch:14},{wch:20},{wch:14},{wch:30}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Orders');

  const c2=[['Employee','Role','Commission Rate','Completed Orders','Total Revenue (Rs.)','Commission Earned (Rs.)']];
  emps.forEach(e=>{
    const done=orders.filter(o=>o.empId===e.id&&o.status==='Completed').length;
    const rev=orders.filter(o=>o.empId===e.id&&o.status==='Completed').reduce((s,o)=>s+Number(o.value),0);
    c2.push([e.name,e.role,commRate(e.id)+'%',done,rev,calcComm(e.id,rev)]);
  });
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(c2),'Commission');
  XLSX.writeFile(wb,`FalconsDigital_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* EXPORT CSV */
function exportCSV(){
  const orders=getOrders(),emps=getEmps();
  const rows=[['Order ID','Date','Employee','Client','Service','Value','Commission','Status']];
  orders.forEach(o=>{
    const e=emps.find(x=>x.id===o.empId);
    rows.push(['#'+o.id.slice(-4).toUpperCase(),fmtD(o.date),e?e.name:'',o.clientName,o.service,o.value,o.status==='Completed'?calcComm(o.empId,Number(o.value)):0,o.status]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=`FalconsDigital_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

/* MODAL */
function openM(id){
  document.getElementById(id).classList.add('open');
  if(id==='m-add-emp'){
    document.getElementById('ne-user').value='';
    document.getElementById('ne-pass').value=genPassword();
    updateCredentialBox('','');
  }
}
function closeM(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.addEventListener('click',e=>{if(!e.target.closest('.notif-wrap'))document.getElementById('notif-dd').classList.remove('open');});

function logout(){sessionStorage.clear();window.location.href='login.html';}

/* INIT */
migrateEmployees();
fillMonths();
askNotifPerm();
updateNotifBadge();
updateReviewBadge();
renderOverview();

document.getElementById('ne-name')?.addEventListener('input',()=>{
  const userEl=document.getElementById('ne-user');
  if(userEl) userEl.value=uniqueUsername(document.getElementById('ne-name').value.trim());
});

/* fill target emp dropdown on modal open */
document.getElementById('m-set-target').addEventListener('click',()=>{
  const sel=document.getElementById('t-emp');
  if(sel.options.length<=1) getEmps().filter(e=>e.active).forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;sel.appendChild(o);});
});

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
