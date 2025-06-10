export class Brick {
  constructor(x, y, width, height, color, points, gl) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.points = points;
    this.visible = true;
    this.gl = gl;
  }
}
