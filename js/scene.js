// Full-page 3D background.
// A "neural" cluster sits behind the hero; more shapes float down the page.
// The camera travels down through them as you scroll. Colours follow the theme.
import * as THREE from './three.module.min.js';

const canvas = document.getElementById('bg-3d');
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
  const DEPTH = 44;           // how far down (world units) the page "track" runs
  let wide = true;

  // ---------- Materials (recoloured on theme change) ----------
  const M = {
    wire:    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 }),
    wireDim: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.32 }),
    solidA:  new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.35, roughness: 0.45 }),
    solidB:  new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.2, roughness: 0.5 }),
    ghostA:  new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.55 }),
    ghostB:  new THREE.MeshStandardMaterial({ flatShading: true, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.5 }),
    ring:    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 }),
    link:    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 }),
    dots:    new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.6, sizeAttenuation: true }),
  };

  // ---------- Hero cluster ----------
  const hero = new THREE.Group();
  scene.add(hero);

  const coreWire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.6, 1)), M.wire);
  const coreSolid = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), M.solidA);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.018, 8, 160), M.ring);
  ring.rotation.x = Math.PI * 0.42;
  hero.add(coreWire, coreSolid, ring);

  const nodeGeos = [
    new THREE.BoxGeometry(0.32, 0.32, 0.32),
    new THREE.OctahedronGeometry(0.24),
    new THREE.SphereGeometry(0.16, 16, 12),
  ];
  const nodes = [];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(nodeGeos[i % 3], i % 2 ? M.solidB : M.solidA);
    m.userData = {
      r: 2.4 + Math.random() * 1.4,
      phi: Math.acos(2 * (i + 0.5) / N - 1),
      theta: Math.PI * (1 + Math.sqrt(5)) * i,
      speed: 0.08 + Math.random() * 0.12,
      spin: Math.random() * 0.02 + 0.005,
    };
    hero.add(m);
    nodes.push(m);
  }
  const linkPos = new Float32Array(N * 2 * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  hero.add(new THREE.LineSegments(linkGeo, M.link));

  // ---------- Floaters down the page ----------
  // A mix of wireframe and solid shapes, alternating left/right of the content.
  const makers = [
    () => new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(0.7, 0.2, 80, 10)), M.wireDim),
    () => new THREE.Mesh(new THREE.OctahedronGeometry(0.75), M.ghostA),
    () => new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.95, 1)), M.wire),
    () => new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), M.ghostB),
    () => new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 10, 64), M.ring),
    () => new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.DodecahedronGeometry(0.85)), M.wireDim),
    () => new THREE.Mesh(new THREE.TetrahedronGeometry(0.8), M.ghostA),
    () => new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), M.ghostB),
  ];
  const floaters = [];
  const F = 22;
  for (let i = 0; i < F; i++) {
    const obj = makers[i % makers.length]();
    const side = i % 2 ? 1 : -1;
    obj.userData = {
      side,
      baseY: -5 - (i / (F - 1)) * (DEPTH - 4) + (Math.random() - 0.5) * 1.5,
      xOff: 0.2 + Math.random() * 1.3,       // distance beyond the content edge
      z: -1.5 - Math.random() * 4,
      bob: 0.25 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      rs: new THREE.Vector3(Math.random() * 0.3 + 0.1, Math.random() * 0.4 + 0.1, Math.random() * 0.2),
      scale: 0.7 + Math.random() * 0.8,
    };
    obj.scale.setScalar(obj.userData.scale);
    scene.add(obj);
    floaters.push(obj);
  }
  // A few small "satellite" shapes that drift through the middle, far back
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(nodeGeos[i % 3], i % 2 ? M.ghostA : M.ghostB);
    m.userData = {
      side: 0, center: true,
      baseY: -8 - Math.random() * (DEPTH - 8),
      x: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 3), z: -7 - Math.random() * 4,
      bob: 0.4, phase: Math.random() * 6,
      rs: new THREE.Vector3(0.4, 0.6, 0.1), scale: 1.2,
    };
    m.scale.setScalar(1.2);
    scene.add(m);
    floaters.push(m);
  }

  // ---------- Particle field spanning the full page ----------
  const P = 1400;
  const pPos = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 24;
    pPos[i * 3 + 1] = 6 - Math.random() * (DEPTH + 14);
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, M.dots);
  scene.add(particles);

  // ---------- Lights ----------
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 5, 6);
  const rim = new THREE.PointLight(0xffffff, 18, 20); rim.position.set(-4, -2, 3);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6), key, rim);

  let running = false;
  function applyTheme() {
    const a = new THREE.Color(css('--wheat')), b = new THREE.Color(css('--sky')), c = new THREE.Color(css('--ink-3'));
    M.wire.color.copy(b); M.wireDim.color.copy(b);
    M.solidA.color.copy(a); M.ghostA.color.copy(a); M.ring.color.copy(a);
    M.solidB.color.copy(b); M.ghostB.color.copy(b);
    M.link.color.copy(c); M.dots.color.copy(c);
    rim.color.copy(b);
    if (!running) step(performance.now());
  }
  addEventListener('themechange', applyTheme);

  // visible half-width at z=0, used to park floaters just outside the content column
  let halfW = 5;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    wide = w > 900;
    hero.position.x = wide ? 2.6 : 0.8;
    hero.position.y = wide ? 0 : -1.2;
    hero.scale.setScalar(wide ? 1 : 0.75);
    if (!running) step(performance.now());
  }
  addEventListener('resize', resize);

  // ---------- Input: pointer parallax + scroll ----------
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    target.x = (e.clientX / innerWidth - 0.5) * 2;
    target.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  let scrollT = 0, scrollCur = 0, lastScroll = 0, spinBoost = 0;
  function readScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollT = Math.min(1, Math.max(0, scrollY / max));
    spinBoost = Math.min(spinBoost + Math.abs(scrollY - lastScroll) * 0.0006, 0.6);
    lastScroll = scrollY;
    if (!running) step(performance.now());
  }
  addEventListener('scroll', readScroll, { passive: true });

  const tmp = new THREE.Vector3();
  let spinAcc = 0;
  function step(t) {
    const s = t * 0.001;
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    scrollCur += (scrollT - scrollCur) * (reduced ? 1 : 0.08);
    spinBoost *= 0.95;
    spinAcc += 0.002 + spinBoost * 0.03;

    // camera travels down the track
    camera.position.y = -scrollCur * DEPTH + cur.y * -0.3;
    camera.position.x = cur.x * 0.4;
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);

    // hero cluster
    hero.rotation.y = s * 0.12 + cur.x * 0.35 + spinAcc;
    hero.rotation.x = Math.sin(s * 0.2) * 0.15 + cur.y * 0.25;
    coreWire.rotation.y = -s * 0.25;
    coreSolid.rotation.set(s * 0.3, s * 0.4, 0);
    coreWire.scale.setScalar(1 + Math.sin(s * 1.3) * 0.04);
    ring.rotation.z = s * 0.15;

    nodes.forEach(n => {
      const u = n.userData, th = u.theta + s * u.speed;
      n.position.set(
        u.r * Math.sin(u.phi) * Math.cos(th),
        u.r * Math.cos(u.phi) + Math.sin(s + u.theta) * 0.15,
        u.r * Math.sin(u.phi) * Math.sin(th)
      );
      n.rotation.x += u.spin; n.rotation.y += u.spin * 1.3;
    });
    let k = 0;
    nodes.forEach((n, i) => {
      linkPos.set([0, 0, 0, n.position.x, n.position.y, n.position.z], k); k += 6;
      let best = nodes[(i + 1) % N], bd = Infinity;
      nodes.forEach((o, j) => { if (j !== i) { const d = tmp.copy(o.position).sub(n.position).lengthSq(); if (d < bd) { bd = d; best = o; } } });
      linkPos.set([n.position.x, n.position.y, n.position.z, best.position.x, best.position.y, best.position.z], k); k += 6;
    });
    linkGeo.attributes.position.needsUpdate = true;

    // floaters
    const contentEdge = wide ? Math.min(halfW * 0.82, 4.4) : halfW * 0.55;
    floaters.forEach(f => {
      const u = f.userData;
      // objects further back look closer to the centre; push them out by depth so they stay in the margins
      const depthK = (camera.position.z - u.z) / camera.position.z;
      const x = u.center ? u.x : u.side * (contentEdge + u.xOff * (wide ? 1 : 0.6)) * depthK;
      f.position.set(x, u.baseY + Math.sin(s * u.bob + u.phase) * 0.35, u.z);
      f.rotation.x = s * u.rs.x + spinAcc * 0.6 + u.phase;
      f.rotation.y = s * u.rs.y + spinAcc + u.phase;
      f.rotation.z = s * u.rs.z;
    });

    particles.rotation.y = s * 0.015;
    renderer.render(scene, camera);
  }

  let raf = 0;
  function loop(t) { step(t); raf = requestAnimationFrame(loop); }
  function start() { if (!running && !reduced) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  readScroll();
  applyTheme();
  start();
  canvas.classList.add('ready');
}
