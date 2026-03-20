‘use strict’;

const CONFIG = {
sitePassword:    ‘hillock7’,
darkPassword:    ‘district17’,
purgeHours:      72,
jsonPath:        ‘threads.json’,
threadPostLimit: 150,
postTimeBase:    ‘03:17’,
postTimeMinGap:  1,
postTimeMaxGap:  4,
};

const STATE = {
darkUnlocked: false,
activeBoard:  ‘gen’,
allThreads:   {},
};

const BOARDS = [
{ id: ‘gen’,        label: ‘/gen/’,        desc: ‘General’,            dark: false },
{ id: ‘life’,       label: ‘/life/’,       desc: ‘Life & Quarters’,    dark: false },
{ id: ‘goss’,       label: ‘/goss/’,       desc: ‘Gossip & Rumours’,   dark: false },
{ id: ‘complaints’, label: ‘/complaints/’, desc: ‘Complaints’,         dark: false },
{ id: ‘sports’,     label: ‘/sports/’,     desc: ‘Sports & Betting’,   dark: false },
{ id: ‘field’,      label: ‘/field/’,      desc: ‘Front Line’,         dark: false },
{ id: ‘dark’,       label: ‘/dark/’,       desc: ‘Restricted’,         dark: true  },
];

document.addEventListener(‘DOMContentLoaded’, () => {
initGate();
initClock();
initPurgeTimer();
});

// ─── ESCAPE ───────────────────────────────────────────────
function escHtml(str) {
return String(str)
.replace(/&/g,  ‘&’)
.replace(/</g,  ‘<’)
.replace(/>/g,  ‘>’)
.replace(/”/g,  ‘"’)
.replace(/’/g,  ‘'’);
}

// ─── GATE ─────────────────────────────────────────────────
function initGate() {
const input  = document.getElementById(‘gate-input’);
const submit = document.getElementById(‘gate-submit’);
submit.addEventListener(‘click’, checkGatePassword);
input.addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) checkGatePassword();
document.getElementById(‘gate-error’).classList.add(‘hidden’);
});
}

function checkGatePassword() {
const val = document.getElementById(‘gate-input’).value.trim();
if (val === CONFIG.sitePassword) {
enterSite();
} else {
document.getElementById(‘gate-error’).classList.remove(‘hidden’);
const inp = document.getElementById(‘gate-input’);
inp.value = ‘’;
inp.style.borderColor = ‘var(–red-bright)’;
setTimeout(() => inp.style.borderColor = ‘’, 600);
}
}

function enterSite() {
document.getElementById(‘gate-screen’).classList.add(‘hidden’);
document.getElementById(‘app’).classList.remove(‘hidden’);
loadThreadData();
}

function openDarkGate() {
const gate = document.getElementById(‘dark-gate’);
gate.classList.remove(‘hidden’);
document.getElementById(‘dark-input’).value = ‘’;
document.getElementById(‘dark-error’).classList.add(‘hidden’);
setTimeout(() => document.getElementById(‘dark-input’).focus(), 100);
}

function closeDarkGate() {
document.getElementById(‘dark-gate’).classList.add(‘hidden’);
if (!STATE.darkUnlocked) activateBoard(‘gen’);
}

function initDarkGate() {
document.getElementById(‘dark-submit’).addEventListener(‘click’, checkDarkPassword);
document.getElementById(‘dark-cancel’).addEventListener(‘click’, closeDarkGate);
document.getElementById(‘dark-input’).addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) checkDarkPassword();
document.getElementById(‘dark-error’).classList.add(‘hidden’);
});
}

function checkDarkPassword() {
const val = document.getElementById(‘dark-input’).value.trim();
if (val === CONFIG.darkPassword) {
STATE.darkUnlocked = true;
document.getElementById(‘dark-gate’).classList.add(‘hidden’);
activateBoard(‘dark’);
} else {
document.getElementById(‘dark-error’).classList.remove(‘hidden’);
document.getElementById(‘dark-input’).value = ‘’;
}
}

// ─── DATA ─────────────────────────────────────────────────
function loadThreadData() {
fetch(CONFIG.jsonPath)
.then(r => r.json())
.then(data => {
STATE.allThreads = data;
buildBoardList();
initDarkGate();
activateBoard(‘gen’);
})
.catch(() => {
STATE.allThreads = {};
buildBoardList();
initDarkGate();
activateBoard(‘gen’);
});
}

