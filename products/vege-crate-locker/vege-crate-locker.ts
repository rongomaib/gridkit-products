import type { Params, Parts, PartsFn, Plugins, Presets } from '@villagekit/design/kit'
import { GridBeam } from '@villagekit/part-gridbeam/creator'
import { GridPanel } from '@villagekit/part-gridpanel/creator'
import { Hinge, HINGE_DOOR_PANEL_Y } from '@villagekit/part-hinge/creator'

export const parameters = {
  columns: {
    label: 'Columns (Horizontal Bays)',
    shortId: 'c',
    type: 'number',
    min: 1,
    max: 4,
    step: 1,
  },
  tiers: {
    label: 'Tiers (Vertical Bays)',
    shortId: 't',
    type: 'number',
    min: 1,
    max: 4,
    step: 1,
  },
  bayWidth: {
    label: 'Bay Width (grid units)',
    shortId: 'w',
    type: 'number',
    min: 5,
    max: 20,
    step: 1,
    default: 10,
  },
  bayDepth: {
    label: 'Bay Depth (grid units)',
    shortId: 'p',
    type: 'number',
    min: 5,
    max: 25,
    step: 1,
    default: 15,
  },
  bayHeight: {
    label: 'Bay Height (grid units)',
    shortId: 'h',
    type: 'number',
    min: 3,
    max: 15,
    step: 1,
    default: 6,
  },
  hasDoors: {
    label: 'Doors',
    shortId: 'd',
    type: 'boolean',
    default: false,
  },
  hasRearPanels: {
    label: 'Rear Panels',
    shortId: 'r',
    type: 'boolean',
    default: true,
  },
  hasSidePanels: {
    label: 'Side Panels',
    shortId: 's',
    type: 'boolean',
    default: true,
  },
  doorAngle: {
    label: 'Door Angle',
    shortId: 'a',
    type: 'number',
    min: 0,
    max: 180,
    step: 5,
    default: 0,
  },
} satisfies Params

export const presets: Presets<typeof parameters> = [
  {
    id: 'single',
    label: 'Single Crate',
    values: {
      columns: 1,
      tiers: 1,
      bayWidth: 10,
      bayDepth: 15,
      bayHeight: 6,
      hasDoors: true,
      hasRearPanels: true,
      hasSidePanels: true,
      doorAngle: 0,
    },
  },
  {
    id: 'locker-3x3',
    label: '3x3 Locker',
    values: {
      columns: 3,
      tiers: 3,
      bayWidth: 10,
      bayDepth: 15,
      bayHeight: 6,
      hasDoors: false,
      hasRearPanels: true,
      hasSidePanels: true,
      doorAngle: 0,
    },
  },
  {
    id: 'locker-3x3-doors',
    label: '3x3 Locker w/ Doors',
    values: {
      columns: 3,
      tiers: 3,
      bayWidth: 10,
      bayDepth: 15,
      bayHeight: 6,
      hasDoors: true,
      hasRearPanels: true,
      hasSidePanels: true,
      doorAngle: 90,
    },
  },
]

export const plugins: Plugins = ['smart-fasteners']

export const parts: PartsFn<typeof parameters> = (parameters) => {
  const { columns, tiers, bayWidth, bayDepth, bayHeight, hasDoors, hasRearPanels, hasSidePanels, doorAngle } = parameters

  const totalWidth = columns * bayWidth + 1
  const totalDepth = bayDepth + 1
  const totalHeight = tiers * bayHeight + 1

  return [
    posts({ columns, tiers, bayWidth, bayDepth, bayHeight, totalWidth, totalDepth, totalHeight }),
    shelves({ columns, tiers, bayWidth, bayDepth, bayHeight, totalWidth, totalDepth, totalHeight }),
    hasDoors ? doors({ columns, tiers, bayWidth, bayHeight, doorAngle }) : null,
    hasRearPanels ? rearPanels({ totalWidth, totalDepth, totalHeight }) : null,
    hasSidePanels ? sidePanels({ totalWidth, totalDepth, totalHeight }) : null,
  ] satisfies Parts
}

type Options = {
  columns: number
  tiers: number
  bayWidth: number
  bayDepth: number
  bayHeight: number
  totalWidth: number
  totalDepth: number
  totalHeight: number
  doorAngle?: number
}

function posts({ columns, bayWidth, totalDepth, totalHeight }: Options): Parts {
  const parts: Parts = []

  for (let c = 0; c <= columns; c++) {
    const x = c * bayWidth

    parts.push(GridBeam.Z({
      id: `front-post-${c}`,
      x,
      y: 0,
      z: [-2, totalHeight],
    }))

    parts.push(GridBeam.Z({
      id: `back-post-${c}`,
      x,
      y: totalDepth - 1,
      z: [-2, totalHeight],
    }))
  }

  return parts
}

