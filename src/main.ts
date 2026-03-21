import Phaser from 'phaser'

type Direction = 0 | 1 | 2 | 3

type Stats = {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  str: number
  vit: number
  int: number
  agi: number
  luck: number
}

type PartyMember = {
  name: string
  job: string
  race: string
  stats: Stats
  defending?: boolean
}

type Enemy = {
  name: string
  hp: number
  maxHp: number
}

type GameState = {
  floor: number
  mapSize: number
  map: number[][]
  playerX: number
  playerY: number
  direction: Direction
  party: PartyMember[]
  encounterRate: number
  battleReturnScene?: string
}

const JOBS = ['ファイター', 'メイジ', 'プリースト', 'シーフ', 'サムライ', 'ビショップ']
const RACES = ['ヒューマン', 'エルフ', 'ドワーフ', 'ノーム']
const NAMES = ['ユウカ', 'ノア', 'アリス', 'ヒマリ', 'コトリ', 'モモイ', 'ミドリ', 'カリン', 'アスナ', 'ネル']
const ENEMY_NAMES = ['スライム', 'ゴブリン', 'スケルトン', 'オーク', 'シャドウ']

const dirVectors: Record<Direction, { dx: number; dy: number; label: string }> = {
  0: { dx: 0, dy: -1, label: '北' },
  1: { dx: 1, dy: 0, label: '東' },
  2: { dx: 0, dy: 1, label: '南' },
  3: { dx: -1, dy: 0, label: '西' }
}

const gameState: GameState = {
  floor: 1,
  mapSize: 10,
  map: [],
  playerX: 1,
  playerY: 1,
  direction: 0,
  party: [],
  encounterRate: 0.22
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function choice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function generateParty(): PartyMember[] {
  const used = new Set<string>()
  const party: PartyMember[] = []
  for (let i = 0; i < 6; i++) {
    let name = choice(NAMES)
    while (used.has(name)) name = choice(NAMES)
    used.add(name)
    const hp = randInt(24, 40)
    const mp = randInt(8, 20)
    party.push({
      name,
      job: JOBS[i % JOBS.length],
      race: choice(RACES),
      stats: {
        hp,
        maxHp: hp,
        mp,
        maxMp: mp,
        str: randInt(6, 15),
        vit: randInt(6, 15),
        int: randInt(6, 15),
        agi: randInt(6, 15),
        luck: randInt(6, 15)
      }
    })
  }
  return party
}

function generateDungeon(size: number): { map: number[][]; startX: number; startY: number } {
  const map: number[][] = Array.from({ length: size }, () => Array(size).fill(0))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
        map[y][x] = 0
      } else {
        map[y][x] = Math.random() < 0.72 ? 1 : 0
      }
    }
  }

  const startX = randInt(1, size - 2)
  const startY = randInt(1, size - 2)
  map[startY][startX] = 1

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]

  let cx = startX
  let cy = startY
  for (let i = 0; i < size * size; i++) {
    map[cy][cx] = 1
    const [dx, dy] = choice(directions)
    cx = Phaser.Math.Clamp(cx + dx, 1, size - 2)
    cy = Phaser.Math.Clamp(cy + dy, 1, size - 2)
    map[cy][cx] = 1
  }

  let stairX = randInt(1, size - 2)
  let stairY = randInt(1, size - 2)
  while ((stairX === startX && stairY === startY) || map[stairY][stairX] === 0) {
    stairX = randInt(1, size - 2)
    stairY = randInt(1, size - 2)
  }
  map[stairY][stairX] = 2

  return { map, startX, startY }
}

