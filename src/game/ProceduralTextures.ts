// Procedural dungeon texture generator using Canvas
// No external assets needed!

const SIZE = 128

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = SIZE; c.height = SIZE
  const ctx = c.getContext('2d')!
  return [c, ctx]
}

function toDataURL(c: HTMLCanvasElement): string {
  return c.toDataURL('image/png')
}

// Stone brick wall
function generateWall(seed = 42): string {
  const [c, ctx] = createCanvas()
  const rand = seededRandom(seed)

  // Base dark stone color
  ctx.fillStyle = '#2a2420'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Brick pattern
  const brickH = 16
  const brickW = 32
  const mortarW = 2

  for (let row = 0; row < Math.ceil(SIZE / brickH); row++) {
    const offset = (row % 2) * (brickW / 2)
    for (let col = -1; col < Math.ceil(SIZE / brickW) + 1; col++) {
      const x = col * brickW + offset
      const y = row * brickH

      // Slight color variation per brick
      const v = Math.floor(rand() * 30 - 15)
      const r = 38 + v, g = 32 + v, b = 28 + v
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x + mortarW, y + mortarW, brickW - mortarW * 2, brickH - mortarW * 2)

      // Inner brick texture (subtle noise)
      for (let i = 0; i < 8; i++) {
        const nx = x + mortarW + rand() * (brickW - mortarW * 2)
        const ny = y + mortarW + rand() * (brickH - mortarW * 2)
        const nv = Math.floor(rand() * 20 - 10)
        ctx.fillStyle = `rgba(${50 + nv},${42 + nv},${38 + nv},0.3)`
        ctx.fillRect(nx, ny, 3 + rand() * 4, 2 + rand() * 3)
      }

      // Cracks on some bricks
      if (rand() < 0.15) {
        ctx.strokeStyle = 'rgba(15,10,8,0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + brickW * 0.3, y + mortarW)
        ctx.lineTo(x + brickW * 0.6, y + brickH - mortarW)
        ctx.stroke()
      }
    }
  }

  // Mortar lines
  ctx.strokeStyle = '#1a1512'
  ctx.lineWidth = mortarW
  for (let row = 0; row <= Math.ceil(SIZE / brickH); row++) {
    const y = row * brickH
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke()
  }
  for (let row = 0; row < Math.ceil(SIZE / brickH); row++) {
    const offset = (row % 2) * (brickW / 2)
    for (let col = 0; col <= Math.ceil(SIZE / brickW); col++) {
      const x = col * brickW + offset
      ctx.beginPath(); ctx.moveTo(x, row * brickH); ctx.lineTo(x, (row + 1) * brickH); ctx.stroke()
    }
  }

  // Darken edges (vignette)
  const grad = ctx.createRadialGradient(SIZE/2, SIZE/2, SIZE*0.2, SIZE/2, SIZE/2, SIZE*0.7)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Moss on some edges
  for (let i = 0; i < 12; i++) {
    const mx = rand() * SIZE
    const my = rand() < 0.5 ? 0 : SIZE
    const mw = 5 + rand() * 15
    const mg = 30 + Math.floor(rand() * 20)
    ctx.fillStyle = `rgba(${mg - 10},${mg + 10},${mg - 15},0.4)`
    ctx.beginPath()
    ctx.ellipse(mx, my, mw, 3 + rand() * 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  return toDataURL(c)
}

// Stone tile floor
function generateFloor(seed = 99): string {
  const [c, ctx] = createCanvas()
  const rand = seededRandom(seed)

  // Base
  ctx.fillStyle = '#222018'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Stone tiles (grid of rough squares)
  const tileSize = 32
  for (let ty = 0; ty < Math.ceil(SIZE / tileSize); ty++) {
    for (let tx = 0; tx < Math.ceil(SIZE / tileSize); tx++) {
      const x = tx * tileSize
      const y = ty * tileSize
      const v = Math.floor(rand() * 20 - 10)

      ctx.fillStyle = `rgb(${30 + v},${28 + v},${22 + v})`
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2)

      // Tile surface noise
      for (let i = 0; i < 15; i++) {
        const nx = x + 1 + rand() * (tileSize - 2)
        const ny = y + 1 + rand() * (tileSize - 2)
        const nv = Math.floor(rand() * 15 - 7)
        ctx.fillStyle = `rgba(${35 + nv},${32 + nv},${25 + nv},0.4)`
        ctx.fillRect(nx, ny, 2 + rand() * 3, 1 + rand() * 3)
      }

      // Crack lines
      if (rand() < 0.2) {
        ctx.strokeStyle = 'rgba(10,8,5,0.4)'
        ctx.lineWidth = 1
        ctx.beginPath()
        const sx = x + rand() * tileSize
        const sy = y + rand() * tileSize
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + (rand() - 0.5) * 20, sy + (rand() - 0.5) * 20)
        ctx.stroke()
      }

      // Tile border (grout)
      ctx.strokeStyle = '#151210'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2)
    }
  }

  // Wet/shine effect
  const grad = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, SIZE*0.7)
  grad.addColorStop(0, 'rgba(60,55,45,0.1)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)

  return toDataURL(c)
}

