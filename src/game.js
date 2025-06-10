import { Renderer } from './renderer.js';
import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { Brick, createLevel } from './levels.js';

export class Game {
  constructor(canvas, scoreDisplay, livesDisplay) {
    this.canvas = canvas;
    this.scoreDisplay = scoreDisplay;
    this.livesDisplay = livesDisplay;
    
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameState = 'READY'; // READY, PLAYING, GAME_OVER, LEVEL_COMPLETE
    
    this.renderer = new Renderer(canvas);
    this.ball = new Ball(this.renderer.gl);
    this.paddle = new Paddle(this.renderer.gl);
    this.bricks = [];
    
    this.keys = {};
    this.mouseX = 0;
    
    this.setupEventListeners();
    this.resizeCanvas();
    this.startLevel();
  }
  
  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      
      if (e.key === ' ' && this.gameState !== 'PLAYING') {
        if (this.gameState === 'GAME_OVER') {
          this.resetGame();
        } else {
          this.gameState = 'PLAYING';
        }
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });
  }
  
  resizeCanvas() {
    const width = Math.min(800, window.innerWidth - 40);
    const height = Math.min(600, window.innerHeight - 40);
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.renderer.handleResize();
    
    // Adjust game elements
    this.paddle.width = width / 6;
    this.paddle.height = 10;
    this.paddle.y = height - 30;
    
    this.ball.radius = 8;
    this.resetBall();
    
    // Recreate bricks for the current level
    this.startLevel();
  }
  
  handleResize() {
    this.resizeCanvas();
  }
  
  startLevel() {
    this.bricks = createLevel(this.level, this.canvas.width, this.canvas.height / 3, this.renderer.gl);
    this.gameState = 'READY';
    this.resetBall();
  }
  
  resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - 50;
    this.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    this.ball.dy = -4;
  }
  
  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.updateUI();
    this.startLevel();
  }
  
  update(timestamp) {
    if (this.gameState !== 'PLAYING') return;
    
    // Update paddle position
    if (this.keys['ArrowLeft'] || this.keys['a']) {
      this.paddle.x -= 8;
    }
    if (this.keys['ArrowRight'] || this.keys['d']) {
      this.paddle.x += 8;
    }
    
    // Also allow mouse control
    if (this.mouseX > 0) {
      this.paddle.x = this.mouseX - this.paddle.width / 2;
    }
    
    // Keep paddle in bounds
    this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
    
    // Update ball position
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;
    
    // Ball-wall collisions
    if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.dx *= -1;
      this.playSound('bounce');
    }
    
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.dy *= -1;
      this.playSound('bounce');
    }
    
    // Ball-paddle collision
    if (
      this.ball.y + this.ball.radius > this.paddle.y &&
      this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
      this.ball.x + this.ball.radius > this.paddle.x &&
      this.ball.x - this.ball.radius < this.paddle.x + this.paddle.width
    ) {
      // Calculate bounce angle based on where ball hits paddle
      const hitPos = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
      this.ball.dx = hitPos * 5;
      this.ball.dy = -Math.abs(this.ball.dy);
      this.playSound('bounce');
    }
    
    // Ball out of bounds (bottom)
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.lives--;
      this.updateUI();
      
      if (this.lives <= 0) {
        this.gameState = 'GAME_OVER';
      } else {
        this.gameState = 'READY';
        this.resetBall();
      }
    }
    
    // Ball-brick collisions
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      if (!brick.visible) continue;
      
      if (
        this.ball.x + this.ball.radius > brick.x &&
        this.ball.x - this.ball.radius < brick.x + brick.width &&
        this.ball.y + this.ball.radius > brick.y &&
        this.ball.y - this.ball.radius < brick.y + brick.height
      ) {
        // Determine which side was hit
        const ballCenterX = this.ball.x;
        const ballCenterY = this.ball.y;
        const brickCenterX = brick.x + brick.width / 2;
        const brickCenterY = brick.y + brick.height / 2;
        
        // Calculate differences
        const dx = ballCenterX - brickCenterX;
        const dy = ballCenterY - brickCenterY;
        
        // Determine which axis to bounce on
        if (Math.abs(dx) > Math.abs(dy)) {
          this.ball.dx *= -1;
        } else {
          this.ball.dy *= -1;
        }
        
        brick.visible = false;
        this.score += brick.points;
        this.updateUI();
        this.playSound('break');
        
        // Check if level is complete
        const bricksLeft = this.bricks.filter(b => b.visible).length;
        if (bricksLeft === 0) {
          this.level++;
          this.gameState = 'LEVEL_COMPLETE';
          setTimeout(() => this.startLevel(), 1500);
        }
        
        break; // Only handle one collision per frame
      }
    }
  }
  
  render() {
    this.renderer.clear();
    
    // Draw bricks
    this.bricks.forEach(brick => {
      if (brick.visible) {
        this.renderer.drawRect(brick.x, brick.y, brick.width, brick.height, brick.color);
      }
    });
    
    // Draw paddle
    this.renderer.drawRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, [1.0, 1.0, 1.0]);
    
    // Draw ball
    this.renderer.drawCircle(this.ball.x, this.ball.y, this.ball.radius, [1.0, 1.0, 1.0]);
    
    // Draw game state messages
    if (this.gameState === 'READY') {
      this.renderer.drawText('PRESS SPACE TO START', this.canvas.width / 2, this.canvas.height / 2, 24, [1.0, 1.0, 1.0]);
    } else if (this.gameState === 'GAME_OVER') {
      this.renderer.drawText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2, 32, [1.0, 0.0, 0.0]);
      this.renderer.drawText('PRESS SPACE TO PLAY AGAIN', this.canvas.width / 2, this.canvas.height / 2 + 40, 20, [1.0, 1.0, 1.0]);
    } else if (this.gameState === 'LEVEL_COMPLETE') {
      this.renderer.drawText(`LEVEL ${this.level - 1} COMPLETE!`, this.canvas.width / 2, this.canvas.height / 2, 32, [0.0, 1.0, 0.0]);
    }
  }
  
  updateUI() {
    this.scoreDisplay.textContent = `SCORE: ${this.score}`;
    this.livesDisplay.textContent = `LIVES: ${this.lives}`;
  }
  
  playSound(type) {
    // In a real implementation, you would use the Web Audio API here
    // For simplicity, we'll just log the sound event
    console.log(`Play sound: ${type}`);
  }
}
