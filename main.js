// main.js
const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	console.log("Game initialization starting"); // Debug log

	gameEngine.init(ctx);
	gameEngine.running = true;

	// Add entities
	const player = new Player(gameEngine);
	const ground = new Ground(gameEngine);
	const obstacleManager = new ObstacleManager(gameEngine);
	const scoreManager = new ScoreManager(gameEngine);
	const cloud = new CloudManager(gameEngine); // Added cloud background

	gameEngine.addEntity(cloud); // Draw clouds first
	gameEngine.addEntity(ground);
	gameEngine.addEntity(player);
	gameEngine.addEntity(obstacleManager);
	gameEngine.addEntity(scoreManager);

	console.log("Starting game engine"); // Debug log
	gameEngine.start();
});

class Player {
	constructor(game) {
		this.game = game;
		this.x = 100;
		this.y = 400;
		this.width = 50;
		this.height = 50;
		this.velocityY = 0;
		this.gravity = 1.5;
		this.jumpStrength = -24;
		this.isDucking = false;
		this.isJumping = false;
		this.normalHeight = 50;
		this.duckHeight = 25;
		this.color = "#333333"; // Dark gray for the player
		this.jumpSound = new Audio(); // Create a sound for jumping
		this.jumpSound.src = "jump.mp3"; // Assuming you add this file
		this.jumpSound.volume = 0.3; // Not too loud
		this.invincible = false; // Added invincibility after restart
		this.invincibleTimer = 0;
	}

	update() {
		if (!this.game.running) return;

		// Invincibility timer
		if (this.invincible) {
			this.invincibleTimer++;
			if (this.invincibleTimer > 60) { // About 1 second of invincibility
				this.invincible = false;
				this.invincibleTimer = 0;
			}
		}

		// Apply gravity
		this.velocityY += this.gravity;
		this.y += this.velocityY;

		// Ground collision
		if (this.y > 400) {
			this.y = 400;
			this.velocityY = 0;
			this.isJumping = false;
		}

		// Handle jumping
		if ((this.game.keys[" "] || this.game.keys["ArrowUp"]) && !this.isJumping && this.y >= 400) {
			this.velocityY = this.jumpStrength;
			this.isJumping = true;
			this.jumpSound.currentTime = 0;
			this.jumpSound.play().catch(e => console.log("Audio play failed:", e));
		}

		// Handle ducking
		this.isDucking = this.game.keys["ArrowDown"] && !this.isJumping;
		this.height = this.isDucking ? this.duckHeight : this.normalHeight;

		if (this.isDucking) {
			this.y = 400 + (this.normalHeight - this.duckHeight);
		}
	}

	draw(ctx) {
		ctx.fillStyle = this.color;

		// Flashing effect when invincible
		if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
			ctx.fillStyle = "#888888";
		}

		ctx.fillRect(this.x, this.y, this.width, this.height);

		if (this.game.options && this.game.options.debugging) {
			ctx.strokeStyle = "red";
			ctx.strokeRect(this.x, this.y, this.width, this.height);
		}
	}
}

class Ground {
	constructor(game) {
		this.game = game;
		this.baseSpeed = 10; // Increased speed as requested
		this.speed = this.baseSpeed;
		this.x = 0;
		this.y = 450;
		this.width = 1024;
		this.height = 2;

		// Add some ground details
		this.details = [];
		for (let i = 0; i < 15; i++) {
			this.details.push({
				x: Math.random() * this.width,
				width: 2 + Math.random() * 5,
				height: 2 + Math.random() * 4
			});
		}
	}

	update() {
		if (!this.game.running) return;

		// Update speed based on score
		const scoreManager = this.game.entities.find(e => e instanceof ScoreManager);
		if (scoreManager) {
			// Smoother speed increase as score increases, up to 2x starting speed
			this.speed = this.baseSpeed + Math.min(scoreManager.score / 200, this.baseSpeed + 10);
		}

		this.x -= this.speed;
		if (this.x <= -this.width) {
			this.x = 0;
		}

		// Update ground details
		this.details.forEach(detail => {
			detail.x -= this.speed;
			if (detail.x <= -detail.width) {
				detail.x = this.width + Math.random() * 100;
				detail.width = 2 + Math.random() * 5;
				detail.height = 2 + Math.random() * 4;
			}
		});
	}

	draw(ctx) {
		// Main ground line
		ctx.fillStyle = "#666666";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.fillRect(this.x + this.width, this.y, this.width, this.height);

		// Ground details (small bumps and rocks)
		ctx.fillStyle = "#888888";
		this.details.forEach(detail => {
			ctx.fillRect(this.x + detail.x, this.y - detail.height, detail.width, detail.height);
			ctx.fillRect(this.x + this.width + detail.x, this.y - detail.height, detail.width, detail.height);
		});
	}
}

