const worldMap = document.getElementById('worldMap');
const worldViewport = document.getElementById('worldViewport');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const challengeBtn = document.getElementById('challengeBtn');
const nicknameInput = document.getElementById('nicknameInput');
const challengePoint = document.getElementById('challengePoint');

const worldWidth = Number(worldMap.dataset.width || 2000);
const worldHeight = Number(worldMap.dataset.height || 1200);
const step = 12;

const youId = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
let players = [];
let me = { id: youId, nickname: 'Gracz', x: 130, y: 130 };
let pollIntervalId;

const challengeLocation = { x: 980, y: 560 };
challengePoint.style.left = `${challengeLocation.x}px`;
challengePoint.style.top = `${challengeLocation.y}px`;
const worldDecorations = [
    { type: 'tree', x: 220, y: 260 },
    { type: 'tree', x: 340, y: 870 },
    { type: 'tree', x: 620, y: 430 },
    { type: 'tree', x: 1260, y: 290 },
    { type: 'tree', x: 1530, y: 910 },
    { type: 'tree', x: 1820, y: 620 },
    { type: 'stone', x: 510, y: 650 },
    { type: 'stone', x: 840, y: 340 },
    { type: 'stone', x: 1170, y: 760 },
    { type: 'stone', x: 1690, y: 460 }
];

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function renderDecorations() {
    worldDecorations.forEach(item => {
        const el = document.createElement('div');
        el.className = `world-object world-object--${item.type}`;
        el.style.left = `${item.x}px`;
        el.style.top = `${item.y}px`;
        worldMap.appendChild(el);
    });
}

function renderPlayers() {
    worldMap.querySelectorAll('.player').forEach(node => node.remove());

    players.forEach(player => {
        const el = document.createElement('div');
        el.className = `player ${player.id === me.id ? 'player--self' : ''}`;
        el.style.left = `${player.x}px`;
        el.style.top = `${player.y}px`;

        const label = document.createElement('span');
        label.textContent = player.nickname;
        label.className = 'player-label';
        el.appendChild(label);
        worldMap.appendChild(el);
    });

    const meSnapshot = players.find(player => player.id === me.id);
    if (meSnapshot) {
        me = { ...me, ...meSnapshot };
    }

    const viewportW = worldViewport.clientWidth;
    const viewportH = worldViewport.clientHeight;
    const targetX = clamp(me.x - viewportW / 2, 0, worldWidth - viewportW);
    const targetY = clamp(me.y - viewportH / 2, 0, worldHeight - viewportH);
    worldMap.style.transform = `translate(${-targetX}px, ${-targetY}px)`;
}

function sendMove() {
    fetch('/api/world/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: me.id, x: me.x, y: me.y })
    }).catch(error => console.error('Błąd aktualizacji pozycji:', error));
}

async function connectToWorld() {
    me.nickname = (nicknameInput.value || 'Gracz').trim().slice(0, 20) || 'Gracz';
    try {
        const response = await fetch('/api/world/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: me.id, nickname: me.nickname, x: me.x, y: me.y })
        });
        if (!response.ok) {
            statusText.textContent = 'Status: błąd połączenia.';
            return;
        }
        statusText.textContent = 'Status: połączono ze wspólnym światem.';
        refreshWorldState();
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
        }
        pollIntervalId = setInterval(refreshWorldState, 1000);
    } catch (error) {
        console.error(error);
        statusText.textContent = 'Status: błąd połączenia.';
    }
}

async function refreshWorldState() {
    try {
        const response = await fetch('/api/world/state');
        const data = await response.json();
        players = data.players || [];
        renderPlayers();
    } catch (error) {
        console.error('Błąd pobierania stanu świata:', error);
    }
}

function handleMovement(event) {
    const key = event.key.toLowerCase();
    if (!['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        return;
    }

    if (key === 'arrowup' || key === 'w') me.y -= step;
    if (key === 'arrowdown' || key === 's') me.y += step;
    if (key === 'arrowleft' || key === 'a') me.x -= step;
    if (key === 'arrowright' || key === 'd') me.x += step;

    me.x = clamp(me.x, 0, worldWidth);
    me.y = clamp(me.y, 0, worldHeight);
    sendMove();
}

async function runChallenge() {
    const distance = Math.hypot(me.x - challengeLocation.x, me.y - challengeLocation.y);
    if (distance > 90) {
        statusText.textContent = 'Podejdź bliżej znacznika wyzwania (zielone koło).';
        return;
    }

    try {
        const response = await fetch('/api/adventure/challenge');
        const challenge = await response.json();
        if (!response.ok) {
            statusText.textContent = challenge.error || 'Brak wyzwań.';
            return;
        }

        const answer = prompt(`Wyzwanie (${challenge.category}): ${challenge.question}`);
        if (answer === null) return;

        if (answer.trim().toLowerCase() === challenge.answer.trim().toLowerCase()) {
            statusText.textContent = '✅ Poprawna odpowiedź! Świat odzyskuje wiedzę.';
        } else {
            statusText.textContent = `❌ Błędna odpowiedź. Poprawnie: ${challenge.answer}`;
        }
    } catch (error) {
        console.error(error);
        statusText.textContent = 'Błąd pobierania wyzwania.';
    }
}

document.addEventListener('keydown', handleMovement);
connectBtn.addEventListener('click', connectToWorld);
challengeBtn.addEventListener('click', runChallenge);
window.addEventListener('beforeunload', () => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    fetch('/api/world/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: me.id }),
        keepalive: true
    });
});
renderDecorations();
renderPlayers();
