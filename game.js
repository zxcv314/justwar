// ============================= 전역 변수 =============================
let currentUser = null;
let devMode = false;
let gameState = {
    currentPlayer: 'P1',
    turnCount: 1,
    apLeft: 3,
    p1: { resources: 200, units: [], baseHP: 10, tactics: [] },
    p2: { resources: 200, units: [], baseHP: 10, tactics: [] },
    selectedUnit: null,
    selectedTargetId: null,
    selectedTargetUnit: null,
    map: [],
    aiDifficulty: 'normal',
    replayData: [],
    tacticUsedThisTurn: new Set()
};

let unitIdCounter = 0;

// ============================= 유닛 데이터 =============================
const unitData = {
    '보병 부대': { cost: 100, limit: 6, groundAttack: true, airAttack: false, atk: 1, hp: 1, range: 1, move: 1, special: 'groupCommand', isAir: false },
    '보병 중대': { cost: 200, limit: 3, groundAttack: true, airAttack: false, atk: 1, hp: 3, range: 1, move: 1, special: '', isAir: false },
    '기계화 보병 부대': { cost: 200, limit: 2, groundAttack: true, airAttack: true, atk: 2, hp: 1, range: 2, move: 1, special: '', isAir: false },
    '장갑차': { cost: 250, limit: 3, groundAttack: true, airAttack: false, atk: 2, hp: 3, range: 1, move: 2, special: '', isAir: false, armored: true },
    '탱크': { cost: 400, limit: 2, groundAttack: true, airAttack: false, atk: 3, hp: 5, range: 1, move: 1, special: '', isAir: false, armored: true },
    '공격헬기': { cost: 350, limit: 3, groundAttack: true, airAttack: true, atk: 3, hp: 1, range: 2, move: 3, special: '', isAir: true },
    '저격수': { cost: 300, limit: 2, groundAttack: true, airAttack: true, atk: 2, hp: 1, range: 4, move: 2, special: 'noArmor', isAir: false },
    '자폭드론': { cost: 100, limit: 3, groundAttack: false, airAttack: false, atk: 2, hp: 1, range: 0, move: 2, special: 'selfDestruct', isAir: false },
    '자주포': { cost: 400, limit: 2, groundAttack: true, airAttack: false, atk: 3, hp: 1, range: 3, move: 1, special: 'exactRange3', isAir: false },
    '방공포대': { cost: 400, limit: 3, groundAttack: false, airAttack: true, atk: 2, hp: 1, range: 4, move: 1, special: 'antiAir', isAir: false },
    '전투기': { cost: 600, limit: 2, groundAttack: true, airAttack: true, atk: 1, hp: 1, range: 1, move: 3, special: 'moveAttack', isAir: true },
    '델타포스': { cost: 800, limit: 1, groundAttack: true, airAttack: true, atk: 3, hp: 4, range: 3, move: 3, special: 'bombImmune', isAir: false },
    '시모 해위해': { cost: 1200, limit: 1, groundAttack: true, airAttack: true, atk: 5, hp: 1, range: 6, move: 1, special: 'bombImmune forestIgnore', isAir: false }
};

const tacticData = {
    '전술 폭격': { cost: 450 },
    '헬파이어 폭격': { cost: 450 }
};

// ============================= 맵 프리셋 =============================
const mapPresets = {
    classic: () => {
        const map = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const id = row * 3 + col;
                const terrain = Math.random() < 0.3 ? 'forest' : Math.random() < 0.4 ? 'building' : 'plain';
                map.push({ id, row, col, type: 'normal', terrain, units: [], hellfireRemaining: 0, baseHP: 0, owner: null });
            }
        }
        map[0].type = 'base'; map[0].owner = 'P1'; map[0].baseHP = 10;
        map[8].type = 'base'; map[8].owner = 'P2'; map[8].baseHP = 10;
        return map;
    },
    fortress: () => {
        const map = [];
        const terrains = ['forest', 'forest', 'forest', 'building', 'plain', 'building', 'forest', 'forest', 'forest'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const id = row * 3 + col;
                map.push({ id, row, col, type: 'normal', terrain: terrains[id], units: [], hellfireRemaining: 0, baseHP: 0, owner: null });
            }
        }
        map[0].type = 'base'; map[0].owner = 'P1'; map[0].baseHP = 10;
        map[8].type = 'base'; map[8].owner = 'P2'; map[8].baseHP = 10;
        return map;
    },
    corridor: () => {
        const map = [];
        const terrains = ['plain', 'building', 'plain', 'building', 'plain', 'building', 'plain', 'building', 'plain'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const id = row * 3 + col;
                map.push({ id, row, col, type: 'normal', terrain: terrains[id], units: [], hellfireRemaining: 0, baseHP: 0, owner: null });
            }
        }
        map[0].type = 'base'; map[0].owner = 'P1'; map[0].baseHP = 10;
        map[8].type = 'base'; map[8].owner = 'P2'; map[8].baseHP = 10;
        return map;
    },
    random: () => mapPresets.classic()
};

