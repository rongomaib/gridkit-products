import { Beam120 } from '@villagekit/part-beam120/creator'
import { GablePanel } from '@villagekit/part-gable-panel/creator'
import { GridPanel } from '@villagekit/part-gridpanel/creator'
import { WallFrame } from '@villagekit/part-wall-frame/creator'

// Japanese tiny house with engawa — monopitch roof.
//
// All posts referenced by SW corner (minimum X, minimum Y) — see ADR-0001.
//
// X layout (outer face to outer face): 3 + 60 + 3 + 60 + 3 = 129gu = 5160mm
//   West column SW: x=0   Centre column SW: x=63   East column SW: x=126
//
// Y layout: 3 + 60 + 3 + engawaWidthGu + 3
//   Back row SW: y=0   Front row SW: y=63   Engawa row SW: y=66+engawaWidthGu
//
// Z: posts start at z=0 (ground). Floor beam bottom face at z=FLOOR_Z.
//   Front post top:  FLOOR_Z + 60 (pivot — always 3×800mm wall modules, 2400mm)
//   Back post top:   FLOOR_Z + 60 + round((yF − yB) × tan(pitchDeg))
//   Engawa post top: FLOOR_Z + 60 − round((yE − yF) × tan(pitchDeg))
//   Pivot is at top of front wall posts — roof plane rotates around that line.

const POST_X = [0, 63, 126] as const
const POST_Y_BACK  = 0
const POST_Y_FRONT = 63
const POST_W = 3   // post section width in gu (120mm)
const EAVE_GU = 30  // 1200mm eave cantilever all four sides

export const parameters = {
  pitchDeg: {
    type: 'number' as const,
    label: 'Roof angle (°)',
    description:
      'Monopitch roof angle in degrees. Pivot is the top of the front wall posts. ' +
      'Back wall rises, engawa drops. 5° = near-flat, 45° = steep.',
    min: 5,
    max: 45,
    step: 1,
  },
  engawaWidthGu: {
    type: 'number' as const,
    label: 'Engawa width (gu)',
    description: 'Clear depth of engawa in grid units (1 gu = 40 mm). Default 30 = 1200 mm.',
    min: 15,
    max: 60,
    step: 5,
  },
  floorHeightGu: {
    type: 'number' as const,
    label: 'Floor height (gu)',
    description: 'Height of the floor above ground in grid units (1 gu = 40 mm). Default 20 = 800 mm sub-floor.',
    min: 0,
    max: 40,
    step: 5,
  },
}

export const presets = [
  { id: 'default',     label: 'Gentle slope (15°)',    values: { pitchDeg: 15, engawaWidthGu: 30, floorHeightGu: 20 } },
  { id: 'medium',      label: 'Medium slope (25°)',    values: { pitchDeg: 25, engawaWidthGu: 30, floorHeightGu: 20 } },
  { id: 'steep',       label: 'Steep slope (35°)',     values: { pitchDeg: 35, engawaWidthGu: 30, floorHeightGu: 20 } },
  { id: 'deep-engawa', label: 'Deep engawa (15°)',     values: { pitchDeg: 15, engawaWidthGu: 45, floorHeightGu: 20 } },
]

