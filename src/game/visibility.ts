// Recursive Shadowcasting — map convention: 0=wall, 1=path, 2=stairs

export function computeVisibleCells(
    map: number[][],
    camX: number,
    camY: number,
    _camRotDeg: number,
    maxDistance: number = 8
): Set<string> {
    const rows = map.length;
    const cols = map[0].length;
    const cx = Math.round(camX);
    const cy = Math.round(camY);

    const visible = new Set<string>();
    visible.add(`${cx},${cy}`);

    // 8オクタント
    const octants: [number, number, number, number][] = [
        [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
        [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1],
    ];

    for (const [xx, xy, yx, yy] of octants) {
        castLight(map, rows, cols, cx, cy, maxDistance, 1, 1.0, 0.0, xx, xy, yx, yy, visible);
    }

    // Line-of-sight boost: BFS flood fill to ensure all reachable path cells within
    // range are visible (prevents black corridors from shadowcasting gaps)
    const visited = new Set<string>();
    const queue: [number, number, number][] = [[cx, cy, 0]];
    visited.add(`${cx},${cy}`);
    while (queue.length > 0) {
        const [qx, qy, dist] = queue.shift()!;
        if (dist >= maxDistance) continue;
        const deltas: [number, number][] = [[0,-1],[0,1],[-1,0],[1,0]];
        for (const [dx, dy] of deltas) {
            const nx = qx + dx, ny = qy + dy;
            const key = `${nx},${ny}`;
            if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
            if (visited.has(key)) continue;
            visited.add(key);
            visible.add(key); // Always make it visible
            // Only continue flood through non-wall cells
            if (map[ny][nx] !== 0) {
              queue.push([nx, ny, dist + 1]);
            }
        }
    }

    return visible;
}

function castLight(
    map: number[][], rows: number, cols: number,
    cx: number, cy: number, radius: number, row: number,
    startSlope: number, endSlope: number,
    xx: number, xy: number, yx: number, yy: number,
    visible: Set<string>,
): void {
    if (startSlope < endSlope) return
    const radiusSq = radius * radius
    let nextStartSlope = startSlope
    for (let j = row; j <= radius; j++) {
        let blocked = false
        for (let dx = -j; dx <= 0; dx++) {
            const mapX = cx + dx * xx + j * xy
            const mapY = cy + dx * yx + j * yy
            const leftSlope = (dx - 0.5) / (j + 0.5)
            const rightSlope = (dx + 0.5) / (j - 0.5)
            if (startSlope < rightSlope) continue
            if (endSlope > leftSlope) break
            if (dx * dx + j * j <= radiusSq) {
                if (mapY >= 0 && mapY < rows && mapX >= 0 && mapX < cols) {
                    visible.add(`${mapX},${mapY}`)
                }
            }
            // 0 = wall
            const isWall = mapY < 0 || mapY >= rows || mapX < 0 || mapX >= cols || map[mapY][mapX] === 0
            if (blocked) {
                if (isWall) { nextStartSlope = rightSlope }
                else { blocked = false; startSlope = nextStartSlope }
            } else if (isWall) {
                blocked = true
                castLight(map, rows, cols, cx, cy, radius, j + 1, startSlope, leftSlope, xx, xy, yx, yy, visible)
                nextStartSlope = rightSlope
            }
        }
        if (blocked) break
    }
}