// ============================= 로그인 시스템 =============================
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        alert('사용자 이름을 입력하세요.');
        return;
    }
    
    if (username === 'dev' && password === 'dev') {
        devMode = true;
        document.getElementById('dev-mode-btn').style.display = 'inline-block';
    }
    
    currentUser = { username, isGuest: false };
    document.getElementById('current-username').textContent = username;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    loadUserStats();
    initGame();
}

function guestLogin() {
    currentUser = { username: 'Guest', isGuest: true };
    document.getElementById('current-username').textContent = 'Guest';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    initGame();
}

function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        currentUser = null;
        devMode = false;
        location.reload();
    }
}

function toggleDevMode() {
    if (!devMode) return;
    const choice = prompt(`개발자 명령:\n1. 자원 +1000\n2. AP 충전\n3. 적 기지 피해 -5\n4. 승리`);
    
    if (choice === '1') {
        getPlayer().resources += 1000;
        addLog('🔧 [DEV] 자원 +1000');
    } else if (choice === '2') {
        gameState.apLeft = 3;
        addLog('🔧 [DEV] AP 충전');
    } else if (choice === '3') {
        const enemyBase = gameState.map.find(n => n.type === 'base' && n.owner !== gameState.currentPlayer);
        enemyBase.baseHP = Math.max(0, enemyBase.baseHP - 5);
        getEnemyPlayer().baseHP = enemyBase.baseHP;
        addLog('🔧 [DEV] 적 기지 피해 -5');
        if (enemyBase.baseHP <= 0) endGame(gameState.currentPlayer);
    } else if (choice === '4') {
        endGame(gameState.currentPlayer);
    }
    
    updateUI();
    renderAll();
}

// ============================= 전적 시스템 =============================
function loadUserStats() {
    if (currentUser.isGuest) return;
    const stats = JSON.parse(localStorage.getItem(`stats_${currentUser.username}`) || '{"wins":0,"losses":0,"totalTurns":0,"games":0}');
    currentUser.stats = stats;
}

function saveGameResult(winner, turns) {
    if (currentUser.isGuest) return;
    
    const stats = currentUser.stats || { wins: 0, losses: 0, totalTurns: 0, games: 0 };
    stats.games++;
    stats.totalTurns += turns;
    
    if (winner === 'P1') stats.wins++;
    else stats.losses++;
    
    localStorage.setItem(`stats_${currentUser.username}`, JSON.stringify(stats));
    currentUser.stats = stats;
}

function showStats() {
    const stats = currentUser.isGuest ? null : currentUser.stats;
    const content = document.getElementById('stats-content');
    
    if (!stats) {
        content.innerHTML = '<p>게스트는 전적이 저장되지 않습니다.</p>';
    } else {
        const winRate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0;
        const avgTurns = stats.games > 0 ? (stats.totalTurns / stats.games).toFixed(1) : 0;
        
        content.innerHTML = `
            <table class="stats-table">
                <tr><th>항목</th><th>값</th></tr>
                <tr><td>총 게임</td><td>${stats.games}</td></tr>
                <tr><td>승리</td><td>${stats.wins}</td></tr>
                <tr><td>패배</td><td>${stats.losses}</td></tr>
                <tr><td>승률</td><td>${winRate}%</td></tr>
                <tr><td>평균 턴 수</td><td>${avgTurns}</td></tr>
            </table>
        `;
    }
    
    document.getElementById('stats-modal').classList.add('show');
}