function resetDungeon(floor = 1): void {
  const generated = generateDungeon(gameState.mapSize)
  gameState.floor = floor
  gameState.map = generated.map
  gameState.playerX = generated.startX
  gameState.playerY = generated.startY
  gameState.direction = 0
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020')
    this.add.text(400, 170, 'セミナー・ダンジョン', {
      fontSize: '48px',
      color: '#d6e4ff'
    }).setOrigin(0.5)

    const btn = this.add.rectangle(400, 320, 320, 64, 0x3659b8).setInteractive({ useHandCursor: true })
    this.add.text(400, 320, '冒険を始める', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5)

    btn.on('pointerover', () => btn.setFillStyle(0x4c72d6))
    btn.on('pointerout', () => btn.setFillStyle(0x3659b8))
    btn.on('pointerdown', () => {
      if (gameState.party.length === 0) gameState.party = generateParty()
      resetDungeon(1)
      this.scene.start('TownScene')
    })

    this.add.text(400, 530, '↑↓←→: 移動 / Q・E: 回転 / P: パーティ', { fontSize: '20px', color: '#a9b8dd' }).setOrigin(0.5)
  }
}

class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#102015')
    this.add.text(400, 100, '城下町 - セミナー支部', { fontSize: '40px', color: '#d7ffe0' }).setOrigin(0.5)
    this.add.text(400, 160, '準備を整えてダンジョンへ向かいましょう。', { fontSize: '22px', color: '#b7eac0' }).setOrigin(0.5)

    const healBtn = this.add.rectangle(260, 320, 240, 64, 0x2f8f58).setInteractive({ useHandCursor: true })
    this.add.text(260, 320, '宿屋で全回復', { fontSize: '24px', color: '#fff' }).setOrigin(0.5)

    const goBtn = this.add.rectangle(540, 320, 240, 64, 0x4a4cb0).setInteractive({ useHandCursor: true })
    this.add.text(540, 320, '探索開始', { fontSize: '24px', color: '#fff' }).setOrigin(0.5)

    const log = this.add.text(400, 430, '行動を選択してください。', { fontSize: '20px', color: '#d7ffe0' }).setOrigin(0.5)

    healBtn.on('pointerdown', () => {
      gameState.party.forEach((m) => {
        m.stats.hp = m.stats.maxHp
        m.stats.mp = m.stats.maxMp
      })
      log.setText('宿屋で全員のHP/MPが全回復しました。')
    })

    goBtn.on('pointerdown', () => this.scene.start('DungeonScene'))

    this.input.keyboard?.on('keydown-P', () => this.scene.start('PartyScene', { returnScene: 'TownScene' }))
  }
}

class PartyScene extends Phaser.Scene {
  constructor() {
    super('PartyScene')
  }

  create(data: { returnScene?: string }) {
    const returnScene = data?.returnScene ?? 'TownScene'
    this.cameras.main.setBackgroundColor('#1a1f34')
    this.add.text(400, 40, 'パーティステータス', { fontSize: '36px', color: '#e8efff' }).setOrigin(0.5)

    const header = '名前      職業       種族      HP      MP    STR VIT INT AGI LUCK'
    this.add.text(60, 90, header, { fontSize: '18px', color: '#c7d5ff', fontFamily: 'monospace' })

    gameState.party.forEach((m, idx) => {
      const line = `${m.name.padEnd(8)}${m.job.padEnd(10)}${m.race.padEnd(8)}${String(m.stats.hp).padStart(3)}/${String(m.stats.maxHp).padEnd(3)}  ${String(m.stats.mp).padStart(3)}/${String(m.stats.maxMp).padEnd(3)}   ${String(m.stats.str).padStart(2)}  ${String(m.stats.vit).padStart(2)}  ${String(m.stats.int).padStart(2)}  ${String(m.stats.agi).padStart(2)}   ${String(m.stats.luck).padStart(2)}`
      this.add.text(60, 130 + idx * 60, line, { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' })
    })

    this.add.text(400, 560, 'SPACE または ESC で戻る', { fontSize: '20px', color: '#9fb0df' }).setOrigin(0.5)

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start(returnScene))
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(returnScene))
  }
}

class DungeonScene extends Phaser.Scene {
  private viewText!: Phaser.GameObjects.Text
  private infoText!: Phaser.GameObjects.Text
  private floorText!: Phaser.GameObjects.Text
  private logText!: Phaser.GameObjects.Text
  private miniMapGraphics!: Phaser.GameObjects.Graphics

