import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface Rocket {
	x: number;
	y: number;
	radius: number;
	angle: number;
	speed: number;
}

interface Planet {
	x: number;
	y: number;
	radius: number;
}

interface Obstacle {
	id: number;
	x: number;
	y: number;
	radius: number;
	speed: number;
	angle: number;
}

interface DirectionIndicator {
	angle: number;
}

interface RangeIndicator {
	angle: number;
	range: number;
}

function App() {
	const [angleErrorRange, setAngleErrorRange] = useState(Math.PI / 2); // 30 degrees error range
	const [redirectInterval, setRedirectInterval] = useState(600);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const gameLoopRef = useRef<number | null>(null);
	const redirectIntervalRef = useRef<number | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = 1500;
		canvas.height = 1000;

		// Game objects
		const rocket: Rocket = {
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			radius: 20,
			angle: 0,
			speed: 2
		};

		const planet: Planet = {
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			radius: 30
		};

		const obstacles: Obstacle[] = [];
		const numObstacles = 350;

		// Create obstacles
		for (let i = 0; i < numObstacles; i++) {
			obstacles.push({
				id: i,
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				radius: 13,
				speed: 1,
				angle: Math.random() * Math.PI * 2, // Random angle between 0 and 2π
			});
		}

		// Helper functions
		function distance(x1: number, y1: number, x2: number, y2: number): number {
			return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
		}

		function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
			return Math.atan2(y2 - y1, x2 - x1);
		}

		// New collision response function
		function resolveCollision(obj1: Rocket | Obstacle, obj2: Rocket | Obstacle): void {
			const angle = calculateAngle(obj1.x, obj1.y, obj2.x, obj2.y);
			const overlap = obj1.radius + obj2.radius - distance(obj1.x, obj1.y, obj2.x, obj2.y);

			// Move objects apart
			obj1.x -= overlap * Math.cos(angle) / 2;
			obj1.y -= overlap * Math.sin(angle) / 2;
			obj2.x += overlap * Math.cos(angle) / 2;
			obj2.y += overlap * Math.sin(angle) / 2;

			// Calculate new angles
			const temp = obj1.angle;
			obj1.angle = obj2.angle;
			obj2.angle = temp;

			// Slightly randomize angles to prevent objects from getting stuck
			obj1.angle += (Math.random() - 0.5) * Math.PI / 6; // ±15 degrees
			obj2.angle += (Math.random() - 0.5) * Math.PI / 6; // ±15 degrees

			// Ensure angles stay within 0 to 2π
			obj1.angle = (obj1.angle + 2 * Math.PI) % (2 * Math.PI);
			obj2.angle = (obj2.angle + 2 * Math.PI) % (2 * Math.PI);

			// Speeds remain unchanged
		}

		// Add these variables at the top of your script, with your other game objects
		const directionIndicator: DirectionIndicator = {
			angle: 0 // Store the intended direction
		};

		const rangeIndicator: RangeIndicator = {
			angle: 0, // This will always point towards the planet
			range: angleErrorRange,
		};

		// Main game loop
		function gameLoop() {
			if (!canvas || !ctx) return;

			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Move rocket
			rocket.x += Math.cos(rocket.angle) * rocket.speed;
			rocket.y += Math.sin(rocket.angle) * rocket.speed;

			// Move and check collisions for obstacles
			for (let obstacle of obstacles) {
				// Move obstacle
				obstacle.x += Math.cos(obstacle.angle) * obstacle.speed;
				obstacle.y += Math.sin(obstacle.angle) * obstacle.speed;

				// Bounce off canvas edges
				if (obstacle.x - obstacle.radius < 0 || obstacle.x + obstacle.radius > canvas.width) {
					obstacle.angle = Math.PI - obstacle.angle;
					obstacle.x = Math.max(obstacle.radius, Math.min(canvas.width - obstacle.radius, obstacle.x));
				}
				if (obstacle.y - obstacle.radius < 0 || obstacle.y + obstacle.radius > canvas.height) {
					obstacle.angle = -obstacle.angle;
					obstacle.y = Math.max(obstacle.radius, Math.min(canvas.height - obstacle.radius, obstacle.y));
				}

				// Check for collisions with other obstacles
				for (let otherObstacle of obstacles) {
					if (otherObstacle !== obstacle && distance(obstacle.x, obstacle.y, otherObstacle.x, otherObstacle.y) < obstacle.radius + otherObstacle.radius) {
						resolveCollision(obstacle, otherObstacle);
					}
				}

				// Check for collision with rocket
				if (distance(rocket.x, rocket.y, obstacle.x, obstacle.y) < rocket.radius + obstacle.radius) {
					resolveCollision(rocket, obstacle);
				}
			}

			// Bounce rocket off canvas edges
			if (rocket.x - rocket.radius < 0 || rocket.x + rocket.radius > canvas.width) {
				rocket.angle = Math.PI - rocket.angle;
				rocket.x = Math.max(rocket.radius, Math.min(canvas.width - rocket.radius, rocket.x));
			}
			if (rocket.y - rocket.radius < 0 || rocket.y + rocket.radius > canvas.height) {
				rocket.angle = -rocket.angle;
				rocket.y = Math.max(rocket.radius, Math.min(canvas.height - rocket.radius, rocket.y));
			}

			// Draw obstacles
			ctx.fillStyle = 'gray';
			for (let obstacle of obstacles) {
				ctx.beginPath();
				ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
				ctx.fill();
			}

			// Draw planet
			ctx.fillStyle = 'blue';
			ctx.beginPath();
			ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
			ctx.fill();

			// Draw rocket
			ctx.fillStyle = 'red';
			ctx.beginPath();
			ctx.arc(rocket.x, rocket.y, rocket.radius, 0, Math.PI * 2);
			ctx.fill();

			// Update range indicator to always point towards the planet
			rangeIndicator.angle = calculateAngle(rocket.x, rocket.y, planet.x, planet.y);

			// Draw range indicator (behind the direction indicator)
			drawRangeIndicator();

			// Draw direction indicator
			drawDirectionIndicator();

			// Check for planet collision
			if (distance(rocket.x, rocket.y, planet.x, planet.y) < rocket.radius + planet.radius) {
				alert('Rocket reached the planet!');
				resetGame();
			}

			gameLoopRef.current = requestAnimationFrame(gameLoop);
		}

		// Redirect rocket periodically
		function startRedirectInterval() {
			redirectIntervalRef.current = setInterval(() => {
				const targetAngle = calculateAngle(rocket.x, rocket.y, planet.x, planet.y);
				const error = (Math.random() * 2 - 1) * (angleErrorRange / 2);
				const intendedAngle = targetAngle + error;

				// Update rocket angle
				rocket.angle = intendedAngle;

				// Update direction indicator
				directionIndicator.angle = intendedAngle;
			}, redirectInterval);
		}

		// Reset game function
		function resetGame() {
			if (!canvas) return ;
			rocket.x = Math.random() * canvas.width;
			rocket.y = Math.random() * canvas.height;
			planet.x = Math.random() * canvas.width;
			planet.y = Math.random() * canvas.height;
		}

		// Function to draw direction indicator
		function drawDirectionIndicator() {
			if (!ctx) return ;
			ctx.save();
			ctx.translate(rocket.x, rocket.y);
			ctx.rotate(directionIndicator.angle);

			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(40, 0);
			ctx.lineTo(35, -7);
			ctx.moveTo(40, 0);
			ctx.lineTo(35, 7);
			ctx.strokeStyle = 'orange';
			ctx.lineWidth = 4;
			ctx.stroke();

			ctx.restore();
		}

		// Function to draw range indicator
		function drawRangeIndicator() {
			if (!ctx) return ;
			ctx.save();
			ctx.translate(rocket.x, rocket.y);
			ctx.rotate(rangeIndicator.angle - rangeIndicator.range / 2);

			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, 70, 0, rangeIndicator.range);
			ctx.fillStyle = 'rgba(143, 235, 52, 0.4)'; // Semi-transparent orange
			ctx.fill();

			ctx.restore();
		}

		// Start the game
		gameLoop();
		startRedirectInterval();

		// Cleanup function
		return () => {
			if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
			if (redirectIntervalRef.current) clearInterval(redirectIntervalRef.current);
		};
	}, [angleErrorRange, redirectInterval]);

	const handleErrorRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setAngleErrorRange((parseFloat(e.target.value) * Math.PI) / 180);
	};

	const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRedirectInterval(parseFloat(e.target.value));
	};

	return (
		<>
			<h1>Mini Rocket Sim</h1>
			<canvas ref={canvasRef} id="gameCanvas"></canvas>
			<div className="mt-5 flex flex-col items-center">
				<label className="flex items-center mb-2.5">
					Error Range (degrees):
					<input
						type="range"
						min="0"
						max="180"
						value={(angleErrorRange * 180) / Math.PI}
						onChange={handleErrorRangeChange}
						className="mx-2.5"
					/>
					{((angleErrorRange * 180) / Math.PI).toFixed(1)}°
				</label>
				<label className="flex items-center mb-2.5">
					Redirect Interval (ms):
					<input
						type="range"
						min="100"
						max="2000"
						step="100"
						value={redirectInterval}
						onChange={handleIntervalChange}
						className="mx-2.5"
					/>
					{redirectInterval}ms
				</label>
			</div>
		</>
	);
}

export default App;