function showRules() {
    document.getElementById('rules-modal').classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// ============================= 게임 초기화 =============================
function initGame() {
    gameState = {
        currentPlayer: Math.random() < 0.5 ? 'P1' : 'P2',
        turnCount: 1,
        apLeft: 3,
        p1: { resources: 200, units: [], baseHP: 10, tactics: [] },
        p2: { resources: 200, units: [], baseHP: 10, tactics: [] },
        selectedUnit: null,
        selectedTargetId: null,
        selectedTargetUnit: null,
        map: mapPresets[document.getElementById('map-select').value](),
        aiDifficulty: 'normal',
        replayData: [],
        tacticUsedThisTurn: new Set()
    };
    
    unitIdCounter = 0;
    
    addLog(`${gameState.currentPlayer}이(가) 선공입니다!`);
    startTurn();
}

function changeMap() {
    if (confirm('맵을 변경하면 게임이 초기화됩니다. 계속하시겠습니까?')) {
        initGame();
    }
}

function startTurn() {
    cancelSelection();
    gameState.apLeft = 3;
    gameState.tacticUsedThisTurn.clear();
    getPlayerUnits().forEach(u => u.acted = false);
    
    showTurnOverlay(`${gameState.currentPlayer} 턴 시작`);
    
    createBuyButtons();
    createTacticButtons();
    renderAll();
    updateUI();

    if (gameState.currentPlayer === 'P2') {
        setTimeout(aiTurn, 1500);
    }
}

function showTurnOverlay(text) {
    const overlay = document.getElementById('turn-overlay');
    document.getElementById('turn-text').textContent = text;
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 1000);
}

// ============================= 렌더링 =============================
function renderAll() {
    renderMap();
    renderMyTactics();
}

function renderMap() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    gameState.map.forEach(node => {
        const div = document.createElement('div');
        div.className = `node ${node.terrain}`;
        if (node.type === 'base') div.classList.add('base');

        // 이동/공격 가능 하이라이트
        if (gameState.selectedUnit && !gameState.selectedTargetId) {
            if (isMovableTo(gameState.selectedUnit, node.id)) {
                div.classList.add('highlight-move');
            }
            if (canAttackNode(gameState.selectedUnit, node.id)) {
                div.classList.add('highlight-attack');
            }
        }

        div.innerHTML = `
            <strong>(${node.row},${node.col})</strong><br>
            ${getTerrainIcon(node.terrain)}<br>
            ${node.type === 'base' ? `🏰 HP: ${node.baseHP}<br>` : ''}
            ${node.hellfireRemaining > 0 ? `🔥x${node.hellfireRemaining}<br>` : ''}
        `;
        
        node.units.forEach(unit => {
            const unitDiv = document.createElement('div');
            unitDiv.className = `unit-card ${unit.owner.toLowerCase()}`;
            if (unit.acted) unitDiv.classList.add('acted');
            if (gameState.selectedUnit && gameState.selectedUnit.id === unit.id) {
                unitDiv.classList.add('selected');
            }
            
            unitDiv.innerHTML = `
                ${unit.name}<br>
                ❤️${unit.hp} ⚔️${unit.atk}
                ${unit.acted ? '<br>(행동완료)' : ''}
            `;
            
            unitDiv.onclick = (e) => {
                e.stopPropagation();
                onUnitClick(unit);
            };
            
            div.appendChild(unitDiv);
        });
        
        div.onclick = () => onNodeClick(node.id);
        board.appendChild(div);
    });
}

function getTerrainIcon(t) {
    switch(t) {
        case 'forest': return '🌲';
        case 'building': return '🏢';
        default: return '⛰️';
    }
}

function renderMyTactics() {
    const div = document.getElementById('my-tactics');
    div.innerHTML = '';
    
    const tactics = getPlayer().tactics;
    if (tactics.length === 0) {
        div.innerHTML = '<p style="color:#999;">보유한 전술이 없습니다.</p>';
        return;
    }
    
    tactics.forEach(tactic => {
        const btn = document.createElement('button');
        btn.textContent = `${tactic.name} 사용`;
        btn.disabled = gameState.apLeft < 1;
        btn.onclick = () => {
            const target = parseInt(prompt(`${tactic.name}\n타겟 노드 번호 (0~8):`));
            if (target >= 0 && target <= 8) {
                useTactic(tactic.name, target);
            }
        };
        div.appendChild(btn);
    });
}

// ============================= UI 업데이트 =============================
function updateUI() {
    document.getElementById('current-player').textContent = gameState.currentPlayer;
    document.getElementById('turn-count').textContent = gameState.turnCount;
    document.getElementById('p1-resources').textContent = gameState.p1.resources;
    document.getElementById('p2-resources').textContent = gameState.p2.resources;
    document.getElementById('ap-left').textContent = Math.max(0, gameState.apLeft);
}

