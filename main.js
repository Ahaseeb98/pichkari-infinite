import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Game State
const gameState = {
  hits: 0,
  misses: 0,
  losses: 0,
  penalties: 0,
  isPlaying: true,
  speed: 0.1, // Base speed for world movement
  lastTargetSpawn: 0,
  lastPenaltySpawn: 0,
};

// Configuration
const CONFIG = {
  treeCount: 50,
  treeSpacing: 5,
  buildingSpacing: 5,
  buildingCount: 30,
  roadWidth: 2.5,
  roadTreeWidth: 2.6,
  maxPenalties: 5,
  maxLosses: 10,
  spawnIntervalTarget: 2000,
  spawnIntervalPenalty: 4000,
  speedIncrement: 0.005, // Speed increase per hit
};

// Array to keep track of objects
const trees = [];
const buildings = [];

function updateScoreboard() {
  const scoreboard = document.getElementById("scoreboard");
  if (!gameState.isPlaying) {
    scoreboard.innerHTML = `GAME OVER | Hits: ${gameState.hits} | Final Score: ${gameState.hits - gameState.penalties * 2} <br> Press R to Restart`;
    scoreboard.style.color = "red";
    scoreboard.style.fontSize = "30px";
    scoreboard.style.textAlign = "center";
    scoreboard.style.left = "50%";
    scoreboard.style.transform = "translateX(-50%)";
  } else {
    scoreboard.innerHTML = `Hits: ${gameState.hits} | Misses: ${gameState.misses} | Losses: ${gameState.losses} | Penalties: ${gameState.penalties}`;
    scoreboard.style.color = "navy";
    scoreboard.style.fontSize = "20px";
    scoreboard.style.left = "10px";
    scoreboard.style.transform = "none";
  }
}

// Window Resize Handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Restart Handler
window.addEventListener("keydown", (e) => {
  if (!gameState.isPlaying && e.key.toLowerCase() === "r") {
    location.reload();
  }
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffe7be); // Light blue color

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.08,
  1000,
);
const renderer = new THREE.WebGLRenderer({ alpha: true }); // Enable transparency if you want
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xffe7be, 1); // Light blue color with full opacity
// Create road

const textureLoader = new THREE.TextureLoader();
const roadTexture = textureLoader.load("assets/road.jpg"); // Use a high-quality road texture
// Set texture repeat and wrap
roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(1, 12);

// Rotate the texture by 90 degrees
roadTexture.rotation = Math.PI / 2; // Rotate 90 degrees
roadTexture.center.set(0.5, 0.5); // Set the rotation center to the middle of the texture

const roadMaterial = new THREE.MeshBasicMaterial({
  map: roadTexture,
  side: THREE.DoubleSide,
});
const roadGeometry = new THREE.PlaneGeometry(5, 1000);
const road = new THREE.Mesh(roadGeometry, roadMaterial);

// Keep the road geometry rotation as it is
road.rotation.x = -Math.PI / 2;
scene.add(road);
// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Ground (dirt) plane around the road
const groundWidth = 50; // Width of the ground plane
const groundLength = 1000; // Length to cover the entire road

const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundLength);
const groundMaterial = new THREE.MeshBasicMaterial({
  color: 0xfad5a5,
  // depthBias: -0.0001,
}); // Add a tiny bias
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Lay it flat on the XZ plane
ground.position.y = -0.01; // Slightly below road to avoid z-fighting
scene.add(ground);

// Load bike model
const loader = new GLTFLoader();
let bike;

loader.load(
  "assets/Motorcycle.glb",
  (gltf) => {
    bike = gltf.scene;
    bike.scale.set(0.05, 0.05, 0.05);
    bike.rotation.y = Math.PI / 2; // Correct orientation
    bike.position.y = 0.1; // Height adjustment
    bike.position.z = 0; // Initial Z position
    scene.add(bike);
  },
  undefined,
  function (error) {
    console.error("An error occurred while loading the model:", error);
  },
);
// Function to create trees at specific positions
// Function to create trees at specific positions
function createTree(x, z) {
  const type = Math.random() > 0.5 ? "oak" : "pine";

  const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 8);
  const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.set(x, 0.25, z);

  let foliageGeometry;
  // Random shade of green
  const greenShades = [0x228b22, 0x006400, 0x32cd32, 0x6b8e23];
  const color = greenShades[Math.floor(Math.random() * greenShades.length)];
  const foliageMaterial = new THREE.MeshBasicMaterial({ color: color });

  let foliageY = 0.75;

  if (type === "oak") {
    foliageGeometry = new THREE.SphereGeometry(
      0.2 + Math.random() * 0.1,
      16,
      16,
    );
    foliageY = 0.75;
  } else {
    // pine
    foliageGeometry = new THREE.ConeGeometry(0.25, 0.8, 16);
    foliageY = 0.85;
  }

  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.set(x, foliageY, z);

  scene.add(trunk);
  scene.add(foliage);

  // Store the tree and its z position for looping
  trees.push({ trunk, foliage, z, type });
}

