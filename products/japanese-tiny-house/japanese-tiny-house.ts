import { Beam120 } from '@villagekit/part-beam120/creator'
import { GridPanel } from '@villagekit/part-gridpanel/creator'
import { WallFrame } from '@villagekit/part-wall-frame/creator'

// Japanese tiny house with engawa — monopitch roof.
//
// All posts referenced by SW corner (minimum X, minimum Y) — see ADR-0001.
//
// X layout (outer face to outer face): 3 + 60 + 3 + 60 + 3 = 129gu = 5160mm
//   West post SW: x=0   Central post SW: x=63   East post SW: x=126
//
// Y layout (outer face to outer face): 3 + 60 + 3 + 30 + 3 = 99gu = 3960mm
//   Back post SW: y=0   Front post SW: y=63   Engawa post SW: y=96
//
// Z: posts from z=0 (ground). Floor beam bottom face at z=FLOOR_Z.
//   Front wall post top:  FLOOR_Z + 60 (fixed — pitch pivots here)
//   Back wall post top:   FLOOR_Z + 60 + round(tan(pitchDeg°) × 60gu interior depth)
//   Engawa post top:      FLOOR_Z + 60 − round(tan(pitchDeg°) × (3+engawaWidthGu))

const POST_X = [0, 63, 126] as const
const POST_Y_BACK = 0
const POST_Y_FRONT = 63
const FLOOR_Z = 20

export const parameters = {
  pitchDeg: {
    type: 'number' as const,
    label: 'Roof pitch (°)',
    description: 'Monopitch angle in degrees. Front wall always stays at 2400mm; back wall and engawa eave heights derive from this.',
    min: 5,
    max: 35,
    step: 1,
  },
  engawaWidthGu: {
    type: 'number' as const,
    label: 'Engawa width (gu)',
    description: 'Clear depth of engawa in grid units (1 gu = 40mm). Default 30 = 1200mm.',
    min: 15,
    max: 60,
    step: 5,
  },
}

export const presets = [
  { id: 'default',     label: '18° pitch',          values: { pitchDeg: 18, engawaWidthGu: 30 } },
  { id: 'steep',       label: '27° steep pitch',    values: { pitchDeg: 27, engawaWidthGu: 30 } },
  { id: 'deep-engawa', label: '18° / deep engawa',  values: { pitchDeg: 18, engawaWidthGu: 45 } },
]