function createBuyButtons() {
    const container = document.getElementById('buy-buttons');
    container.innerHTML = '';
    const player = getPlayer();
    
    Object.keys(unitData).forEach(name => {
        const data = unitData[name];
        const count = player.units.filter(u => u.name === name).length;
        const btn = document.createElement('button');
        btn.textContent = `${name}`;
        btn.title = `비용: ${data.cost} | ${count}/${data.limit}`;
        btn.disabled = gameState.apLeft < 1 || player.resources < data.cost || count >= data.limit;
        btn.onclick = () => buyUnit(name);
        container.appendChild(btn);
    });
}

function createTacticButtons() {
    const container = document.getElementById('tactic-buy-buttons');
    container.innerHTML = '';
    const player = getPlayer();
    
    Object.keys(tacticData).forEach(name => {
        const cost = tacticData[name].cost;
        const btn = document.createElement('button');
        btn.textContent = `${name}`;
        btn.title = `비용: ${cost}`;
        btn.disabled = gameState.apLeft < 1 || player.resources < cost;
        btn.onclick = () => buyTactic(name);
        container.appendChild(btn);
    });
}

// ============================= 유닛/노드 선택 =============================
function onUnitClick(unit) {
    if (unit.owner !== gameState.currentPlayer) {
        // 적 유닛 클릭 → 공격 타겟 선택
        if (gameState.selectedUnit && !gameState.selectedUnit.acted) {
            gameState.selectedTargetUnit = unit;
            gameState.selectedTargetId = unit.position;
            addLog(`공격 타겟: ${unit.name} (ID ${unit.id})`);
            showUnitInfo(gameState.selectedUnit);
        }
        return;
    }
    
    if (unit.acted) {
        addLog(`${unit.name}은(는) 이미 행동했습니다.`);
        return;
    }
    
    gameState.selectedUnit = unit;
    gameState.selectedTargetId = null;
    gameState.selectedTargetUnit = null;
    document.getElementById('selected-unit-name').textContent = unit.name;
    document.getElementById('unit-controls').style.display = 'block';
    showUnitInfo(unit);
    addLog(`${unit.name} 선택 (ID ${unit.id})`);
    renderMap();
}

function onNodeClick(id) {
    if (gameState.selectedUnit && !gameState.selectedTargetId) {
        // 유닛 선택 후 노드 클릭 → 타겟 노드 선택
        gameState.selectedTargetId = id;
        gameState.selectedTargetUnit = null;
        const node = gameState.map[id];
        addLog(`타겟 노드: (${node.row},${node.col})`);
        showUnitInfo(gameState.selectedUnit);
        renderMap();
    }
}

function showUnitInfo(unit) {
    const panel = document.getElementById('unit-info-panel');
    panel.innerHTML = `
        <div class="unit-stat"><span>체력</span><span>${unit.hp}/${unitData[unit.name].hp}</span></div>
        <div class="unit-stat"><span>공격력</span><span>${unit.atk}</span></div>
        <div class="unit-stat"><span>사거리</span><span>${unit.range}</span></div>
        <div class="unit-stat"><span>이동력</span><span>${unit.move}</span></div>
        <div class="unit-stat"><span>위치</span><span>노드 ${unit.position}</span></div>
        <div class="unit-stat"><span>특수능력</span><span>${unit.special || '-'}</span></div>
        ${gameState.selectedTargetId !== null ? `<div class="unit-stat"><span>타겟</span><span>노드 ${gameState.selectedTargetId}</span></div>` : ''}
        ${gameState.selectedTargetUnit ? `<div class="unit-stat"><span>타겟 유닛</span><span>${gameState.selectedTargetUnit.name}</span></div>` : ''}
    `;
}

function cancelSelection() {
    gameState.selectedUnit = null;
    gameState.selectedTargetId = null;
    gameState.selectedTargetUnit = null;
    document.getElementById('unit-controls').style.display = 'none';
    renderMap();
}

// ============================= 행동 실행 =============================
function performAction(action) {
    if (!gameState.selectedUnit) {
        alert('유닛을 먼저 선택하세요!');
        return;
    }
    
    if (gameState.selectedTargetId === null && action !== 'special') {
        alert('타겟을 선택하세요!');
        return;
    }

    try {
        if (action === 'move') moveUnit(gameState.selectedUnit, gameState.selectedTargetId);
        else if (action === 'attack') attackUnit(gameState.selectedUnit, gameState.selectedTargetId);
        else if (action === 'special') specialAction(gameState.selectedUnit, gameState.selectedTargetId);
    } catch (error) {
        addLog(`❌ 오류: ${error.message}`);
        console.error(error);
    }

    cancelSelection();
    updateUI();
}