// Create initial trees
// Create initial trees
for (let i = 0; i < CONFIG.treeCount; i++) {
  const x = i % 2 === 0 ? -CONFIG.roadTreeWidth : CONFIG.roadTreeWidth;
  const z =
    -Math.random() * CONFIG.treeSpacing * CONFIG.treeCount - Math.random() * 10; // Random initial z position
  createTree(x, z);
}

function createBuilding(x, z, width, height, depth, color) {
  const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
  const buildingMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1, // Adjust as needed
    polygonOffsetUnits: 1,
  });
  const building = new THREE.Mesh(buildingGeometry, buildingMaterial);

  building.position.set(x, height / 2, z);
  scene.add(building);

  // Store the building and its z position for looping
  buildings.push({ mesh: building, initialZ: z });
}

// Generate buildings along the road
function addBuildings() {
  const minDistance = 1; // Minimum distance between buildings

  for (let i = 0; i < CONFIG.buildingCount; i++) {
    const zPosition = -i * CONFIG.buildingSpacing + Math.random() * 2; // Small random offset
    const width = Math.random() * 1.5 + 0.5;
    const height = Math.random() * 0.5 + 5;
    const depth = Math.random() * 1.5 + 0.5;
    const colors = [0xcccccc, 0xa0a0a0, 0xb0b0b0, 0x999999];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const leftZ = zPosition + Math.random() * minDistance;
    const rightZ = zPosition - Math.random() * minDistance;

    createBuilding(
      -CONFIG.roadWidth - width / 2 - 0.5,
      leftZ,
      width,
      height,
      depth,
      color,
    );
    createBuilding(
      CONFIG.roadWidth + width / 2 + 0.5,
      rightZ,
      width,
      height,
      depth,
      color,
    );
  }
}

addBuildings();

function createSun() {
  const sunGeometry = new THREE.SphereGeometry(2, 200, 200); // Radius, width segments, height segments
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xff7f50 }); // Yellow color for the sun
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);

  sun.position.set(0, 5, -10); // Position the sun in the sky
  scene.add(sun);
}

createSun();

let bikeSpeed = 0.1;
let bikeDirection = 0; // To track left/right movement
const spawns = []; // Array to keep track of spit objects
const targets = []; // Array to keep track of normal targets
const penaltyTargets = []; // Array to keep track of penalty targets

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    bikeDirection = -bikeSpeed; // Move left
  } else if (event.key === "ArrowRight") {
    bikeDirection = bikeSpeed; // Move right
  } else if (event.key === " ") {
    spitPaan();
  }
});

// Stop bike movement when key is released
document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    bikeDirection = 0; // Stop moving when key is released
  }
});

// Spit paan
function spitPaan() {
  const paanGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const paanMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const paan = new THREE.Mesh(paanGeometry, paanMaterial);

  // Set initial position ahead of the bike
  paan.position.set(bike.position.x, bike.position.y, bike.position.z + 0.5);
  spawns.push(paan); // Store the spit in the array
  scene.add(paan);
}

function createTarget() {
  // Randomize Geometry
  const types = ["box", "sphere", "diamond"];
  const type = types[Math.floor(Math.random() * types.length)];

  let targetGeometry;
  if (type === "box") {
    targetGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  } else if (type === "sphere") {
    targetGeometry = new THREE.SphereGeometry(0.35, 16, 16);
  } else {
    // diamond/octahedron
    targetGeometry = new THREE.OctahedronGeometry(0.35);
  }

  // Randomize Color (keep them bright)
  const colors = [0xffffff, 0xffff00, 0x00ffff, 0xff00ff];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const targetMaterial = new THREE.MeshBasicMaterial({ color: color });
  const target = new THREE.Mesh(targetGeometry, targetMaterial);

  // Set the target's position at a random x and a fixed negative z position
  target.position.set((Math.random() - 0.5) * 5, 0.2, -30);
  target.isHit = false; // Initialize hit flag

  // Custom rotation for diamonds to look nicer
  if (type === "diamond") {
    target.rotation.y = Math.PI / 4;
  }

  targets.push(target);
  scene.add(target);
}

function createPenaltyTarget() {
  const penaltyTargetGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const penaltyTargetMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  }); // Red color for penalty target
  const penaltyTarget = new THREE.Mesh(
    penaltyTargetGeometry,
    penaltyTargetMaterial,
  );

  // Set the penalty target's position behind the bike (actually deep in background)
  penaltyTarget.position.set((Math.random() - 0.5) * 5, 0.2, -30);

  penaltyTargets.push(penaltyTarget);
  scene.add(penaltyTarget);
}

