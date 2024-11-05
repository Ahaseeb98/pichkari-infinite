import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let hits = 0;
let misses = 0;
let losses = 0;
let penalties = 0; // New penalties variable
let penaltyTargetActive = false; // Flag to track if a penalty target is active
// Constants
const treeCount = 50; // Number of trees for smoother looping
const treeSpacing = 5; // Distance to reset trees off-screen

const buildingSpacing = 5; // Distance between each building on the z-axis
const buildingCount = 30; // Number of buildings on each side of the road
// Array to keep track of trees
const trees = [];
const buildings = [];

function updateScoreboard() {
  const scoreboard = document.getElementById("scoreboard");
  scoreboard.innerHTML = `Hits: ${hits} | Misses: ${misses} | Losses: ${losses} | Penalties: ${penalties}`; // Update scoreboard display
}

const roadWidth = 2.5; // Half the width of the road (since the road goes from -2.5 to 2.5 on the X-axis)
const roadTreeWidth = 2.6; // Half the width of the road (since the road goes from -2.5 to 2.5 on the X-axis)

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffe7be); // Light blue color

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.08,
  1000
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
  depthBias: -0.0001,
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
  }
);
// Function to create trees at specific positions
function createTree(x, z) {
  const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 8);
  const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Brown color for trunk
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.set(x, 0.25, z); // Lower height for trunk

  const foliageGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const foliageMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 }); // Green color for foliage
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.set(x, 0.75, z); // Foliage sits above the trunk

  scene.add(trunk);
  scene.add(foliage);

  // Store the tree and its z position for looping
  trees.push({ trunk, foliage, z });
}

// Create initial trees
for (let i = 0; i < treeCount; i++) {
  const x = i % 2 === 0 ? -roadTreeWidth : roadTreeWidth;
  const z = -Math.random() * treeSpacing * treeCount - Math.random() * 10; // Random initial z position
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

  for (let i = 0; i < buildingCount; i++) {
    const zPosition = -i * buildingSpacing + Math.random() * 2; // Small random offset
    const width = Math.random() * 1.5 + 0.5;
    const height = Math.random() * 0.5 + 5;
    const depth = Math.random() * 1.5 + 0.5;
    const colors = [0xcccccc, 0xa0a0a0, 0xb0b0b0, 0x999999];
    const color = colors[Math.floor(Math.random() * colors.length)];
    // Alternate sides of the road
    // Alternate sides of the road
    const leftZ = zPosition + Math.random() * minDistance;
    const rightZ = zPosition - Math.random() * minDistance;

    createBuilding(
      -roadWidth - width / 2 - 0.5,
      leftZ,
      width,
      height,
      depth,
      color
    );
    createBuilding(
      roadWidth + width / 2 + 0.5,
      rightZ,
      width,
      height,
      depth,
      color
    );
  }
}

addBuildings();

function createSun() {
  const sunGeometry = new THREE.SphereGeometry(0.5, 32, 32); // Radius, width segments, height segments
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for the sun
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
  const targetGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.5);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const target = new THREE.Mesh(targetGeometry, targetMaterial);

  // Set the target's position at a random x and a fixed negative z position
  target.position.set((Math.random() - 0.5) * 5, 0.1, -30); // Start further back on the Z axis
  targets.push(target); // Add to targets array
  scene.add(target);
}

function createPenaltyTarget() {
  if (!penaltyTargetActive) {
    // Check if no active penalty target
    const penaltyTargetGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    const penaltyTargetMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    }); // Red color for penalty target
    const penaltyTarget = new THREE.Mesh(
      penaltyTargetGeometry,
      penaltyTargetMaterial
    );

    // Set the penalty target's position behind the bike
    penaltyTarget.position.set((Math.random() - 0.5) * 5, 0.1, -30); // Random x, fixed z

    penaltyTargets.push(penaltyTarget); // Add to penalty targets array
    scene.add(penaltyTarget);
    penaltyTargetActive = true; // Set the flag to indicate an active penalty target

    // Set a timeout to remove the penalty target after a random time between 10 and 20 seconds
    const penaltyDuration = Math.random() * 5000 + 5000; // Random time between 10 and 20 seconds
    setTimeout(() => {
      scene.remove(penaltyTarget);
      penaltyTargets.splice(penaltyTargets.indexOf(penaltyTarget), 1); // Remove from array
      penaltyTargetActive = false; // Reset flag to allow new penalty target creation
    }, penaltyDuration);
  }
}