// ============================= 구매 =============================
function buyUnit(name) {
    if (gameState.apLeft < 1) {
        addLog('❌ AP 부족!');
        return;
    }
    
    const data = unitData[name];
    const player = getPlayer();
    
    if (player.resources < data.cost) {
        addLog('❌ 자원 부족!');
        return;
    }
    
    const count = player.units.filter(u => u.name === name).length;
    if (count >= data.limit) {
        addLog('❌ 제한 초과!');
        return;
    }

    player.resources -= data.cost;
    const pos = gameState.currentPlayer === 'P1' ? 0 : 8;
    const newUnit = { 
        id: unitIdCounter++,
        name, 
        ...data, 
        hp: data.hp, 
        position: pos, 
        owner: gameState.currentPlayer, 
        acted: false 
    };
    player.units.push(newUnit);
    gameState.map[pos].units.push(newUnit);

    gameState.apLeft = Math.max(0, gameState.apLeft - 1);
    addLog(`✅ ${name} 구매 완료 (AP ${gameState.apLeft} 남음)`);
    
    createBuyButtons();
    renderAll();
    updateUI();
}

function buyTactic(name) {
    if (gameState.apLeft < 1) {
        addLog('❌ AP 부족!');
        return;
    }
    
    const cost = tacticData[name].cost;
    const player = getPlayer();
    
    if (player.resources < cost) {
        addLog('❌ 자원 부족!');
        return;
    }

    player.resources -= cost;
    player.tactics.push({ name });
    gameState.apLeft = Math.max(0, gameState.apLeft - 1);
    addLog(`✅ ${name} 구매 완료`);
    
    createTacticButtons();
    renderAll();
    updateUI();
}

// ============================= 이동/공격 로직 =============================
function bfsDistance(start, target) {
    if (start === target) return 0;
    const queue = [{id: start, dist: 0}];
    const visited = new Set([start]);
    while (queue.length) {
        const {id, dist} = queue.shift();
        for (const nei of getNeighbors(id)) {
            if (!visited.has(nei)) {
                visited.add(nei);
                if (nei === target) return dist + 1;
                queue.push({id: nei, dist: dist + 1});
            }
        }
    }
    return Infinity;
}

function getNeighbors(id) {
    const mapSize = 3;
    const row = Math.floor(id / mapSize), col = id % mapSize;
    const nei = [];
    if (row > 0) nei.push(id - mapSize);
    if (row < mapSize - 1) nei.push(id + mapSize);
    if (col > 0) nei.push(id - 1);
    if (col < mapSize - 1) nei.push(id + 1);
    return nei;
}

function isMovableTo(unit, targetId) {
    return unit.position !== targetId && bfsDistance(unit.position, targetId) <= unit.move;
}

function getEffectiveRange(unit, targetTerrain) {
    let r = unit.range;
    if (unit.special && unit.special.includes('forestIgnore') && targetTerrain === 'forest') return r;
    if (targetTerrain === 'forest' || targetTerrain === 'building') r = Math.floor(r / 2);
    return r;
}

function canAttackTarget(attacker, targetUnit) {
    if (!targetUnit) return false;
    if (targetUnit.isAir && !attacker.airAttack) return false;
    if (!targetUnit.isAir && !attacker.groundAttack) return false;
    if (attacker.special === 'noArmor' && targetUnit.armored) return false;
    return true;
}

function canAttackNode(unit, nodeId) {
    const node = gameState.map[nodeId];
    const dist = bfsDistance(unit.position, nodeId);
    let effRange = getEffectiveRange(unit, node.terrain);
    
    if (unit.special === 'exactRange3') {
        return dist === 3;
    }
    
    return dist > 0 && dist <= effRange;
}

function moveUnit(unit, targetId) {
    if (unit.acted || gameState.apLeft < 1) {
        addLog('❌ 행동 불가!');
        return;
    }
    
    if (!isMovableTo(unit, targetId)) {
        addLog('❌ 이동 거리 초과!');
        return;
    }

    gameState.map[unit.position].units = gameState.map[unit.position].units.filter(u => u.id !== unit.id);
    unit.position = targetId;
    gameState.map[targetId].units.push(unit);
    unit.acted = true;
    gameState.apLeft = Math.max(0, gameState.apLeft - 1);
    addLog(`✅ ${unit.name} → 노드 ${targetId} 이동`);
    renderAll();
}