export const parts = ({
  pitchDeg,
  engawaWidthGu,
  floorHeightGu,
}: {
  pitchDeg: number
  engawaWidthGu: number
  floorHeightGu: number
}) => {
  // ── Named position constants ──────────────────────────────────────────────
  // Avoids POST_X[i] array-index arithmetic at every usage site. The class of
  // bug this prevents: POST_X[2+3] (wrong index) vs POST_X[2]+3 (offset on
  // value) are visually identical. With named constants there is no array to
  // index into.
  //
  // Suffix convention:
  //   xW, xC, xE   — west face of each post column (= POST_X values)
  //   xWE, xCE, xEE — east face of each post column (= POST_X[n] + POST_W)
  //   yB, yF, yE   — south face of each post row
  //   yBN, yFN, yEN — north face of each post row (= y + POST_W)
  const [xW, xC, xE] = POST_X
  const xWE = xW + POST_W   // east face of west column:    3
  const xCE = xC + POST_W   // east face of centre column: 66
  const xEE = xE + POST_W   // east face of east column:  129

  const yB  = POST_Y_BACK
  const yF  = POST_Y_FRONT
  const yE  = yF + POST_W + engawaWidthGu
  const yBN = yB + POST_W   // north face of back wall row:   3
  const yFN = yF + POST_W   // north face of front wall row: 66
  const yEN = yE + POST_W   // north face of engawa row

  // ── Post heights ──────────────────────────────────────────────────────────
  // Roof pivots at the top of the front wall posts. Back wall rises, engawa drops.
  // Horizontal distances measured from front rail (y = yF = 63).
  const FLOOR_Z = floorHeightGu

  const tanPitch      = Math.tan(pitchDeg * Math.PI / 180)
  const POST_H_FRONT  = FLOOR_Z + 60
  const riseGu        = Math.round((yF - yB) * tanPitch)   // rise from front to back rail
  const POST_H_BACK   = POST_H_FRONT + riseGu
  const dropGu        = Math.round((yE - yF) * tanPitch)   // drop from front to engawa rail
  const POST_H_ENGAWA = POST_H_FRONT - dropGu

  // ── Derived Z values ──────────────────────────────────────────────────────
  const ROOF_Z_BACK   = POST_H_BACK   - POST_W
  const ROOF_Z_FRONT  = POST_H_FRONT  - POST_W
  const ROOF_Z_ENGAWA = POST_H_ENGAWA - POST_W
  const PANEL_Z       = FLOOR_Z + POST_W

  // ── Roof module geometry ───────────────────────────────────────────────────
  // Panels span in Y from back eave tip to engawa eave tip, sloped at pitchDeg.
  // The roof is a single plane: z(y) = POST_H_FRONT + (yF − y) × tanPitch.
  // slopedDepthGu = horizontal span / cos(pitch) — the actual length along the slope.
  const yPanelStart   = yB
  const yPanelEnd     = yEN + EAVE_GU
  const dyPanel       = yPanelEnd - yPanelStart
  const pitchRad      = pitchDeg * Math.PI / 180
  const slopedDepthGu = dyPanel / Math.cos(pitchRad)
  const zPanelStart   = POST_H_FRONT + (yF - yPanelStart) * tanPitch

  return [
    // ── Posts ─────────────────────────────────────────────────────────────
    Beam120.Z({ id: 'post-b-w', x: xW, y: yB, z: [0, POST_H_BACK - 3] }),
    Beam120.Z({ id: 'post-b-m', x: xC, y: yB, z: [0, POST_H_BACK - 3] }),
    Beam120.Z({ id: 'post-b-e', x: xE, y: yB, z: [0, POST_H_BACK - 3] }),

    Beam120.Z({ id: 'post-f-w', x: xW, y: yF, z: [0, POST_H_FRONT - 3] }),
    Beam120.Z({ id: 'post-f-m', x: xC, y: yF - 1, z: [0, POST_H_FRONT - 3] }),
    Beam120.Z({ id: 'post-f-e', x: xE, y: yF, z: [0, POST_H_FRONT - 3] }),

    Beam120.Z({ id: 'post-e-w', x: xW, y: yE, z: [0, POST_H_ENGAWA - 3] }),
    Beam120.Z({ id: 'post-e-m', x: xC, y: yE, z: [0, POST_H_ENGAWA - 3] }),
    Beam120.Z({ id: 'post-e-e', x: xE, y: yE, z: [0, POST_H_ENGAWA - 2] }),

    // ── Floor beams — X (fit between posts in each bay) ───────────────────
    Beam120.X({ id: 'beam-fl-x-b-1', x: [xWE - 2, xC - 1], y: yB, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-b-2', x: [xCE - 2, xE - 1], y: yB, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-f-1', x: [xWE - 2, xC - 1], y: yF, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-f-2', x: [xCE - 4, xE - 1], y: yF, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-e-1', x: [xWE - 2, xC - 1], y: yE, z: FLOOR_Z }),
    Beam120.X({ id: 'beam-fl-x-e-2', x: [xCE - 4, xE - 1], y: yE, z: FLOOR_Z }),

    // ── Floor beams — Y (run along each post column) ──────────────────────
    Beam120.Y({ id: 'beam-fl-y-w-int', x: xW, y: [yB - 1, yFN - 1], z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-m-int', x: xC, y: [yB - 1, yFN - 1], z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-e-int', x: xE, y: [yB - 1, yFN - 1], z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-w-eng', x: xW, y: [yFN - 2, yEN - 2], z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-m-eng', x: xC, y: [yFN - 2, yEN - 2], z: FLOOR_Z }),
    Beam120.Y({ id: 'beam-fl-y-e-eng', x: xE, y: [yFN - 2, yEN - 2], z: FLOOR_Z }),

    // ── Roof — primary 120×120 rails in X ────────────────────────────────
    // Single continuous beam per row, eave-to-eave. translate.ts splits each beam
    // at intermediate post intersections automatically for structural analysis.
    // Heights differ per row — this is what shows the monopitch slope in the 3D view.
    Beam120.X({ id: 'roof-x-b', x: [xW - EAVE_GU, xEE + EAVE_GU], y: yB, z: ROOF_Z_BACK }),
    Beam120.X({ id: 'roof-x-f', x: [xW - EAVE_GU, xEE + EAVE_GU], y: yF, z: ROOF_Z_FRONT }),
    Beam120.X({ id: 'roof-x-e', x: [xW - EAVE_GU, xEE + EAVE_GU], y: yE, z: ROOF_Z_ENGAWA }),

    // ── Roof modules — 1200mm (30gu) wide, sloped at pitchDeg ───────────────
    // GridPanel.create() + rotate() is safe here because holes: false causes
    // calculateFasteningPoints() to return [] before the axis-alignment check.
    // Canonical Y = slopedDepthGu (length along slope, not horizontal projection).
    // Rotation -pitchDeg around X tilts the panel so its Y axis points downhill
    // (toward the engawa). Translation puts the back-eave corner on the roof plane.
    ...Array.from(
      { length: Math.ceil((xEE + EAVE_GU - (xW - EAVE_GU)) / 30) },
      (_, i) => {
        const x0 = xW - EAVE_GU + i * 30
        const x1 = Math.min(x0 + 30, xEE + EAVE_GU)
        return GridPanel.create({
          id: `roof-mod-${i}`,
          variantId: 'Grid40mm_Hole8mm_Thickness12mm_MaterialPlywood',
          sizeInGrids: [x1 - x0, slopedDepthGu],
          holes: false,
        })
          .rotate({ angle: -pitchDeg, direction: [1, 0, 0] as [number, number, number] })
          .translate([x0 * 0.04, yPanelStart * 0.04, zPanelStart * 0.04])
      },
    ),

    // ── Floor panels — 4 × 1200×2400mm ply (30gu wide × 60gu deep) ───────
    GridPanel.XY({ id: 'floor-w-1', x: [xWE,      xWE + 30], y: [yBN, yF], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-w-2', x: [xWE + 30, xC],       y: [yBN, yF], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-e-1', x: [xCE,      xCE + 30], y: [yBN, yF], z: PANEL_Z, holes: false }),
    GridPanel.XY({ id: 'floor-e-2', x: [xCE + 30, xE],       y: [yBN, yF], z: PANEL_Z, holes: false }),

    // ── Engawa deck panels ────────────────────────────────────────────────
    GridPanel.XY({ id: 'engawa-1', x: [xWE,      xWE + 30], y: [yFN, yE], z: PANEL_Z - 1, holes: false }),
    GridPanel.XY({ id: 'engawa-2', x: [xWE + 30, xC],       y: [yFN, yE], z: PANEL_Z - 1, holes: false }),
    GridPanel.XY({ id: 'engawa-3', x: [xCE,      xCE + 30], y: [yFN, yE], z: PANEL_Z - 1, holes: false }),
    GridPanel.XY({ id: 'engawa-4', x: [xCE + 30, xE],       y: [yFN, yE], z: PANEL_Z - 1, holes: false }),

    // ── Back wall — 2 bays × 3 panels (20gu wide) + clerestory ───────────
    // Standard story: FLOOR_Z → POST_H_FRONT (3×800mm modules)
    WallFrame.XZ({ id: 'wall-b-1-a', x: [xWE,      xWE + 20], y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-1-b', x: [xWE + 20, xWE + 40], y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-1-c', x: [xWE + 40, xC],       y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-2-a', x: [xCE,      xCE + 20], y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-2-b', x: [xCE + 20, xCE + 40], y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-b-2-c', x: [xCE + 40, xE],       y: yB, z: [FLOOR_Z, POST_H_FRONT] }),
    // Clerestory: fill from POST_H_FRONT to POST_H_BACK in 800mm (20gu) rows; last row may be partial
    ...Array.from({ length: Math.ceil(riseGu / 20) }, (_, row) => {
      const zBot = POST_H_FRONT + row * 20
      const zTop = Math.min(zBot + 20, POST_H_BACK)
      return [
        WallFrame.XZ({ id: `wall-b-1-cl-${row}-a`, x: [xWE,      xWE + 20], y: yB, z: [zBot, zTop] }),
        WallFrame.XZ({ id: `wall-b-1-cl-${row}-b`, x: [xWE + 20, xWE + 40], y: yB, z: [zBot, zTop] }),
        WallFrame.XZ({ id: `wall-b-1-cl-${row}-c`, x: [xWE + 40, xC],       y: yB, z: [zBot, zTop] }),
        WallFrame.XZ({ id: `wall-b-2-cl-${row}-a`, x: [xCE,      xCE + 20], y: yB, z: [zBot, zTop] }),
        WallFrame.XZ({ id: `wall-b-2-cl-${row}-b`, x: [xCE + 20, xCE + 40], y: yB, z: [zBot, zTop] }),
        WallFrame.XZ({ id: `wall-b-2-cl-${row}-c`, x: [xCE + 40, xE],       y: yB, z: [zBot, zTop] }),
      ]
    }).flat(),

    // ── Front wall — 2 bays × 3 panels ───────────────────────────────────
    WallFrame.XZ({ id: 'wall-f-1-a', x: [xWE,      xWE + 20], y: yF, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-1-b', x: [xWE + 20, xWE + 40], y: yF, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-1-c', x: [xWE + 40, xC],       y: yF, z: [FLOOR_Z, POST_H_FRONT - 1] }),
    WallFrame.XZ({ id: 'wall-f-2-a', x: [xCE,      xCE + 20], y: yF, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-2-b', x: [xCE + 20, xCE + 40], y: yF, z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.XZ({ id: 'wall-f-2-c', x: [xCE + 40, xE],       y: yF, z: [FLOOR_Z, POST_H_FRONT] }),

    // ── Side walls — 3 panels per side (20gu wide × story tall) ──────────
    // Main wall section: FLOOR_Z to POST_H_FRONT (same both sides)
    WallFrame.YZ({ id: 'wall-w-a', x: xW, y: [yBN,      yBN + 20], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-w-b', x: xW, y: [yBN + 20, yBN + 40], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-w-c', x: xW, y: [yBN + 40, yF],       z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-a', x: xE, y: [yBN,      yBN + 20], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-b', x: xE, y: [yBN + 20, yBN + 40], z: [FLOOR_Z, POST_H_FRONT] }),
    WallFrame.YZ({ id: 'wall-e-c', x: xE, y: [yBN + 40, yF],       z: [FLOOR_Z, POST_H_FRONT] }),
    // Gable panels — right triangle filling the clerestory taper on each side wall.
    // Right angle at (yBN, POST_H_FRONT): base runs to yF, height rises to POST_H_BACK.
    GablePanel.YZ({ id: 'gable-w', x: xW, y: [yBN, yF], z: POST_H_FRONT, heightInGrids: riseGu }),
    GablePanel.YZ({ id: 'gable-e', x: xE, y: [yBN, yF], z: POST_H_FRONT, heightInGrids: riseGu }),
  ]
}