// ─── BOARD LIST ───────────────────────────────────────────
function buildBoardList() {
const container = document.getElementById(‘board-list’);
container.innerHTML = ‘’;

BOARDS.forEach(board => {
let count = 0;
let countClass = ‘’;

```
if (board.id === 'gen') {
  count = Object.entries(STATE.allThreads)
    .filter(([k]) => !k.startsWith('_') && k !== 'dark')
    .reduce((acc, [, v]) => acc + (Array.isArray(v) ? v.length : 0), 0);
} else {
  const threads = STATE.allThreads[board.id] || [];
  count = threads.length;
}

if (board.dark) countClass = 'dark-count';
else if (count > 5) countClass = 'hot';

const el = document.createElement('div');
el.className = 'board-item' + (board.dark ? ' dark-board' : '');
el.dataset.boardId = board.id;
el.innerHTML = `<span>${board.label}</span><span class="count ${countClass}">${board.dark ? '██' : count}</span>`;

el.addEventListener('click', () => {
  if (board.dark && !STATE.darkUnlocked) {
    openDarkGate();
  } else {
    activateBoard(board.id);
  }
});

container.appendChild(el);
```

});
}

// ─── ACTIVATE BOARD ───────────────────────────────────────
function activateBoard(boardId) {
STATE.activeBoard = boardId;

document.querySelectorAll(’.board-item’).forEach(el => {
el.classList.toggle(‘active’, el.dataset.boardId === boardId);
});

const board = BOARDS.find(b => b.id === boardId);

const nameEl = document.getElementById(‘board-name-display’);
nameEl.textContent = board.label;
nameEl.className = ‘board-name’ + (board.dark ? ’ dark’ : ‘’);

let threads;
if (boardId === ‘gen’) {
threads = [];
BOARDS.forEach(b => {
if (b.id !== ‘gen’ && b.id !== ‘dark’) {
const bt = STATE.allThreads[b.id] || [];
bt.forEach(t => threads.push({ …t, _boardId: b.id, _boardLabel: b.label }));
}
});
threads.sort((a, b) => {
if (a.pinned && !b.pinned) return -1;
if (!a.pinned && b.pinned)  return 1;
return (b.id || 0) - (a.id || 0);
});
} else {
threads = STATE.allThreads[boardId] || [];
}

const now = new Date();
const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
document.getElementById(‘board-meta’).textContent =
`Threads: ${threads.length} // Viewing: ██ // Last updated: ${timeStr}`;

renderThreads(threads, board.dark, boardId === ‘gen’);
document.getElementById(‘thread-list’).scrollTop = 0;
}

// ─── RENDER THREADS ───────────────────────────────────────
function renderThreads(threads, isDark, isGen) {
const list = document.getElementById(‘thread-list’);
list.innerHTML = ‘’;

if (threads.length === 0) {
list.innerHTML = ‘<div class="empty-board">// NO THREADS // BOARD IS QUIET //</div>’;
return;
}

threads.forEach((thread, idx) => {
list.appendChild(buildThread(thread, idx, isDark, isGen));
});
}

function buildThread(thread, idx, isDark, isGen) {
const item = document.createElement(‘div’);
item.className = ‘thread’
+ (thread.pinned ? ’ pinned’      : ‘’)
+ (isDark        ? ’ dark-thread’ : ‘’);
item.dataset.threadId = thread.id;

// モジュールシステムが有効なスレかどうか判定
const hasModules = thread.posts && thread.posts.some(p => p.module);

// 表示するpostを解決
const resolvedPosts = hasModules
? resolveModulePosts(thread.posts)
: (thread.posts || []);

// 上限150
const visiblePosts = resolvedPosts.slice(0, CONFIG.threadPostLimit);

// 時間を動的計算（モジュールスレのみ）
const timedPosts = hasModules
? assignPostTimes(visiblePosts, CONFIG.postTimeBase)
: visiblePosts;

const replyCount = timedPosts.length > 0 ? timedPosts.length - 1 : (thread.replyCount || 0);
const isHot      = replyCount > 10;
const boardLabel = isGen && thread._boardLabel
? `<span style="color:var(--text-muted);font-size:9px;">[${thread._boardLabel}]</span> `
: ‘’;

const summary = document.createElement(‘div’);
summary.className = ‘thread-summary’;

const meta = document.createElement(‘div’);
meta.className = ‘thread-meta’;
meta.innerHTML = [
thread.tag   ? `<span class="thread-tag ${thread.tag}">${thread.tag.toUpperCase()}</span>` : ‘’,
`<span class="thread-id">#${String(thread.id || idx + 1).padStart(5, '0')}</span>`,
isHot        ? `<span class="thread-tag hot">HOT</span>` : ‘’,
thread.isNew ? `<span class="new-badge">NEW</span>` : ‘’,
`<span class="expand-icon">▶</span>`,
].join(’ ’);

const title = document.createElement(‘div’);
title.className = ‘thread-title’;
title.innerHTML = boardLabel + escHtml(thread.title);

const preview = document.createElement(‘div’);
preview.className = ‘thread-preview’;
preview.textContent = thread.preview || ‘’;

const footer = document.createElement(‘div’);
footer.className = ‘thread-footer’;
footer.innerHTML =
`<span>${escHtml(thread.author || 'anon')} // ${escHtml(thread.time || '')}</span>` +
`<span class="${isHot ? 'reply-hot' : ''}">replies: ${replyCount}</span>`;

summary.appendChild(meta);
summary.appendChild(title);
summary.appendChild(preview);
summary.appendChild(footer);

const body = document.createElement(‘div’);
body.className = ‘thread-body’;

if (timedPosts.length > 0) {
timedPosts.forEach((post, pIdx) => {
const postEl = buildPost(post, pIdx === 0);
if (postEl) body.appendChild(postEl);
});
} else {
const empty = document.createElement(‘div’);
empty.style.cssText = ‘padding:12px;font-size:10px;color:var(–text-muted)’;
empty.textContent = ‘// No replies yet.’;
body.appendChild(empty);
}

summary.addEventListener(‘click’, () => {
const wasExpanded = item.classList.contains(‘expanded’);
document.querySelectorAll(’.thread.expanded’).forEach(el => el.classList.remove(‘expanded’));
if (!wasExpanded) item.classList.add(‘expanded’);
});

item.appendChild(summary);
item.appendChild(body);
return item;
}

