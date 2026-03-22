import { DungeonRenderer } from './game/DungeonRenderer'
import Phaser from 'phaser'

type Direction = 0 | 1 | 2 | 3

type Stats = {
  hp: number; maxHp: number; mp: number; maxMp: number
  str: number; vit: number; int: number; agi: number; luck: number
}

type PartyMember = {
  name: string; job: string; race: string; stats: Stats; defending?: boolean
}

type Enemy = { name: string; hp: number; maxHp: number }

type GameState = {
  floor: number; mapSize: number; map: number[][]
  playerX: number; playerY: number; direction: Direction
  party: PartyMember[]; encounterRate: number; battleReturnScene?: string; use3D: boolean
  openedChests: Set<string>
  inventory: InventoryItem[]
}

type InventoryItem = { name: string; type: 'weapon' | 'armor' | 'accessory' | 'potion'; stat: string; value: number; equipped?: boolean }

const WEAPONS = [
  { name: '短剣', type: 'weapon' as const, stat: 'str', value: 3 },
  { name: 'ブロードソード', type: 'weapon' as const, stat: 'str', value: 6 },
  { name: '魔法の杖', type: 'weapon' as const, stat: 'int', value: 5 },
  { name: 'フレイル', type: 'weapon' as const, stat: 'str', value: 8 },
  { name: '魔導書', type: 'weapon' as const, stat: 'int', value: 10 },
]

const ARMORS = [
  { name: '革の鎧', type: 'armor' as const, stat: 'vit', value: 3 },
  { name: 'チェインメイル', type: 'armor' as const, stat: 'vit', value: 5 },
  { name: 'プレートアーマー', type: 'armor' as const, stat: 'vit', value: 8 },
]

const ACCESSORIES = [
  { name: '命の指輪', type: 'accessory' as const, stat: 'maxHp', value: 15 },
  { name: '知恵の首飾り', type: 'accessory' as const, stat: 'maxMp', value: 8 },
  { name: '疾風のブーツ', type: 'accessory' as const, stat: 'agi', value: 5 },
]

const POTIONS = [
  { name: '回復の薬', type: 'potion' as const, stat: 'hp', value: 30 },
  { name: '上回復の薬', type: 'potion' as const, stat: 'hp', value: 60 },
  { name: 'マナの薬', type: 'potion' as const, stat: 'mp', value: 20 },
]

// Special items
const SPECIAL_ITEMS = [
  { name: '帰還の巻物', type: 'scroll' as const, stat: 'teleport', value: 0 },
]

const JOBS = ['ファイター', 'メイジ', 'プリースト', 'シーフ', 'サムライ', 'ビショップ']
const RACES = ['ヒューマン', 'エルフ', 'ドワーフ', 'ノーム']
const NAMES = ['ユウカ', 'ノア', 'アリス', 'ヒマリ', 'コトリ', 'モモイ', 'ミドリ', 'カリン', 'アスナ', 'ネル']
const ENEMY_NAMES = ['スライム', 'ゴブリン', 'スケルトン', 'オーク', 'シャドウ']

// Monster visual definitions: CSS-only creatures with shaking animation
const MONSTER_STYLES: Record<string, { shape: string; color: string; glow: string; shakeIntensity: number; size: number }> = {
  'スライム': { shape: 'blob', color: '#4ade80', glow: '#166534', shakeIntensity: 3, size: 60 },
  'ゴブリン': { shape: 'blocky', color: '#a78bfa', glow: '#4c1d95', shakeIntensity: 5, size: 55 },
  'スケルトン': { shape: 'thin', color: '#e2e8f0', glow: '#475569', shakeIntensity: 2, size: 65 },
  'オーク': { shape: 'big', color: '#f87171', glow: '#7f1d1d', shakeIntensity: 1.5, size: 75 },
  'シャドウ': { shape: 'ghost', color: '#818cf8', glow: '#1e1b4b', shakeIntensity: 4, size: 60 },
}

function monsterHTML(name: string, hpPercent: number, index: number): string {
  const ms = MONSTER_STYLES[name] || MONSTER_STYLES['スライム']
  const shake = hpPercent < 30 ? ms.shakeIntensity * 3 : ms.shakeIntensity
  const opacity = hpPercent < 30 ? 0.5 : 1
  const dur = 0.3 + Math.random() * 0.2
  const delay = index * 0.1

  let shapeCSS = ''
  switch(ms.shape) {
    case 'blob':
      shapeCSS = `width:${ms.size}px;height:${ms.size*0.8}px;background:${ms.color};border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;box-shadow:0 0 20px ${ms.glow},inset 0 -8px 16px rgba(0,0,0,0.3);`
      break
    case 'blocky':
      shapeCSS = `width:${ms.size}px;height:${ms.size*0.9}px;background:${ms.color};border-radius:8px;clip-path:polygon(20% 0%,80% 0%,100% 30%,100% 100%,0% 100%,0% 30%);box-shadow:0 0 15px ${ms.glow};`
      break
    case 'thin':
      shapeCSS = `width:${ms.size*0.6}px;height:${ms.size}px;background:${ms.color};border-radius:30%;box-shadow:0 0 20px ${ms.glow};opacity:0.9;`
      // Skull face
      shapeCSS += `background: linear-gradient(180deg, ${ms.color} 0%, ${ms.color} 100%);`
      break
    case 'big':
      shapeCSS = `width:${ms.size}px;height:${ms.size}px;background:${ms.color};border-radius:12px;box-shadow:0 0 25px ${ms.glow},inset 0 -10px 20px rgba(0,0,0,0.3);`
      break
    case 'ghost':
      shapeCSS = `width:${ms.size}px;height:${ms.size}px;background:${ms.color};border-radius:50% 50% 30% 30%;box-shadow:0 0 25px ${ms.glow};opacity:0.7;`
      break
  }

  // Eyes (common)
  const eyeSize = ms.shape === 'big' ? 8 : 5
  const eyes = `<div style="position:absolute;top:30%;left:30%;width:${eyeSize}px;height:${eyeSize}px;background:#fff;border-radius:50%;box-shadow:${eyeSize+6}px 0 0 #fff;"></div>
    <div style="position:absolute;top:32%;left:32%;width:${eyeSize-2}px;height:${eyeSize-2}px;background:#111;border-radius:50%;box-shadow:${eyeSize+6}px 0 0 #111;"></div>`

  // HP bar
  const hpBar = `<div style="width:100%;max-width:${ms.size}px;height:4px;background:#333;border-radius:2px;margin-top:6px;">
    <div style="width:${hpPercent}%;height:100%;background:${hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#fbbf24' : '#ef4444'};border-radius:2px;transition:width 0.3s;"></div>
  </div>`

  return `
    <div style="display:flex;flex-direction:column;align-items:center;opacity:${opacity};animation:monsterShake${index} ${dur}s ease-in-out ${delay}s infinite alternate;">
      <div style="position:relative;${shapeCSS}animation:monsterPulse 2s ease-in-out infinite;">
        ${eyes}
      </div>
      <div style="font-size:11px;color:#ccc;margin-top:2px;">${name}</div>
      ${hpBar}
    </div>
    <style>
      @keyframes monsterShake${index} {
        0% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(${shake}px, ${-shake/2}px) rotate(${shake/2}deg); }
        50% { transform: translate(${-shake}px, ${shake/2}px) rotate(${-shake/2}deg); }
        75% { transform: translate(${shake/2}px, ${shake}px) rotate(${shake/3}deg); }
        100% { transform: translate(${-shake/2}px, ${-shake}px) rotate(${-shake/3}deg); }
      }
      @keyframes monsterPulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.15); }
      }
    </style>
  `
}