export const parts = ({
  pitchDeg,
  engawaWidthGu,
}: {
  pitchDeg: number
  engawaWidthGu: number
}) => {
  // Post Y positions (SW corners)
  const POST_Y_ENGAWA = POST_Y_FRONT + 3 + engawaWidthGu

  // Pitch pivots at the front wall — front post top is always FLOOR_Z+60.
  const POST_H_FRONT  = FLOOR_Z + 60
  const riseGu        = Math.round(Math.tan(pitchDeg * Math.PI / 180) * 60)
  const POST_H_BACK   = POST_H_FRONT + Math.max(1, riseGu)
  const dropGu        = Math.round(Math.tan(pitchDeg * Math.PI / 180) * (3 + engawaWidthGu))
  const POST_H_ENGAWA = Math.max(FLOOR_Z + 20, POST_H_FRONT - dropGu)

  // Roof beam bottom face sits at post top minus beam depth (3gu)
  const ROOF_Z_BACK   = POST_H_BACK   - 3
  const ROOF_Z_FRONT  = POST_H_FRONT  - 3
  const ROOF_Z_ENGAWA = POST_H_ENGAWA - 3

  // Floor panels sit on top of floor beams (beam depth = 3gu)
  const PANEL_Z = FLOOR_Z + 3

  return [
    // ── Back wall posts (y=0, 3 posts) ────────────────────────────────────
    Beam120.Z({ id: 'post-b-w', x: POST_X[0], y: POST_Y_BACK, z: [0, POST_H_BACK] }),
    Beam120.Z({ id: 'post-b-m', x: POST_X[1], y: POST_Y_BACK, z: [0, POST_H_BACK] }),
    Beam120.Z({ id: 'post-b-e', x: POST_X[2], y: POST_Y_BACK, z: [0, POST_H_BACK] }),

    // ── Front wall posts (y=63, 3 posts) ──────────────────────────────────
    Beam120.Z({ id: 'post-f-w', x: POST_X[0], y: POST_Y_FRONT, z: [0, POST_H_FRONT] }),
    Beam120.Z({ id: 'post-f-m', x: POST_X[1], y: POST_Y_FRONT, z: [0, POST_H_FRONT] }),
    Beam120.Z({ id: 'post-f-e', x: POST_X[2], y: POST_Y_FRONT, z: [0, POST_H_FRONT] }),

    // ── Engawa posts (y=POST_Y_ENGAWA, 3 posts) ───────────────────────────
    Beam120.Z({ id: 'post-e-w', x: POST_X[0], y: POST_Y_ENGAWA, z: [0, POST_H_ENGAWA] }),
    Beam120.Z({ id: 'post-e-m', x: POST_X[1], y: POST_Y_ENGAWA, z: [0, POST_H_ENGAWA] }),
    Beam120.Z({ id: 'post-e-e', x: POST_X[2], y: POST_Y_ENGAWA, z: [0, POST_H_ENGAWA] }),

    // ── Floor beams — X direction (2400mm per bay, not full-span) ────────
    Beam120.X({ id: 'beam-fl-x-b-1', x: [POST_X[0] + 3, POST_X[1]], y: POST_Y_BACK,   z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-b-2', x: [POST_X[1] + 3, POST_X[2]], y: POST_Y_BACK,   z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-f-1', x: [POST_X[0] + 3, POST_X[1]], y: POST_Y_FRONT,  z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-f-2', x: [POST_X[1] + 3, POST_X[2]], y: POST_Y_FRONT,  z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-e-1', x: [POST_X[0] + 3, POST_X[1]], y: POST_Y_ENGAWA, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-e-2', x: [POST_X[1] + 3, POST_X[2]], y: POST_Y_ENGAWA, z: FLOOR_Z }),

    // ── Floor beams — Y direction (one per post column) ───────────────────
    Beam120.Y({ id: 'beam-fl-y-w-int',  x: POST_X[0], y: [POST_Y_BACK,        POST_Y_FRONT + 3],   z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-m-int',  x: POST_X[1], y: [POST_Y_BACK,        POST_Y_FRONT + 3],   z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-e-int',  x: POST_X[2], y: [POST_Y_BACK,        POST_Y_FRONT + 3],   z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-w-eng',  x: POST_X[0], y: [POST_Y_FRONT + 3,   POST_Y_ENGAWA + 3],  z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-m-eng',  x: POST_X[1], y: [POST_Y_FRONT + 3,   POST_Y_ENGAWA + 3],  z: FLOOR_Z}),
    Beam120.Y({ id: 'beam-fl-y-e-eng',  x: POST_X[2], y: [POST_Y_FRONT + 3,   POST_Y_ENGAWA + 3],  z: FLOOR_Z }),

    // ── Roof beams — X direction (one per post row at post top) ───────────
    Beam120.X({ id: 'roof-x-b', x: [POST_X[0], POST_X[2] + 3], y: POST_Y_BACK,   z: ROOF_Z_BACK }),
    Beam120.X({ id: 'roof-x-f', x: [POST_X[0], POST_X[2] + 3], y: POST_Y_FRONT,  z: ROOF_Z_FRONT }),
    Beam120.X({ id: 'roof-x-e', x: [POST_X[0], POST_X[2] + 3], y: POST_Y_ENGAWA, z: ROOF_Z_ENGAWA }),

    // ── Floor panels — 4 × 1200×2400mm ply, 4×1 grid ─────────────────────
    // Each panel is 30gu (1200mm) wide in X × 60gu (2400mm) long in Y.
    // Two panels per bay split at mid-bay X; long dimension spans full interior depth.
    GridPanel.XY({ id: 'floor-w-1', x: [POST_X[0] + 3, POST_X[0] + 33], y: [POST_Y_BACK + 3, POST_Y_FRONT], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-w-2', x: [POST_X[0] + 33, POST_X[1]],     y: [POST_Y_BACK + 3, POST_Y_FRONT], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-e-1', x: [POST_X[1] + 3, POST_X[1] + 33], y: [POST_Y_BACK + 3, POST_Y_FRONT], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-e-2', x: [POST_X[1] + 33, POST_X[2]],     y: [POST_Y_BACK + 3, POST_Y_FRONT], z: PANEL_Z, holes: false }),

    // ── Engawa deck panels — same X layout as floor, Y = front post to engawa post ──
    GridPanel.XY({ id: 'engawa-1', x: [POST_X[0] + 3,  POST_X[0] + 33], y: [POST_Y_FRONT + 3, POST_Y_ENGAWA], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'engawa-2', x: [POST_X[0] + 33, POST_X[1]],      y: [POST_Y_FRONT + 3, POST_Y_ENGAWA], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'engawa-3', x: [POST_X[1] + 3,  POST_X[1] + 33], y: [POST_Y_FRONT + 3, POST_Y_ENGAWA], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'engawa-4', x: [POST_X[1] + 33, POST_X[2]],      y: [POST_Y_FRONT + 3, POST_Y_ENGAWA], z: PANEL_Z, holes: false }),

    // ── Back wall — 2 bays × 3 portrait panels per bay, plus clerestory ──────
    // Each panel: 20gu (800mm) wide × full-story tall — portrait orientation
    // Bay 1 (west): standard story
    WallFrame.XZ({ id: 'wall-b-1-a', x: [POST_X[0] + 3,  POST_X[0] + 23], y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-1-b', x: [POST_X[0] + 23, POST_X[0] + 43], y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-1-c', x: [POST_X[0] + 43, POST_X[1]],      y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    // Bay 1: clerestory
    WallFrame.XZ({ id: 'wall-b-1-cl-a', x: [POST_X[0] + 3,  POST_X[0] + 23], y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),
    WallFrame.XZ({ id: 'wall-b-1-cl-b', x: [POST_X[0] + 23, POST_X[0] + 43], y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),
    WallFrame.XZ({ id: 'wall-b-1-cl-c', x: [POST_X[0] + 43, POST_X[1]],      y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),
    // Bay 2 (east): standard story
    WallFrame.XZ({ id: 'wall-b-2-a', x: [POST_X[1] + 3,  POST_X[1] + 23], y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-2-b', x: [POST_X[1] + 23, POST_X[1] + 43], y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-2-c', x: [POST_X[1] + 43, POST_X[2]],      y: POST_Y_BACK, z: [FLOOR_Z, POST_H_FRONT] }),
    // Bay 2: clerestory
    WallFrame.XZ({ id: 'wall-b-2-cl-a', x: [POST_X[1] + 3,  POST_X[1] + 23], y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),
    WallFrame.XZ({ id: 'wall-b-2-cl-b', x: [POST_X[1] + 23, POST_X[1] + 43], y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),
    WallFrame.XZ({ id: 'wall-b-2-cl-c', x: [POST_X[1] + 43, POST_X[2]],      y: POST_Y_BACK, z: [POST_H_FRONT, POST_H_BACK] }),

    // ── Front wall — 2 bays × 3 portrait panels per bay ──────────────────────
    WallFrame.XZ({ id: 'wall-f-1-a', x: [POST_X[0] + 3,  POST_X[0] + 23], y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-1-b', x: [POST_X[0] + 23, POST_X[0] + 43], y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-1-c', x: [POST_X[0] + 43, POST_X[1]],      y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-2-a', x: [POST_X[1] + 1, POST_X[1 ] + 23], y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-2-b', x: [POST_X[1] + 23, POST_X[1] + 44], y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-2-c', x: [POST_X[1] + 43, POST_X[2]],      y: POST_Y_FRONT, z: [FLOOR_Z, POST_H_FRONT] }),

    // ── Side walls — 3 portrait panels per side (20gu wide × full-story tall) ─
    WallFrame.YZ({ id: 'wall-w-a', x: POST_X[0], y: [POST_Y_BACK + 3,  POST_Y_BACK + 23], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-w-b', x: POST_X[0], y: [POST_Y_BACK + 23, POST_Y_BACK + 43], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-w-c', x: POST_X[0], y: [POST_Y_BACK + 43, POST_Y_FRONT],     z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-a', x: POST_X[2], y: [POST_Y_BACK + 3,  POST_Y_BACK + 23], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-b', x: POST_X[2], y: [POST_Y_BACK + 23, POST_Y_BACK + 43], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-c', x: POST_X[2], y: [POST_Y_BACK + 43, POST_Y_FRONT],     z: [FLOOR_Z, POST_H_FRONT] }),
  ]
}
