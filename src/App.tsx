import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface Rocket {
	x: number;
	y: number;
	radius: number;
	angle: number;
	speed: number;
	intendedDirection: number;
	trail: { x: number; y: number }[];
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

function drawDirectionIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(60, 0);
  ctx.lineTo(55, -7);
  ctx.moveTo(60, 0);
  ctx.lineTo(55, 7);
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}

function drawRangeIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  range: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle - range / 2);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 70, 0, range);
  ctx.fillStyle = 'rgba(143, 235, 52, 0.22)';
  ctx.fill();

  ctx.restore();
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
	return Math.atan2(y2 - y1, x2 - x1);
}

function App() {
	const [angleErrorRange, setAngleErrorRange] = useState<number>(Math.PI / 2);
	const [redirectInterval, setRedirectInterval] = useState<number>(600);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const marsImageRef = useRef<HTMLImageElement | null>(null);
	const rocketImageRef = useRef<HTMLImageElement | null>(null);

	useEffect(() => {
		let animationId: number;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = 1500;
		canvas.height = 1000;

		const marsImage = new Image();
    marsImage.src = '/mars.svg'; // Assuming the SVG is in the public folder
    marsImageRef.current = marsImage;
		const rocketImage = new Image();
    rocketImage.src = '/capsule.svg'; // Assuming the SVG is in the public folder
    rocketImageRef.current = rocketImage;

		// Game objects
		const rocket: Rocket = {
			x: canvas.width * 1 / 5,
			y: canvas.height / 2,
			radius: 35,
			angle: 0,
			speed: 2.1,
			intendedDirection: 0,
			trail: [],
		};

		const planet: Planet = {
			x: canvas.width * 4 / 5,
			y: canvas.height / 2,
			radius: 50
		};

		const obstacles: Obstacle[] = [];
		const numObstacles = 170;
		rocket.intendedDirection = calculateAngle(rocket.x, rocket.y, planet.x, planet.y);

		// Create obstacles
		for (let i = 0; i < numObstacles; i++) {
			obstacles.push({
				id: i,
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				radius: 6,
				speed: 1.2,
				angle: Math.random() * Math.PI * 2,
			});
		}

		// New collision response function
		function resolveCollision(obj1: Rocket | Obstacle, obj2: Rocket | Obstacle): void {
			const collisionAngle = calculateAngle(obj1.x, obj1.y, obj2.x, obj2.y);
			const overlap = obj1.radius + obj2.radius - distance(obj1.x, obj1.y, obj2.x, obj2.y) + 0.5;

			// Move objects apart
			obj1.x -= overlap * Math.cos(collisionAngle) / 2;
			obj1.y -= overlap * Math.sin(collisionAngle) / 2;
			obj2.x += overlap * Math.cos(collisionAngle) / 2;
			obj2.y += overlap * Math.sin(collisionAngle) / 2;

			// Calculate new angles using reflection
			const newAngle1 = 2 * collisionAngle - obj1.angle - Math.PI;
			const newAngle2 = 2 * collisionAngle - obj2.angle - Math.PI;

			// Update angles
			obj1.angle = newAngle1;
			obj2.angle = newAngle2;

			// Ensure angles stay within 0 to 2π
			obj1.angle = (obj1.angle + 2 * Math.PI) % (2 * Math.PI);
			obj2.angle = (obj2.angle + 2 * Math.PI) % (2 * Math.PI);
		}

		// Main game loop
		function gameLoop() {
			if (!canvas || !ctx) return;

			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Move rocket
			rocket.x += Math.cos(rocket.angle) * rocket.speed;
			rocket.y += Math.sin(rocket.angle) * rocket.speed;

			// Add current position to the trail
			rocket.trail.push({ x: rocket.x, y: rocket.y });

			// Limit the trail length (adjust 100 to change the trail length)
			// if (rocket.trail.length > 100) {
			// 	rocket.trail.shift();
			// }

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

				if (distance(planet.x, planet.y, obstacle.x, obstacle.y) < planet.radius + obstacle.radius) {
					// Calculate the angle of collision
					const collisionAngle = calculateAngle(planet.x, planet.y, obstacle.x, obstacle.y);
					// Calculate the angle of the obstacle's current movement
					const movementAngle = obstacle.angle;
					// Calculate the new angle after collision (reflection)
					const newAngle = 2 * collisionAngle - movementAngle - Math.PI;
					// Update the obstacle's angle
					obstacle.angle = newAngle;

					// Move the obstacle outside the planet's radius to prevent sticking
					const separationDistance = planet.radius + obstacle.radius;
					obstacle.x = planet.x + Math.cos(collisionAngle) * separationDistance;
					obstacle.y = planet.y + Math.sin(collisionAngle) * separationDistance;
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

			// Draw planet (Mars)
			if (marsImageRef.current && marsImageRef.current.complete) {
				const imageSize = planet.radius * 2;
				ctx.drawImage(
					marsImageRef.current,
					planet.x - planet.radius,
					planet.y - planet.radius,
					imageSize,
					imageSize
				);
			} else {
				// Fallback to circle if image is not loaded
				ctx.fillStyle = 'red';
				ctx.beginPath();
				ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
				ctx.fill();
			}

			// Draw rocket (Capsule)
			if (rocketImageRef.current && rocketImageRef.current.complete) {
				const imageSize = rocket.radius * 2;
				ctx.save();
				ctx.translate(rocket.x, rocket.y);
				ctx.rotate(rocket.angle + Math.PI / 2);
				ctx.drawImage(
					rocketImageRef.current,
					-rocket.radius,
					-rocket.radius,
					imageSize,
					imageSize
				);
				ctx.restore();
				ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black
				ctx.beginPath();
				ctx.arc(rocket.x, rocket.y, rocket.radius, 0, Math.PI * 2);
				ctx.lineWidth = 0.4;
				ctx.stroke();
			} else {
				// Fallback to circle if image is not loaded
				ctx.fillStyle = 'red';
				ctx.beginPath();
				ctx.arc(rocket.x, rocket.y, rocket.radius, 0, Math.PI * 2);
				ctx.fill();
			}

			// Draw rocket trail
			ctx.beginPath();
			ctx.moveTo(rocket.trail[0].x, rocket.trail[0].y);
			for (let i = 1; i < rocket.trail.length; i++) {
				ctx.lineTo(rocket.trail[i].x, rocket.trail[i].y);
			}
			ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
			ctx.lineWidth = 2;
			ctx.stroke();

			// Update range indicator to always point towards the planet
			let rangeIndicatorAngle = calculateAngle(rocket.x, rocket.y, planet.x, planet.y);

      drawRangeIndicator(ctx, rocket.x, rocket.y, rangeIndicatorAngle, angleErrorRange);
      // drawDirectionIndicator(ctx, rocket.x, rocket.y, rocket.intendedDirection);

			// Check for planet collision
			if (distance(rocket.x, rocket.y, planet.x, planet.y) < rocket.radius + planet.radius) {
				alert('Rocket reached the planet!');
				resetGame();
			}

			animationId = requestAnimationFrame(gameLoop);
		}

		// Redirect rocket periodically
		function startRedirectInterval() {
			return setInterval(() => {
				const targetAngle = calculateAngle(rocket.x, rocket.y, planet.x, planet.y);
				const error = (Math.random() * 2 - 1) * (angleErrorRange / 2);
				const intendedAngle = targetAngle + error;

				// Update rocket angle
				rocket.angle = intendedAngle;

				// Update direction indicator
				rocket.intendedDirection = intendedAngle;
			}, redirectInterval);
		}

		// Reset game function
		function resetGame() {
			if (!canvas) return ;
			rocket.x = canvas.width * 1 / 5;
			rocket.y = canvas.height / 2;
			rocket.trail = []; // Clear the trail when resetting
			planet.x = canvas.width * 4 / 5;
			planet.y = canvas.height / 2;
		}

		// Start the game
		gameLoop();
		const intervalID = startRedirectInterval();

		// Cleanup function
		return () => {
			cancelAnimationFrame(animationId);
			clearInterval(intervalID);
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
