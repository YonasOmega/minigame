// main.js
const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	// Add entities
	const scoreManager = new ScoreManager(gameEngine);
	const player = new Player(gameEngine);
	const obstacleManager = new ObstacleManager(gameEngine, player);
	const ground = new Ground(gameEngine);

	gameEngine.addEntity(ground);
	gameEngine.addEntity(player);
	gameEngine.addEntity(obstacleManager);
	gameEngine.addEntity(scoreManager);

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
	}

	update() {
		if (!this.game.running) return;

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
		ctx.fillRect(this.x, this.y, this.width, this.height);

		if (this.game.options.debugging) {
			ctx.strokeStyle = "red";
			ctx.strokeRect(this.x, this.y, this.width, this.height);
		}
	}
}

class Ground {
	constructor(game) {
		this.game = game;
		this.speed = 5;
		this.x = 0;
		this.y = 450;
		this.width = 1024;
		this.height = 2;
	}

	update() {
		if (!this.game.running) return;

		this.x -= this.speed;
		if (this.x <= -this.width) {
			this.x = 0;
		}
	}

	draw(ctx) {
		ctx.fillStyle = "#666666";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.fillRect(this.x + this.width, this.y, this.width, this.height);
	}
}

class Obstacle {
	constructor(game, type, x, y) {
		this.game = game;
		this.type = type;
		this.x = x;
		this.y = y;
		this.speed = 5;

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
				break;
		}
	}

	update() {
		if (!this.game.running) return;

		this.x -= this.speed;

		if (this.x + this.width < 0) {
			this.removeFromWorld = true;
			return;
		}

		// If it's a bird, make it move up and down slightly
		if (this.type === 'bird') {
			this.y += Math.sin(this.x / 30) * 2;
		}

		// Collision detection
		const player = this.game.entities.find(e => e instanceof Player);
		if (player && !player.removeFromWorld) {
			if (this.checkCollision(player)) {
				console.log("Game Over!");
				this.game.running = false;
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
		ctx.fillRect(this.x, this.y, this.width, this.height);

		if (this.game.options.debugging) {
			ctx.strokeStyle = "red";
			ctx.strokeRect(this.x, this.y, this.width, this.height);
		}
	}
}

class ObstacleManager {
	constructor(game) {
		this.game = game;
		this.spawnTimer = 0;
		this.minSpawnTime = 60;
		this.maxSpawnTime = 120;
		this.nextSpawnTime = this.minSpawnTime;
	}

	update() {
		if (!this.game.running) return;

		this.spawnTimer++;

		if (this.spawnTimer >= this.nextSpawnTime) {
			this.spawnObstacle();
			this.spawnTimer = 0;
			this.nextSpawnTime = this.minSpawnTime + Math.random() * (this.maxSpawnTime - this.minSpawnTime);
		}
	}

	spawnObstacle() {
		const rand = Math.random();
		let type;

		if (rand < 0.4) {
			type = 'small-cactus';
		} else if (rand < 0.7) {
			type = 'large-cactus';
		} else {
			type = 'bird';
		}

		const obstacle = new Obstacle(this.game, type, 1024, 400);
		this.game.addEntity(obstacle);
	}

	draw(ctx) {
		// Manager doesn't need to draw anything
	}
}

class ScoreManager {
	constructor(game) {
		this.game = game;
		this.score = 0;
		this.highScore = localStorage.getItem('dinoHighScore') || 0;
	}

	update() {
		if (this.game.running) {
			this.score += 0.1;
			if (this.score > this.highScore) {
				this.highScore = Math.floor(this.score);
				localStorage.setItem('dinoHighScore', this.highScore);
			}
		}
	}

	draw(ctx) {
		ctx.font = "20px Arial";
		ctx.fillStyle = "#666666";
		ctx.fillText(`Score: ${Math.floor(this.score)}`, 20, 30);
		ctx.fillText(`High Score: ${this.highScore}`, 20, 60);

		if (!this.game.running) {
			ctx.font = "40px Arial";
			ctx.fillStyle = "#666666";
			ctx.fillText("Game Over!", 400, 200);
			ctx.font = "20px Arial";
			ctx.fillText("Press Space to Restart", 400, 250);

			if (this.game.keys[" "]) {
				this.resetGame();
			}
		}
	}

	resetGame() {
		this.score = 0;
		this.game.running = true;
		// Remove all obstacles
		this.game.entities = this.game.entities.filter(entity =>
			!(entity instanceof Obstacle)
		);
	}
}