  constructor() {
    super('DungeonScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#05070f')
    const w = this.cameras.main.width
    const h = this.cameras.main.height

    this.floorText = this.add.text(20, 16, '', { fontSize: '22px', color: '#e6eeff' })
    this.viewText = this.add.text(w / 2, h * 0.46, '', { fontSize: '28px', color: '#dde6ff' }).setOrigin(0.5)
    this.infoText = this.add.text(20, 50, '', { fontSize: '20px', color: '#a9b8dd' })
    this.logText = this.add.text(20, h - 32, '探索を開始。', { fontSize: '18px', color: '#9ed1ff' })
    this.miniMapGraphics = this.add.graphics()

    // 方向パッド
    const padY = h - 120
    const padX = w / 2
    const btnSize = 80
    const btnAlpha = 0.7

    // 前進
    const btnUp = this.add.rectangle(padX, padY - 50, btnSize, btnSize, 0x4488ff, btnAlpha).setInteractive({ useHandCursor: true })
    this.add.text(padX, padY - 50, '↑', { fontSize: '32px', color: '#fff' }).setOrigin(0.5)
    btnUp.on('pointerdown', () => this.move(1))

    // 後退
    const btnDown = this.add.rectangle(padX, padY + 50, btnSize, btnSize, 0x4488ff, btnAlpha).setInteractive({ useHandCursor: true })
    this.add.text(padX, padY + 50, '↓', { fontSize: '32px', color: '#fff' }).setOrigin(0.5)
    btnDown.on('pointerdown', () => this.move(-1))

    // 左回転
    const btnLeft = this.add.rectangle(padX - 100, padY, btnSize, btnSize, 0x4488ff, btnAlpha).setInteractive({ useHandCursor: true })
    this.add.text(padX - 100, padY, '←', { fontSize: '32px', color: '#fff' }).setOrigin(0.5)
    btnLeft.on('pointerdown', () => this.rotate(-1))

    // 右回転
    const btnRight = this.add.rectangle(padX + 100, padY, btnSize, btnSize, 0x4488ff, btnAlpha).setInteractive({ useHandCursor: true })
    this.add.text(padX + 100, padY, '→', { fontSize: '32px', color: '#fff' }).setOrigin(0.5)
    btnRight.on('pointerdown', () => this.rotate(1))

    this.bindKeys()
    this.renderView()
  }

