/* =========================================================
   ConnectWorks Admin (CMS) — schema-driven editor on Supabase
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.CW_CONFIG || {};
  var app = document.getElementById('app');
  function fatal(msg){ app.innerHTML = '<div class="center-msg"><h2>Admin error</h2><p>'+msg+'</p><p><button class="btn" onclick="location.reload()">Reload</button></p></div>'; }
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { fatal('Missing Supabase settings in <code>js/cw-config.js</code>.'); return; }
  if (!window.supabase || !window.supabase.createClient) { fatal('The Supabase library did not load. Check your internet/ad-blocker and reload.'); return; }
  var sb;
  try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
  catch (e) { fatal('Could not initialize Supabase: ' + (e && e.message || e)); return; }

  /* ---------- icon set (matches the public site sprite) ---------- */
  var ICONS = ['camera','lock','intercom','cable','fiber','wifi','av','shield','tools','pin','sparkle','sliders',
    'fair','office','warehouse','retail','restaurant','coffee','car','school','church','multi','manager','medical',
    'chat','clipboard','doc','wrench','headset','phone','mail','globe','arrow','check','clock','star','badge','alert'];
  function ic(name, size) { size = size || 20; return '<svg class="ic" viewBox="0 0 24 24" style="width:' + size + 'px;height:' + size + 'px"><use href="#i-' + (name || 'check') + '"/></svg>'; }

  var SRC = ['Yelp','Google','Direct','Other'];
  var LEAD_STATUS = ['new','contacted','quoted','won','lost'];

  /* ---------- collection definitions (drive the whole UI) ---------- */
  var COLLECTIONS = [
    { key:'settings', label:'General Settings', icon:'sliders', table:'site_settings', single:true, match:{id:1}, fields:[
      {n:'company_name',l:'Company name'},{n:'tagline'},{n:'phone'},{n:'email'},{n:'website'},
      {n:'service_area',l:'Service area'},{n:'address',l:'Address (optional)'},
      {n:'has_licenses',l:'Has licenses?',t:'bool',hint:'If ON, the site shows "Licensed & Insured". If OFF, it shows the professional / available-on-request text.'},
      {n:'license_text',l:'Licensed text'},{n:'no_license_text',l:'No-license text'},
      {n:'review_rating',l:'Review rating (e.g. 4.9 — leave blank to hide)'},{n:'review_rating_label'},
      {n:'facebook_url'},{n:'instagram_url'},{n:'linkedin_url'},{n:'yelp_url'},{n:'google_reviews_url'},
      {n:'logo_url',l:'Logo',t:'image'},{n:'favicon_url',l:'Favicon',t:'image'},{n:'og_image_url',l:'Open Graph image',t:'image'}
    ]},
    { key:'hero', label:'Home / Hero', icon:'star', table:'home_sections', single:true, match:{section_key:'hero'}, fields:[
      {n:'eyebrow'},{n:'title',l:'H1 — wrap the highlighted part in **double asterisks**'},{n:'subtitle',t:'textarea'},
      {n:'cta_text',l:'Primary button text'},{n:'cta_link',l:'Primary button link'},
      {n:'cta2_text',l:'Secondary button text'},{n:'cta2_link',l:'Secondary button link'}
    ]},
    { key:'cta', label:'CTA Banner', icon:'arrow', table:'home_sections', single:true, match:{section_key:'cta_banner'}, fields:[
      {n:'title'},{n:'content',t:'textarea'},{n:'cta_text',l:'Button text'},{n:'cta_link',l:'Button link'}
    ]},
    { key:'badges', label:'Trust Badges', icon:'badge', table:'trust_badges', order:'sort_order',
      cols:['label','active','sort_order'], fields:[
      {n:'label',req:true},{n:'icon',t:'icon'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'services', label:'Services', icon:'camera', table:'services', order:'sort_order',
      cols:['title','active','sort_order'], fields:[
      {n:'title',req:true},{n:'slug'},{n:'short_description',t:'textarea'},{n:'long_description',t:'textarea'},
      {n:'icon',t:'icon'},{n:'image_url',l:'Image',t:'image'},{n:'cta_text'},{n:'cta_link'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'industries', label:'Industries', icon:'office', table:'industries', order:'sort_order',
      cols:['title','active','sort_order'], fields:[
      {n:'title',req:true},{n:'description',t:'textarea'},{n:'icon',t:'icon'},{n:'image_url',l:'Image',t:'image'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'features', label:'Why Choose Us', icon:'fair', table:'features', order:'sort_order',
      cols:['title','active','sort_order'], fields:[
      {n:'title',req:true},{n:'description',t:'textarea'},{n:'icon',t:'icon'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'process', label:'Process', icon:'clipboard', table:'process_steps', order:'sort_order',
      cols:['step_number','title','active'], fields:[
      {n:'step_number',l:'Step #',t:'number'},{n:'title',req:true},{n:'description',t:'textarea'},{n:'icon',t:'icon'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'problems', label:'Problems We Solve', icon:'alert', table:'problems', order:'sort_order',
      cols:['title','active','sort_order'], fields:[
      {n:'title',req:true},{n:'description',t:'textarea'},{n:'icon',t:'icon'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'projects', label:'Projects / Gallery', icon:'wrench', table:'projects', order:'sort_order',
      cols:['title','category','active'], fields:[
      {n:'title',req:true},{n:'category'},{n:'description',t:'textarea'},{n:'image_url',l:'Main image',t:'image'},
      {n:'location',l:'Location (optional)'},{n:'service_related'},{n:'industry_related'},
      {n:'is_real_project',l:'Real project? (off = "Work Example")',t:'bool'},{n:'featured',t:'bool'},
      {n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'reviews', label:'Reviews', icon:'star', table:'reviews', order:'sort_order',
      cols:['client_name','rating','active'], fields:[
      {n:'client_name',l:'Client name',req:true},{n:'company',l:'Company (optional)'},{n:'review_text',t:'textarea'},
      {n:'rating',t:'number'},{n:'source',t:'select',options:SRC},{n:'source_url',l:'Source link (optional)'},
      {n:'review_date',t:'date'},{n:'sort_order',t:'number'},{n:'active',t:'bool'}
    ]},
    { key:'seo', label:'SEO', icon:'globe', table:'seo_settings', single:true, match:{page_key:'home'}, fields:[
      {n:'meta_title'},{n:'meta_description',t:'textarea'},{n:'og_title'},{n:'og_description',t:'textarea'},
      {n:'og_image',l:'OG image',t:'image'},{n:'canonical_url'}
    ]},
    { key:'form', label:'Contact Form', icon:'clipboard', table:'form_settings', single:true, match:{id:1}, fields:[
      {n:'business_types',l:'Business type options (one per line)',t:'textarea'},
      {n:'services',l:'Service options (one per line)',t:'textarea'},
      {n:'project_types',l:'Project type options (one per line)',t:'textarea'},
      {n:'timelines',l:'Timeline options (one per line)',t:'textarea'},
      {n:'budgets',l:'Budget options (one per line)',t:'textarea'},
      {n:'submit_text',l:'Submit button text'},
      {n:'thankyou_message',l:'Thank-you message',t:'textarea'},
      {n:'success_message',l:'Inline success message',t:'textarea'}
    ]},
    { key:'leads', label:'Leads', icon:'mail', table:'leads', leads:true },
    { key:'media', label:'Media Library', icon:'doc', media:true }
  ];
  function col(k){ return COLLECTIONS.filter(function(c){return c.key===k;})[0]; }

  /* ---------- helpers ---------- */
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function toast(msg, err){ var t=document.createElement('div'); t.className='toast'+(err?' toast--err':''); t.textContent=msg; document.body.appendChild(t); setTimeout(function(){t.remove();},2800); }
  function flabel(f){ return f.l || f.n.replace(/_/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();}); }

  /* ---------- auth ---------- */
  var state = { view:'settings', session:null };

  (async function init(){
    try { var r = await sb.auth.getSession(); state.session = (r && r.data) ? r.data.session : null; route(); }
    catch(e){ fatal('Auth error: ' + (e && e.message || e)); }
  })();
  sb.auth.onAuthStateChange(function(_e, session){ state.session = session; route(); });

  function route(){
    try { if(!state.session){ renderLogin(); } else { renderApp(); } }
    catch(e){ fatal('Render error: ' + (e && e.message || e)); }
  }

  function renderLogin(){
    app.innerHTML =
      '<div class="login-wrap"><form class="login-card" id="loginForm">'
      + '<div class="login-brand"><img src="../assets/logo-connectworks.png" alt=""><strong>ConnectWorks Admin</strong></div>'
      + '<h1>Sign in</h1><p>Manage your website content.</p>'
      + '<div class="field"><label>Email</label><input type="email" id="li-email" required></div>'
      + '<div class="field"><label>Password</label><input type="password" id="li-pass" required></div>'
      + '<button class="btn btn--primary" style="width:100%;justify-content:center" type="submit">Sign in</button>'
      + '<p class="status status--err" id="li-err" style="margin-top:12px"></p>'
      + '</form></div>';
    document.getElementById('loginForm').addEventListener('submit', async function(e){
      e.preventDefault();
      var btn=e.target.querySelector('button'); btn.disabled=true; btn.textContent='Signing in…';
      var em=document.getElementById('li-email').value.trim(), pw=document.getElementById('li-pass').value;
      var r=await sb.auth.signInWithPassword({email:em,password:pw});
      if(r.error){ document.getElementById('li-err').textContent=r.error.message; btn.disabled=false; btn.textContent='Sign in'; }
    });
  }

  function renderApp(){
    var nav='';
    COLLECTIONS.forEach(function(c){
      nav += '<button class="navitem'+(state.view===c.key?' navitem--on':'')+'" data-go="'+c.key+'">'+ic(c.icon,18)+' <span>'+c.label+'</span></button>';
    });
    app.innerHTML =
      '<div class="app"><aside class="sidebar">'
      + '<div class="brand"><img src="../assets/logo-connectworks.png" alt=""> Admin</div>'
      + '<div class="grp">Content</div>' + nav
      + '</aside><div class="main">'
      + '<div class="topbar"><h2 id="pageTitle"></h2><div class="right">'
      + '<a class="btn" href="/" target="_blank">'+ic('globe',18)+' Preview site</a>'
      + '<button class="btn btn--ghost" id="logout">Logout</button></div></div>'
      + '<div class="content" id="content"></div></div></div>';
    document.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click', function(){ state.view=b.getAttribute('data-go'); renderApp(); }); });
    document.getElementById('logout').addEventListener('click', function(){ sb.auth.signOut(); });
    var c=col(state.view); document.getElementById('pageTitle').textContent=c.label;
    if(c.media) return renderMedia();
    if(c.leads) return renderLeads();
    if(c.single) return renderSingle(c);
    return renderList(c);
  }

  /* ---------- single-row editor (settings, hero, cta, seo) ---------- */
  async function renderSingle(c){
    var box=document.getElementById('content'); box.innerHTML='<div class="center-msg">Loading…</div>';
    var q=sb.from(c.table).select('*'); Object.keys(c.match).forEach(function(k){ q=q.eq(k,c.match[k]); });
    var r=await q.maybeSingle();
    if(r.error && r.error.code!=='PGRST116'){ box.innerHTML='<div class="card status status--err">'+esc(r.error.message)+'</div>'; return; }
    var row=r.data || Object.assign({}, c.match);
    box.innerHTML='<div class="card">'+formHtml(c,row)+'</div>';
    wireForm(c,row,box,function(){ renderApp(); });
  }

  /* ---------- list editor ---------- */
  async function renderList(c){
    var box=document.getElementById('content'); box.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from(c.table).select('*').order(c.order||'sort_order',{ascending:true});
    if(r.error){ box.innerHTML='<div class="card status status--err">'+esc(r.error.message)+'</div>'; return; }
    var rows=r.data||[];
    var ths=c.cols.map(function(k){return '<th>'+flabel({n:k})+'</th>';}).join('')+'<th></th>';
    var trs=rows.map(function(row){
      var tds=c.cols.map(function(k){
        if(k==='active') return '<td><span class="pill '+(row[k]?'pill--on':'pill--off')+'">'+(row[k]?'Active':'Hidden')+'</span></td>';
        return '<td>'+esc(row[k])+'</td>';
      }).join('');
      return '<tr>'+tds+'<td><div class="row-actions"><button class="btn" data-edit="'+row.id+'">Edit</button><button class="btn btn--danger" data-del="'+row.id+'">Delete</button></div></td></tr>';
    }).join('') || '<tr><td colspan="'+(c.cols.length+1)+'" class="muted">No items yet.</td></tr>';
    box.innerHTML='<div class="list-head"><h3>'+c.label+'</h3><button class="btn btn--primary" id="newBtn">'+ic('check',18)+' New</button></div>'
      +'<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
    document.getElementById('newBtn').addEventListener('click', function(){ openForm(c, {active:true, sort_order:rows.length+1}); });
    box.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ var row=rows.filter(function(x){return String(x.id)===b.getAttribute('data-edit');})[0]; openForm(c,row); }); });
    box.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', async function(){
      if(!confirm('Delete this item? This cannot be undone.')) return;
      var d=await sb.from(c.table).delete().eq('id',b.getAttribute('data-del'));
      if(d.error) toast(d.error.message,true); else { toast('Deleted'); renderList(c); }
    }); });
  }

  function openForm(c,row){
    var box=document.getElementById('content');
    box.innerHTML='<div class="card"><div class="list-head"><h3>'+(row.id?'Edit':'New')+' '+c.label+'</h3>'
      +'<button class="btn btn--ghost" id="backBtn">← Back</button></div>'+formHtml(c,row)+'</div>';
    document.getElementById('backBtn').addEventListener('click', function(){ renderList(c); });
    wireForm(c,row,box,function(){ renderList(c); });
  }

  /* ---------- form rendering + wiring ---------- */
  function formHtml(c,row){
    var html='<form id="cwForm">';
    c.fields.forEach(function(f){
      var v=row[f.n]; var id='f-'+f.n;
      html+='<div class="field" data-field="'+f.n+'" data-type="'+(f.t||'text')+'">';
      if(f.t!=='bool') html+='<label for="'+id+'">'+flabel(f)+(f.req?' *':'')+(f.hint?' <span class="hint">— '+esc(f.hint)+'</span>':'')+'</label>';
      if(f.t==='textarea') html+='<textarea id="'+id+'">'+esc(v)+'</textarea>';
      else if(f.t==='number') html+='<input type="number" id="'+id+'" value="'+esc(v)+'">';
      else if(f.t==='date') html+='<input type="date" id="'+id+'" value="'+esc(v||'')+'">';
      else if(f.t==='bool') html+='<div class="switch"><input type="checkbox" id="'+id+'" '+(v?'checked':'')+'><label for="'+id+'" style="margin:0">'+flabel(f)+(f.hint?' <span class="hint">— '+esc(f.hint)+'</span>':'')+'</label></div>';
      else if(f.t==='select') html+='<select id="'+id+'">'+f.options.map(function(o){return '<option '+(o===v?'selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>';
      else if(f.t==='icon') html+='<div><button type="button" class="icon-field-btn" data-iconpick="'+f.n+'">'+ic(v||'check',22)+' <span data-iconname>'+esc(v||'(choose)')+'</span></button><input type="hidden" id="'+id+'" value="'+esc(v||'')+'"></div>';
      else if(f.t==='image') html+='<div class="img-field"><span class="img-prev" data-prev style="'+(v?'background-image:url('+esc(v)+')':'')+'"></span>'
          +'<div style="flex:1"><input type="text" id="'+id+'" value="'+esc(v||'')+'" placeholder="image URL or path"><button type="button" class="btn" style="margin-top:8px" data-imgpick="'+f.n+'">'+ic('doc',16)+' Choose / upload</button></div></div>';
      else html+='<input type="text" id="'+id+'" value="'+esc(v)+'">';
      html+='</div>';
    });
    html+='<div class="form-actions"><button class="btn btn--primary" type="submit">'+ic('check',18)+' Save</button>'
      +'<button class="btn" type="button" id="cancelBtn">Cancel</button>'
      +'<span class="status" id="formStatus"></span></div></form>';
    return html;
  }

  function wireForm(c,row,scope,after){
    var form=scope.querySelector('#cwForm');
    scope.querySelectorAll('[data-iconpick]').forEach(function(btn){
      btn.addEventListener('click', function(){ openIconPicker(function(name){
        btn.querySelector('[data-iconname]').textContent=name;
        btn.querySelector('.ic use').setAttribute('href','#i-'+name);
        form.querySelector('#f-'+btn.getAttribute('data-iconpick')).value=name;
      }); });
    });
    scope.querySelectorAll('[data-imgpick]').forEach(function(btn){
      btn.addEventListener('click', function(){ openMediaPicker(function(url){
        var inp=form.querySelector('#f-'+btn.getAttribute('data-imgpick')); inp.value=url;
        var prev=inp.closest('.img-field').querySelector('[data-prev]'); prev.style.backgroundImage='url('+url+')';
      }); });
    });
    var cancel=scope.querySelector('#cancelBtn'); if(cancel) cancel.addEventListener('click', function(){ after(); });
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var st=form.querySelector('#formStatus'); st.className='status'; st.textContent='Saving…';
      var payload={};
      c.fields.forEach(function(f){
        var el=form.querySelector('#f-'+f.n);
        if(f.t==='bool') payload[f.n]=el.checked;
        else if(f.t==='number') payload[f.n]= el.value===''?null:Number(el.value);
        else payload[f.n]= el.value===''?null:el.value;
      });
      var res;
      if(row.id){ res=await sb.from(c.table).update(payload).eq('id',row.id); }
      else { if(c.match) Object.assign(payload,c.match); res=await sb.from(c.table).insert(payload); }
      if(res.error){ st.className='status status--err'; st.textContent=res.error.message; toast(res.error.message,true); }
      else { st.className='status status--ok'; st.textContent='Saved ✓'; toast('Saved'); setTimeout(after,500); }
    });
  }

  /* ---------- icon picker ---------- */
  function openIconPicker(cb){
    var m=modal('Choose an icon',
      '<div class="icon-grid">'+ICONS.map(function(n){return '<button class="icon-opt" data-i="'+n+'">'+ic(n,26)+'<span>'+n+'</span></button>';}).join('')+'</div>');
    m.querySelectorAll('[data-i]').forEach(function(b){ b.addEventListener('click', function(){ cb(b.getAttribute('data-i')); m.close(); }); });
  }

  /* ---------- media library ---------- */
  async function listMedia(){ var r=await sb.storage.from('media').list('',{limit:200,sortBy:{column:'created_at',order:'desc'}}); return (r.data||[]).filter(function(f){return f.name && f.id;}); }
  function pubUrl(name){ return sb.storage.from('media').getPublicUrl(name).data.publicUrl; }

  function mediaItemHtml(f, pick){
    var url=pubUrl(f.name);
    return '<div class="media-item"><img src="'+esc(url)+'" alt="'+esc(f.name)+'" data-pick="'+esc(url)+'" title="'+(pick?'Click to select':'')+'">'
      +'<div class="mi-row"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px">'+esc(f.name)+'</span>'
      +'<button class="btn btn--danger" style="padding:3px 8px" data-rm="'+esc(f.name)+'">✕</button></div></div>';
  }

  async function renderMedia(){
    var box=document.getElementById('content');
    box.innerHTML='<div class="list-head"><h3>Media Library</h3><label class="btn btn--primary">'+ic('check',18)+' Upload image<input type="file" id="upl" accept="image/*" multiple hidden></label></div><div class="media-grid" id="mg"><div class="muted">Loading…</div></div>';
    async function refresh(){ var files=await listMedia(); document.getElementById('mg').innerHTML = files.length? files.map(function(f){return mediaItemHtml(f,false);}).join('') : '<div class="muted">No images yet. Upload one.</div>';
      box.querySelectorAll('[data-rm]').forEach(function(b){ b.addEventListener('click', async function(){ if(!confirm('Delete this image?'))return; await sb.storage.from('media').remove([b.getAttribute('data-rm')]); toast('Deleted'); refresh(); }); }); }
    document.getElementById('upl').addEventListener('change', function(e){ uploadFiles(e.target.files, refresh); });
    refresh();
  }

  async function uploadFiles(files, done){
    for(var i=0;i<files.length;i++){
      var file=files[i]; var safe=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'-').toLowerCase();
      var r=await sb.storage.from('media').upload(safe,file,{upsert:false,cacheControl:'3600'});
      if(r.error) toast(r.error.message,true); else toast('Uploaded '+file.name);
    }
    if(done) done();
  }

  function openMediaPicker(cb){
    var m=modal('Select or upload an image',
      '<label class="btn btn--primary" style="margin-bottom:14px">'+ic('check',16)+' Upload new<input type="file" id="mpUpl" accept="image/*" hidden></label>'
      +'<div class="media-grid" id="mpGrid"><div class="muted">Loading…</div></div>');
    async function refresh(){ var files=await listMedia(); m.querySelector('#mpGrid').innerHTML= files.length? files.map(function(f){return mediaItemHtml(f,true);}).join('') : '<div class="muted">No images yet.</div>';
      m.querySelectorAll('[data-pick]').forEach(function(img){ img.addEventListener('click', function(){ cb(img.getAttribute('data-pick')); m.close(); }); });
      m.querySelectorAll('[data-rm]').forEach(function(b){ b.addEventListener('click', async function(){ if(!confirm('Delete this image?'))return; await sb.storage.from('media').remove([b.getAttribute('data-rm')]); refresh(); }); });
    }
    m.querySelector('#mpUpl').addEventListener('change', function(e){ uploadFiles(e.target.files, refresh); });
    refresh();
  }

  /* ---------- leads ---------- */
  async function renderLeads(){
    var box=document.getElementById('content'); box.innerHTML='<div class="center-msg">Loading…</div>';
    var r=await sb.from('leads').select('*').order('created_at',{ascending:false});
    if(r.error){ box.innerHTML='<div class="card status status--err">'+esc(r.error.message)+'</div>'; return; }
    var rows=r.data||[];
    var trs=rows.map(function(L){
      var sel='<select data-leadstatus="'+L.id+'">'+LEAD_STATUS.map(function(s){return '<option '+(s===(L.status||'new')?'selected':'')+'>'+s+'</option>';}).join('')+'</select>';
      return '<tr><td>'+esc((L.created_at||'').slice(0,10))+'</td><td><strong>'+esc(L.name)+'</strong><br><span class="muted">'+esc(L.business||'')+'</span></td>'
        +'<td>'+esc(L.phone)+'<br><span class="muted">'+esc(L.email)+'</span></td>'
        +'<td>'+esc(L.service||'')+'<br><span class="muted">'+esc(L.project_type||'')+'</span></td>'
        +'<td>'+esc(L.budget||'')+'<br><span class="muted">'+esc(L.timeline||'')+'</span></td>'
        +'<td>'+esc(L.message||'')+'</td><td>'+sel+'</td></tr>';
    }).join('') || '<tr><td colspan="7" class="muted">No leads yet.</td></tr>';
    box.innerHTML='<div class="list-head"><h3>Leads ('+rows.length+')</h3></div>'
      +'<table><thead><tr><th>Date</th><th>Contact</th><th>Phone / Email</th><th>Service</th><th>Budget</th><th>Details</th><th>Status</th></tr></thead><tbody>'+trs+'</tbody></table>';
    box.querySelectorAll('[data-leadstatus]').forEach(function(s){ s.addEventListener('change', async function(){
      var u=await sb.from('leads').update({status:s.value}).eq('id',s.getAttribute('data-leadstatus'));
      toast(u.error?u.error.message:'Status updated', !!u.error);
    }); });
  }

  /* ---------- modal ---------- */
  function modal(title, inner){
    var wrap=document.createElement('div'); wrap.className='modal';
    wrap.innerHTML='<div class="modal__box"><div class="modal__head"><h3 style="margin:0">'+esc(title)+'</h3><button class="btn btn--ghost" data-close>✕</button></div>'+inner+'</div>';
    document.body.appendChild(wrap);
    function close(){ wrap.remove(); }
    wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
    wrap.querySelector('[data-close]').addEventListener('click', close);
    wrap.close=close; wrap.querySelectorAll=wrap.querySelectorAll.bind(wrap);
    return wrap;
  }
})();