// Game loop
function animate() {
  requestAnimationFrame(animate);

  // Move bike and spit objects
  if (bike) {
    bike.position.z += -0.000001; // Move bike forward continuously
    bike.position.x += bikeDirection; // Move bike left/right based on key press

    // Boundary checks
    if (bike.position.x < -roadWidth) {
      bike.position.x = -roadWidth; // Prevent moving left off the road
    } else if (bike.position.x > roadWidth) {
      bike.position.x = roadWidth; // Prevent moving right off the road
    }
  }

  // Move trees along with the bike and loop them
  for (const tree of trees) {
    tree.z += 0.35; // Move trees toward the bike
    tree.trunk.position.z = tree.z;
    tree.foliage.position.z = tree.z;

    // Check if tree needs to loop back
    if (tree.z > 100) {
      tree.z = -30; // Research t the tree's position to create the loop effect
    }
  }

  // Update spit positions
  for (let i = spawns.length - 1; i >= 0; i--) {
    const paan = spawns[i];
    paan.position.z -= 0.2; // Update spit position

    for (let j = targets.length - 1; j >= 0; j--) {
      const target = targets[j];
      const distance = paan.position.distanceTo(target.position);

      if (distance < 0.3) {
        // Collision detected
        scene.remove(target);
        targets.splice(j, 1);
        scene.remove(paan);
        spawns.splice(i, 1);

        hits++;
        updateScoreboard();
      }
    }

    // Remove the spit if it moves too far
    if (paan.position.z < -20) {
      scene.remove(paan);
      spawns.splice(i, 1);
      misses++;
      updateScoreboard();
    }
  }

  // Update regular targets
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    target.position.z += 0.25; // Move targets toward the bike (positive Z direction)

    // Check if target has passed the bike without being hit
    if (target.position.z >= bike.position.z) {
      scene.remove(target);
      targets.splice(i, 1); // Remove from array
      losses++; // Increment losses only for regular targets
      updateScoreboard(); // Update scoreboard
    }

    // Remove target if it moves off-screen
    if (target.position.z > 100) {
      scene.remove(target);
      targets.splice(i, 1); // Remove from array
    }
  }

  // Move buildings slowly toward the bike
  for (const building of buildings) {
    building.mesh.position.z += 0.1; // Move slower than trees for depth effect

    // Reset building if it goes beyond a certain position
    if (building.mesh.position.z > 10) {
      building.mesh.position.z =
        building.initialZ - buildingCount * buildingSpacing; // Ensure no overlap
    }
  }

  // Update penalty targets
  for (let i = penaltyTargets.length - 1; i >= 0; i--) {
    const penaltyTarget = penaltyTargets[i];
    penaltyTarget.position.z += 0.35; // Ensure penalty targets move toward the bike

    // Check if penalty target has passed the bike without being hit
    if (penaltyTarget.position.z >= bike.position.z) {
      scene.remove(penaltyTarget);
      penaltyTargets.splice(i, 1); // Remove from array
    }

    // Remove penalty target if it moves off-screen
    if (penaltyTarget.position.z > 100) {
      scene.remove(penaltyTarget);
      penaltyTargets.splice(i, 1); // Remove from array
    }
    if (penaltyTarget.position.z >= bike.position.z) {
      const distance = penaltyTarget.position.distanceTo(bike.position);
      if (distance < 0.3) {
        // Collision detected with penalty target
        scene.remove(penaltyTarget);
        penaltyTargets.splice(i, 1); // Remove from array
        penalties++; // Increment penalties
        updateScoreboard(); // Update scoreboard
      }
    }
  }

  renderer.render(scene, camera);
}

animate();
createPenaltyTarget(); // Call this in the animate loop to continually check for new penalty targets

// Initial camera position
camera.position.set(0, 1, 2.5);

// Create targets at intervals
setInterval(createTarget, 2000); // Create a normal target every 2 seconds
setInterval(createPenaltyTarget, 4000); // Create a penalty target every 4 seconds