// ─── MODULE SYSTEM ────────────────────────────────────────
//
// posts配列を走査し、モジュール単位でtrigger_imageの存在を確認する。
// 画像が存在しないモジュールはそのモジュールの全postを除外する。
// module_00は画像がなくてもプレースホルダーとして必ず含める。
// module_13はtrigger_imageが配列で、全て存在する時だけ表示。
//
function resolveModulePosts(posts) {
// モジュールごとにpostをグループ化（順序を保持するためMapを使用）
const moduleMap = new Map();

posts.forEach(post => {
const mod = post.module;
if (!mod) return;

```
if (!moduleMap.has(mod)) {
  moduleMap.set(mod, { triggerImage: null, posts: [] });
}

const entry = moduleMap.get(mod);

if (post.trigger_image && !entry.triggerImage) {
  entry.triggerImage = post.trigger_image;
}

entry.posts.push(post);
```

});

const result = [];

moduleMap.forEach((entry, modId) => {
if (checkModuleVisible(modId, entry.triggerImage)) {
entry.posts.forEach(p => result.push(p));
}
});

return result;
}

// モジュールを表示するかどうか判定
function checkModuleVisible(modId, triggerImage) {
// module_00は必ず表示
if (modId === ‘module_00’) return true;

if (!triggerImage) return false;

// trigger_imageが配列（module_13: 全て揃う必要がある）
if (Array.isArray(triggerImage)) {
return triggerImage.every(filename => imageExists(filename));
}

// 通常：1枚の画像で判定
return imageExists(triggerImage);
}

// 画像の存在確認キャッシュ
const _imageCache = new Map();

function imageExists(filename) {
if (_imageCache.has(filename)) {
return _imageCache.get(filename);
}

const img = new Image();
img.src = `images/${filename}`;

// ブラウザキャッシュから即座に判定できる場合
if (img.complete && img.naturalWidth > 0) {
_imageCache.set(filename, true);
return true;
}

_imageCache.set(filename, false);

// 非同期でロード完了したら/dark/を再レンダリング
img.onload = () => {
_imageCache.set(filename, true);
if (STATE.activeBoard === ‘dark’) {
const threads = STATE.allThreads[‘dark’] || [];
renderThreads(threads, true, false);
}
};
img.onerror = () => {
_imageCache.set(filename, false);
};

return false;
}

// ─── TIME CALCULATION ─────────────────────────────────────
//
// postのidをシードにした疑似ランダムで1〜4分の間隔を生成。
// 同じidなら何度リロードしても同じ時間になる。
// モジュールが抜けても表示postだけで再計算するので時間が自然に続く。
//
function assignPostTimes(posts, baseTime) {
if (!posts || posts.length === 0) return posts;

const [baseHour, baseMin] = baseTime.split(’:’).map(Number);
let totalMinutes = baseHour * 60 + baseMin;

return posts.map(post => {
const hh  = String(Math.floor(totalMinutes / 60) % 24).padStart(2, ‘0’);
const mm  = String(totalMinutes % 60).padStart(2, ‘0’);
const timeStr = `${hh}:${mm}`;

```
const gap = seededRandom(post.id, CONFIG.postTimeMinGap, CONFIG.postTimeMaxGap);
totalMinutes += gap;

return { ...post, time: timeStr };
```

});
}

// post idをシードにした疑似ランダム整数（min〜max）
function seededRandom(seed, min, max) {
const s = Math.abs(parseInt(seed) || 1);
const x = Math.sin(s * 9301 + 49297) * 233280;
const r = x - Math.floor(x);
return min + Math.floor(r * (max - min + 1));
}

