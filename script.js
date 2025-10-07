/* 抽奖逻辑（纯前端） */
const participantsArea = document.getElementById('participantsArea');
const csvFile = document.getElementById('csvFile');
const btnImport = document.getElementById('btnImport');
const btnClearList = document.getElementById('btnClearList');
const prizeListDiv = document.getElementById('prizeList');
const prizeNameIn = document.getElementById('prizeName');
const prizeCountIn = document.getElementById('prizeCount');
const btnAddPrize = document.getElementById('btnAddPrize');
const selectPrize = document.getElementById('selectPrize');
const btnDraw = document.getElementById('btnDraw');
const currentName = document.getElementById('currentName');
const currentNote = document.getElementById('currentNote');
const winnersOl = document.getElementById('winners');
const btnExportWinners = document.getElementById('btnExportWinners');
const btnResetWinners = document.getElementById('btnResetWinners');
const btnExportAll = document.getElementById('btnExportAll');
const btnShowAdmin = document.getElementById('btnShowAdmin');
const adminModal = document.getElementById('adminModal');
const btnCloseAdmin = document.getElementById('btnCloseAdmin');
const btnLogin = document.getElementById('btnLogin');
const adminPwd = document.getElementById('adminPwd');
const btnForceClearStorage = document.getElementById('btnForceClearStorage');
const btnLoadSample = document.getElementById('btnLoadSample');
const allowRepeatCheckbox = document.getElementById('allowRepeat');

let participants = []; // {name,note}
let prizes = []; // {id,name,count}
let winners = []; // {prizeId,name,note,timestamp}
const STORAGE_KEY = 'lucky_draw_v1';

// load from storage
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{
      const s = JSON.parse(raw);
      participants = s.participants || [];
      prizes = s.prizes || [];
      winners = s.winners || [];
    }catch(e){ console.warn('parse storage fail', e) }
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({participants,prizes,winners}));}

// UI updates
function renderPrizeList(){
  prizeListDiv.innerHTML = '';
  selectPrize.innerHTML = '';
  prizes.forEach((p,idx)=>{
    const div = document.createElement('div'); div.className='prize-item';
    div.innerHTML = `<div>${p.name}（${p.count} 个）</div><div><button class="small" data-idx="${idx}">删除</button></div>`;
    prizeListDiv.appendChild(div);
    const opt = document.createElement('option'); opt.value = p.id; opt.textContent = `${p.name}（剩余: ${remainingForPrize(p.id)}）`; selectPrize.appendChild(opt);
  });
  // attach delete
  prizeListDiv.querySelectorAll('button').forEach(b=>b.addEventListener('click', e=>{
    const idx = +e.currentTarget.dataset.idx;
    prizes.splice(idx,1); saveState(); renderPrizeList(); renderWinners();
  }));
}
function remainingForPrize(pid){
  const p = prizes.find(x=>x.id===pid);
  if(!p) return 0;
  const awarded = winners.filter(w=>w.prizeId===pid).length;
  return Math.max(0, p.count - awarded);
}
function renderWinners(){
  winnersOl.innerHTML = '';
  winners.forEach(w=>{
    const li = document.createElement('li');
    li.textContent = `${w.prizeName} — ${w.name}${w.note?(' （'+w.note+'）'):''}  ${new Date(w.ts).toLocaleString()}`;
    winnersOl.appendChild(li);
  });
}
function renderParticipantsArea(){
  participantsArea.value = participants.map(p=> p.note ? `${p.name},${p.note}` : p.name).join('\n');
}

// import CSV/simple
btnImport.addEventListener('click', ()=>{
  const txt = participantsArea.value.trim();
  parseAndLoadText(txt);
});

// file import
csvFile.addEventListener('change', (evt)=>{
  const f = evt.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = e=>{
    parseAndLoadText(e.target.result);
  };
  reader.readAsText(f, 'utf-8');
});

function parseAndLoadText(text){
  if(!text) return alert('没有内容');
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
  const parsed = lines.map(line=>{
    const parts = line.split(',').map(s=>s.trim());
    return {name: parts[0], note: parts[1] || ''};
  });
  participants = participants.concat(parsed);
  // 去重（按姓名+备注）
  const seen = new Map();
  participants = participants.filter(p=>{
    const k = (p.name||'') + '|' + (p.note||'');
    if(seen.has(k)) return false; seen.set(k,true); return true;
  });
  saveState(); renderParticipantsArea();
  alert('已导入 ' + parsed.length + ' 条参与者（去重后保存）');
}

