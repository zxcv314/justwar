// 게임 상태
let currentPlayer = 'P1', turnCount = 1, apLeft = 3;
let p1 = { resources: 200, units: [], baseHP: 10, tactics: [] };
let p2 = { resources: 200, units: [], baseHP: 10, tactics: [] };
let selectedUnit = null;
let selectedTargetId = null;

// 3x3 맵
const mapSize = 3;
const map = [];
for (let row = 0; row < mapSize; row++) {
    for (let col = 0; col < mapSize; col++) {
        const id = row * mapSize + col;
        const terrain = Math.random() < 0.3 ? 'forest' : Math.random() < 0.4 ? 'building' : 'plain';
        map.push({
            id, row, col, type: 'normal', terrain,
            units: [], hellfireRemaining: 0, baseHP: 0, owner: null
        });
    }
}
map[0].type = 'base'; map[0].owner = 'P1'; map[0].baseHP = 10;
map[8].type = 'base'; map[8].owner = 'P2'; map[8].baseHP = 10;

// 유닛 도감
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

// =================================== 초기화 ===================================
function initGame() {
    currentPlayer = Math.random() < 0.5 ? 'P1' : 'P2';
    p1.baseHP = map[0].baseHP = 10;
    p2.baseHP = map[8].baseHP = 10;

    addLog(`${currentPlayer}이 선공입니다! 턴을 시작하세요.`);
    startTurn(); // 턴 시작 처리 통합
}

function startTurn() {
    cancelSelection();
    apLeft = 3;
    getPlayerUnits().forEach(u => u.acted = false);
    createBuyButtons();
    createTacticButtons();
    renderAll();
    updateUI();

    if (currentPlayer === 'P2') {
        setTimeout(aiTurn, 1500);
    }
}

// =================================== 렌더링 ===================================
function renderAll() {
    renderMap();
    renderUnitsList();
    renderMyTactics();
}

