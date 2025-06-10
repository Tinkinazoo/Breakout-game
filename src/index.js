import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const scoreDisplay = document.getElementById('score-display');
  const livesDisplay = document.getElementById('lives-display');
  
  const game = new Game(canvas, scoreDisplay, livesDisplay);
  
  function gameLoop(timestamp) {
    game.update(timestamp);
    game.render();
    requestAnimationFrame(gameLoop);
  }
  
  requestAnimationFrame(gameLoop);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.handleResize();
  });
});
