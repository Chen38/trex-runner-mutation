//******************************************************************************
/**
 * T-rex game character.
 * @param {HTMLCanvas} canvas
 * @param {Object} spritePos Positioning within image sprite.
 * @constructor
 */
function Trex(canvas, spritePos, spriteTextPos, canvasWidth) {
  this.canvas = canvas;
  this.canvasCtx = canvas.getContext('2d');
  this.spritePos = spritePos;
  this.spriteTextPos = spriteTextPos;
  this.xPos = 0;
  this.yPos = 0;
  // Position when on the ground.
  this.groundYPos = 0;
  this.currentFrame = 0;
  this.currentAnimFrames = [];
  this.blinkDelay = 0;
  this.animStartTime = 0;
  this.timer = 0;
  this.msPerFrame = 1000 / FPS;
  this.config = Trex.config;
  // Current status.
  this.status = Trex.status.WAITING;
  this.jumping = false;
  this.ducking = false;
  this.jumpVelocity = 0;
  this.reachedMinHeight = false;
  this.speedDrop = false;
  this.jumpCount = 0;
  this.jumpspotX = 0;
  // Shot status
  this.bullets = [];
  this.bulletsAmounts = 0;
  this.bulletAmountsX = 0;
  this.bulletAmountsY = 8;
  this.defaultBulletAmountString = '';
  this.bulletDigits = [];
  this.init(canvasWidth);
};
/**
 * T-rex player config.
 * @enum {number}
 */
Trex.config = {
  DROP_VELOCITY: -5,
  GRAVITY: 0.6,
  HEIGHT: 47,
  HEIGHT_DUCK: 25,
  INIITAL_JUMP_VELOCITY: -10,
  INTRO_DURATION: 1500,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPEED_DROP_COEFFICIENT: 3,
  SPRITE_WIDTH: 262,
  START_X_POS: 50,
  WIDTH: 44,
  WIDTH_DUCK: 59,
  MAX_BULLETS_UNITS: 4
};
/**
 * Used in collision detection.
 * @type {Array<CollisionBox>}
 */
Trex.collisionBoxes = {
  DUCKING: [
    new CollisionBox(1, 18, 55, 25)
  ],
  RUNNING: [
    new CollisionBox(22, 0, 17, 16),
    new CollisionBox(1, 18, 30, 9),
    new CollisionBox(10, 35, 14, 8),
    new CollisionBox(1, 24, 29, 5),
    new CollisionBox(5, 30, 21, 4),
    new CollisionBox(9, 34, 15, 4)
  ]
};
/**
 * Animation states.
 * @enum {string}
 */
Trex.status = {
  CRASHED: 'CRASHED',
  DUCKING: 'DUCKING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING'
};
/**
 * Blinking coefficient.
 * @const
 */
Trex.BLINK_TIMING = 7000;
/**
 * Animation config for different states.
 * @enum {Object}
 */
