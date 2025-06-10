import { mat4 } from 'gl-matrix';
import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
    
    this.initShaders();
    this.initBuffers();
    this.initTextRendering();
    
    this.projectionMatrix = mat4.create();
    this.updateProjectionMatrix();
  }
  
  initShaders() {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);
    
    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(this.shaderProgram));
    }
    
    this.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.colorUniform = this.gl.getUniformLocation(this.shaderProgram, 'uColor');
    this.matrixUniform = this.gl.getUniformLocation(this.shaderProgram, 'uModelViewProjectionMatrix');
  }
  
  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  initBuffers() {
    // Rectangle buffer
    this.rectangleBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectangleBuffer);
    
    const vertices = [
      -0.5, -0.5,
       0.5, -0.5,
      -0.5,  0.5,
       0.5,  0.5
    ];
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    
    // Circle buffer (unit circle)
    const circleVertices = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circleVertices.push(Math.cos(angle), Math.sin(angle));
    }
    
    this.circleBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(circleVertices), this.gl.STATIC_DRAW);
    this.circleSegments = segments;
  }
  
  initTextRendering() {
    // Simple text rendering using canvas 2D API as fallback
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = 256;
    this.textCanvas.height = 128;
    this.textCtx = this.textCanvas.getContext('2d');
    this.textTexture = this.gl.createTexture();
  }
  
  updateProjectionMatrix() {
    mat4.ortho(this.projectionMatrix, 0, this.canvas.width, this.canvas.height, 0, -1, 1);
  }
  
  handleResize() {
    this.updateProjectionMatrix();
  }
  
  clear() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
  
  drawRect(x, y, width, height, color) {
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [x + width/2, y + height/2, 0]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [width, height, 1]);
    
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, this.projectionMatrix, modelViewMatrix);
    
    this.gl.useProgram(this.shaderProgram);
    this.gl.uniformMatrix4fv(this.matrixUniform, false, mvpMatrix);
    this.gl.uniform3fv(this.colorUniform, color);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectangleBuffer);
    this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
    this.gl.vertexAttribPointer(this.vertexPositionAttribute, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  
  drawCircle(x, y, radius, color) {
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, 0]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [radius, radius, 1]);
    
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, this.projectionMatrix, modelViewMatrix);
    
    this.gl.useProgram(this.shaderProgram);
    this.gl.uniformMatrix4fv(this.matrixUniform, false, mvpMatrix);
    this.gl.uniform3fv(this.colorUniform, color);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circleBuffer);
    this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
    this.gl.vertexAttribPointer(this.vertexPositionAttribute, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, this.circleSegments + 1);
  }
  
  drawText(text, x, y, size, color) {
    // Simple text rendering using canvas 2D API
    this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    this.textCtx.font = `${size}px 'Courier New', monospace`;
    this.textCtx.fillStyle = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`;
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'middle';
    this.textCtx.fillText(text, this.textCanvas.width / 2, this.textCanvas.height / 2);
    
    // Upload texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textCanvas);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    
    // Draw texture as a quad
    const width = this.textCtx.measureText(text).width;
    const height = size * 1.2;
    
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, 0]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [width, height, 1]);
    
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, this.projectionMatrix, modelViewMatrix);
    
    // For simplicity, we'll use the same shader but with texture
    this.gl.useProgram(this.shaderProgram);
    this.gl.uniformMatrix4fv(this.matrixUniform, false, mvpMatrix);
    this.gl.uniform3fv(this.colorUniform, [1.0, 1.0, 1.0]); // White for texture
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rectangleBuffer);
    this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
    this.gl.vertexAttribPointer(this.vertexPositionAttribute, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
    
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