const dirVectors: Record<Direction, { dx: number; dy: number; label: string }> = {
  0: { dx: 0, dy: -1, label: '北' },
  1: { dx: 1, dy: 0, label: '東' },
  2: { dx: 0, dy: 1, label: '南' },
  3: { dx: -1, dy: 0, label: '西' }
}

const gameState: GameState = {
  floor: 1, mapSize: 10, map: [], playerX: 1, playerY: 1, direction: 0,
  party: [], encounterRate: 0.05, use3D: false, openedChests: new Set<string>(), inventory: []
}

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function choice<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)] }

// ====== DOM UI ======
function clearUI() {
  document.querySelectorAll('.gu').forEach(e => e.remove())
}

function overlay(bg = '#0b1020'): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'gu'
  el.style.cssText = `position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:${bg};`
  document.body.appendChild(el)
  return el
}

function btn(label: string, bg: string, cb: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = label
  b.style.cssText = `width:100%;max-width:280px;padding:16px;font-size:20px;border:none;border-radius:12px;background:${bg};color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;margin:6px 0;`
  b.addEventListener('pointerdown', e => { e.preventDefault(); cb() })
  return b
}

// ====== Procedural Textures (Canvas) ======
function seededRng(s: number) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }

function genWall(seed = 42): string {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const x = c.getContext('2d')!; const r = seededRng(seed)
  x.fillStyle = '#2a2420'; x.fillRect(0, 0, 256, 256)
  const bh = 24, bw = 48
  for (let row = 0; row < Math.ceil(256 / bh); row++) {
    const off = (row % 2) * (bw / 2)
    for (let col = -1; col < Math.ceil(256 / bw) + 1; col++) {
      const px = col * bw + off, py = row * bh
      const v = Math.floor(r() * 30 - 15)
      x.fillStyle = `rgb(${38+v},${32+v},${28+v})`; x.fillRect(px + 2, py + 2, bw - 4, bh - 4)
      for (let i = 0; i < 6; i++) {
        const nv = Math.floor(r() * 20 - 10)
        x.fillStyle = `rgba(${50+nv},${42+nv},${38+nv},0.3)`
        x.fillRect(px + 2 + r() * (bw - 4), py + 2 + r() * (bh - 4), 3 + r() * 6, 2 + r() * 4)
      }
      if (r() < 0.12) {
        x.strokeStyle = 'rgba(15,10,8,0.5)'; x.lineWidth = 1; x.beginPath()
        x.moveTo(px + bw * 0.3, py + 2); x.lineTo(px + bw * 0.6, py + bh - 2); x.stroke()
      }
    }
  }
  x.strokeStyle = '#1a1512'; x.lineWidth = 2
  for (let row = 0; row <= Math.ceil(256 / bh); row++) { x.beginPath(); x.moveTo(0, row * bh); x.lineTo(256, row * bh); x.stroke() }
  for (let row = 0; row < Math.ceil(256 / bh); row++) {
    const off = (row % 2) * (bw / 2)
    for (let col = 0; col <= Math.ceil(256 / bw); col++) { const px = col * bw + off; x.beginPath(); x.moveTo(px, row * bh); x.lineTo(px, (row + 1) * bh); x.stroke() }
  }
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 180); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)')
  x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  return c.toDataURL()
}

function genFloor(seed = 99): string {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const x = c.getContext('2d')!; const r = seededRng(seed)
  x.fillStyle = '#222018'; x.fillRect(0, 0, 256, 256)
  const ts = 32
  for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
    const px = tx * ts, py = ty * ts, v = Math.floor(r() * 20 - 10)
    x.fillStyle = `rgb(${30+v},${28+v},${22+v})`; x.fillRect(px + 1, py + 1, ts - 2, ts - 2)
    for (let i = 0; i < 12; i++) { const nv = Math.floor(r() * 15 - 7); x.fillStyle = `rgba(${35+nv},${32+nv},${25+nv},0.4)`; x.fillRect(px + 1 + r() * (ts - 2), py + 1 + r() * (ts - 2), 2 + r() * 3, 1 + r() * 3) }
    x.strokeStyle = '#151210'; x.lineWidth = 1; x.strokeRect(px + 1, py + 1, ts - 2, ts - 2)
  }
  return c.toDataURL()
}

const texWall = genWall()
const texFloor = genFloor()

