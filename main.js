const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	// Add the player entity
	const player = new Player(gameEngine);
	gameEngine.addEntity(player);

	// Add an obstacle manager to handle spawning obstacles
	const obstacleManager = new ObstacleManager(gameEngine, player);
	gameEngine.addEntity(obstacleManager);

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
		this.gravity = 0.5;
		this.jumpStrength = -10;
		this.isDucking = false;
		this.normalHeight = 50;
		this.duckHeight = 25;
	}

	update() {
		// Apply gravity
		this.velocityY += this.gravity;
		this.y += this.velocityY;

		// Ground collision
		if (this.y > 400) {
			this.y = 400;
			this.velocityY = 0;
		}

		// Handle jumping
		if (this.game.keys["ArrowUp"] && this.y === 400) {
			this.velocityY = this.jumpStrength;
		}

		// Handle ducking
		if (this.game.keys["ArrowDown"]) {
			this.isDucking = true;
			this.height = this.duckHeight;
		} else {
			this.isDucking = false;
			this.height = this.normalHeight;
		}
	}

	draw(ctx) {
		ctx.fillStyle = "black";
		ctx.fillRect(this.x, this.y, this.width, this.height);
	}
}

class Obstacle {
	constructor(game, x, y, width, height) {
		this.game = game;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.speed = 5;
	}

	update() {
		this.x -= this.speed;

		// Remove obstacle if it goes off screen
		if (this.x + this.width < 0) {
			this.removeFromWorld = true;
		}

		// Check for collision with player
		const player = this.game.entities.find(e => e instanceof Player);
		if (player && !player.removeFromWorld) {
			if (this.x < player.x + player.width &&
				this.x + this.width > player.x &&
				this.y < player.y + player.height &&
				this.y + this.height > player.y) {
				console.log("Game Over!");
				this.game.running = false;
			}
		}
	}

	draw(ctx) {
		ctx.fillStyle = "red";
		ctx.fillRect(this.x, this.y, this.width, this.height);
	}
}

class ObstacleManager {
	constructor(game, player) {
		this.game = game;
		this.player = player;
		this.spawnInterval = 100; // Spawn obstacle every 100 frames
		this.frameCount = 0;
	}

	update() {
		this.frameCount++;

		if (this.frameCount % this.spawnInterval === 0) {
			const obstacle = new Obstacle(this.game, 1024, 400, 30, 50);
			this.game.addEntity(obstacle);
		}
	}

	draw(ctx) {
		// ObstacleManager doesn't need to draw anything
	}
}