/**
 * 🔧 STEP 1: Add your Firebase project config here (from Firebase Console > Project Settings > SDK setup & config)
 *    - Create a project at https://console.firebase.google.com
 *    - Add a Web app, copy the config, and paste below
 *    - In Realtime Database, set rules to test mode during development or configure proper auth-based rules
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 🚀 Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/** App State */
const state = {
  room: 'global',
  name: localStorage.getItem('chat:name') || `User-${Math.floor(Math.random()*999)}`,
  typingUsers: new Set(),
  isOnline: false,
};

// UI elements
const els = {
  messages: document.getElementById('messages'),
  input: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  typing: document.getElementById('typing'),
  nameInput: document.getElementById('nameInput'),
  saveName: document.getElementById('saveName'),
  status: document.getElementById('status'),
  dot: document.getElementById('onlineDot'),
};

// Prefill name input
els.nameInput.value = state.name;

// Presence/connection
const connectedRef = db.ref('.info/connected');
connectedRef.on('value', (snap) => {
  state.isOnline = snap.val() === true;
  els.status.textContent = state.isOnline ? 'Online' : 'Offline';
  els.dot.style.background = state.isOnline ? 'var(--accent)' : 'var(--danger)';
  els.dot.style.boxShadow = state.isOnline ? '0 0 16px var(--accent)' : 'none';
  els.sendBtn.disabled = !state.isOnline;
  els.input.disabled = !state.isOnline;
});

// Refs
const roomRef = () => db.ref(`rooms/${state.room}`);
const messagesRef = () => roomRef().child('messages');
const typingRef = () => roomRef().child('typing');

// Listen for new messages
messagesRef().limitToLast(200).on('child_added', (snap) => {
  const msg = snap.val();
  renderMessage(msg);
  if (isNearBottom(els.messages)) {
    els.messages.scrollTop = els.messages.scrollHeight;
  }
});

// Typing indicator: listen to typing users
typingRef().on('value', (snap) => {
  const data = snap.val() || {};
  const names = Object.entries(data)
    .filter(([_, v]) => v && v.name && v.name !== state.name)
    .map(([_, v]) => v.name);
  els.typing.textContent = names.length ? `${names.join(', ')} typing…` : '';
});

// Send message
function sendMessage(){
  const text = els.input.value.trim();
  if(!text) return;
  const msg = {
    text,
    user: state.name,
    ts: firebase.database.ServerValue.TIMESTAMP
  };
  els.input.value = '';
  setTyping(false);
  messagesRef().push(msg).catch(console.error);
}

// Render message bubble
function renderMessage({ text, user, ts }){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (user === state.name ? 'me' : 'other');

  const body = document.createElement('div');
  body.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = user;
  const time = document.createElement('span');
  time.textContent = ' • ' + formatTime(ts);

  meta.appendChild(name);
  meta.appendChild(time);
  wrap.appendChild(body);
  wrap.appendChild(meta);
  els.messages.appendChild(wrap);
}

function formatTime(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

function isNearBottom(el){
  const threshold = 120; // px
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

// Typing logic
let typingTimeout = null;
function setTyping(isTyping){
  const meRef = typingRef().child(state.name);
  if(isTyping){
    meRef.set({ name: state.name, at: firebase.database.ServerValue.TIMESTAMP });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => meRef.remove(), 1500);
  } else {
    meRef.remove();
  }
}

// Events
els.sendBtn.addEventListener('click', sendMessage);
els.input.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') sendMessage();
});
els.input.addEventListener('input', ()=> setTyping(!!els.input.value));

els.saveName.addEventListener('click', ()=>{
  const newName = els.nameInput.value.trim() || `User-${Math.floor(Math.random()*999)}`;
  localStorage.setItem('chat:name', newName);
  state.name = newName;
  setTyping(false);
});

// Welcome system message (local only)
function systemMessage(text){
  const wrap = document.createElement('div'); wrap.className = 'msg system';
  wrap.textContent = text; els.messages.appendChild(wrap);
}
systemMessage('Welcome! Set your name (bottom-right) and start chatting.');

// Optional: Change room via hash (#roomName)
window.addEventListener('hashchange', ()=>{
  const newRoom = location.hash.replace('#','').trim() || 'global';
  if(newRoom !== state.room){
    messagesRef().off(); typingRef().off();
    els.messages.innerHTML = '';
    state.room = newRoom;
    document.getElementById('roomName').textContent = state.room;
    messagesRef().limitToLast(200).on('child_added', (snap)=>{ renderMessage(snap.val()); if(isNearBottom(els.messages)) els.messages.scrollTop = els.messages.scrollHeight; });
    typingRef().on('value', (snap)=>{
      const data = snap.val() || {}; const names = Object.entries(data).filter(([_, v]) => v && v.name && v.name !== state.name).map(([_, v]) => v.name);
      els.typing.textContent = names.length ? `${names.join(', ')} typing…` : '';
    });
    systemMessage(`Switched to room: #${state.room}`);
  }
});

// Initialize room from hash on first load
window.dispatchEvent(new Event('hashchange'));
```

---

### Quick-start Database Rules (development only — make stricter for production)
In Firebase Console → Realtime Database → Rules, you can start with:

```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