// ====== Party / Dungeon generation ======
function generateParty(): PartyMember[] {
  const used = new Set<string>(); const party: PartyMember[] = []
  for (let i = 0; i < 6; i++) {
    let name = choice(NAMES); while (used.has(name)) name = choice(NAMES); used.add(name)
    const hp = randInt(35, 55), mp = randInt(10, 25)
    party.push({ name, job: JOBS[i % JOBS.length], race: choice(RACES), stats: { hp, maxHp: hp, mp, maxMp: mp, str: randInt(6, 15), vit: randInt(6, 15), int: randInt(6, 15), agi: randInt(6, 15), luck: randInt(6, 15) } })
  }
  return party
}

function generateDungeon(size: number) {
  const map: number[][] = Array.from({ length: size }, () => Array(size).fill(0))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!(x === 0 || y === 0 || x === size - 1 || y === size - 1)) map[y][x] = Math.random() < 0.72 ? 1 : 0
  const sx = randInt(1, size - 2), sy = randInt(1, size - 2); map[sy][sx] = 1
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]]; let cx = sx, cy = sy
  for (let i = 0; i < size * size; i++) {
    map[cy][cx] = 1; const [dx, dy] = choice(dirs)
    cx = Math.max(1, Math.min(size - 2, cx + dx)); cy = Math.max(1, Math.min(size - 2, cy + dy)); map[cy][cx] = 1
  }
  let stx = randInt(1, size - 2), sty = randInt(1, size - 2)
  while ((stx === sx && sty === sy) || map[sty][stx] === 0) { stx = randInt(1, size - 2); sty = randInt(1, size - 2) }
  map[sty][stx] = 2
  // Place 2-4 treasure chests on path cells
  const numChests = randInt(2, 4)
  for (let i = 0; i < numChests; i++) {
    let tx = randInt(1, size - 2), ty = randInt(1, size - 2)
    let tries = 0
    while ((map[ty][tx] !== 1 || (tx === sx && ty === sy) || (tx === stx && ty === sty)) && tries < 50) {
      tx = randInt(1, size - 2); ty = randInt(1, size - 2); tries++
    }
    if (tries < 50) map[ty][tx] = 3 // 3 = treasure chest
  }
  return { map, startX: sx, startY: sy }
}

function resetDungeon(floor = 1) {
  const g = generateDungeon(gameState.mapSize)
  gameState.floor = floor; gameState.map = g.map; gameState.playerX = g.startX; gameState.playerY = g.startY; gameState.direction = 0
}

// ====== TITLE ======
class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene') }
  create() {
    this.cameras.main.setBackgroundColor('#0b1020')
    clearUI()
    const o = overlay('radial-gradient(ellipse at center, #1a2544 0%, #0b1020 100%)')
    const t = document.createElement('div'); t.textContent = 'セミナー・ダンジョン'; t.style.cssText = 'font-size:clamp(32px,8vw,56px);color:#d6e4ff;margin-bottom:40px;text-shadow:0 0 20px rgba(100,150,255,0.5);'
    o.appendChild(t)
    o.appendChild(btn('冒険を始める', '#3659b8', () => { if (!gameState.party.length) gameState.party = generateParty(); resetDungeon(1); o.remove(); this.scene.start('TownScene') }))
    const s = document.createElement('div'); s.textContent = 'キーボード or タッチで操作'; s.style.cssText = 'margin-top:20px;font-size:14px;color:#6a7baa;'
    o.appendChild(s)
  }
}

// ====== TOWN ======
class TownScene extends Phaser.Scene {
  constructor() { super('TownScene') }
  create() {
    this.cameras.main.setBackgroundColor('#102015')
    clearUI()
    const o = overlay('radial-gradient(ellipse at center, #1a3525 0%, #102015 100%)')
    const t = document.createElement('div'); t.textContent = '城下町 - セミナー支部'; t.style.cssText = 'font-size:clamp(24px,6vw,40px);color:#d7ffe0;margin-bottom:12px;'
    o.appendChild(t)
    const d = document.createElement('div'); d.textContent = '準備を整えてダンジョンへ'; d.style.cssText = 'font-size:16px;color:#8bc89a;margin-bottom:8px;'
    o.appendChild(d)
    const log = document.createElement('div'); log.style.cssText = 'font-size:14px;color:#d7ffe0;margin-bottom:16px;min-height:24px;'
    o.appendChild(log)
    o.appendChild(btn('宿屋で全回復（無料）', '#2f8f58', () => {
      const wasHurt = gameState.party.some(m => m.stats.hp < m.stats.maxHp || m.stats.mp < m.stats.maxMp)
      gameState.party.forEach(m => { m.stats.hp = m.stats.maxHp; m.stats.mp = m.stats.maxMp })
      log.textContent = wasHurt ? '✨ 全員のHP/MPが全回復した！' : 'みんな元気だ！'
    }))
    o.appendChild(btn('パーティ確認', '#3a4c80', () => { o.remove(); this.scene.start('PartyScene', { returnScene: 'TownScene' }) }))
    o.appendChild(btn('探索開始', '#4a4cb0', () => { o.remove(); this.scene.start('DungeonScene') }))
  }
}

