//******************************************************************************
/**
 * Bullet shoting when game in kaigua mode.
 */
function Bullet(canvasCtx) {
  this.canvasCtx = canvasCtx;
  this.width = this.canvasCtx.canvas.width;
  this.remove = false;
  this.xPos = 0;
  this.yPos = 0;
  this.time = 0;
  this.config = Bullet.config;
  this.init();
}
/**
 * Bullet config.
 * @enum {any}
 */
Bullet.config = {
  WIDTH: 20,
  HEIGHT: 10,
  OFFSET_LEFT: 3,
  OFFSET_TOP: 8,
  SPEED: 8,
  SHOT_DELAY: 500
}

Bullet.prototype = {
  /**
   * Bullet obj initialize.
   */
  init: function() {
    this.loadImages();
  },
  /**
   * Set the animation status.
   * @param {number} x
   * @param {number} y
   */
  update: function(x, y) {
    if (!this.remove) {
      if (!this.savedX) {
        this.savedX = x + Trex.config.WIDTH - this.config.WIDTH - this.config.OFFSET_LEFT;
        this.xPos = this.savedX;
      }
      if (!this.savedY) {
        this.savedY = y + this.config.OFFSET_TOP;
        this.yPos = this.savedY;
      }
      this.draw(this.xPos, this.yPos);
      this.xPos += this.config.SPEED;
      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  },
  /**
   * Draw the bullet to a particular position.
   * @param {number} xPos
   */
  draw: function(x, y) {
    var x = x || this.savedX;
    if (this.image) {
      this.canvasCtx.drawImage(this.image, x, y, this.config.WIDTH, this.config.HEIGHT);
    }
  },
  /**
   * Get the bullet asset.
   */
  loadImages: function() {
    this.image = document.getElementById('bullet');
  },
  /**
   * Check if bullet is visible.
   * @return {boolean} Whether the bullet is in the game area.
   */
  isVisible: function() {
    return this.xPos < this.width;
  }
}