// Game loop
function animate(time) {
  requestAnimationFrame(animate);

  if (!gameState.isPlaying) return;

  // Spawning Logic
  if (time - gameState.lastTargetSpawn > CONFIG.spawnIntervalTarget) {
    createTarget();
    gameState.lastTargetSpawn = time;
  }

  if (time - gameState.lastPenaltySpawn > CONFIG.spawnIntervalPenalty) {
    createPenaltyTarget();
    gameState.lastPenaltySpawn = time;
  }

  // Update regular targets
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    target.position.z += gameState.speed * 2.5; // Move proportional to game speed

    // Check if target has passed the bike without being hit
    if (!target.isHit && target.position.z >= bike?.position?.z + 2) {
      scene.remove(target);
      targets.splice(i, 1);

      gameState.losses++;
      updateScoreboard();
    }
  }

  // Move bike and spit objects
  if (bike) {
    // bike.position.z += -0.000001; // Removing this slight forward move to keep player stationary relative to world
    bike.position.x += bikeDirection;

    // Boundary checks
    if (bike.position.x < -CONFIG.roadWidth) {
      bike.position.x = -CONFIG.roadWidth;
    } else if (bike.position.x > CONFIG.roadWidth) {
      bike.position.x = CONFIG.roadWidth;
    }
  }

  // Move trees
  for (const tree of trees) {
    tree.z += gameState.speed * 3.5; // Trees move faster
    tree.trunk.position.z = tree.z;
    tree.foliage.position.z = tree.z;

    if (tree.z > 20) {
      tree.z = -100; // Loop back further
    }
  }

  // Update spit positions
  for (let i = spawns.length - 1; i >= 0; i--) {
    const paan = spawns[i];
    paan.position.z -= 0.5; // Spit moves fast forward

    for (let j = targets.length - 1; j >= 0; j--) {
      const target = targets[j];
      const distance = paan.position.distanceTo(target.position);

      if (distance < 0.5 && !target.isHit) {
        // Increased hit radius slightly
        target.isHit = true;
        animateCollision(target);
        scene.remove(paan);
        spawns.splice(i, 1);

        gameState.hits++;
        gameState.speed += CONFIG.speedIncrement; // Increase speed
        updateScoreboard();

        // Break to avoid double counting if multiple targets are close (though unlikely)
        break;
      }
    }

    // Remove the spit if it moves too far
    if (paan.position.z < -50) {
      if (spawns[i]) {
        // Check if not already removed
        scene.remove(paan);
        spawns.splice(i, 1);
        gameState.misses++;
        updateScoreboard();
      }
    }
  }

  // Move buildings
  for (const building of buildings) {
    building.mesh.position.z += gameState.speed;

    if (building.mesh.position.z > 20) {
      building.mesh.position.z =
        building.initialZ - CONFIG.buildingCount * CONFIG.buildingSpacing;
    }
  }

  // Update penalty targets
  for (let i = penaltyTargets.length - 1; i >= 0; i--) {
    const penaltyTarget = penaltyTargets[i];
    penaltyTarget.position.z += gameState.speed * 3.5;

    // Remove if passed
    if (penaltyTarget.position.z >= bike?.position?.z + 2) {
      scene.remove(penaltyTarget);
      penaltyTargets.splice(i, 1);
    }

    // Check collision with bike
    if (
      penaltyTarget.position.z >= bike?.position?.z - 0.5 &&
      penaltyTarget.position.z <= bike?.position?.z + 0.5
    ) {
      // Simple box collision approximation
      if (Math.abs(penaltyTarget.position.x - bike.position.x) < 0.5) {
        scene.remove(penaltyTarget);
        penaltyTargets.splice(i, 1);
        gameState.penalties++;
        updateScoreboard();
      }
    }
  }

  // Game Over Check
  if (
    gameState.penalties >= CONFIG.maxPenalties ||
    gameState.losses >= CONFIG.maxLosses
  ) {
    gameState.isPlaying = false;
    updateScoreboard();
  }

  renderer.render(scene, camera);
}

animate(0);
// createPenaltyTarget(); // Handled in loop now

// Initial camera position
camera.position.set(0, 1, 2.5);

// Create targets at intervals - Removed setIntervals in favor of game loop

function animateCollision(target) {
  const originalScale = target.scale.clone();
  const animationDuration = 200;
  const scaleFactor = 0.3;
  target.material.color.set(0xff0000);

  const startTime = performance.now();
  function animate() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / animationDuration, 1);
    const scale = originalScale
      .clone()
      .multiplyScalar(1 + (scaleFactor - 1) * t);
    target.scale.set(scale.x, scale.y, scale.z);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      const index = targets.indexOf(target);
      if (index > -1) {
        scene.remove(target);
        targets.splice(index, 1);
      }
      target.scale.set(originalScale.x, originalScale.y, originalScale.z);
    }
  }
  animate();
}
