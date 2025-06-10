attribute vec2 aVertexPosition;

uniform mat4 uModelViewProjectionMatrix;

void main() {
  gl_Position = uModelViewProjectionMatrix * vec4(aVertexPosition, 0.0, 1.0);
}