function renderMap() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    map.forEach(node => {
        const div = document.createElement('div');
        div.className = `node ${node.terrain}`;
        if (node.type === 'base') div.classList.add('base');

        // 이동 가능 하이라이트
        if (selectedUnit && isMovableTo(selectedUnit, node.id)) {
            div.classList.add('highlight');
        }

        div.innerHTML = `
            <strong>(${node.row},${node.col})</strong><br>
            ${getTerrainIcon(node.terrain)}<br>
            ${node.type === 'base' ? `기지 HP: ${node.baseHP}<br>` : ''}
            ${node.hellfireRemaining > 0 ? `🔥${node.hellfireRemaining}<br>` : ''}
        `;
        node.units.forEach(unit => {
            div.innerHTML += `<div class="unit ${unit.owner.toLowerCase()}">
                ${unit.name}<br>HP: ${unit.hp}${unit.acted ? ' (행동완료)' : ''}
            </div>`;
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

// =================================== 버튼 생성 ===================================
function createBuyButtons() {
    const container = document.getElementById('buy-buttons');
    container.innerHTML = '';
    const player = getPlayer();
    Object.keys(unitData).forEach(name => {
        const data = unitData[name];
        const count = player.units.filter(u => u.name === name).length;
        const btn = document.createElement('button');
        btn.textContent = `${name} (${data.cost}원)`;
        btn.disabled = apLeft < 1 || player.resources < data.cost || count >= data.limit;
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
        btn.textContent = `${name} (${cost}원)`;
        btn.disabled = apLeft < 1 || player.resources < cost;
        btn.onclick = () => buyTactic(name);
        container.appendChild(btn);
    });
}

// =================================== UI 및 도우미 ===================================
function updateUI() {
    document.getElementById('current-player').textContent = currentPlayer;
    document.getElementById('turn-count').textContent = turnCount;
    document.querySelector('#p1-resources span').textContent = p1.resources;
    document.querySelector('#p2-resources span').textContent = p2.resources;
    document.querySelector('#ap-info span').textContent = apLeft;
    document.getElementById('end-turn-btn').onclick = endTurn;
    document.getElementById('end-turn-btn').disabled = false;
}

function renderUnitsList() {
    document.getElementById('p1-units').innerHTML = p1.units.map(u => `<li>${u.name} (노드 ${u.position}, HP ${u.hp})</li>`).join('');
    document.getElementById('p2-units').innerHTML = p2.units.map(u => `<li>${u.name} (노드 ${u.position}, HP ${u.hp})</li>`).join('');
}

function renderMyTactics() {
    const div = document.getElementById('my-tactics');
    div.innerHTML = '';
    getPlayer().tactics.forEach(tactic => {
        const btn = document.createElement('button');
        btn.textContent = `${tactic.name} 사용 (1 AP)`;
        btn.disabled = apLeft < 1;
        btn.onclick = () => {
            const target = parseInt(prompt(`${tactic.name}\n타겟 노드 번호 (0~8):`));
            if (target >= 0 && target <= 8) {
                useTactic(tactic.name, target);
            }
        };
        div.appendChild(btn);
        div.appendChild(document.createElement('br'));
    });
}

function getPlayer() { return currentPlayer === 'P1' ? p1 : p2; }
function getEnemyPlayer() { return currentPlayer === 'P1' ? p2 : p1; }
function getPlayerUnits() { return getPlayer().units; }

function addLog(msg) {
    const li = document.createElement('li');
    li.textContent = `[${currentPlayer}] ${msg}`;
    document.getElementById('log-list').appendChild(li);
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;
}

// =================================== 노드 클릭 및 선택 ===================================
function onNodeClick(id) {
    const node = map[id];
    const myUnitsHere = node.units.filter(u => u.owner === currentPlayer && !u.acted);

    if (selectedUnit) {
        // 이미 선택된 상태 → 타겟 선택
        selectedTargetId = id;
        addLog(`타겟 노드 선택: (${node.row},${node.col})`);
        renderMap();
    } else if (myUnitsHere.length > 0) {
        // 유닛 선택
        selectedUnit = myUnitsHere[0]; // 같은 노드에 여러 유닛 있으면 첫 번째
        document.getElementById('selected-unit-name').textContent = selectedUnit.name;
        document.getElementById('unit-controls').style.display = 'block';
        addLog(`${selectedUnit.name} 선택`);
        renderMap();
    } else {
        // 빈 곳 클릭 → 선택 해제
        cancelSelection();
    }
}

function cancelSelection() {
    selectedUnit = null;
    selectedTargetId = null;
    document.getElementById('unit-controls').style.display = 'none';
    renderMap();
}

// =================================== 행동 실행 ===================================
function performAction(action) {
    if (!selectedUnit || selectedTargetId === null) {
        alert('유닛과 타겟을 선택하세요!');
        return;
    }

    if (action === 'move') moveUnit(selectedUnit, selectedTargetId);
    else if (action === 'attack') attackUnit(selectedUnit, selectedTargetId);
    else if (action === 'special') specialAction(selectedUnit, selectedTargetId);

    cancelSelection();
    updateUI();
}

// =================================== 구매 ===================================
function buyUnit(name) {
    if (apLeft < 1) return alert('AP 부족!');
    const data = unitData[name];
    const player = getPlayer();
    if (player.resources < data.cost) return alert('자원 부족!');
    const count = player.units.filter(u => u.name === name).length;
    if (count >= data.limit) return alert('제한 초과!');

    player.resources -= data.cost;
    const pos = currentPlayer === 'P1' ? 0 : 8;
    const newUnit = { name, ...data, hp: data.hp, position: pos, owner: currentPlayer, acted: false };
    player.units.push(newUnit);
    map[pos].units.push(newUnit);

    apLeft -= 1;
    addLog(`${name} 구매 및 기지에 배치 (AP ${apLeft} 남음)`);
    createBuyButtons(); // 버튼 상태 갱신
    renderAll();
    updateUI();
}

function buyTactic(name) {
    if (apLeft < 1) return alert('AP 부족!');
    const cost = tacticData[name].cost;
    const player = getPlayer();
    if (player.resources < cost) return alert('자원 부족!');
    player.resources -= cost;
    player.tactics.push({ name });
    apLeft -= 1;
    addLog(`${name} 구매 완료`);
    createTacticButtons();
    renderAll();
    updateUI();
}

// =================================== 이동/공격/특수 ===================================
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

function moveUnit(unit, targetId) {
    if (unit.acted || apLeft < 1) return alert('행동 불가!');
    if (!isMovableTo(unit, targetId)) return alert('이동 거리 초과!');

    map[unit.position].units = map[unit.position].units.filter(u => u !== unit);
    unit.position = targetId;
    map[targetId].units.push(unit);
    unit.acted = true;
    apLeft -= 1;
    addLog(`${unit.name} → 노드 ${targetId} 이동`);
    renderAll();
}

function attackUnit(unit, targetId) {
    if (unit.acted || apLeft < 1) return alert('행동 불가!');
    const targetNode = map[targetId];
    const dist = bfsDistance(unit.position, targetId);
    let effRange = getEffectiveRange(unit, targetNode.terrain);

    if (unit.special === 'exactRange3' && dist !== 3) return alert('자주포는 정확히 거리 3이어야 합니다!');
    if (unit.special === 'exactRange3') effRange = 999;

    if (dist > effRange || dist === 0) return alert('사거리 밖!');

    const enemies = targetNode.units.filter(t => t.owner !== currentPlayer && canAttackTarget(unit, t));
    enemies.forEach(t => t.hp -= unit.atk);

    if (targetNode.type === 'base' && targetNode.owner !== currentPlayer) {
        targetNode.baseHP -= unit.atk;
        if (targetNode.owner === 'P1') p1.baseHP = targetNode.baseHP;
        else p2.baseHP = targetNode.baseHP;
        addLog(`적 기지 ${unit.atk} 피해! (남은 HP ${targetNode.baseHP})`);
        if (targetNode.baseHP <= 0) endGame(currentPlayer);
    }

    cleanupDeadUnits();
    unit.acted = true;
    apLeft -= 1;
    addLog(`${unit.name} → 노드 ${targetId} 공격`);
    renderAll();
}

function specialAction(unit, targetId) {
    if (unit.special === 'selfDestruct') {
        const node = map[unit.position];
        applyDamage(node, 2, true); // 피아 구분 없이 2데미지
        getPlayerUnits().splice(getPlayerUnits().indexOf(unit), 1);
        addLog(`${unit.name} 자폭 발동! 주변 2데미지`);
        cancelSelection();
        return;
    }

    if (unit.special === 'moveAttack') {
        // 전투기: 이동 후 도착 지점에서만 공격 (밸런스)
        if (apLeft < 1 || unit.acted) return alert('행동 불가!');
        if (!isMovableTo(unit, targetId)) return alert('이동 불가!');

        // 이동 먼저
        map[unit.position].units = map[unit.position].units.filter(u => u !== unit);
        unit.position = targetId;
        map[targetId].units.push(unit);

        // 도착 지점 공격
        const targetNode = map[targetId];
        targetNode.units.filter(t => t.owner !== currentPlayer && canAttackTarget(unit, t))
            .forEach(t => t.hp -= unit.atk);
        if (targetNode.type === 'base' && targetNode.owner !== currentPlayer) {
            targetNode.baseHP -= unit.atk;
            addLog(`전투기 기지 공격 ${unit.atk} 피해`);
            if (targetNode.baseHP <= 0) endGame(currentPlayer);
        }

        cleanupDeadUnits();
        unit.acted = true;
        apLeft -= 1;
        addLog(`${unit.name} 이동 후 공격 (노드 ${targetId})`);
        renderAll();
        return;
    }

    alert('이 유닛은 특수 행동이 없습니다.');
}

// =================================== 전술 및 기타 ===================================
function useTactic(name, targetNodeId) {
    if (apLeft < 1) return alert('AP 부족!');
    const node = map[targetNodeId];

    if (name === '전술 폭격') {
        const enemy = getEnemyPlayer();
        const hasAA = enemy.units.some(u => u.special === 'antiAir' && bfsDistance(u.position, targetNodeId) <= u.range);
        if (hasAA) {
            addLog('방공포대에 의해 전술 폭격 무효화!');
            return;
        }
        node.units = node.units.filter(u => !u.special || !u.special.includes('bombImmune'));
        addLog(`전술 폭격 발동 → 노드 ${targetNodeId} 유닛 궤멸 (면역 제외)`);
    } else if (name === '헬파이어 폭격') {
        applyDamage(node, 3);
        node.hellfireRemaining = 2;
        addLog(`헬파이어 폭격 → 노드 ${targetNodeId}에 3데미지 + 2턴 지속`);
    }

    apLeft -= 1;
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
        if (node.owner === 'P1') p1.baseHP = node.baseHP;
        else p2.baseHP = node.baseHP;
        if (node.baseHP <= 0) endGame(currentPlayer);
    }
}

function cleanupDeadUnits() {
    p1.units = p1.units.filter(u => u.hp > 0);
    p2.units = p2.units.filter(u => u.hp > 0);
    map.forEach(node => node.units = node.units.filter(u => u.hp > 0));
}

function infantryCommand(action) {
    if (apLeft < 1) return alert('AP 부족!');
    const infantry = getPlayerUnits().filter(u => u.name === '보병 부대' && !u.acted);
    if (infantry.length === 0) return alert('행동 가능한 보병 부대가 없습니다!');

    const target = parseInt(prompt(`보병 부대 전체 ${action === 'move' ? '이동' : '타격'} 타겟 노드 (0~8):`));
    if (isNaN(target) || target < 0 || target > 8) return;

    let successCount = 0;
    infantry.forEach(u => {
        selectedUnit = u;
        selectedTargetId = target;
        if (action === 'move') {
            if (isMovableTo(u, target)) {
                moveUnit(u, target);
                successCount++;
            }
        } else {
            // 공격은 사거리 체크는 attackUnit 내부에서
            attackUnit(u, target);
            if (u.acted) successCount++;
        }
    });

    if (successCount > 0) apLeft -= 1;
    addLog(`보병 부대 전체 명령 (${action}) → ${successCount}/${infantry.length} 성공`);
    cancelSelection();
    createBuyButtons();
    updateUI();
}

// =================================== 턴 종료 및 승리 ===================================
function endTurn() {
    // 헬파이어 지속 피해
    map.forEach(node => {
        if (node.hellfireRemaining > 0) {
            applyDamage(node, 1);
            node.hellfireRemaining--;
            if (node.hellfireRemaining === 0) {
                addLog(`헬파이어 지속 피해 종료 (노드 ${node.id})`);
            }
        }
    });

    getPlayer().resources += 200;
    addLog('턴 종료 → 자원 +200');
    currentPlayer = currentPlayer === 'P1' ? 'P2' : 'P1';
    turnCount++;

    startTurn(); // 다음 턴 시작
}

function endGame(winner) {
    alert(`🎉 ${winner} 승리! 적 기지가 파괴되었습니다!`);
    setTimeout(() => location.reload(), 2000);
}

// =================================== AI ===================================
function aiTurn() {
    let actions = 0;
    while (apLeft > 0 && actions < 5) {  // 무한 루프 방지
        const units = getPlayerUnits().filter(u => !u.acted);
        const canBuy = p2.resources >= 100 && apLeft > 0;  // P2 고정 (AI)

        if (canBuy && Math.random() < 0.5) {
            const cheapUnits = ['보병 부대', '자폭드론'].filter(name => {
                const data = unitData[name];
                const count = p2.units.filter(u => u.name === name).length;
                return p2.resources >= data.cost && count < data.limit;
            });
            if (cheapUnits.length > 0) {
                buyUnit(cheapUnits[Math.floor(Math.random() * cheapUnits.length)]);
                cancelSelection();  // ★★★ 추가 ★★★
                actions++;
                continue;
            }
        }

        if (units.length > 0) {
            const unit = units[Math.floor(Math.random() * units.length)];
            const possibleMoves = getNeighbors(unit.position).filter(n => bfsDistance(unit.position, n) <= unit.move);
            if (possibleMoves.length > 0) {
                const target = possibleMoves.sort((a, b) => a - b)[0];  // P1 방향 우선
                selectedUnit = unit;
                selectedTargetId = target;
                if (Math.random() < 0.6) {
                    moveUnit(unit, target);
                } else {
                    attackUnit(unit, target);
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
// =================================== 시작 ===================================
window.onload = initGame;