function shelves({ columns, tiers, bayWidth, bayHeight, totalWidth, totalDepth, totalHeight }: Options): Parts {
  const parts: Parts = []

  for (let t = 0; t < tiers; t++) {
    const z = t * bayHeight

    for (let c = 0; c < columns; c++) {
      const xStart = c * bayWidth

      parts.push(GridBeam.Y({
        id: `left-side-support-t${t}-c${c}`,
        x: xStart + 1,
        y: [0, totalDepth],
        z: z,
      }))

      parts.push(GridBeam.Y({
        id: `right-side-support-t${t}-c${c}`,
        x: xStart + bayWidth - 1,
        y: [0, totalDepth],
        z: z,
      }))

      parts.push(GridPanel.XY({
        id: `shelf-panel-t${t}-c${c}`,
        x: [xStart + 1, xStart + bayWidth],
        y: [1, totalDepth - 1],
        z: z + 1,
      }))
    }
  }

  parts.push(GridPanel.XY({
    id: 'roof-panel',
    x: [0, totalWidth - 0],
    y: [totalDepth - 1, -1],
    z: totalHeight,
  }))

  return parts
}

function doors({ columns, tiers, bayWidth, bayHeight, doorAngle = 0 }: Pick<Options, 'columns' | 'tiers' | 'bayWidth' | 'bayHeight' | 'doorAngle'>): Parts {
  const parts: Parts = []

  for (let t = 0; t < tiers; t++) {
    const zStart = t * bayHeight
    for (let c = 0; c < columns; c++) {
      const xStart = c * bayWidth

      let doorPanel = GridPanel.XZ({
        id: `door-panel-t${t}-c${c}`,
        x: [xStart + bayWidth - 1, xStart - 1],
        y: HINGE_DOOR_PANEL_Y - 1.4, // door is 1 unit in front of the post
        z: [zStart, zStart + bayHeight + 1],
        fit: 'top',
      })

      if (doorAngle !== 0) {
        doorPanel = doorPanel.rotate({
          angle: -doorAngle, // rotate outwards
          origin: [(xStart - 1) * 0.04 + 0.022, -0.02, 0], // hinge barrel origin
          direction: [0, 0, 1]
        })
      }

      parts.push(doorPanel)

      // Two hinges on left side of each door. angle=0 = folded closed.
      // Barrel at x=xStart (left post), each hinge offset 1 grid unit from bay top/bottom.
      parts.push(Hinge.Door({
        id: `hinge-t${t}-c${c}-bottom`,
        x: xStart - 1,
        z: zStart,
        angle: doorAngle,
      }).rotate({
        angle: -90,
        origin: [(xStart - 1) * 0.04 + 0.022, -0.02, 0],
        direction: [0, 0, 1]
      }))

      parts.push(Hinge.Door({
        id: `hinge-t${t}-c${c}-top`,
        x: xStart - 0.95,
        z: zStart + bayHeight - 1,
        angle: doorAngle,
      }).rotate({
        angle: -90,
        origin: [(xStart - 1) * 0.04 + 0.022, -0.02, 0],
        direction: [0, 0, 1]
      }))
    }
  }

  return parts
}

function rearPanels({ totalWidth, totalDepth, totalHeight }: Omit<Options, 'columns' | 'tiers' | 'bayWidth' | 'bayDepth' | 'bayHeight'>): Parts {
  const parts: Parts = []

  parts.push(GridPanel.XZ({
    id: 'rear-panel',
    x: [totalWidth - 1, -1],
    y: totalDepth,
    z: [0, totalHeight],
    fit: 'bottom',
  }))

  return parts
}

function sidePanels({ totalWidth, totalDepth, totalHeight }: Omit<Options, 'columns' | 'tiers' | 'bayWidth' | 'bayDepth' | 'bayHeight'>): Parts {
  const parts: Parts = []

  parts.push(GridPanel.YZ({
    id: 'left-side-panel',
    x: -1,
    y: [totalDepth - 1, -1],
    z: [0, totalHeight],
    fit: 'top',
  }))

  parts.push(GridPanel.YZ({
    id: 'right-side-panel',
    x: totalWidth + 1 - 1,
    y: [totalDepth - 1, -1],
    z: [0, totalHeight],
    fit: 'bottom',
  }))

  return parts
}