// ─── BUILD POST ───────────────────────────────────────────
function buildPost(post, isOp) {
const el = document.createElement(‘div’);
el.className = ‘post’ + (isOp ? ’ op’ : ‘’);
el.id = `post-${post.id}`;

const isModule00 = post.module === ‘module_00’;

const header = document.createElement(‘div’);
header.className = ‘post-header’;
header.innerHTML = `<span class="post-id">No.${String(post.id || '????').padStart(6, '0')}</span> <span class="post-handle ${isOp ? 'op-handle' : ''}">${escHtml(post.handle || 'anon')}</span> ${isOp ? '<span class="thread-tag anon">OP</span>' : ''} <span class="post-time">${escHtml(post.time || '')}</span>`;

const body = document.createElement(‘div’);
body.className = ‘post-body’;
body.innerHTML = buildPostBody(post, isModule00);

el.appendChild(header);
el.appendChild(body);

el.querySelectorAll(’.spoiler’).forEach(s => {
s.addEventListener(‘click’, () => s.classList.toggle(‘revealed’));
});

el.querySelectorAll(’.quote’).forEach(q => {
const targetId = q.dataset.target;
if (!targetId) return;
q.addEventListener(‘click’, e => {
e.stopPropagation();
jumpToPost(targetId);
});
});

el.querySelectorAll(’.post-image-wrap img’).forEach(img => {
img.addEventListener(‘click’, e => {
e.stopPropagation();
img.classList.toggle(‘expanded’);
});
});

return el;
}

function buildPostBody(post, isModule00 = false) {
let html = ‘’;

if (post.quote) {
html += `<span class="quote" data-target="${escHtml(String(post.quote))}">&gt;&gt;${escHtml(String(post.quote))}</span>`;
}

if (post.text) {
html += escHtml(post.text).replace(/\n/g, ‘<br>’);
}

if (post.spoiler) {
html += ` <span class="spoiler">${escHtml(post.spoiler)}</span>`;
}

if (post.images && post.images.length > 0) {
post.images.forEach(img => {
if (img.src) {
// module_00で画像がまだない場合はプレースホルダー
if (isModule00 && !_imageCache.get(img.src)) {
html += `<div class="post-image-placeholder">[ IMAGE PENDING ]</div>`;
} else {
html += `<div class="post-image-wrap"><img src="images/${escHtml(img.src)}" alt="${escHtml(img.alt || '')}" loading="lazy"></div>`;
}
}
});
} else if (isModule00 && post.trigger_image) {
// module_00にimagesフィールドがない場合もプレースホルダー
html += `<div class="post-image-placeholder">[ IMAGE PENDING ]</div>`;
}

return html;
}

function jumpToPost(postId) {
const target = document.getElementById(`post-${postId}`);
if (!target) return;
target.scrollIntoView({ behavior: ‘smooth’, block: ‘center’ });
target.classList.add(‘flash’);
setTimeout(() => target.classList.remove(‘flash’), 1000);
}

// ─── CLOCK ────────────────────────────────────────────────
function initClock() {
function tick() {
const now = new Date();
const hh  = String(now.getHours()).padStart(2, ‘0’);
const mm  = String(now.getMinutes()).padStart(2, ‘0’);
const ss  = String(now.getSeconds()).padStart(2, ‘0’);
const str = `1097.06.14 // ${hh}:${mm}:${ss}`;
const lt  = document.getElementById(‘live-time’);
const ft  = document.getElementById(‘footer-time’);
if (lt) lt.textContent = str;
if (ft) ft.textContent = `1097.06.14 ${hh}:${mm}:${ss}`;
}
tick();
setInterval(tick, 1000);
}

// ─── PURGE TIMER ──────────────────────────────────────────
function initPurgeTimer() {
const KEY      = ‘vanet_purge_v3’;
const duration = CONFIG.purgeHours * 3600 * 1000;

function getDeadline() {
let d = parseInt(sessionStorage.getItem(KEY) || ‘0’);
if (!d || Date.now() > d) {
d = Date.now() + duration;
sessionStorage.setItem(KEY, d);
}
return d;
}

let deadline = getDeadline();

function tick() {
const el = document.getElementById(‘purge-timer’);
if (!el) return;

```
let remaining = deadline - Date.now();
if (remaining <= 0) {
  deadline = Date.now() + duration;
  sessionStorage.setItem(KEY, deadline);
  remaining = duration;
}

const h = Math.floor(remaining / 3600000);
const m = Math.floor((remaining % 3600000) / 60000);
const s = Math.floor((remaining % 60000) / 1000);
el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
```

}

tick();
setInterval(tick, 1000);
}
