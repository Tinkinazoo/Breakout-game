import { Brick } from './brick.js';

export function createLevel(level, canvasWidth, areaHeight, gl) {
  const bricks = [];
  const rows = 5 + level;
  const cols = 10;
  const brickWidth = canvasWidth / cols - 4;
  const brickHeight = areaHeight / rows - 4;
  
  const colors = [
    [1.0, 0.0, 0.0], // Red
    [1.0, 0.5, 0.0], // Orange
    [1.0, 1.0, 0.0], // Yellow
    [0.0, 1.0, 0.0], // Green
    [0.0, 0.0, 1.0], // Blue
  ];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (brickWidth + 4) + 2;
      const y = r * (brickHeight + 4) + 2;
      const color = colors[r % colors.length];
      const points = (rows - r) * 10;
      
      bricks.push(new Brick(x, y, brickWidth, brickHeight, color, points, gl));
    }
  }
  
  return bricks;
}