// ====== PARTY ======
class PartyScene extends Phaser.Scene {
  constructor() { super('PartyScene') }
  create(data: { returnScene?: string }) {
    const ret = data?.returnScene ?? 'TownScene'
    this.cameras.main.setBackgroundColor('#1a1f34')
    clearUI()
    const o = overlay('#1a1f34'); o.style.justifyContent = 'flex-start'; o.style.padding = '40px 16px'; o.style.overflowY = 'auto'
    const t = document.createElement('div'); t.textContent = 'パーティステータス'; t.style.cssText = 'font-size:24px;color:#e8efff;margin-bottom:20px;position:sticky;top:0;background:#1a1f34;padding-bottom:8px;z-index:1;'
    o.appendChild(t)
    // Inventory section
    const invTitle = document.createElement('div'); invTitle.textContent = '📦 所持品'; invTitle.style.cssText = 'font-size:16px;color:#ffd700;margin:16px 0 8px;font-weight:bold;'
    o.appendChild(invTitle)
    if (gameState.inventory.length === 0) {
      const empty = document.createElement('div'); empty.textContent = '（なし）'; empty.style.cssText = 'color:#666;font-size:13px;margin-bottom:8px;'
      o.appendChild(empty)
    } else {
      const invList = document.createElement('div'); invList.style.cssText = 'width:100%;max-width:360px;margin-bottom:12px;'
      gameState.inventory.forEach((item, i) => {
        const typeEmoji = item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'accessory' ? '💍' : '🧪'
        const el = document.createElement('div'); el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;font-size:13px;'
        el.innerHTML = `<span>${typeEmoji}</span><span style="color:#fff;flex:1;">${item.name}</span><span style="color:#4ade80;font-size:11px;">${item.stat}+${item.value}</span>`
        invList.appendChild(el)
      })
      o.appendChild(invList)
    }
    // Party members
    const ptTitle = document.createElement('div'); ptTitle.textContent = '👥 メンバー'; ptTitle.style.cssText = 'font-size:16px;color:#e8efff;margin:12px 0 8px;font-weight:bold;'
    o.appendChild(ptTitle)
    gameState.party.forEach((m, i) => {
      const card = document.createElement('div'); card.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;margin-bottom:8px;width:100%;max-width:360px;'
      const hp = Math.round(m.stats.hp / m.stats.maxHp * 100)
      card.innerHTML = `<div style="font-size:16px;color:#fff;font-weight:bold;">${i + 1}. ${m.name} <span style="font-size:12px;color:#8899bb;">${m.job} / ${m.race}</span></div><div style="margin-top:6px;font-size:13px;"><span style="color:#ff8888;">HP</span> ${m.stats.hp}/${m.stats.maxHp} <span style="margin-left:12px;color:#8888ff;">MP</span> ${m.stats.mp}/${m.stats.maxMp}</div><div style="margin-top:4px;background:#333;border-radius:4px;height:8px;overflow:hidden;"><div style="width:${hp}%;height:100%;background:${hp > 50 ? '#4caf50' : hp > 25 ? '#ff9800' : '#f44336'};border-radius:4px;"></div></div><div style="margin-top:4px;font-size:11px;color:#8899bb;">STR ${m.stats.str} | VIT ${m.stats.vit} | INT ${m.stats.int} | AGI ${m.stats.agi} | LUCK ${m.stats.luck}</div>`
      o.appendChild(card)
    })
    o.appendChild(btn('戻る', '#3a3a5c', () => { o.remove(); this.scene.start(ret) }))
  }
}

// ====== DUNGEON (2D first-person + optional 3D) ======
class DungeonScene extends Phaser.Scene {
  private isMoving = false
  private viewEl!: HTMLDivElement
  private infoEl!: HTMLDivElement
  private logEl!: HTMLDivElement
  private floorEl!: HTMLDivElement
  private minimapEl!: HTMLDivElement
  private use3D = false
  private container3d: HTMLDivElement | null = null
  private renderer3d: any = null

  constructor() { super('DungeonScene') }

