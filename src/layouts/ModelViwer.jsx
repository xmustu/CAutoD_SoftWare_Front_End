import { useEffect, useRef, useState, useCallback } from 'react'; // 导入 useCallback
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ModelViewer = ({ modelUrl, backendApiBaseUrl }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  // 加载模型函数
  const loadModel = useCallback(async (url, baseUrl) => {
    setIsLoading(true);
    try {
      const fullModelUrl = `${baseUrl}${url}`;
      const token = localStorage.getItem("token");
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(fullModelUrl, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const loader = new STLLoader();
      const geometry = loader.parse(arrayBuffer);

      // 清除现有模型
      if (sceneRef.current) {
        const objectsToRemove = sceneRef.current.children.filter(
          (child) => child instanceof THREE.Mesh
        );
        objectsToRemove.forEach((child) => sceneRef.current.remove(child));
      }

      const material = new THREE.MeshPhongMaterial({
        color: 0x0070f3,
        shininess: 100,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      mesh.position.sub(center);

      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 10 / maxDim;
      mesh.scale.set(scale, scale, scale);

      if (sceneRef.current) {
        sceneRef.current.add(mesh);
      }

      if (cameraRef.current) {
        cameraRef.current.position.z = 20;
      }

      setIsLoading(false);
    } catch (error) {
      console.error('模型加载或解析错误:', error);
      setIsLoading(false);
    }
  }, []);

  // 初始化Three.js场景
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 20;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const currentContainer = containerRef.current;
      const currentCamera = cameraRef.current;
      const currentRenderer = rendererRef.current;
      
      currentCamera.aspect = currentContainer.clientWidth / currentContainer.clientHeight;
      currentCamera.updateProjectionMatrix();
      currentRenderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // 当 modelUrl 或 backendApiBaseUrl 变化时加载模型
  useEffect(() => {
    if (modelUrl && backendApiBaseUrl) {
      loadModel(modelUrl, backendApiBaseUrl);
    }
  }, [modelUrl, backendApiBaseUrl, loadModel]);

  return (
    <div className="relative w-full h-96">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
          <p>加载模型中...</p>
        </div>
      )}
      <div 
        ref={containerRef}
        id="model-container" 
        className="w-full h-full border border-gray-200 rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default ModelViewer;
