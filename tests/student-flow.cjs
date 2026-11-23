const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const handlers = {};
const elements = new Map();
const ctx = { fillRect() {}, beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {} };
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: '', textContent: '', hidden: false, disabled: false,
    addEventListener(type, handler) { handlers[`${id}:${type}`] = handler; },
    querySelector() { return element('key-button'); },
    append() {}, focus() {}, getContext() { return ctx; },
    toBlob(callback, type) { assert.equal(type, 'image/png'); callback({ type }); },
    classList: { toggle() {} }, setAttribute() {}
  });
  return elements.get(id);
}
let now = 1000;
class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const user = { uid: 'student-1', displayName: '학생', email: 'student@example.com' };
let saved;
const sandbox = {
  document: { getElementById: element, createElement: () => element('created'), querySelectorAll: () => [] },
  initializeFirebase: () => ({}), observeUser: (_, callback) => callback(user),
  googleSignIn: async () => {}, submitActivity: async (...args) => { saved = args; },
  fetch: async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '응답' }] }] }) }),
  crypto: { randomUUID: () => 'activity-1' }, Date: FakeDate, confirm: () => true, console
};
const source = fs.readFileSync('src/main.js', 'utf8').replace(/^import .*?;\s*/s, '');
vm.runInNewContext(source, sandbox);

async function run() {
  assert.match(element('user-info').textContent, /학생.*student@example.com/);
  element('api-key').value = 'test-key';
  await handlers['key-form:submit']({ preventDefault() {}, currentTarget: element('key-form') });
  assert.equal(element('chat-section').hidden, false);
  for (let i = 0; i < 3; i++) {
    now = 1000 + i * 1000;
    element('chat-input').value = `이야기 ${i + 1}`;
    await handlers['chat-form:submit']({ preventDefault() {} });
  }
  assert.equal(element('finish-button').disabled, false);
  now = 5000;
  handlers['finish-button:click']();
  assert.equal(element('draw-section').hidden, false);
  now = 8000;
  await handlers['submit-button:click']();
  assert.equal(saved[1].uid, user.uid);
  assert.equal(saved[2], 'activity-1');
  assert.equal(saved[3].type, 'image/png');
  assert.equal(saved[4].conversation.length, 7);
  assert.equal(saved[4].conversation[1].content, '이야기 1');
  assert.equal(saved[4].chatDurationMs, 4000);
  assert.equal(saved[4].drawingDurationMs, 3000);
  assert.equal(element('submit-button').disabled, true);
  console.log('Student login, conversation, timing and PNG submission flow passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