Trex.animFrames = {
  WAITING: {
    frames: [44, 0],
    msPerFrame: 1000 / 3
  },
  RUNNING: {
    frames: [88, 132],
    msPerFrame: 1000 / 12
  },
  CRASHED: {
    frames: [220],
    msPerFrame: 1000 / 60
  },
  JUMPING: {
    frames: [0],
    msPerFrame: 1000 / 60
  },
  DUCKING: {
    frames: [262, 321],
    msPerFrame: 1000 / 8
  }
};
Trex.prototype = {
  /**
   * T-rex player initaliser.
   * Sets the t-rex to blink at random intervals.
   */
  init: function(canvasWidth) {
    this.blinkDelay = this.setBlinkDelay();
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
      Runner.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
    this.draw(0, 0);
    this.update(0, Trex.status.WAITING);
    this.calcXPos(canvasWidth);

    for (var i = 0; i < this.config.MAX_BULLETS_UNITS; i++) {
      this.drawBulletAmounts(i, 0);
      this.defaultBulletAmountString += '0';
    }
  },
  /**
   * Calculate the xPos in the canvas.
   * @param {number} canvasWidth
   */
  calcXPos: function(canvasWidth) {
    this.bulletAmountsX = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
      (Trex.config.MAX_BULLETS_UNITS + 1));
  },
  /**
   * Setter for the jump velocity.
   * The approriate drop velocity is also set.
   */
  setJumpVelocity: function(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
  },
  /**
   * Set the animation status.
   * @param {!number} deltaTime
   * @param {Trex.status} status Optional status to switch to.
   */
  update: function(deltaTime, opt_status) {
    this.timer += deltaTime;
    // Update the status.
    if (opt_status) {
      this.status = opt_status;
      this.currentFrame = 0;
      this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
      this.currentAnimFrames = Trex.animFrames[opt_status].frames;
      if (opt_status == Trex.status.WAITING) {
        this.animStartTime = getTimeStamp();
        this.setBlinkDelay();
      }
    }
    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += Math.round((this.config.START_X_POS /
        this.config.INTRO_DURATION) * deltaTime);
    }
    if (this.status == Trex.status.WAITING) {
      this.blink(getTimeStamp());
    } else {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }
    // Update the frame position.
    if (this.timer >= this.msPerFrame) {
      this.currentFrame = this.currentFrame ==
        this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
      this.timer = 0;
    }
    // Speed drop becomes duck if the down key is still being pressed.
    if (this.speedDrop && this.yPos == this.groundYPos) {
      this.speedDrop = false;
      this.setDuck(true);
    }
  },
  /**
   * Draw the t-rex to a particular position.
   * @param {number} x
   * @param {number} y
   */
  draw: function(x, y) {
    var sourceX = x;
    var sourceY = y;
    var sourceWidth = this.ducking && this.status != Trex.status.CRASHED ?
      this.config.WIDTH_DUCK : this.config.WIDTH;
    var sourceHeight = this.config.HEIGHT;
    if (IS_HIDPI) {
      sourceX *= 2;
      sourceY *= 2;
      sourceWidth *= 2;
      sourceHeight *= 2;
    }
    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;
    // Ducking.
    if (this.ducking && this.status != Trex.status.CRASHED) {
      this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        this.config.WIDTH_DUCK, this.config.HEIGHT);

    }
    else {
      // Crashed whilst ducking. Trex is standing up so needs adjustment.
      if (this.ducking && this.status == Trex.status.CRASHED) {
        this.xPos++;
      }

      // Standing / running
      this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        this.config.WIDTH, this.config.HEIGHT);
    }
  },
  /**
   * Sets a random time for the blink to happen.
   */
  setBlinkDelay: function() {
    this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
  },
  /**
   * Make t-rex blink at random intervals.
   * @param {number} time Current time in milliseconds.
   */
  blink: function(time) {
    var deltaTime = time - this.animStartTime;
    if (deltaTime >= this.blinkDelay) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
      if (this.currentFrame == 1) {
        // Set new random delay to blink.
        this.setBlinkDelay();
        this.animStartTime = time;
      }
    }
  },
  /**
   * Shot every obstacle.
   */
  shoot: function() {
    if (this.bulletsAmounts > 0) {
      this.bulletsAmounts--;
      this.addNewBullet(this.canvasCtx);
    }
  },
  /**
   * Add bullet objs.
   */
  addNewBullet: function(ctx) {
    var newBullet = new Bullet(ctx);
    this.bullets.push(newBullet);
  },
  /**
   * Update bullets amount
   */
  updateBullets: function() {
    this.bulletDigits = (this.defaultBulletAmountString + this.bulletsAmounts).substr(-this.config.MAX_BULLETS_UNITS).split('');

    for (var i = 0; i < this.config.MAX_BULLETS_UNITS; i++) {
      this.drawBulletAmounts(i, this.bulletDigits[i]);
    }
  },
  /**
   * Draw the amounts of bullets.
   */
  drawBulletAmounts: function(digitPos, value) {
    var sourceWidth = DistanceMeter.dimensions.WIDTH;
    var sourceHeight = DistanceMeter.dimensions.HEIGHT;
    var sourceX = DistanceMeter.dimensions.WIDTH * value;
    var sourceY = 0;
    var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
    var targetY = this.bulletAmountsY + DistanceMeter.dimensions.HEIGHT;
    var targetWidth = DistanceMeter.dimensions.WIDTH;
    var targetHeight = DistanceMeter.dimensions.HEIGHT;
    // For high DPI we 2x source values.
    if (IS_HIDPI) {
      sourceWidth *= 2;
      sourceHeight *= 2;
      sourceX *= 2;
    }
    sourceX += this.spriteTextPos.x;
    sourceY += this.spriteTextPos.y;
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = .7;
    this.canvasCtx.translate(this.bulletAmountsX, this.bulletAmountsY);
    this.canvasCtx.drawImage(Runner.imageSprite,
                             sourceX, sourceY,
                             sourceWidth, sourceHeight,
                             targetX, targetY,
                             targetWidth, targetHeight
    );
    this.canvasCtx.restore();
  },
  /**
   * Initialise a jump.
   * @param {number} speed
   */
  startJump: function(speed) {
    if (!this.jumping) {
      this.update(0, Trex.status.JUMPING);
      // Tweak the jump velocity based on the speed.
      this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY - (speed / 10);
      this.jumping = true;
      this.reachedMinHeight = false;
      this.speedDrop = false;
    }
  },
  /**
   * Jump is complete, falling down.
   */
  endJump: function() {
    if (this.reachedMinHeight &&
      this.jumpVelocity < this.config.DROP_VELOCITY) {
      this.jumpVelocity = this.config.DROP_VELOCITY;
    }
  },
  /**
   * Update frame for a jump.
   * @param {number} deltaTime
   * @param {number} speed
   */
  updateJump: function(deltaTime, speed) {
    var msPerFrame = Trex.animFrames[this.status].msPerFrame;
    var framesElapsed = deltaTime / msPerFrame;
    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
      this.yPos += Math.round(this.jumpVelocity *
        this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
    }
    else {
      this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }
    this.jumpVelocity += this.config.GRAVITY * framesElapsed;
    // Minimum height has been reached.
    if (this.yPos < this.minJumpHeight || this.speedDrop) {
      this.reachedMinHeight = true;
    }
    // Reached max height
    if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
      this.endJump();
    }
    // Back down at ground level. Jump completed.
    if (this.yPos > this.groundYPos) {
      this.reset();
      this.jumpCount++;
    }
    this.update(deltaTime);
  },
  /**
   * Set the speed drop. Immediately cancels the current jump.
   */
  setSpeedDrop: function() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
  },
  /**
   * @param {boolean} isDucking.
   */
  setDuck: function(isDucking) {
    if (isDucking && this.status != Trex.status.DUCKING) {
      this.update(0, Trex.status.DUCKING);
      this.ducking = true;
    }
    else if (this.status == Trex.status.DUCKING) {
      this.update(0, Trex.status.RUNNING);
      this.ducking = false;
    }
  },
  /**
   * Reset the t-rex to running at start of game.
   */
  reset: function() {
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.ducking = false;
    this.update(0, Trex.status.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    this.bullets = [];
  }
};

