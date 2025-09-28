// src/components/ThreeViewer.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function ThreeViewer({
  modelUrl,
  autoRotate = true,
  rotateSpeed = 0.005,
  background = 0xf5f5f5,
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!modelUrl || !mountRef.current) return;
    const mount = mountRef.current;

    // === 场景 ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    // === 相机 ===
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 1.5, 3);

    // === 渲染器 ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);

    // 新增：色彩 & 色调映射
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    mount.appendChild(renderer.domElement);

    // === 灯光（更真实） ===
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    scene.add(dir);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    // === 控制器 ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // === 加载模型 ===
    const loader = new GLTFLoader();
    let model = null;
    let rafId = 0;

    loader.load(
      modelUrl,
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        // 居中模型
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        model.position.sub(center);

        // 调整相机
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitDist = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
        camera.position.set(0, maxDim * 0.5, fitDist * 1.6);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => console.error("GLB 加载失败：", err)
    );

    // === 自适应 ===
    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener("resize", onResize);

    // === 渲染循环 ===
    const tick = () => {
      if (model && autoRotate) model.rotation.y += rotateSpeed;
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // === 清理 ===
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();

      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose?.());
          } else {
            obj.material?.dispose?.();
          }
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [modelUrl, autoRotate, rotateSpeed, background]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "420px",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}
    />
  );
}