function attackUnit(unit, targetId) {
    if (unit.acted || gameState.apLeft < 1) {
        addLog('❌ 행동 불가!');
        return;
    }
    
    const targetNode = gameState.map[targetId];
    const dist = bfsDistance(unit.position, targetId);
    let effRange = getEffectiveRange(unit, targetNode.terrain);

    if (unit.special === 'exactRange3' && dist !== 3) {
        addLog('❌ 자주포는 정확히 거리 3이어야 합니다!');
        return;
    }
    if (unit.special === 'exactRange3') effRange = 999;

    if (dist > effRange || dist === 0) {
        addLog('❌ 사거리 밖!');
        return;
    }

    // 특정 유닛을 선택했을 경우 해당 유닛만 공격
    if (gameState.selectedTargetUnit) {
        const target = gameState.selectedTargetUnit;
        if (!canAttackTarget(unit, target)) {
            addLog('❌ 해당 유닛을 공격할 수 없습니다!');
            return;
        }
        target.hp -= unit.atk;
        addLog(`⚔️ ${unit.name} → ${target.name} 공격 (${unit.atk} 데미지)`);
    } else {
        // 노드만 선택한 경우 첫 번째 적 유닛 공격
        const enemies = targetNode.units.filter(t => t.owner !== gameState.currentPlayer && canAttackTarget(unit, t));
        if (enemies.length > 0) {
            enemies[0].hp -= unit.atk;
            addLog(`⚔️ ${unit.name} → ${enemies[0].name} 공격 (${unit.atk} 데미지)`);
        }
    }

    // 기지 공격
    if (targetNode.type === 'base' && targetNode.owner !== gameState.currentPlayer) {
        targetNode.baseHP -= unit.atk;
        if (targetNode.owner === 'P1') gameState.p1.baseHP = targetNode.baseHP;
        else gameState.p2.baseHP = targetNode.baseHP;
        addLog(`🏰 적 기지 ${unit.atk} 피해! (남은 HP ${targetNode.baseHP})`);
        if (targetNode.baseHP <= 0) endGame(gameState.currentPlayer);
    }

    cleanupDeadUnits();
    unit.acted = true;
    gameState.apLeft = Math.max(0, gameState.apLeft - 1);
    renderAll();
}

function specialAction(unit, targetId) {
    // 자폭드론
    if (unit.special === 'selfDestruct') {
        const node = gameState.map[unit.position];
        applyDamage(node, 2, true);
        const player = getPlayer();
        player.units = player.units.filter(u => u.id !== unit.id);
        node.units = node.units.filter(u => u.id !== unit.id);
        addLog(`💥 ${unit.name} 자폭 발동! 주변 2데미지`);
        cleanupDeadUnits();
        cancelSelection();
        renderAll();
        return;
    }

    // 전투기: 이동 후 공격
    if (unit.special === 'moveAttack') {
        if (gameState.apLeft < 1 || unit.acted) {
            addLog('❌ 행동 불가!');
            return;
        }
        
        if (!targetId || !isMovableTo(unit, targetId)) {
            addLog('❌ 이동 불가!');
            return;
        }

        gameState.map[unit.position].units = gameState.map[unit.position].units.filter(u => u.id !== unit.id);
        unit.position = targetId;
        gameState.map[targetId].units.push(unit);

        const targetNode = gameState.map[targetId];
        targetNode.units.filter(t => t.owner !== gameState.currentPlayer && canAttackTarget(unit, t))
            .forEach(t => t.hp -= unit.atk);
        
        if (targetNode.type === 'base' && targetNode.owner !== gameState.currentPlayer) {
            targetNode.baseHP -= unit.atk;
            addLog(`✈️ 전투기 기지 공격 ${unit.atk} 피해`);
            if (targetNode.baseHP <= 0) endGame(gameState.currentPlayer);
        }

        cleanupDeadUnits();
        unit.acted = true;
        gameState.apLeft = Math.max(0, gameState.apLeft - 1);
        addLog(`✈️ ${unit.name} 이동 후 공격 (노드 ${targetId})`);
        renderAll();
        return;
    }

    alert('이 유닛은 특수 행동이 없습니다.');
}

