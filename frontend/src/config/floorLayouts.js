export const buildingLayouts = {
  "Bucharest": {
    // Each floor uses the same layout in this example
    "0": {
      viewBox: "0 0 840 600", // Matches the original blueprint dimensions (70' x 50')
      baseElements: [
        // Main outline
        { type: 'rect', x: 0, y: 0, width: 840, height: 600, fill: 'none', stroke: '#e5e5e5', strokeWidth: 2 },
        // Corridors and walkways (horizontal line in middle)
        { type: 'path', d: 'M 0 300 H 840', stroke: '#e5e5e5', strokeWidth: 1, strokeDasharray: '4 4' }
      ],
      rooms: {
        // Top row, left to right
        "0.01": { x: 0, y: 0, width: 132, height: 150, label: { x: 66, y: 75 } },           // Office
        "0.02": { x: 132, y: 0, width: 120, height: 150, label: { x: 192, y: 75 } },        // Server
        "0.03": { x: 252, y: 0, width: 114, height: 150, label: { x: 309, y: 75 } },        // Office
        "0.04": { x: 366, y: 0, width: 114, height: 150, label: { x: 423, y: 75 } },        // Office
        "0.05": { x: 480, y: 0, width: 114, height: 150, label: { x: 537, y: 75 } },        // Office
        "0.06": { x: 594, y: 0, width: 246, height: 150, label: { x: 717, y: 75 } },        // Office
      }
    },
    "1": {
      viewBox: "0 0 840 600", // Matches the original blueprint dimensions (70' x 50')
      baseElements: [
        // Main outline
        { type: 'rect', x: 0, y: 0, width: 840, height: 600, fill: 'none', stroke: '#e5e5e5', strokeWidth: 2 },
        // Corridors and walkways (horizontal line in middle)
        { type: 'path', d: 'M 0 300 H 840', stroke: '#e5e5e5', strokeWidth: 1, strokeDasharray: '4 4' }
      ],
      rooms: {
        // Top row, left to right
        "1.01": { x: 0, y: 0, width: 132, height: 150, label: { x: 66, y: 75 } },           // Office
        "1.02": { x: 132, y: 0, width: 120, height: 150, label: { x: 192, y: 75 } },        // Server
        "1.03": { x: 252, y: 0, width: 114, height: 150, label: { x: 309, y: 75 } },        // Office
        "1.04": { x: 366, y: 0, width: 114, height: 150, label: { x: 423, y: 75 } },        // Office
        "1.05": { x: 480, y: 0, width: 114, height: 150, label: { x: 537, y: 75 } },        // Office
        "1.06": { x: 594, y: 0, width: 246, height: 150, label: { x: 717, y: 75 } },        // Office
      }
    }
  }
};