  create() {
    this.use3D = gameState.use3D
    this.cameras.main.setBackgroundColor('#000')
    clearUI()

    // Build entire dungeon UI as single overlay
    const o = overlay('#000')
    o.style.justifyContent = 'flex-start'
    o.id = 'dungeon-main'

    // Top bar
    const top = document.createElement('div')
    top.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-start;'
    this.floorEl = document.createElement('div')
    this.floorEl.style.cssText = 'background:rgba(0,0,0,0.7);color:#e6eeff;font-size:16px;font-weight:bold;padding:4px 10px;border-radius:6px;'
    this.infoEl = document.createElement('div')
    this.infoEl.style.cssText = 'background:rgba(0,0,0,0.7);color:#a9b8dd;font-size:12px;padding:4px 10px;border-radius:6px;'
    const leftCol = document.createElement('div')
    leftCol.appendChild(this.floorEl); leftCol.appendChild(this.infoEl)
    top.appendChild(leftCol)

    // Minimap
    this.minimapEl = document.createElement('div')
    this.minimapEl.style.cssText = 'background:rgba(0,0,0,0.8);border:1px solid #334;padding:4px;border-radius:6px;'
    top.appendChild(this.minimapEl)

    // 3D toggle
    const toggleBtn = document.createElement('button')
    toggleBtn.textContent = this.use3D ? '3D' : '2D'
    toggleBtn.style.cssText = 'background:rgba(68,136,255,0.6);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;'
    toggleBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      gameState.use3D = !gameState.use3D
      this.use3D = gameState.use3D
      toggleBtn.textContent = this.use3D ? '3D' : '2D'
      if (this.use3D) this.init3D(); else this.destroy3D()
      this.renderView()
    })
    const rightCol = document.createElement('div')
    rightCol.style.cssText = 'display:flex;gap:6px;align-items:center;'
    rightCol.appendChild(this.minimapEl)
    rightCol.appendChild(toggleBtn)
    top.appendChild(rightCol)

    // Log
    this.logEl = document.createElement('div')
    this.logEl.style.cssText = 'position:fixed;top:50px;left:8px;max-width:45%;background:rgba(0,10,20,0.85);color:#9ed1ff;font-size:12px;padding:6px 10px;border-radius:6px;z-index:1001;'
    this.logEl.textContent = '探索を開始。'
    document.body.appendChild(this.logEl)

    o.appendChild(top)

    // Main view (wall image)
    this.viewEl = document.createElement('div')
    this.viewEl.style.cssText = 'width:100%;max-width:500px;aspect-ratio:1/1;margin:4px auto;position:relative;overflow:hidden;border-radius:8px;'
    o.appendChild(this.viewEl)

    // Bottom pad
    const pad = document.createElement('div')
    pad.style.cssText = 'display:grid;grid-template-columns:70px 70px 70px;grid-template-rows:70px 70px;gap:6px;margin:auto auto 20px;'
    const actions: [string, string, number, number][] = [
      ['↑', 'up', 1, 0], ['📋', 'menu', 2, 0],
      ['←', 'left', 0, 1], ['↓', 'down', 1, 1], ['→', 'right', 2, 1],
    ]
    actions.forEach(([label, action, col, row]) => {
      const b = document.createElement('button')
      b.textContent = label; b.style.cssText = 'width:70px;height:70px;font-size:22px;border:none;border-radius:14px;background:rgba(68,136,255,0.75);color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;display:flex;align-items:center;justify-content:center;'
      b.addEventListener('pointerdown', e => {
        e.preventDefault()
        if (action === 'up') this.move(1)
        else if (action === 'down') this.move(-1)
        else if (action === 'left') this.rotate(-1)
        else if (action === 'right') this.rotate(1)
        else if (action === 'menu') { o.remove(); this.logEl.remove(); this.scene.start('PartyScene', { returnScene: 'DungeonScene' }) }
      })
      b.style.gridColumn = String(col + 1); b.style.gridRow = String(row + 1)
      pad.appendChild(b)
    })

    // Item button row
    const itemRow = document.createElement('div')
    itemRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:16px;'
    const useBtn = document.createElement('button')
    useBtn.textContent = '🎒 アイテム'
    useBtn.style.cssText = 'padding:10px 20px;font-size:13px;border:none;border-radius:10px;background:rgba(156,39,176,0.7);color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;'
    useBtn.addEventListener('pointerdown', e => { e.preventDefault(); this.openItemMenu() })
    itemRow.appendChild(useBtn)
    o.appendChild(itemRow)
    o.appendChild(pad)

    this.bindKeys()
    // Always reset 3D state on scene create (container may have been orphaned by clearUI)
    this.container3d = null
    this.renderer3d = null
    if (this.use3D) this.init3D()
    this.renderView()
  }

  private init3D() {
    if (this.container3d) return
    const o = document.getElementById('dungeon-main')
    if (!o) return
    this.container3d = document.createElement('div')
    this.container3d.style.cssText = 'width:100%;max-width:500px;aspect-ratio:16/9;margin:4px auto;position:relative;overflow:hidden;border-radius:8px;'
    this.renderer3d = new DungeonRenderer(this.container3d)
    this.renderer3d.scaleTo(500, 281)
    o.insertBefore(this.container3d, this.viewEl.nextSibling)
  }

  private destroy3D() {
    if (this.renderer3d) { this.renderer3d.destroy(); this.renderer3d = null }
    if (this.container3d) { this.container3d.remove(); this.container3d = null }
  }

  private bindKeys() {
    const k = this.input.keyboard; if (!k) return
    k.on('keydown-UP', () => this.move(1)); k.on('keydown-DOWN', () => this.move(-1))
    k.on('keydown-LEFT', () => this.rotate(-1)); k.on('keydown-RIGHT', () => this.rotate(1))
    k.on('keydown-Q', () => this.rotate(-1)); k.on('keydown-E', () => this.rotate(1))
    k.on('keydown-P', () => { this.destroy3D(); this.logEl.remove(); this.scene.start('PartyScene', { returnScene: 'DungeonScene' }) })
  }

  private rotate(delta: number) {
    if (this.isMoving) return
    gameState.direction = (((gameState.direction + delta) % 4) + 4) % 4 as Direction
    this.logEl.textContent = `向き: ${dirVectors[gameState.direction].label}`
    this.renderView()
  }

  private move(step: 1 | -1) {
    if (this.isMoving) return
    const v = dirVectors[gameState.direction]
    const nx = gameState.playerX + v.dx * step, ny = gameState.playerY + v.dy * step
    const tile = gameState.map[ny]?.[nx] ?? 0
    if (tile === 0) { this.logEl.textContent = '壁だ。'; return }
    gameState.playerX = nx; gameState.playerY = ny
    if (tile === 2) { this.logEl.textContent = '階段！次の階層へ…'; resetDungeon(gameState.floor + 1); this.renderView(); return }
    // Treasure chest
    if (tile === 3) {
      const key = `${nx},${ny}`
      if (!gameState.openedChests.has(key)) {
        gameState.openedChests.add(key)
        gameState.map[ny][nx] = 1 // Open chest → becomes path
        // Generate loot based on floor
        const loot = this.generateLoot()
        gameState.inventory.push(loot)
        this.logEl.textContent = `宝箱！${loot.name}を手に入れた！`
        // Flash effect
        this.showTreasurePopup(loot)
      } else {
        this.logEl.textContent = '（空の宝箱）'
      }
      this.renderView(); return
    }
    if (Math.random() < gameState.encounterRate) { gameState.battleReturnScene = 'DungeonScene'; this.scene.start('BattleScene'); return }
    this.logEl.textContent = '進んだ。'; this.renderView()
  }

  private generateLoot(): InventoryItem {
    const floorBonus = gameState.floor
    const roll = Math.random()
    if (roll < 0.15) {
      // Scroll (rare, very useful)
      const s = SPECIAL_ITEMS[0]
      return { ...s }
    } else if (roll < 0.35) {
      // Potion
      const p = choice(POTIONS)
      return { ...p, value: p.value + Math.floor(floorBonus * 2) }
    } else if (roll < 0.65) {
      // Weapon
      const w = choice(WEAPONS)
      return { ...w, value: w.value + Math.floor(floorBonus * 1.5) }
    } else if (roll < 0.85) {
      // Armor
      const a = choice(ARMORS)
      return { ...a, value: a.value + Math.floor(floorBonus * 1.5) }
    } else {
      // Accessory
      const ac = choice(ACCESSORIES)
      return { ...ac, value: ac.value + Math.floor(floorBonus) }
    }
  }

  private showTreasurePopup(item: InventoryItem) {
    const popup = document.createElement('div')
    popup.className = 'gu'
    popup.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);animation:fadeIn 0.3s;'
    const typeEmoji = item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'accessory' ? '💍' : item.type === 'scroll' ? '📜' : '🧪'
    popup.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid ${item.type === 'scroll' ? '#00bcd4' : '#ffd700'};border-radius:12px;padding:24px;text-align:center;max-width:280px;box-shadow:0 0 30px ${item.type === 'scroll' ? 'rgba(0,188,212,0.3)' : 'rgba(255,215,0,0.3)'};">
        <div style="font-size:40px;margin-bottom:8px;">${typeEmoji}</div>
        <div style="color:${item.type === 'scroll' ? '#00bcd4' : '#ffd700'};font-size:18px;font-weight:bold;margin-bottom:4px;">${item.name}</div>
        <div style="color:#aaa;font-size:12px;margin-bottom:8px;">${item.type === 'potion' ? '消耗品' : item.type === 'weapon' ? '武器' : item.type === 'armor' ? '防具' : item.type === 'scroll' ? '巻物' : 'アクセサリー'}</div>
        ${item.type !== 'scroll' ? `<div style="color:#4ade80;font-size:13px;">${item.stat} +${item.value}</div>` : '<div style="color:#80deea;font-size:13px;">町へ一瞬で帰還</div>'}
        <button style="margin-top:16px;background:${item.type === 'scroll' ? '#00bcd4' : '#ffd700'};color:#000;border:none;border-radius:6px;padding:8px 24px;font-size:14px;font-weight:bold;cursor:pointer;">OK</button>
      </div>
      <style>@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }</style>
    `
    document.body.appendChild(popup)
    popup.querySelector('button')!.addEventListener('click', () => popup.remove())
    setTimeout(() => { if (popup.parentNode) popup.remove() }, 4000)
  }

  private openItemMenu() {
    const usable = gameState.inventory.filter(i => i.type === 'potion' || i.type === 'scroll')
    if (usable.length === 0) { this.logEl.textContent = '使えるアイテムがない。'; return }

    const modal = document.createElement('div')
    modal.className = 'gu'
    modal.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);'
    const panel = document.createElement('div')
    panel.style.cssText = 'background:#1a1f34;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;max-width:320px;width:90%;max-height:70vh;overflow-y:auto;'
    const title = document.createElement('div')
    title.textContent = '🎒 アイテム'
    title.style.cssText = 'font-size:18px;color:#fff;font-weight:bold;margin-bottom:12px;text-align:center;'
    panel.appendChild(title)

    usable.forEach((item) => {
      const typeEmoji = item.type === 'scroll' ? '📜' : '🧪'
      const el = document.createElement('div')
      el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;cursor:pointer;transition:background 0.2s;'
      const desc = item.type === 'scroll' ? '町へ帰還' : `${item.name} (${item.stat}+${item.value})`
      el.innerHTML = `<span style="font-size:20px;">${typeEmoji}</span><span style="color:#fff;flex:1;font-size:13px;">${desc}</span><span style="color:#4ade80;font-size:11px;">使用</span>`
      el.addEventListener('pointerdown', () => {
        const realIdx = gameState.inventory.indexOf(item)
        if (realIdx === -1) return
        gameState.inventory.splice(realIdx, 1)
        if (item.type === 'scroll') {
          this.logEl.textContent = '帰還の巻物を使った！'
          gameState.party.forEach(m => { m.stats.hp = Math.min(m.stats.maxHp, m.stats.hp + Math.floor(m.stats.maxHp * 0.3)) })
          modal.remove()
          this.time.delayedCall(600, () => { document.querySelectorAll('.gu').forEach(e => e.remove()); this.logEl.remove(); this.scene.start('TownScene') })
        } else if (item.type === 'potion') {
          const target = [...gameState.party].sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0]
          if (item.stat === 'hp') {
            const heal = Math.min(item.value, target.stats.maxHp - target.stats.hp)
            target.stats.hp += heal
            this.logEl.textContent = `${target.name}に${item.name}！HP+${heal}`
          } else if (item.stat === 'mp') {
            const restore = Math.min(item.value, target.stats.maxMp - target.stats.mp)
            target.stats.mp += restore
            this.logEl.textContent = `${target.name}に${item.name}！MP+${restore}`
          }
          modal.remove()
        }
      })
      el.addEventListener('pointerenter', () => el.style.background = 'rgba(255,255,255,0.1)')
      el.addEventListener('pointerleave', () => el.style.background = 'rgba(255,255,255,0.05)')
      panel.appendChild(el)
    })

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '閉じる'
    closeBtn.style.cssText = 'width:100%;margin-top:12px;padding:10px;background:rgba(255,255,255,0.1);color:#ccc;border:none;border-radius:8px;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('pointerdown', () => modal.remove())
    panel.appendChild(closeBtn)

    modal.appendChild(panel)
    document.body.appendChild(modal)
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) modal.remove() })
  }

  private renderView() {
    const v = dirVectors[gameState.direction]
    const fx = gameState.playerX + v.dx, fy = gameState.playerY + v.dy
    const front = gameState.map[fy]?.[fx] ?? 0

    if (this.use3D && this.renderer3d) {
      // 3D mode
      this.viewEl.style.display = 'none'
      this.container3d!.style.display = ''
      this.renderer3d.render(gameState.map, gameState.playerX, gameState.playerY, gameState.direction)
      const c3 = this.container3d!
      // Show stairs indicator
      const old = c3.querySelector('.stairs-indicator')
      if (old) old.remove()
      if (front === 2) {
        const ind = document.createElement('div')
        ind.className = 'stairs-indicator'
        ind.style.cssText = 'position:absolute;bottom:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#5c8f40;font-size:16px;padding:8px 16px;border-radius:8px;border:1px solid #5c8f40;z-index:200;'
        ind.textContent = '▼ 階段'
        c3.appendChild(ind)
      } else if (front === 3) {
        const isOpen = gameState.openedChests.has(`${fx},${fy}`)
        const ind = document.createElement('div')
        ind.className = 'treasure-indicator'
        ind.style.cssText = `position:absolute;bottom:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:${isOpen ? '#5a4a3a' : '#ffd700'};font-size:16px;padding:8px 16px;border-radius:8px;border:1px solid ${isOpen ? '#5a4a3a' : '#ffd700'};z-index:200;`
        ind.textContent = isOpen ? '📦 空' : '📦 宝箱'
        c3.appendChild(ind)
      }
    } else {
      // 2D mode
      this.viewEl.style.display = ''
      if (this.container3d) this.container3d.style.display = 'none'

      let html = ''
      if (front === 0) {
        // Wall in front (0 = wall block)
        html = `<div style="width:100%;height:100%;background:url(${texWall}) center/cover;image-rendering:pixelated;"></div>`
      } else {
        // Corridor / stairs in front (1 = path, 2 = stairs)
        const isStairs = front === 2
        // Check side walls (0 = wall)
        const lx = gameState.playerX + dirVectors[((gameState.direction + 3) % 4) as Direction].dx
        const ly = gameState.playerY + dirVectors[((gameState.direction + 3) % 4) as Direction].dy
        const rx = gameState.playerX + dirVectors[((gameState.direction + 1) % 4) as Direction].dx
        const ry = gameState.playerY + dirVectors[((gameState.direction + 1) % 4) as Direction].dy
        const lw = gameState.map[ly]?.[lx] ?? 0
        const rw = gameState.map[ry]?.[rx] ?? 0

        // Check 2 cells ahead for the far wall (0 = wall)
        const f2x = fx + v.dx, f2y = fy + v.dy
        const f2 = gameState.map[f2y]?.[f2x] ?? 0

        // Draw corridor with perspective using CSS clip-path trapezoids
        const ceilH = 18, floorH = 18
        const nearWall = 22, farWall = 42

        // Ceiling
        html += `<div style="position:absolute;top:0;left:0;right:0;height:${ceilH}%;background:linear-gradient(180deg,#0a0806,#151210);"></div>`
        // Floor
        html += `<div style="position:absolute;bottom:0;left:0;right:0;height:${floorH}%;background:url(${texFloor}) center/cover;image-rendering:pixelated;"></div>`

        // Left wall (show if side IS wall = 0)
        if (lw === 0) {
          html += `<div style="position:absolute;top:${ceilH}%;bottom:${floorH}%;left:0;right:50%;
            background:url(${texWall}) center/cover;image-rendering:pixelated;
            clip-path:polygon(0 0, ${100-nearWall}% 0, ${100-farWall}% 100%, 0 100%);
          "></div>`
        }
        // Right wall
        if (rw === 0) {
          html += `<div style="position:absolute;top:${ceilH}%;bottom:${floorH}%;left:50%;right:0;
            background:url(${texWall}) center/cover;image-rendering:pixelated;
            clip-path:polygon(${nearWall}% 0, 100% 0, 100% 100%, ${farWall}% 100%);
          "></div>`
        }

        // Far wall (end of corridor = 0)
        if (f2 === 0) {
          html += `<div style="position:absolute;top:${ceilH}%;bottom:${floorH}%;left:${farWall}%;right:${farWall}%;
            background:url(${texWall}) center/cover;image-rendering:pixelated;
          "></div>`
        } else {
          // Open ahead
          html += `<div style="position:absolute;top:${ceilH}%;bottom:${floorH}%;left:${farWall}%;right:${farWall}%;
            background:radial-gradient(ellipse at 50% 50%, #1a1510, #0a0806);
          "></div>`
        }

        // Vignette
        html += `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.8) 100%);pointer-events:none;"></div>`

        if (isStairs) html += `<div style="position:absolute;bottom:25%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#5c8f40;font-size:16px;padding:8px 16px;border-radius:8px;border:1px solid #5c8f40;z-index:10;">▼ 階段</div>`
        if (front === 3) {
          const isOpen = gameState.openedChests.has(`${fx},${fy}`)
          html += `<div style="position:absolute;bottom:30%;left:50%;transform:translateX(-50%);z-index:10;">
            <div style="width:48px;height:36px;background:${isOpen ? '#5a4a3a' : '#d4a017'};border:2px solid ${isOpen ? '#3a2a1a' : '#ffd700'};border-radius:4px;position:relative;box-shadow:0 0 ${isOpen ? '5px' : '15px'} ${isOpen ? '#2a1a0a' : 'rgba(255,215,0,0.5)'};">
              ${!isOpen ? `<div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:20px;height:8px;background:#ffd700;border-radius:2px 2px 0 0;"></div>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;background:#fff;border-radius:50%;box-shadow:0 0 5px #ffd700;"></div>` : ''}
            </div>
            <div style="color:${isOpen ? '#666' : '#ffd700'};font-size:11px;text-align:center;margin-top:2px;">${isOpen ? '空の箱' : '📦 宝箱'}</div>
          </div>`
        }
      }
      this.viewEl.innerHTML = html
    }

    this.floorEl.textContent = `B${gameState.floor}F`
    this.infoEl.textContent = `(${gameState.playerX},${gameState.playerY}) ${dirVectors[gameState.direction].label}`
    this.drawMinimap()
  }

  private drawMinimap() {
    const size = gameState.mapSize; const cell = Math.max(4, Math.floor(80 / size))
    let svg = `<svg width="${cell * size}" height="${cell * size}" style="display:block;">`
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const t = gameState.map[y][x]; const ck = `${x},${y}`; const c = t === 0 ? '#1f2433' : t === 2 ? '#5c8f40' : t === 3 && gameState.openedChests.has(ck) ? '#5a4a3a' : t === 3 ? '#ffd700' : '#9aa6bf'
      svg += `<rect x="${x * cell}" y="${y * cell}" width="${cell - 1}" height="${cell - 1}" fill="${c}"/>`
    }
    const px = gameState.playerX * cell + cell / 2, py = gameState.playerY * cell + cell / 2
    svg += `<circle cx="${px}" cy="${py}" r="${Math.max(2, cell / 2.5)}" fill="#ffd166"/>`
    const dv = dirVectors[gameState.direction]
    svg += `<line x1="${px}" y1="${py}" x2="${px + dv.dx * cell * 0.8}" y2="${py + dv.dy * cell * 0.8}" stroke="#ff7b7b" stroke-width="2"/>`
    svg += '</svg>'
    this.minimapEl.innerHTML = svg
  }
}

// ====== BATTLE ======
class BattleScene extends Phaser.Scene {
  private enemies: Enemy[] = []
  private logLines: string[] = []
  private logEl!: HTMLDivElement
  private enemyEl!: HTMLDivElement
  private partyEl!: HTMLDivElement

  constructor() { super('BattleScene') }
  create() {
    this.cameras.main.setBackgroundColor('#220c0c')
    clearUI()
    this.enemies = Array.from({ length: randInt(1, 3) }, () => { const hp = randInt(10, 20); return { name: choice(ENEMY_NAMES), hp, maxHp: hp } })
    const o = overlay('#1a0808'); o.style.justifyContent = 'space-between'; o.style.padding = '12px'
    const top = document.createElement('div'); top.style.cssText = 'width:100%;max-width:400px;'
    const title = document.createElement('div'); title.textContent = '⚔️ 戦闘開始！'; title.style.cssText = 'font-size:20px;color:#ffd0d0;text-align:center;margin-bottom:8px;'; top.appendChild(title)
    this.enemyEl = document.createElement('div'); this.enemyEl.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;margin-bottom:8px;'; top.appendChild(this.enemyEl)
    this.partyEl = document.createElement('div'); this.partyEl.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;'; top.appendChild(this.partyEl)
    this.logEl = document.createElement('div'); this.logEl.style.cssText = 'flex:1;width:100%;max-width:400px;background:rgba(0,0,0,0.4);border-radius:8px;padding:10px 12px;font-size:14px;color:#ffdede;overflow-y:auto;margin:8px 0;'
    o.appendChild(top); o.appendChild(this.logEl)
    const bb = document.createElement('div'); bb.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:400px;'
    bb.appendChild(btn('⚔️ 攻撃', '#7d2a2a', () => this.playerAttack()))
    bb.appendChild(btn('🛡️ 防御', '#2a4a7d', () => this.playerDefend()))
    bb.appendChild(btn('✨ 魔法', '#5a2a7d', () => this.playerMagic()))
    bb.appendChild(btn('🏃 逃走', '#4a4a4a', () => this.playerEscape()))
    o.appendChild(bb)
    this.refreshUI(); this.pushLog('敵が現れた！')
  }

  private refreshUI() {
    // Monster visuals
    this.enemyEl.innerHTML = `<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;padding:12px 0;">
      ${this.enemies.map((e, i) => monsterHTML(e.name, Math.round(e.hp / e.maxHp * 100), i)).join('')}
    </div>`
    this.partyEl.innerHTML = gameState.party.map((m, i) => `<div style="color:#c8e0ff;font-size:12px;">${i + 1}.${m.name} <span style="color:#ff8888;">HP${m.stats.hp}</span> <span style="color:#8888ff;">MP${m.stats.mp}</span></div>`).join('')
  }

  private pushLog(msg: string) { this.logLines.push(msg); if (this.logLines.length > 8) this.logLines.shift(); this.logEl.textContent = this.logLines.join('\n'); this.logEl.scrollTop = this.logEl.scrollHeight }
  private living() { return this.enemies.filter(e => e.hp > 0) }

  private playerAttack() { const t = choice(this.living()); if (!t) return; const a = gameState.party.reduce((s, m) => s + randInt(1, Math.max(2, m.stats.str / 2)), 0); const d = Math.max(1, Math.floor(a / 3)); t.hp = Math.max(0, t.hp - d); this.pushLog(`攻撃！${t.name}に${d}ダメージ。`); this.refreshUI(); this.after() }
  private playerDefend() { gameState.party.forEach(m => m.defending = true); this.pushLog('防御体勢。'); this.after() }
  private playerMagic() {
    const caster = gameState.party.find(m => m.stats.hp > 0 && m.stats.mp >= 3)
    if (!caster) { this.pushLog('MP不足！'); return }
    // Check if party needs healing
    const hurt = gameState.party.find(m => m.stats.hp > 0 && m.stats.hp < m.stats.maxHp)
    if (hurt && Math.random() < 0.5) {
      // Heal
      caster.stats.mp -= 3
      const heal = randInt(10, 20) + Math.floor(caster.stats.int / 2)
      const actual = Math.min(heal, hurt.maxHp - hurt.stats.hp)
      hurt.stats.hp += actual
      this.pushLog(`${caster.name}の回復魔法！${hurt.name}のHP+${actual}！`)
    } else {
      // Attack magic
      caster.stats.mp -= 3
      const t = choice(this.living()); if (!t) return
      const d = randInt(8, 16) + Math.floor(caster.stats.int / 3)
      t.hp = Math.max(0, t.hp - d)
      this.pushLog(`${caster.name}の攻撃魔法！${t.name}に${d}ダメージ。`)
    }
    this.refreshUI(); this.after()
  }
  private playerEscape() { if (Math.random() < 0.5) { this.pushLog('逃走成功！'); this.time.delayedCall(600, () => this.back()) } else { this.pushLog('逃走失敗！'); this.enemyTurn() } }

  private after() { this.refreshUI(); if (!this.living().length) { this.pushLog('全滅！'); this.time.delayedCall(800, () => this.back()); return } this.enemyTurn() }
  private enemyTurn() {
    const alive = gameState.party.filter(m => m.stats.hp > 0)
    if (!alive.length) { this.pushLog('全滅…町へ。'); this.time.delayedCall(1200, () => { gameState.party.forEach(m => { m.stats.hp = m.stats.maxHp; m.stats.mp = m.stats.maxMp }); clearUI(); this.scene.start('TownScene') }); return }
    const a = this.living().length * randInt(1, 5); const t = choice(alive); const r = t.defending ? Math.floor(a / 2) : a; t.stats.hp = Math.max(0, t.stats.hp - r); gameState.party.forEach(m => m.defending = false)
    this.pushLog(`敵の反撃！${t.name}に${r}ダメージ。`); if (t.stats.hp <= 0) this.pushLog(`${t.name}は倒れた！`); this.refreshUI()
  }
  private back() { clearUI(); this.scene.start(gameState.battleReturnScene ?? 'DungeonScene') }
}

// ====== INIT ======
if (!gameState.party.length) gameState.party = generateParty()
if (!gameState.map.length) resetDungeon(1)

new Phaser.Game({
  type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  parent: 'app', backgroundColor: '#000000',
  scene: [TitleScene, TownScene, DungeonScene, BattleScene, PartyScene]
})
