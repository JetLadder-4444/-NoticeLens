const text = document.getElementById('text');
const count = document.getElementById('count');
const analyzeBtn = document.getElementById('analyze');
const scanBtn = document.getElementById('scanBtn');
const cameraInput = document.getElementById('cameraInput');
const fileInput = document.getElementById('fileInput');
const previewBox = document.getElementById('previewBox');
const preview = document.getElementById('preview');
const fileName = document.getElementById('fileName');
const storedStatus = document.getElementById('storedStatus');
const ocrStatus = document.getElementById('ocrStatus');
const result = document.getElementById('result');
const empty = document.getElementById('empty');
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraStatus = document.getElementById('cameraStatus');
let selectedFile = null;
let cameraStream = null;

text.addEventListener('input', () => count.textContent = `${text.value.length.toLocaleString()} / 30,000`);
document.getElementById('demo').addEventListener('click', () => {
  text.value = 'FINAL PAYMENT NOTICE. Your electricity bill is ₹3,847.50. Payment must be completed by September 18, 2026. A late payment charge of ₹125 may be added after the due date. Please use the official provider website. For questions contact billing@example.com. Never share your OTP.';
  text.dispatchEvent(new Event('input'));
});
document.getElementById('clear').addEventListener('click', () => { text.value=''; text.dispatchEvent(new Event('input')); result.classList.add('hidden'); empty.classList.remove('hidden'); });

function chooseFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  selectedFile=file;
  preview.src=URL.createObjectURL(file);
  previewBox.classList.remove('hidden');
  fileName.textContent=file.name || 'Camera photo';
  storedStatus.textContent='Ready to save';
  scanBtn.disabled=false;
  ocrStatus.textContent='Photo ready. Tap “Read photo & sift the signal →” to extract the text.';
}

// Gallery/file picker fallback.
cameraInput.addEventListener('change',e=>chooseFile(e.target.files[0]));
fileInput.addEventListener('change',e=>chooseFile(e.target.files[0]));

async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraInput.click();
    return;
  }
  cameraModal.classList.remove('hidden');
  cameraStatus.textContent='Requesting camera permission…';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraStatus.textContent='Camera ready. Position the document and take the photo.';
  } catch (error) {
    closeCamera();
    cameraStatus.textContent='';
    alert('Camera could not be opened. Check browser camera permission, then try again. You can also choose an existing photo.');
    cameraInput.click();
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.add('hidden');
}

document.getElementById('openCamera').addEventListener('click', openCamera);
document.getElementById('closeCamera').addEventListener('click', closeCamera);
document.getElementById('takePhoto').addEventListener('click', () => {
  if (!cameraStream || !cameraVideo.videoWidth) return;
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  cameraCanvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `camera-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`, { type: 'image/jpeg' });
    chooseFile(file);
    closeCamera();
    ocrStatus.textContent='Photo captured. Tap “Read photo & sift the signal →” to extract the text.';
  }, 'image/jpeg', 0.92);
});
window.addEventListener('beforeunload', closeCamera);

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('notice-lens-db',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('scans'))r.result.createObjectStore('scans',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function saveScan(blob,name,extractedText){try{const db=await openDB();const scan={id:crypto.randomUUID(),name,createdAt:new Date().toISOString(),blob,extractedText};await new Promise((res,rej)=>{const tx=db.transaction('scans','readwrite');tx.objectStore('scans').put(scan);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});storedStatus.textContent='Saved on this device';loadSavedScans();}catch{storedStatus.textContent='Browser storage unavailable';}}
async function getScans(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('scans','readonly').objectStore('scans').getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>rej(r.error);});}
async function loadSavedScans(){const box=document.getElementById('savedScans');try{const scans=await getScans();if(!scans.length){box.innerHTML='<span class="hint">No saved scans yet.</span>';return;}box.innerHTML='';scans.slice(0,12).forEach(s=>{const item=document.createElement('div');item.className='saved-item';const img=document.createElement('img');img.src=URL.createObjectURL(s.blob);img.alt='Saved scan';const meta=document.createElement('div');meta.textContent=s.name||'Scan';item.append(img,meta);box.appendChild(item);});}catch{box.innerHTML='<span class="hint">Saved scans could not be loaded.</span>';}}
document.getElementById('clearSaved').addEventListener('click',async()=>{if(!confirm('Delete all saved scans from this browser on this device?'))return;const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('scans','readwrite');tx.objectStore('scans').clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});loadSavedScans();});

function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function chips(a){return a.length?a.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join(''):'<span class="hint">None detected</span>';}
function list(a){return a.length?a.map(x=>`<li>${escapeHtml(x)}</li>`).join(''):'<li class="hint">No clear action detected.</li>';}
async function analyzeText(value){const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Analysis failed.');renderResult(d);}
function renderResult(d){empty.classList.add('hidden');result.classList.remove('hidden');const p=document.getElementById('priority');p.textContent=d.priority;p.parentElement.parentElement.className=`priority card ${d.priority.toLowerCase()}`;document.getElementById('score').textContent=d.score;document.getElementById('summary').textContent=d.summary||'No concise summary could be generated.';document.getElementById('actions').innerHTML=list(d.actions);document.getElementById('dates').innerHTML=chips(d.dates);document.getElementById('money').innerHTML=chips(d.money);document.getElementById('signals').innerHTML=chips(d.signals);const c=d.contacts||{};const all=[...(c.emails||[]),...(c.phones||[])];document.getElementById('contacts').innerHTML=all.length?all.map(x=>`<div>${escapeHtml(x)}</div>`).join(''):'<span class="hint">None detected</span>';document.getElementById('actionCount').textContent=d.actions.length;document.getElementById('dateCount').textContent=d.dates.length;document.getElementById('moneyCount').textContent=d.money.length;document.getElementById('contactCount').textContent=all.length;document.getElementById('warningsCard').classList.toggle('hidden',!d.warnings.length);document.getElementById('warnings').innerHTML=list(d.warnings);document.getElementById('privacy').textContent=d.privacy_note;result.scrollIntoView({behavior:'smooth',block:'start'});}
analyzeBtn.addEventListener('click',async()=>{if(!text.value.trim()){text.focus();return;}analyzeBtn.disabled=true;analyzeBtn.textContent='Sifting…';try{await analyzeText(text.value);}catch(e){alert(e.message);}finally{analyzeBtn.disabled=false;analyzeBtn.textContent='Sift the signal →';}});
scanBtn.addEventListener('click',async()=>{if(!selectedFile)return;scanBtn.disabled=true;scanBtn.textContent='Reading photo…';ocrStatus.textContent='Reading the document. Large photos can take a little time.';try{const {data:{text:extracted}}=await Tesseract.recognize(selectedFile,'eng',{logger:m=>{if(m.status==='recognizing text')ocrStatus.textContent=`Reading photo… ${Math.round((m.progress||0)*100)}%`;}});if(!extracted.trim())throw new Error('No readable text was found. Try a clearer, brighter photo.');text.value=extracted.trim().slice(0,30000);text.dispatchEvent(new Event('input'));await saveScan(selectedFile,selectedFile.name||'camera-photo.jpg',extracted);ocrStatus.textContent='Photo read successfully. The decision card below shows the extracted information.';await analyzeText(text.value);}catch(e){alert(e.message||'Could not read the photo.');ocrStatus.textContent='Try a clearer photo with the whole document visible.';}finally{scanBtn.disabled=false;scanBtn.textContent='Read photo & sift the signal →';}});
loadSavedScans();
