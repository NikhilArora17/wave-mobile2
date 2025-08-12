import * as THREE from 'three';
import { Noise } from 'noisejs';

const noise = new Noise();

// ==== Fixed canvas size ====
const WIDTH = 370;
const HEIGHT = 710;

let scene, camera, renderer;
const lines = [];
let lineCount = 20;
let segmentCount = 120;

let sharedLeftX = -WIDTH / 1.3;
let sharedRightX = WIDTH / 1.3;
let maxDist = WIDTH / 0.5;

init();
animate();

function init() {
  scene = new THREE.Scene();

  // Orthographic camera sized to fixed canvas
  camera = new THREE.OrthographicCamera(
    -WIDTH / 2, WIDTH / 2,
    HEIGHT / 2, -HEIGHT / 2,
    1, 1000
  );
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true,
    alpha: true
  });

  // Lock internal buffer to 370x710 and avoid CSS scaling
  renderer.setPixelRatio(1);            // keep crisp, no HiDPI scaling
  renderer.setSize(WIDTH, HEIGHT, false); // false => don't touch CSS size
  renderer.autoClearColor = false;
  renderer.setClearColor(0xffffff, 0.05);

  const material = new THREE.PointsMaterial({
    color: 0x000000,
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.4,
    map: createCircleTexture(),
    alphaTest: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < lineCount; i++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segmentCount * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, material.clone());
    points.userData.index = i;
    lines.push(points);
    scene.add(points);
  }

  // No window resize listener — fixed size by design
}

function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function animate(time) {
  requestAnimationFrame(animate);
  const t = time * 0.00032;

  renderer.clearColor();

  lines.forEach((points, lineIndex) => {
    const geometry = points.geometry;
    const positions = geometry.attributes.position.array;

    const baseY = 0;
    const amplitude = 150 + lineIndex * 30;

    const phaseShift = lineIndex * 0.2;
    const verticalOffset = Math.sin(t * 2 + phaseShift) * 12;
    const horizontalJitter = Math.sin(t * 1.5 + phaseShift) * 5;

    const p0 = new THREE.Vector3(sharedLeftX + horizontalJitter, baseY + verticalOffset, 0);
    const p4 = new THREE.Vector3(sharedRightX + horizontalJitter, baseY + verticalOffset, 0);

    const midPoints = [];
    for (let j = 0; j < 3; j++) {
      let x = sharedLeftX + ((j + 1) / 4) * (sharedRightX - sharedLeftX) + horizontalJitter;
      let y = baseY + verticalOffset + noise.perlin2(j * (0.4 + lineIndex * 0.05), t + lineIndex * 0.07) * amplitude;
      midPoints.push(new THREE.Vector3(x, y, 0));
    }

    const curve = new THREE.CatmullRomCurve3([p0, ...midPoints, p4]);
    const curvePoints = curve.getPoints(segmentCount - 1);

    for (let j = 0; j < segmentCount; j++) {
      const p = curvePoints[j];
      const idx = j * 3;
      positions[idx] = p.x;
      positions[idx + 1] = p.y;
      positions[idx + 2] = 0;
    }

    geometry.attributes.position.needsUpdate = true;

    const centerIndex = Math.floor(segmentCount / 2);
    const cx = curvePoints[centerIndex].x;
    const distToCenter = Math.abs(cx);
    const fade = 1.0 - Math.min(distToCenter / maxDist, 1);

    points.material.opacity = 0.15 + 0.35 * Math.sin(t * 4 + lineIndex * 0.4) * fade;
  });

  renderer.render(scene, camera);
}
