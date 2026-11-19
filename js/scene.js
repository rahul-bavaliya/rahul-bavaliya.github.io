// Hero 3D scene: a slowly turning "neural" cluster — a wireframe core,
// orbiting nodes linked by lines, and a drifting particle field.
// Colours follow the site theme; respects prefers-reduced-motion.
import * as THREE from './three.module.min.js';

const canvas = document.getElementById('hero-3d');
if (canvas) init(canvas);

function init(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { canvas.remove(); return; } // no WebGL: page still works
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const col = { a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() };

  const world = new THREE.Group();
  scene.add(world);

  // Core: wireframe icosahedron + inner solid, both gently breathing
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const coreWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(coreGeo),
    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 })
  );
  const coreSolid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.35, roughness: 0.45 })
  );
  world.add(coreWire, coreSolid);

  // Torus ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.018, 8, 160),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI * 0.42;
  world.add(ring);

  // Orbiting nodes (cubes, octahedra, spheres) — the "services"
  const nodeGeos = [
    new THREE.BoxGeometry(0.32, 0.32, 0.32),
    new THREE.OctahedronGeometry(0.24),
    new THREE.SphereGeometry(0.16, 16, 12),
  ];
  const nodeMat = new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.2, roughness: 0.5 });
  const nodeMatAlt = new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.2, roughness: 0.5 });
  const nodes = [];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(nodeGeos[i % 3], i % 2 ? nodeMat : nodeMatAlt);
    const r = 2.4 + Math.random() * 1.4;
    const phi = Math.acos(2 * (i + 0.5) / N - 1);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    m.userData = { r, phi, theta, speed: 0.08 + Math.random() * 0.12, spin: Math.random() * 0.02 + 0.005 };
    world.add(m);
    nodes.push(m);
  }

  // Links: each node to core + to its nearest neighbour (updated per frame)
  const linkCount = N * 2;
  const linkPos = new Float32Array(linkCount * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 }));
  world.add(links);

  // Particle field
  const P = 600;
  const pPos = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 22;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.6, sizeAttenuation: true }));
  scene.add(particles);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 5, 6);
  const rim = new THREE.PointLight(0xffffff, 18, 20); rim.position.set(-4, -2, 3);
  scene.add(amb, key, rim);

  function applyTheme() {
    col.a.set(css('--wheat'));
    col.b.set(css('--sky'));
    col.c.set(css('--ink-3'));
    coreWire.material.color.copy(col.b);
    coreSolid.material.color.copy(col.a);
    ring.material.color.copy(col.a);
    nodeMat.color.copy(col.b);
    nodeMatAlt.color.copy(col.a);
    links.material.color.copy(col.c);
    particles.material.color.copy(col.c);
    rim.color.copy(col.b);
    if (!running) renderer.render(scene, camera);
  }
  addEventListener('themechange', applyTheme);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // shift the cluster right on wide screens so it sits beside the headline
    world.position.x = w > 900 ? 2.6 : 0.8;
    world.position.y = w > 900 ? 0 : -1.2;
    world.scale.setScalar(w > 900 ? 1 : 0.75);
  }
  new ResizeObserver(resize).observe(canvas);

  // Pointer parallax
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    target.x = (e.clientX / innerWidth - 0.5) * 2;
    target.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  const tmp = new THREE.Vector3();
  function step(t) {
    const s = t * 0.001;
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;

    world.rotation.y = s * 0.12 + cur.x * 0.35;
    world.rotation.x = Math.sin(s * 0.2) * 0.15 + cur.y * 0.25;
    coreWire.rotation.y = -s * 0.25;
    coreSolid.rotation.set(s * 0.3, s * 0.4, 0);
    const breathe = 1 + Math.sin(s * 1.3) * 0.04;
    coreWire.scale.setScalar(breathe);
    ring.rotation.z = s * 0.15;

    nodes.forEach(n => {
      const u = n.userData;
      const th = u.theta + s * u.speed;
      n.position.set(
        u.r * Math.sin(u.phi) * Math.cos(th),
        u.r * Math.cos(u.phi) + Math.sin(s + u.theta) * 0.15,
        u.r * Math.sin(u.phi) * Math.sin(th)
      );
      n.rotation.x += u.spin; n.rotation.y += u.spin * 1.3;
    });

    let k = 0;
    nodes.forEach((n, i) => {
      // to core
      linkPos.set([0, 0, 0, n.position.x, n.position.y, n.position.z], k); k += 6;
      // to nearest neighbour
      let best = null, bd = Infinity;
      nodes.forEach((o, j) => { if (j !== i) { const d = tmp.copy(o.position).sub(n.position).lengthSq(); if (d < bd) { bd = d; best = o; } } });
      linkPos.set([n.position.x, n.position.y, n.position.z, best.position.x, best.position.y, best.position.z], k); k += 6;
    });
    linkGeo.attributes.position.needsUpdate = true;

    particles.rotation.y = s * 0.02;
    particles.position.x = -cur.x * 0.3;
    particles.position.y = cur.y * 0.2;

    renderer.render(scene, camera);
  }

  let running = false, raf = 0;
  function loop(t) { step(t); raf = requestAnimationFrame(loop); }
  function start() { if (!running && !reduced) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // only animate while the hero is on screen and the tab is visible
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  applyTheme();
  step(4000); // first frame (and the only frame with reduced motion)
  canvas.classList.add('ready');
}
