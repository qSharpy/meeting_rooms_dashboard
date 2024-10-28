export const buildingLayouts = {
  "Bucharest": {
    // Each floor uses the same layout in this example
    "0": {
      viewBox: "0 0 840 600", // Matches the original blueprint dimensions (70' x 50')
      rooms: {
        // Top row, left to right
        "0.01": { x: 0, y: 90, width: 132, height: 150, label: { x: 66, y: 75 } },           // Office
        "0.02": { x: 132, y: 90, width: 120, height: 150, label: { x: 192, y: 75 } },        // Server
        "0.03": { x: 252, y: 90, width: 114, height: 150, label: { x: 309, y: 75 } },        // Office
        "0.04": { x: 366, y: 90, width: 114, height: 150, label: { x: 423, y: 75 } },        // Office
        "0.05": { x: 480, y: 90, width: 114, height: 150, label: { x: 537, y: 75 } },        // Office
        "0.06": { x: 594, y: 90, width: 246, height: 150, label: { x: 717, y: 75 } },        // Office
      }
    },
    "4": {
      viewBox: "0 0 840 600", // Matches the original blueprint dimensions (70' x 50')
      rooms: {
        // Top row, left to right
        "4.01": { x: 0, y: 90, width: 132, height: 150, label: { x: 66, y: 75 } },           // Office
        "4.02": { x: 132, y: 90, width: 120, height: 150, label: { x: 192, y: 75 } },        // Server
        "4.03": { x: 252, y: 90, width: 114, height: 150, label: { x: 309, y: 75 } },        // Office
        "4.04": { x: 366, y: 90, width: 114, height: 150, label: { x: 423, y: 75 } },        // Office
        "4.05": { x: 480, y: 90, width: 114, height: 150, label: { x: 537, y: 75 } },        // Office
        "4.06": { x: 594, y: 90, width: 246, height: 150, label: { x: 717, y: 75 } },        // Office
      }
    }
  }
};