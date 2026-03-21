import { computeVisibleCells } from './visibility'

// Remotion proportions at half resolution
const DESIGN_W = 960
const DESIGN_H = 540
const GRID_SIZE = 400
const PERSPECTIVE = 600

let texCache: { wall: string; floor: string; ceiling: string } | null = null
function getTextures() {
  if (!texCache) {
    texCache = {
      wall: '/textures/wall.png',
      floor: '/textures/floor.png',
      ceiling: '/textures/ceiling.png',
    }
  }
  return texCache
}

export class DungeonRenderer {
  private sceneContainer: HTMLDivElement
  private worldContainer: HTMLDivElement
  private gridContainer: HTMLDivElement
  private currentCamRot = 0
  private currentCamX = 0
  private currentCamY = 0

  constructor(parentElement: HTMLElement) {
    // Scene container: fixed 1920x1080, scaled to fit
    this.sceneContainer = document.createElement('div')
    this.sceneContainer.style.cssText = `
      position: absolute; left: 0; top: 0; width: ${DESIGN_W}px; height: ${DESIGN_H}px;
      transform-origin: top left;
      perspective: ${PERSPECTIVE}px; perspective-origin: 50% 50%;
      overflow: hidden; background: #000;
    `

    // Vignette
    const vignette = document.createElement('div')
    vignette.style.cssText = `
      position: absolute; width: 100%; height: 100%; z-index: 100; pointer-events: none;
      background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.85) 100%);
    `
    this.sceneContainer.appendChild(vignette)

    // World container at screen center
    this.worldContainer = document.createElement('div')
    this.worldContainer.style.cssText = `
      position: absolute; left: ${DESIGN_W / 2}px; top: ${DESIGN_H / 2}px;
      transform-style: preserve-3d;
    `
    this.sceneContainer.appendChild(this.worldContainer)

    // Grid container
    this.gridContainer = document.createElement('div')
    this.gridContainer.style.cssText = `transform-style: preserve-3d;`
    this.worldContainer.appendChild(this.gridContainer)

    parentElement.appendChild(this.sceneContainer)
  }

  render(map: number[][], playerX: number, playerY: number, direction: number) {
    this.currentCamX = playerX
    this.currentCamY = playerY
    this.currentCamRot = direction * 90

    const visibleCells = computeVisibleCells(map, playerX, playerY, direction * 90, 6)
    this.gridContainer.innerHTML = ''

    const rows = map.length
    const cols = map[0].length

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!visibleCells.has(`${x},${y}`)) continue
        if (map[y][x] === 0) continue // Skip wall cells (0=wall)

        const cell = document.createElement('div')
        cell.style.cssText = `
          position: absolute; transform-style: preserve-3d;
          transform: translate3d(${x * GRID_SIZE}px, 0, ${y * GRID_SIZE}px);
        `

        // Floor & Ceiling
        cell.appendChild(this.makeFloor())
        cell.appendChild(this.makeCeiling())

        // Corner fillers (seal seams)
        const offsets = [[-1,-1],[1,-1],[1,1],[-1,1]]
        offsets.forEach(([dx, dz], i) => {
          const corner = document.createElement('div')
          corner.style.cssText = `
            position: absolute; left: -2px; top: -${GRID_SIZE/2}px;
            width: 4px; height: ${GRID_SIZE}px; background: #050505;
            transform: translate3d(${dx * GRID_SIZE/2}px, 0, ${dz * GRID_SIZE/2}px) rotateY(${i * 45}deg);
            backface-visibility: hidden;
          `
          cell.appendChild(corner)
        })

        // Walls: check neighbors
        const dirs: [number,number,string][] = [[0,-1,'front'],[0,1,'back'],[-1,0,'left'],[1,0,'right']]
        dirs.forEach(([dx, dy, dir]) => {
          const nx = x + dx, ny = y + dy
          const isWall = ny < 0 || ny >= rows || nx < 0 || nx >= cols || map[ny][nx] === 0
          const isBoundary = !isWall && !visibleCells.has(`${nx},${ny}`)
          if (isWall || isBoundary) {
            cell.appendChild(this.makeWall(dir, isBoundary))
          }
        })

