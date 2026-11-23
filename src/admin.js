import { collectionGroup, deleteDoc, getDocs } from 'firebase/firestore';
import { deleteObject, getBlob, ref } from 'firebase/storage';
import { initializeFirebase, observeUser } from './firebase.js';
import { isAdminUid } from './admin-access.js';

const $ = id => document.getElementById(id);
const selectedDates = new Set();
let activities = [], selected = null, imageUrl = null, requestId = 0, loading = false, currentUid = null;
let services;
const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
function recordDate(data) {
  const value = data.submittedAt || (data.createdAt && data.createdAt.toDate());
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date : null;
}
function dateKey(date) { return date ? dayFormat.format(date) : '날짜 미상'; }
function status(message) { $('dashboard-status').textContent = message; }
function clearImage() { if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = null; }
function resetDetails() {
  ++requestId; clearImage(); selected = null;
  $('detail-title').textContent = '학생의 이야기를 만나보세요'; $('detail-subtitle').textContent = '날짜를 선택한 뒤 기록을 눌러 주세요.';
  $('delete-button').hidden = true; $('durations').textContent = '';
  $('conversation').replaceChildren(message('선택한 기록의 대화가 여기에 표시돼요.', 'empty'));
  $('image-container').replaceChildren(message('선택한 기록의 그림이 여기에 표시돼요.', 'empty'));
}
function message(text, className) { const el = document.createElement('p'); el.className = className; el.textContent = text; return el; }
function renderDates() {
  const container = $('date-filters'); container.replaceChildren();
  const dates = [...new Set(activities.map(item => dateKey(item.date)))].sort((a, b) => b.localeCompare(a));
  if (!dates.length) { container.append(message('저장된 기록이 없어요.', 'muted')); return; }
  for (const day of dates) {
    const label = document.createElement('label'); label.className = 'date-option';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selectedDates.has(day);
    input.addEventListener('change', () => { if (input.checked) selectedDates.add(day); else selectedDates.delete(day); if (selected && !selectedDates.has(dateKey(selected.date))) resetDetails(); renderRecords(); });
    const span = document.createElement('span'); span.textContent = day; label.append(input, span); container.append(label);
  }
}
function renderRecords() {
  const container = $('records'); container.replaceChildren();
  const list = activities.filter(item => selectedDates.has(dateKey(item.date)));
  $('record-count').textContent = `${list.length}개`;
  if (!list.length) { container.append(message(selectedDates.size ? '선택한 날짜에 기록이 없어요.' : '날짜를 선택해 주세요.', 'muted')); return; }
  for (const item of list) {
    const row = document.createElement('div'); row.className = 'record-row';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'record-button';
    if (selected?.ref.path === item.ref.path) button.classList.add('active');
    const title = document.createElement('strong'); title.textContent = item.data.name || '이름 없음';
    const time = document.createElement('span'); time.textContent = item.date ? `(${dateKey(item.date)}, ${timeFormat.format(item.date)})` : '(날짜 미상)';
    button.append(title, time); button.addEventListener('click', () => showRecord(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'record-delete'; remove.textContent = '삭제';
    remove.setAttribute('aria-label', `${item.data.name || '학생'} ${item.date ? `${dateKey(item.date)} ${timeFormat.format(item.date)}` : '날짜 미상'} 기록 삭제`);
    remove.addEventListener('click', () => deleteRecord(item)); row.append(button, remove); container.append(row);
  }
}
function duration(ms) { if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '정보 없음'; const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; }
function safeDrawingPath(item) {
  const parts = item.ref.path.split('/');
  const expected = `students/${parts[1]}/drawings/${parts[3]}.png`;
  return item.data.drawingPath === expected ? expected : null;
}
async function showRecord(item) {
  selected = item; const id = ++requestId; clearImage(); renderRecords(); status('');
  $('detail-title').textContent = item.data.name || '이름 없음';
  $('detail-subtitle').textContent = `${item.data.email || '이메일 없음'} · ${item.date ? `${dateKey(item.date)} ${timeFormat.format(item.date)}` : '날짜 미상'}`;
  $('delete-button').hidden = false;
  const conversation = $('conversation'); conversation.replaceChildren();
  if (Array.isArray(item.data.conversation) && item.data.conversation.length) {
    for (const entry of item.data.conversation) {
      const box = document.createElement('div'); box.className = `dialogue ${entry.role === 'user' ? 'dialogue-user' : ''}`;
      const name = document.createElement('strong'); name.textContent = entry.role === 'user' ? (item.data.name || '학생') : '마음 친구';
      box.append(name, message(typeof entry.content === 'string' ? entry.content : '', 'dialogue-text')); conversation.append(box);
    }
  } else conversation.append(message('저장된 대화가 없어요.', 'empty'));
  $('durations').textContent = `대화 시간 ${duration(item.data.chatDurationMs)}  ·  그림 그린 시간 ${duration(item.data.drawingDurationMs)}`;
  $('image-container').replaceChildren(message('그림을 불러오는 중이에요.', 'empty'));
  if (!safeDrawingPath(item)) { $('image-container').replaceChildren(message('그림 경로가 없거나 올바르지 않아요.', 'empty')); return; }
  try {
    const blob = await getBlob(ref(services.storage, safeDrawingPath(item)), 10 * 1024 * 1024);
    if (id !== requestId) return;
    imageUrl = URL.createObjectURL(blob); const img = document.createElement('img'); img.src = imageUrl; img.alt = `${item.data.name || '학생'}의 하루 그림`;
    $('image-container').replaceChildren(img);
  } catch { if (id === requestId) $('image-container').replaceChildren(message('그림을 불러오지 못했어요. 저장소 권한과 CORS 설정을 확인해 주세요.', 'empty')); }
}
async function loadActivities() {
  if (loading) return; loading = true; $('refresh').disabled = true; status('기록을 불러오는 중이에요.');
  try {
    const snapshot = await getDocs(collectionGroup(services.db, 'activities'));
    if (!currentUid || services.auth.currentUser?.uid !== currentUid) return;
    activities = snapshot.docs.filter(doc => /^students\/[^/]+\/activities\/[^/]+$/.test(doc.ref.path)).map(doc => { const data = doc.data(); return { ref: doc.ref, data, date: recordDate(data) }; }).sort((a, b) => (b.date?.valueOf() || 0) - (a.date?.valueOf() || 0));
    const available = new Set(activities.map(item => dateKey(item.date))); for (const day of selectedDates) if (!available.has(day)) selectedDates.delete(day);
    renderDates(); renderRecords(); resetDetails(); status('');
  } catch (error) { status(`기록을 불러오지 못했어요. 관리자 권한과 Firestore 보안 규칙을 확인해 주세요. (${error.code || '오류'})`); }
  finally { loading = false; $('refresh').disabled = false; }
}
$('refresh').addEventListener('click', loadActivities);
$('clear-filters').addEventListener('click', () => { selectedDates.clear(); renderDates(); renderRecords(); resetDetails(); });
async function deleteRecord(target) {
  if (!target || loading || !confirm('이 기록의 대화와 그림을 모두 삭제할까요? 삭제 후에는 복구할 수 없어요.')) return;
  loading = true; $('delete-button').disabled = true; status('기록을 삭제하고 있어요.');
  try {
    if (target.data.drawingPath && !safeDrawingPath(target)) throw new Error('올바르지 않은 그림 경로');
    if (safeDrawingPath(target)) {
      try { await deleteObject(ref(services.storage, safeDrawingPath(target))); }
      catch (error) { if (error.code !== 'storage/object-not-found') throw error; }
    }
    await deleteDoc(target.ref);
    activities = activities.filter(item => item.ref.path !== target.ref.path); if (selected?.ref.path === target.ref.path) resetDetails(); renderDates(); renderRecords(); status('기록을 삭제했어요.');
  } catch (error) { status(`삭제를 완료하지 못했어요. 다시 시도해 주세요. 그림만 먼저 삭제되었을 수 있어요. (${error.code || '오류'})`); }
  finally { loading = false; $('delete-button').disabled = false; }
}
$('delete-button').addEventListener('click', () => deleteRecord(selected));
try {
  services = initializeFirebase();
  observeUser(services.auth, async user => {
    currentUid = user?.uid || null;
    if (!isAdminUid(currentUid)) { $('admin-content').hidden = true; clearImage(); window.location.replace('index.html'); return; }
    $('admin-content').hidden = false; $('teacher-name').textContent = user.displayName || '관리자'; $('teacher-email').textContent = user.email || '';
    try {
      const token = await user.getIdTokenResult(true);
      if (services.auth.currentUser?.uid !== user.uid) return;
      if (token.claims.admin !== true) { status('이 계정에 Firebase 관리자 권한(admin)이 없어요. 관리자 권한을 설정해 주세요.'); return; }
      await loadActivities();
    } catch { status('관리자 권한을 확인하지 못했어요. 네트워크와 인증 설정을 확인해 주세요.'); }
  });
} catch { window.location.replace('index.html'); }