// ============================= 전술 =============================
function useTactic(name, targetNodeId) {
    if (gameState.apLeft < 1) {
        addLog('❌ AP 부족!');
        return;
    }
    
    // 전술 중복 사용 방지
    if (gameState.tacticUsedThisTurn.has(name)) {
        addLog('❌ 이미 이번 턴에 사용한 전술입니다!');
        return;
    }
    
    const node = gameState.map[targetNodeId];

    if (name === '전술 폭격') {
        const enemy = getEnemyPlayer();
        const hasAA = enemy.units.some(u => u.special === 'antiAir' && bfsDistance(u.position, targetNodeId) <= u.range);
        
        if (hasAA) {
            addLog('🚫 방공포대에 의해 전술 폭격 무효화!');
            gameState.tacticUsedThisTurn.add(name);
            getPlayer().tactics = getPlayer().tactics.filter(t => t.name !== name);
            gameState.apLeft = Math.max(0, gameState.apLeft - 1);
            renderAll();
            updateUI();
            return;
        }
        
        const beforeCount = node.units.length;
        node.units = node.units.filter(u => u.special && u.special.includes('bombImmune'));
        const destroyed = beforeCount - node.units.length;
        
        // 전역 유닛 목록에서도 제거
        gameState.p1.units = gameState.p1.units.filter(u => u.hp > 0 && gameState.map[u.position].units.includes(u));
        gameState.p2.units = gameState.p2.units.filter(u => u.hp > 0 && gameState.map[u.position].units.includes(u));
        
        addLog(`💣 전술 폭격 → 노드 ${targetNodeId} ${destroyed}개 유닛 궤멸`);
    } else if (name === '헬파이어 폭격') {
        applyDamage(node, 3);
        node.hellfireRemaining = 2;
        addLog(`🔥 헬파이어 폭격 → 노드 ${targetNodeId} 3데미지 + 2턴 지속`);
    }

    gameState.apLeft = Math.max(0, gameState.apLeft - 1);
    gameState.tacticUsedThisTurn.add(name);
    getPlayer().tactics = getPlayer().tactics.filter(t => t.name !== name);
    cleanupDeadUnits();
    renderAll();
    updateUI();
}

function applyDamage(node, dmg, ignoreImmune = false) {
    node.units.forEach(u => {
        if (!ignoreImmune && u.special && u.special.includes('bombImmune')) return;
        u.hp -= dmg;
    });
    
    if (node.type === 'base') {
        node.baseHP -= dmg;
        if (node.owner === 'P1') gameState.p1.baseHP = node.baseHP;
        else gameState.p2.baseHP = node.baseHP;
        if (node.baseHP <= 0) endGame(gameState.currentPlayer);
    }
}

function cleanupDeadUnits() {
    gameState.p1.units = gameState.p1.units.filter(u => u.hp > 0);
    gameState.p2.units = gameState.p2.units.filter(u => u.hp > 0);
    gameState.map.forEach(node => node.units = node.units.filter(u => u.hp > 0));
}

// ============================= 보병 집단 명령 =============================
function infantryCommand(action) {
    if (gameState.apLeft < 1) {
        addLog('❌ AP 부족!');
        return;
    }
    
    const infantry = getPlayerUnits().filter(u => u.name === '보병 부대' && !u.acted);
    
    if (infantry.length === 0) {
        addLog('❌ 행동 가능한 보병 부대가 없습니다!');
        return;
    }

    const target = parseInt(prompt(`보병 부대 전체 ${action === 'move' ? '이동' : '타격'} 타겟 노드 (0~8):`));
    
    if (isNaN(target) || target < 0 || target > 8) return;

    let successCount = 0;
    
    infantry.forEach(u => {
        if (action === 'move') {
            if (isMovableTo(u, target)) {
                gameState.map[u.position].units = gameState.map[u.position].units.filter(unit => unit.id !== u.id);
                u.position = target;
                gameState.map[target].units.push(u);
                u.acted = true;
                successCount++;
            }
        } else {
            const dist = bfsDistance(u.position, target);
            const effRange = getEffectiveRange(u, gameState.map[target].terrain);
            
            if (dist > 0 && dist <= effRange) {
                const targetNode = gameState.map[target];
                const enemies = targetNode.units.filter(t => t.owner !== gameState.currentPlayer && canAttackTarget(u, t));
                
                if (enemies.length > 0) {
                    enemies[0].hp -= u.atk;
                    u.acted = true;
                    successCount++;
                }
                
                if (targetNode.type === 'base' && targetNode.owner !== gameState.currentPlayer) {
                    targetNode.baseHP -= u.atk;
                    if (targetNode.owner === 'P1') gameState.p1.baseHP = targetNode.baseHP;
                    else gameState.p2.baseHP = targetNode.baseHP;
                    if (targetNode.baseHP <= 0) endGame(gameState.currentPlayer);
                }
            }
        }
    });

    if (successCount > 0) {
        gameState.apLeft = Math.max(0, gameState.apLeft - 1);
        addLog(`🎖️ 보병 부대 전체 명령 (${action}) → ${successCount}/${infantry.length} 성공`);
    }
    
    cleanupDeadUnits();
    cancelSelection();
    createBuyButtons();
    renderAll();
    updateUI();
}