class Obstacle {
	constructor(game, type, x, y) {
		this.game = game;
		this.type = type;
		this.x = x;
		this.y = y;
		this.speed = 10; // Match ground speed
		this.frameCount = 0; // For animation

		switch(type) {
			case 'small-cactus':
				this.width = 20;
				this.height = 40;
				this.color = "#006400"; // Dark green
				break;
			case 'large-cactus':
				this.width = 30;
				this.height = 60;
				this.color = "#228B22"; // Forest green
				break;
			case 'bird':
				this.width = 40;
				this.height = 20;
				this.color = "#4169E1"; // Royal blue
				this.y = 300 + Math.random() * 100; // Random height for birds
				this.wingUp = true; // For basic animation
				break;
		}
	}

	update() {
		if (!this.game.running) return;

		// Get the ground entity to sync speeds
		const ground = this.game.entities.find(e => e instanceof Ground);
		if (ground) {
			this.speed = ground.speed;
		}

		this.x -= this.speed;

		if (this.x + this.width < 0) {
			this.removeFromWorld = true;
			return;
		}

		// Bird animation
		if (this.type === 'bird') {
			this.frameCount++;
			if (this.frameCount >= 15) { // Change wing state every 15 frames
				this.wingUp = !this.wingUp;
				this.frameCount = 0;
			}
			this.y += Math.sin(this.x / 30) * 2;
		}

		// Collision detection
		const player = this.game.entities.find(e => e instanceof Player);
		if (player && !player.removeFromWorld && !player.invincible) {
			if (this.checkCollision(player)) {
				console.log("Game Over!");
				this.game.running = false;

				// Play collision sound if available
				const hitSound = new Audio();
				hitSound.src = "hit.mp3"; // Assuming you add this file
				hitSound.play().catch(e => {});
			}
		}
	}

	checkCollision(player) {
		// Add a small buffer for more forgiving collisions
		const buffer = 5;
		return (
			this.x + buffer < player.x + player.width - buffer &&
			this.x + this.width - buffer > player.x + buffer &&
			this.y + buffer < player.y + player.height - buffer &&
			this.y + this.height - buffer > player.y + buffer
		);
	}

	draw(ctx) {
		ctx.fillStyle = this.color;

		if (this.type === 'bird') {
			// Draw bird body
			ctx.fillRect(this.x, this.y, this.width, this.height);

			// Draw wings in different positions
			if (this.wingUp) {
				ctx.fillRect(this.x + 5, this.y - 10, 30, 5);
			} else {
				ctx.fillRect(this.x + 5, this.y + this.height, 30, 5);
			}
		} else if (this.type === 'small-cactus' || this.type === 'large-cactus') {
			// Draw main cactus body
			ctx.fillRect(this.x, this.y, this.width, this.height);

			// Add some arms to cactus
			if (this.type === 'small-cactus') {
				ctx.fillRect(this.x - 5, this.y + 10, 10, 5);
			} else {
				ctx.fillRect(this.x - 8, this.y + 15, 15, 7);
				ctx.fillRect(this.x + this.width - 7, this.y + 30, 15, 7);
			}
		}

		if (this.game.options && this.game.options.debugging) {
			ctx.strokeStyle = "red";
			ctx.strokeRect(this.x, this.y, this.width, this.height);
		}
	}
}

class ObstacleManager {
	constructor(game) {
		this.game = game;
		this.spawnTimer = 0;
		this.minSpawnTime = 45; // Decreased for more obstacles
		this.maxSpawnTime = 90;
		this.nextSpawnTime = this.minSpawnTime;
		this.lastObstacleType = null; // Remember last type for variety
	}

	update() {
		if (!this.game.running) return;

		this.spawnTimer++;

		if (this.spawnTimer >= this.nextSpawnTime) {
			this.spawnObstacle();
			this.spawnTimer = 0;
			this.nextSpawnTime = this.minSpawnTime + Math.random() * (this.maxSpawnTime - this.minSpawnTime);

			// Decrease spawn time as score increases for more challenge
			const scoreManager = this.game.entities.find(e => e instanceof ScoreManager);
			if (scoreManager && scoreManager.score > 500) {
				this.minSpawnTime = Math.max(35, 45 - scoreManager.score / 500);
			}
		}
	}

	spawnObstacle() {
		const rand = Math.random();
		let type;

		// Avoid spawning the same type of obstacle twice in a row
		do {
			if (rand < 0.4) {
				type = 'small-cactus';
			} else if (rand < 0.7) {
				type = 'large-cactus';
			} else {
				type = 'bird';
			}
		} while (type === this.lastObstacleType && Math.random() < 0.7);

		this.lastObstacleType = type;

		const obstacle = new Obstacle(this.game, type, 1024, 400);
		this.game.addEntity(obstacle);
	}