  private bindKeys() {
    this.input.keyboard?.on('keydown-UP', () => this.move(1))
    this.input.keyboard?.on('keydown-DOWN', () => this.move(-1))
    this.input.keyboard?.on('keydown-Q', () => this.rotate(-1))
    this.input.keyboard?.on('keydown-E', () => this.rotate(1))
    this.input.keyboard?.on('keydown-LEFT', () => this.rotate(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.rotate(1))
    this.input.keyboard?.on('keydown-P', () => this.scene.start('PartyScene', { returnScene: 'DungeonScene' }))
  }

  private rotate(delta: number) {
    gameState.direction = (((gameState.direction + delta) % 4) + 4) % 4 as Direction
    this.logText.setText(`向きを ${dirVectors[gameState.direction].label} に変更。`)
    this.renderView()
  }

  private move(step: 1 | -1) {
    const vec = dirVectors[gameState.direction]
    const dx = vec.dx * step
    const dy = vec.dy * step
    const nx = gameState.playerX + dx
    const ny = gameState.playerY + dy

    const tile = gameState.map[ny]?.[nx] ?? 0
    if (tile === 0) {
      this.logText.setText('壁に阻まれて進めない。')
      this.renderView()
      return
    }

    gameState.playerX = nx
    gameState.playerY = ny

    if (tile === 2) {
      this.logText.setText('階段を発見。次の階層へ進む…')
      resetDungeon(gameState.floor + 1)
      this.renderView()
      return
    }

    if (Math.random() < gameState.encounterRate) {
      gameState.battleReturnScene = 'DungeonScene'
      this.scene.start('BattleScene')
      return
    }

    this.logText.setText('慎重に進んだ。')
    this.renderView()
  }

  private renderView() {
    const vec = dirVectors[gameState.direction]
    const fx = gameState.playerX + vec.dx
    const fy = gameState.playerY + vec.dy
    const front = gameState.map[fy]?.[fx] ?? 0

    this.children.list
      .filter((obj) => obj.name === 'viewRect')
      .forEach((obj) => obj.destroy())

    if (front === 0) {
      this.add.rectangle(400, 270, 520, 320, 0x39405a).setStrokeStyle(6, 0x9aa2c4).setName('viewRect')
      this.viewText.setText('正面: 壁')
    } else {
      this.add.rectangle(400, 270, 520, 320, 0x1c253f).setStrokeStyle(6, 0x5e7ac7).setName('viewRect')
      this.add.rectangle(400, 345, 300, 90, 0x111627).setName('viewRect')
      this.viewText.setText(front === 2 ? '正面: 階段の気配' : '正面: 通路')
    }

    this.floorText.setText(`B${gameState.floor}F`)
    this.infoText.setText(`座標: (${gameState.playerX}, ${gameState.playerY})   向き: ${dirVectors[gameState.direction].label}`)
    this.drawMiniMap()
  }

  private drawMiniMap() {
    const g = this.miniMapGraphics
    g.clear()
    const cell = 12
    const startX = 640
    const startY = 30

    g.lineStyle(1, 0x334477, 1)
    for (let y = 0; y < gameState.mapSize; y++) {
      for (let x = 0; x < gameState.mapSize; x++) {
        const tile = gameState.map[y][x]
        const color = tile === 0 ? 0x1f2433 : tile === 2 ? 0x5c8f40 : 0x9aa6bf
        g.fillStyle(color, 1)
        g.fillRect(startX + x * cell, startY + y * cell, cell - 1, cell - 1)
      }
    }

    const px = startX + gameState.playerX * cell + cell / 2
    const py = startY + gameState.playerY * cell + cell / 2
    g.fillStyle(0xffd166, 1)
    g.fillCircle(px, py, 4)

    const v = dirVectors[gameState.direction]
    g.lineStyle(2, 0xff7b7b, 1)
    g.beginPath()
    g.moveTo(px, py)
    g.lineTo(px + v.dx * 7, py + v.dy * 7)
    g.strokePath()

    this.add.text(700, 8, 'ミニマップ', { fontSize: '18px', color: '#b7c8ff' }).setName('viewRect')
  }
}

class BattleScene extends Phaser.Scene {
  private enemies: Enemy[] = []
  private logLines: string[] = []
  private enemyText!: Phaser.GameObjects.Text
  private logText!: Phaser.GameObjects.Text

  constructor() {
    super('BattleScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#220c0c')
    this.enemies = Array.from({ length: randInt(1, 3) }, () => {
      const hp = randInt(20, 38)
      return { name: choice(ENEMY_NAMES), hp, maxHp: hp }
    })

    this.add.text(400, 50, '戦闘開始！', { fontSize: '42px', color: '#ffd0d0' }).setOrigin(0.5)
    this.enemyText = this.add.text(80, 120, '', { fontSize: '24px', color: '#fff1f1' })
    this.logText = this.add.text(80, 340, '', { fontSize: '20px', color: '#ffdede', wordWrap: { width: 640 } })

    const buttons: Array<[string, number, () => void]> = [
      ['攻撃', 120, () => this.playerAttack()],
      ['防御', 280, () => this.playerDefend()],
      ['魔法', 440, () => this.playerMagic()],
      ['逃走', 600, () => this.playerEscape()]
    ]

    buttons.forEach(([label, x, cb]) => {
      const b = this.add.rectangle(x, 520, 140, 80, 0x7d2a2a).setInteractive({ useHandCursor: true })
      this.add.text(x, 520, label, { fontSize: '24px', color: '#fff' }).setOrigin(0.5)
      b.on('pointerdown', cb)
    })

    this.pushLog('敵が現れた！')
    this.refreshEnemyText()
  }