// Dark ceiling
function generateCeiling(seed = 77): string {
  const [c, ctx] = createCanvas()
  const rand = seededRandom(seed)

  ctx.fillStyle = '#0e0c0a'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Wooden beam pattern
  for (let i = 0; i < 4; i++) {
    const y = i * 32 + 4
    const v = Math.floor(rand() * 10 - 5)
    ctx.fillStyle = `rgb(${18 + v},${15 + v},${12 + v})`
    ctx.fillRect(0, y, SIZE, 28)

    // Wood grain
    for (let j = 0; j < 20; j++) {
      const gx = rand() * SIZE
      const gy = y + rand() * 28
      ctx.strokeStyle = `rgba(${22 + v},${18 + v},${14 + v},0.5)`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(gx + rand() * 30, gy + (rand() - 0.5) * 2)
      ctx.stroke()
    }
  }

  // Cobwebs
  if (rand() < 0.5) {
    ctx.strokeStyle = 'rgba(80,75,65,0.15)'
    ctx.lineWidth = 0.5
    const cx = SIZE * (0.7 + rand() * 0.2)
    const cy = SIZE * 0.1
    for (let a = 0; a < Math.PI * 0.8; a += 0.15) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40)
      ctx.stroke()
    }
  }

  return toDataURL(c)
}

// Passageway (arched corridor view)
function generatePassage(seed = 55): string {
  const [c, ctx] = createCanvas()
  const rand = seededRandom(seed)

  // Dark background
  ctx.fillStyle = '#080604'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Distant light
  const grad = ctx.createRadialGradient(SIZE/2, SIZE*0.4, 0, SIZE/2, SIZE*0.4, SIZE*0.6)
  grad.addColorStop(0, 'rgba(40,35,25,0.6)')
  grad.addColorStop(0.5, 'rgba(20,18,12,0.3)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Arch frame
  ctx.strokeStyle = '#1e1a14'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(20, SIZE)
  ctx.lineTo(20, 30)
  ctx.arc(SIZE/2, 30, SIZE/2 - 20, Math.PI, 0)
  ctx.lineTo(SIZE - 20, SIZE)
  ctx.stroke()

  // Inner arch detail
  ctx.strokeStyle = '#2a2418'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(28, SIZE)
  ctx.lineTo(28, 34)
  ctx.arc(SIZE/2, 34, SIZE/2 - 28, Math.PI, 0)
  ctx.lineTo(SIZE - 28, SIZE)
  ctx.stroke()

  // Floor perspective lines
  ctx.strokeStyle = 'rgba(30,25,18,0.5)'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const t = i / 8
    const lx = 20 + t * 20
    const rx = SIZE - 20 - t * 20
    const fy = SIZE * 0.5 + t * SIZE * 0.5
    ctx.beginPath(); ctx.moveTo(lx, fy); ctx.lineTo(rx, fy); ctx.stroke()
  }

  // Wall texture on sides
  for (let y = 0; y < SIZE; y += 4) {
    const v = Math.floor(rand() * 8 - 4)
    ctx.fillStyle = `rgba(${25 + v},${22 + v},${18 + v},0.3)`
    ctx.fillRect(0, y, 20, 4)
    ctx.fillRect(SIZE - 20, y, 20, 4)
  }

  // Torch light glow (left side)
  const torchGrad = ctx.createRadialGradient(15, SIZE*0.4, 0, 15, SIZE*0.4, 30)
  torchGrad.addColorStop(0, 'rgba(180,120,40,0.15)')
  torchGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = torchGrad
  ctx.fillRect(0, SIZE*0.2, 40, SIZE*0.4)

  return toDataURL(c)
}

export const ProceduralTextures = {
  generateWall,
  generateFloor,
  generateCeiling,
  generatePassage,
  SIZE
}