	draw(ctx) {
		// Manager doesn't need to draw anything
	}
}

class CloudManager {
	constructor(game) {
		this.game = game;
		this.clouds = [];
		this.spawnTimer = 0;

		// Create initial clouds
		for (let i = 0; i < 3; i++) {
			this.createCloud(100 + i * 300);
		}
	}

	createCloud(x) {
		this.clouds.push({
			x: x || 1024 + Math.random() * 200,
			y: 50 + Math.random() * 150,
			width: 60 + Math.random() * 40,
			height: 20 + Math.random() * 15,
			speed: 1 + Math.random() * 2 // Clouds move slower than ground
		});
	}

	update() {
		if (!this.game.running) return;

		// Spawn new clouds occasionally
		this.spawnTimer++;
		if (this.spawnTimer > 120) { // Every ~2 seconds
			this.createCloud();
			this.spawnTimer = 0;
		}

		// Update cloud positions
		this.clouds.forEach(cloud => {
			cloud.x -= cloud.speed;
			if (cloud.x + cloud.width < 0) {
				// Remove clouds that have moved off screen
				this.clouds = this.clouds.filter(c => c !== cloud);
			}
		});

		// Make sure we always have some clouds
		if (this.clouds.length < 3) {
			this.createCloud();
		}
	}

	draw(ctx) {
		ctx.fillStyle = "#808080";
		this.clouds.forEach(cloud => {
			ctx.beginPath();
			ctx.ellipse(cloud.x, cloud.y, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
			ctx.ellipse(cloud.x + cloud.width/3, cloud.y - cloud.height/4, cloud.width/3, cloud.height/2, 0, 0, Math.PI * 2);
			ctx.ellipse(cloud.x + cloud.width/2, cloud.y, cloud.width/3, cloud.height/3, 0, 0, Math.PI * 2);
			ctx.fill();
		});
	}
}

class ScoreManager {
	constructor(game) {
		this.game = game;
		this.score = 0;
		this.highScore = localStorage.getItem('dinoHighScore') || 0;
		this.pointSound = new Audio(); // Sound for milestone scores
		this.pointSound.src = "point.mp3"; // Assuming you add this file
		this.lastMilestone = 0;
	}

	update() {
		if (this.game.running) {
			// Increased score rate
			this.score += 0.2; // Double the original rate

			// Play sound at score milestones (every 100 points)
			const currentMilestone = Math.floor(this.score / 100);
			if (currentMilestone > this.lastMilestone) {
				this.lastMilestone = currentMilestone;
				this.pointSound.currentTime = 0;
				this.pointSound.play().catch(e => {});
			}

			if (this.score > this.highScore) {
				this.highScore = Math.floor(this.score);
				localStorage.setItem('dinoHighScore', this.highScore);
			}
		}
	}

	draw(ctx) {
		// Draw background for the score area
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.fillRect(10, 10, 180, 100);

		// Score display
		ctx.font = "20px Arial";
		ctx.fillStyle = "#333333";
		ctx.fillText(`Score: ${Math.floor(this.score)}`, 20, 30);
		ctx.fillText(`High Score: ${this.highScore}`, 20, 60);

		// Show current speed
		const ground = this.game.entities.find(e => e instanceof Ground);
		if (ground) {
			ctx.fillText(`Speed: ${ground.speed.toFixed(1)}`, 20, 90);
		}

		// Game over screen
		if (!this.game.running) {
			// Semi-transparent overlay
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			// Game over text
			ctx.font = "bold 48px Arial";
			ctx.fillStyle = "#FFFFFF";
			ctx.textAlign = "center";
			ctx.fillText("Game Over!", ctx.canvas.width / 2, 180);

			// Final score
			ctx.font = "24px Arial";
			ctx.fillText(`Your Score: ${Math.floor(this.score)}`, ctx.canvas.width / 2, 220);

			// High score
			if (Math.floor(this.score) >= this.highScore) {
				ctx.fillStyle = "#FFD700";
				ctx.fillText("New High Score!", ctx.canvas.width / 2, 250);
			}

			// Restart instructions
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText("Press R to Restart", ctx.canvas.width / 2, 300);

			// Reset text alignment
			ctx.textAlign = "start";

			if (this.game.keys["r"]) {
				this.resetGame();
			}
		}
	}

	resetGame() {
		this.score = 0;
		this.game.running = true;

		// Reset ground speed
		const ground = this.game.entities.find(e => e instanceof Ground);
		if (ground) {
			ground.speed = ground.baseSpeed;
		}

		// Remove all obstacles
		this.game.entities = this.game.entities.filter(entity =>
			!(entity instanceof Obstacle)
		);

		// Make player briefly invincible after restart
		const player = this.game.entities.find(e => e instanceof Player);
		if (player) {
			player.invincible = true;
			player.invincibleTimer = 0;
		}
	}
}