// clear list
btnClearList.addEventListener('click', ()=>{
  if(!confirm('确定清空参与者名单？')) return;
  participants = []; saveState(); renderParticipantsArea();
});

// add prize
btnAddPrize.addEventListener('click', ()=>{
  const name = prizeNameIn.value.trim();
  const cnt = parseInt(prizeCountIn.value);
  if(!name || !cnt || cnt<=0) return alert('请填写奖项名称和数量');
  const id = 'p_' + Date.now();
  prizes.push({id,name,count:cnt});
  prizeNameIn.value=''; prizeCountIn.value='';
  saveState(); renderPrizeList(); renderWinners();
});

// draw
let animTimer = null;
btnDraw.addEventListener('click', async ()=>{
  if(prizes.length===0) return alert('请先添加奖项');
  const pid = selectPrize.value;
  if(!pid) return alert('请选择奖项');
  const prize = prizes.find(p=>p.id===pid);
  if(!prize) return alert('奖项不存在');
  const remain = remainingForPrize(pid);
  if(remain<=0) return alert('该奖项已抽完');
  if(participants.length===0) return alert('没有参与者');

  // prepare candidate pool
  let pool = participants.slice();
  if(!allowRepeatCheckbox.checked){
    const already = new Set(winners.map(w=> w.name + '|' + (w.note||'')));
    pool = pool.filter(p=> !already.has(p.name + '|' + (p.note||'')));
    if(pool.length===0) return alert('所有人已中奖，无法继续抽取（若想允许重复，请勾选允许重复中奖）');
  }

  // animation: 快速循环名字，最后停在中签者
  const rounds = 50 + Math.floor(Math.random()*30);
  let i = 0;
  btnDraw.disabled = true;
  for(let r=0;r<rounds;r++){
    const pick = pool[Math.floor(Math.random()*pool.length)];
    currentName.textContent = pick.name;
    currentNote.textContent = pick.note||'';
    await sleep(30 + Math.floor(r*4)); // gradually slow
  }
  // final pick
  const winner = pool[Math.floor(Math.random()*pool.length)];
  currentName.textContent = winner.name;
  currentNote.textContent = winner.note||'';
  winners.push({prizeId: pid, prizeName: prize.name, name: winner.name, note: winner.note, ts: Date.now()});
  saveState();
  renderWinners();
  renderPrizeList();
  btnDraw.disabled = false;
});

// sleep helper
function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

// export winners
btnExportWinners.addEventListener('click', ()=>{
  if(winners.length===0) return alert('没有中奖名单');
  const csv = winners.map(w=> [w.prizeName, w.name, w.note||'', new Date(w.ts).toLocaleString()].map(escapeCsv).join(',')).join('\n');
  downloadFile(csv, 'winners.csv');
});

// export all data
btnExportAll.addEventListener('click', ()=>{
  const all = {
    participants, prizes, winners
  };
  downloadFile(JSON.stringify(all, null, 2), 'all_data.json', 'application/json');
});

// reset winners
btnResetWinners.addEventListener('click', ()=>{
  if(!confirm('确定清空中奖名单？')) return;
  winners = []; saveState(); renderWinners(); renderPrizeList();
});

// download helper
function downloadFile(text, filename, type='text/csv'){
  const blob = new Blob([text], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove();
}
function escapeCsv(v){ if(v==null) v=''; if(v.toString().includes(',')||v.toString().includes('"')) return '"' + v.toString().replace(/"/g, '""') + '"'; return v; }

// admin modal
btnShowAdmin.addEventListener('click', ()=> adminModal.style.display = 'flex');
btnCloseAdmin.addEventListener('click', ()=> adminModal.style.display = 'none');
btnLogin.addEventListener('click', ()=>{
  const pwd = adminPwd.value;
  if(pwd === '1234'){ // 默认密码，可让用户改
    alert('管理员登录成功');
  } else { alert('密码错误'); return; }
});
btnForceClearStorage.addEventListener('click', ()=>{
  if(!confirm('确定要清空 localStorage 吗？')) return;
  localStorage.removeItem(STORAGE_KEY); participants=[];prizes=[];winners=[]; renderParticipantsArea(); renderPrizeList(); renderWinners(); alert('已清空');
});
btnLoadSample.addEventListener('click', ()=>{
  const sample = `张三\n李四\n王五\n赵六\n钱七\n孙八\n周九\n吴十`;
  parseAndLoadText(sample);
});

// clear participants helper
document.getElementById('btnClearList').addEventListener('click', ()=>{ /* handled earlier */ });

// init
loadState();
renderPrizeList();
renderWinners();
renderParticipantsArea();