        this.gridContainer.appendChild(cell)
      }
    }

    this.updateCameraTransform(0, 0)
  }

  private makeWall(dir: string, isBoundary: boolean): HTMLDivElement {
    const tex = getTextures()
    const wall = document.createElement('div')
    const half = GRID_SIZE / 2 - 1
    let transform = ''
    switch(dir) {
      case 'front': transform = `translate3d(0, 0, -${half}px)`; break
      case 'back': transform = `translate3d(0, 0, ${half}px) rotateY(180deg)`; break
      case 'left': transform = `translate3d(-${half}px, 0, 0) rotateY(90deg)`; break
      case 'right': transform = `translate3d(${half}px, 0, 0) rotateY(-90deg)`; break
    }
    wall.style.cssText = `
      position: absolute; left: -${GRID_SIZE/2}px; top: -${GRID_SIZE/2}px;
      width: ${GRID_SIZE}px; height: ${GRID_SIZE}px;
      transform: ${transform} scale(1.005);
      background-color: #000;
      background-image: ${isBoundary ? 'none' : `url(${tex.wall})`};
      background-size: cover; image-rendering: pixelated;
      box-shadow: ${isBoundary ? 'none' : 'inset 0 0 100px rgba(0,0,0,0.8)'};
      backface-visibility: hidden;
    `
    if (!isBoundary) {
      const fog = document.createElement('div')
      fog.style.cssText = `position:absolute;width:100%;height:100%;background:rgba(0,0,0,0.2);`
      wall.appendChild(fog)
    }
    return wall
  }

  private makeFloor(): HTMLDivElement {
    const tex = getTextures()
    const floor = document.createElement('div')
    floor.style.cssText = `
      position: absolute; left: -${GRID_SIZE/2}px; top: -${GRID_SIZE/2}px;
      width: ${GRID_SIZE}px; height: ${GRID_SIZE}px;
      transform: translate3d(0, ${GRID_SIZE/2}px, 0) rotateX(90deg) scale(1.005);
      background-color: #050505;
      background-image: url(${tex.floor});
      background-size: cover; image-rendering: pixelated;
      box-shadow: inset 0 0 100px rgba(0,0,0,1);
      backface-visibility: hidden;
    `
    return floor
  }

  private makeCeiling(): HTMLDivElement {
    const tex = getTextures()
    const ceil = document.createElement('div')
    ceil.style.cssText = `
      position: absolute; left: -${GRID_SIZE/2}px; top: -${GRID_SIZE/2}px;
      width: ${GRID_SIZE}px; height: ${GRID_SIZE}px;
      transform: translate3d(0, -${GRID_SIZE/2}px, 0) rotateX(-90deg) scale(1.005);
      background-color: #080808;
      background-image: url(${tex.ceiling});
      background-size: cover; image-rendering: pixelated;
      backface-visibility: hidden;
    `
    return ceil
  }

  updateCameraTransform(bob: number, sway: number) {
    this.worldContainer.style.transform =
      `translate3d(${sway}px, ${bob}px, 0) rotateY(${this.currentCamRot}deg) translate3d(${-this.currentCamX * GRID_SIZE}px, 0, ${-this.currentCamY * GRID_SIZE}px)`
  }

  setCameraSmooth(targetX: number, targetY: number, targetRotDeg: number, duration: number, onComplete?: () => void) {
    const startX = this.currentCamX
    const startY = this.currentCamY
    const startRot = this.currentCamRot
    const startTime = performance.now()

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      this.currentCamX = startX + (targetX - startX) * ease
      this.currentCamY = startY + (targetY - startY) * ease
      this.currentCamRot = startRot + (targetRotDeg - startRot) * ease

      const bob = Math.sin(now * 0.008) * 5
      const sway = Math.cos(now * 0.004) * 3
      this.updateCameraTransform(bob, sway)

      if (t < 1) requestAnimationFrame(animate)
      else if (onComplete) onComplete()
    }
    requestAnimationFrame(animate)
  }

  /**
   * Scale the 1920x1080 scene to fit within a container.
   * Call this when the container resizes.
   */
  scaleTo(containerWidth: number, containerHeight: number) {
    const scaleX = containerWidth / DESIGN_W
    const scaleY = containerHeight / DESIGN_H
    const scale = Math.min(scaleX, scaleY)
    this.sceneContainer.style.transform = `scale(${scale})`
  }

  destroy() {
    this.sceneContainer.remove()
  }
}