// ============================= 턴 종료 =============================
function endTurn() {
    // 헬파이어 지속 피해
    gameState.map.forEach(node => {
        if (node.hellfireRemaining > 0) {
            applyDamage(node, 1);
            node.hellfireRemaining--;
            if (node.hellfireRemaining === 0) {
                addLog(`🔥 헬파이어 지속 피해 종료 (노드 ${node.id})`);
            } else {
                addLog(`🔥 헬파이어 지속 피해 (노드 ${node.id})`);
            }
        }
    });

    cleanupDeadUnits();
    getPlayer().resources += 200;
    addLog(`💰 턴 종료 → 자원 +200`);
    
    gameState.currentPlayer = gameState.currentPlayer === 'P1' ? 'P2' : 'P1';
    gameState.turnCount++;

    startTurn();
}

function endGame(winner) {
    saveGameResult(winner, gameState.turnCount);
    showTurnOverlay(`🎉 ${winner} 승리!`);
    
    setTimeout(() => {
        alert(`🎉 ${winner} 승리!\n적 기지가 파괴되었습니다!\n\n총 턴 수: ${gameState.turnCount}`);
        if (confirm('다시 플레이하시겠습니까?')) {
            initGame();
        }
    }, 1500);
}

// ============================= AI =============================
function aiTurn() {
    let actions = 0;
    const maxActions = 5;
    
    while (gameState.apLeft > 0 && actions < maxActions) {
        const units = getPlayerUnits().filter(u => !u.acted);
        const canBuy = gameState.p2.resources >= 100 && gameState.apLeft > 0;

        // 40% 확률로 유닛 구매
        if (canBuy && Math.random() < 0.4) {
            const cheapUnits = Object.keys(unitData).filter(name => {
                const data = unitData[name];
                const count = gameState.p2.units.filter(u => u.name === name).length;
                return gameState.p2.resources >= data.cost && count < data.limit;
            }).sort((a, b) => unitData[a].cost - unitData[b].cost);
            
            if (cheapUnits.length > 0) {
                buyUnit(cheapUnits[0]);
                cancelSelection();
                actions++;
                continue;
            }
        }

        // 유닛 행동
        if (units.length > 0) {
            const unit = units[Math.floor(Math.random() * units.length)];
            
            // P1 기지 찾기
            const enemyBase = gameState.map.find(n => n.type === 'base' && n.owner === 'P1');
            const distToBase = bfsDistance(unit.position, enemyBase.id);
            
            // 사거리 내면 70% 확률로 공격
            if (distToBase <= unit.range && Math.random() < 0.7) {
                gameState.selectedUnit = unit;
                gameState.selectedTargetId = enemyBase.id;
                attackUnit(unit, enemyBase.id);
                cancelSelection();
                actions++;
                continue;
            }
            
            // 기지 방향으로 이동
            const neighbors = getNeighbors(unit.position);
            const possibleMoves = neighbors.filter(n => bfsDistance(unit.position, n) <= unit.move);
            
            if (possibleMoves.length > 0) {
                // 기지에 가까운 노드 우선
                const target = possibleMoves.sort((a, b) => 
                    bfsDistance(a, enemyBase.id) - bfsDistance(b, enemyBase.id)
                )[0];
                
                gameState.selectedUnit = unit;
                gameState.selectedTargetId = target;
                
                if (Math.random() < 0.6) {
                    moveUnit(unit, target);
                } else {
                    const enemiesInRange = gameState.map[target].units.filter(u => u.owner === 'P1');
                    if (enemiesInRange.length > 0) {
                        attackUnit(unit, target);
                    } else {
                        moveUnit(unit, target);
                    }
                }
                
                cancelSelection();
                actions++;
                continue;
            }
        }
        
        break;
    }
    
    setTimeout(endTurn, 1500);
}

// ============================= 도우미 함수 =============================
function getPlayer() { 
    return gameState.currentPlayer === 'P1' ? gameState.p1 : gameState.p2; 
}

function getEnemyPlayer() { 
    return gameState.currentPlayer === 'P1' ? gameState.p2 : gameState.p1; 
}

function getPlayerUnits() { 
    return getPlayer().units; 
}

function addLog(msg) {
    const li = document.createElement('li');
    li.textContent = `[T${gameState.turnCount}] ${msg}`;
    document.getElementById('log-list').appendChild(li);
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;
}

// ============================= 시작 =============================
window.onload = () => {
    // 로그인 화면 표시 (초기화는 로그인 후)
};
