'use strict';

// 프롬프트와 모델은 이후 수업 목적에 맞게 조정할 수 있습니다.
const MODEL = 'gpt-5.4-mini';
const SYSTEM_PROMPT = '너는 중고등학생이 학교에서 보낸 하루를 돌아보도록 돕는 따뜻한 대화 상대야. 한국어로 짧고 공감적으로 답하고, 부담 없는 질문을 한 번에 하나씩 해. 개인정보를 묻지 말고, 진단하거나 치료한다고 말하지 마. 학생이 위험하거나 힘든 상황을 이야기하면 믿을 수 있는 어른이나 전문적인 도움을 받도록 권해.';
const MIN_TURNS = 3;
const MAX_TURNS = 7;
const $ = (id) => document.getElementById(id);
let apiKey = '';
let turns = 0;
let busy = false;
const history = [];

async function requestResponse(key, input, instructions) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, instructions, input, store: false })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('API 키를 확인해 주세요. 인증에 실패했어요.');
    if (response.status === 429) throw new Error('요청 한도 또는 사용량을 확인한 후 다시 시도해 주세요.');
    throw new Error('OpenAI 요청에 실패했어요. 키의 모델 접근 권한과 네트워크를 확인해 주세요.');
  }
  const text = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
  if (data.status !== 'completed' || !text) throw new Error('완전한 응답을 받지 못했어요. 다시 시도해 주세요.');
  return text;
}

$('key-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const candidate = $('api-key').value.trim();
  if (!candidate || busy) return;
  busy = true;
  const button = event.currentTarget.querySelector('button');
  button.disabled = true; button.textContent = '확인 중...'; $('key-error').textContent = '';
  try {
    await requestResponse(candidate, '안녕', '한국어로 짧게 인사해.');
    apiKey = candidate; $('api-key').value = '';
    $('key-section').hidden = true; $('chat-section').hidden = false;
    $('step-key').className = 'done'; $('step-chat').className = 'current'; $('chat-input').focus();
  } catch (error) { $('key-error').textContent = error instanceof TypeError ? '연결할 수 없어요. 인터넷 연결을 확인해 주세요.' : error.message; }
  finally { busy = false; button.disabled = false; button.textContent = '키 확인하기'; }
});

function addMessage(role, text) {
  const container = document.createElement('div'); container.className = `message ${role}`;
  const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? '나' : '✳';
  const content = document.createElement('div');
  const name = document.createElement('span'); name.className = 'speaker'; name.textContent = role === 'user' ? '나' : '마음 친구';
  const paragraph = document.createElement('p'); paragraph.textContent = text;
  content.append(name, paragraph); container.append(avatar, content); $('messages').append(container);
  $('messages').scrollTop = $('messages').scrollHeight;
}
function updateChat() {
  $('turn-count').textContent = `${turns} / ${MAX_TURNS}회`;
  $('finish-button').disabled = busy || turns < MIN_TURNS;
  $('send-button').disabled = busy || turns >= MAX_TURNS;
  $('chat-input').disabled = busy || turns >= MAX_TURNS;
  $('finish-hint').textContent = turns >= MAX_TURNS ? '대화를 모두 나누었어요. 그림 그리기로 넘어가요.' : turns >= MIN_TURNS ? '이제 대화를 마치고 그림을 그릴 수 있어요.' : '3번 이상 대화하면 그림 그리기로 넘어갈 수 있어요.';
}
$('chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('chat-input'); const message = input.value.trim();
  if (!message || busy || turns >= MAX_TURNS) return;
  busy = true; updateChat(); $('chat-error').textContent = ''; $('chat-status').textContent = '마음 친구가 답장을 생각하고 있어요...';
  try {
    const reply = await requestResponse(apiKey, [...history, { role: 'user', content: message }], SYSTEM_PROMPT);
    history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
    addMessage('user', message); addMessage('assistant', reply); turns++; input.value = '';
  } catch (error) { $('chat-error').textContent = error instanceof TypeError ? '연결할 수 없어요. 인터넷 연결을 확인하고 다시 보내 주세요.' : error.message; }
  finally { busy = false; $('chat-status').textContent = ''; updateChat(); if (turns < MAX_TURNS) input.focus(); }
});
$('finish-button').addEventListener('click', () => {
  if (busy || turns < MIN_TURNS) return;
  $('chat-section').hidden = true; $('draw-section').hidden = false;
  $('step-chat').className = 'done'; $('step-draw').className = 'current'; $('draw-title').focus();
});

const canvas = $('canvas'); const ctx = canvas.getContext('2d');
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
let selectedColor = '#303e36'; let drawing = false; let pointerId = null; let lastPoint = null;
function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; }
function brushColor() {
  const amount = (Number($('brightness').value) - 50) / 50;
  const rgb = selectedColor.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16));
  return `rgb(${rgb.map(value => Math.round(amount >= 0 ? value + (255 - value) * amount : value * (1 + amount))).join(',')})`;
}
function drawLine(from, to) {
  ctx.strokeStyle = brushColor(); ctx.fillStyle = ctx.strokeStyle; ctx.globalAlpha = Number($('opacity').value) / 100;
  ctx.lineWidth = Number($('size').value); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (from.x === to.x && from.y === to.y) { ctx.beginPath(); ctx.arc(from.x, from.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
canvas.addEventListener('pointerdown', event => {
  if (drawing || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault(); drawing = true; pointerId = event.pointerId; canvas.setPointerCapture(pointerId); lastPoint = point(event); drawLine(lastPoint, lastPoint);
});
canvas.addEventListener('pointermove', event => { if (!drawing || event.pointerId !== pointerId) return; const next = point(event); drawLine(lastPoint, next); lastPoint = next; });
function endDrawing(event) { if (event.pointerId === pointerId) { drawing = false; pointerId = null; lastPoint = null; } }
canvas.addEventListener('pointerup', endDrawing); canvas.addEventListener('pointercancel', endDrawing); canvas.addEventListener('lostpointercapture', endDrawing);
$('palette').addEventListener('click', event => {
  const button = event.target.closest('button[data-color]'); if (!button) return;
  selectedColor = button.dataset.color;
  document.querySelectorAll('.swatch').forEach(swatch => { const active = swatch === button; swatch.classList.toggle('selected', active); swatch.setAttribute('aria-pressed', String(active)); });
});
for (const id of ['brightness', 'opacity', 'size']) $(id).addEventListener('input', () => { $(`${id}-value`).textContent = $(id).value + (id === 'size' ? 'px' : '%'); });
$('clear-button').addEventListener('click', () => { if (confirm('그림을 모두 지울까요?')) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } });
$('submit-button').addEventListener('click', () => { $('submit-status').textContent = '아직 제출 기능이 연결되지 않았어요. 그림은 이 화면에만 남아 있어요.'; });