  private refreshEnemyText() {
    const lines = this.enemies.map((e, i) => `${i + 1}. ${e.name} HP: ${e.hp}/${e.maxHp}`)
    this.enemyText.setText(lines.join('\n'))
  }

  private pushLog(message: string) {
    this.logLines.push(message)
    if (this.logLines.length > 7) this.logLines.shift()
    this.logText.setText(this.logLines.join('\n'))
  }

  private livingEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.hp > 0)
  }

  private playerAttack() {
    const targets = this.livingEnemies()
    if (targets.length === 0) return
    const target = choice(targets)
    const atk = gameState.party.reduce((sum, m) => sum + randInt(1, Math.max(2, m.stats.str / 2)), 0)
    const dmg = Math.max(1, Math.floor(atk / 3))
    target.hp = Math.max(0, target.hp - dmg)
    this.pushLog(`パーティの攻撃！ ${target.name}に${dmg}ダメージ。`)
    this.afterPlayerAction()
  }

  private playerDefend() {
    gameState.party.forEach((m) => (m.defending = true))
    this.pushLog('パーティは防御体勢を取った。')
    this.afterPlayerAction()
  }

  private playerMagic() {
    const caster = gameState.party.find((m) => m.stats.mp >= 3)
    if (!caster) {
      this.pushLog('MPが足りない！')
      return
    }
    caster.stats.mp -= 3
    const targets = this.livingEnemies()
    const target = choice(targets)
    const dmg = randInt(8, 16) + Math.floor(caster.stats.int / 3)
    target.hp = Math.max(0, target.hp - dmg)
    this.pushLog(`${caster.name}の魔法！ ${target.name}に${dmg}ダメージ。`)
    this.afterPlayerAction()
  }

  private playerEscape() {
    if (Math.random() < 0.5) {
      this.pushLog('逃走に成功！')
      this.time.delayedCall(600, () => this.backToDungeon())
    } else {
      this.pushLog('逃走失敗！')
      this.enemyTurn()
    }
  }

  private afterPlayerAction() {
    this.refreshEnemyText()
    if (this.livingEnemies().length === 0) {
      this.pushLog('敵を全滅させた！')
      this.time.delayedCall(800, () => this.backToDungeon())
      return
    }
    this.enemyTurn()
  }

  private enemyTurn() {
    const livingMembers = gameState.party.filter((m) => m.stats.hp > 0)
    if (livingMembers.length === 0) {
      this.pushLog('パーティは全滅した…町へ戻される。')
      this.time.delayedCall(1200, () => {
        gameState.party.forEach((m) => {
          m.stats.hp = m.stats.maxHp
          m.stats.mp = m.stats.maxMp
        })
        this.scene.start('TownScene')
      })
      return
    }

    const totalEnemyAtk = this.livingEnemies().length * randInt(4, 10)
    const target = choice(livingMembers)
    const reduced = target.defending ? Math.floor(totalEnemyAtk / 2) : totalEnemyAtk
    target.stats.hp = Math.max(0, target.stats.hp - reduced)
    gameState.party.forEach((m) => (m.defending = false))

    this.pushLog(`敵の反撃！ ${target.name}は${reduced}ダメージを受けた。`)
    if (target.stats.hp <= 0) this.pushLog(`${target.name}は倒れた！`)
  }

  private backToDungeon() {
    this.scene.start(gameState.battleReturnScene ?? 'DungeonScene')
  }
}

if (gameState.party.length === 0) {
  gameState.party = generateParty()
}
if (gameState.map.length === 0) {
  resetDungeon(1)
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  parent: 'app',
  backgroundColor: '#000000',
  scene: [TitleScene, TownScene, DungeonScene, BattleScene, PartyScene]
})
