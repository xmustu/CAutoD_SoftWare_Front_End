import React, { Suspense, useRef, useLayoutEffect, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { 
    OrbitControls, 
    Html, 
    PerspectiveCamera, 
    OrthographicCamera 
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';
import { Color, Vector3, PCFSoftShadowMap } from 'three';

// -------------------------------------------------------------
// 1. Model Component (保持不变)
// -------------------------------------------------------------
const StlModel = ({ url, highlightState, setHighlightState, partVisibility, onPartsLoaded }) => {
    const geometry = useLoader(STLLoader, url);
    const meshRef = useRef();

    useEffect(() => {
        return () => {
            if (geometry) geometry.dispose();
        };
    }, [geometry]);

    useEffect(() => {
        if (onPartsLoaded) {
            onPartsLoaded(['Model']);
        }
    }, [onPartsLoaded]);

    useLayoutEffect(() => {
        if (meshRef.current) {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new Vector3();
            box.getCenter(center);
            meshRef.current.position.sub(center);
        }
    }, [geometry]);

    const baseColor = new Color('#1a4b88');
    const highlightColor = new Color('#ff4b88');

    const handleClick = (event) => {
        event.stopPropagation();
        if (setHighlightState) {
            const isCurrentHighlighted = highlightState?.name === 'Model' && highlightState?.isHighlighted;
            setHighlightState({
                name: isCurrentHighlighted ? null : 'Model',
                isHighlighted: !isCurrentHighlighted
            });
        }
    };

    const isHighlighted = highlightState?.name === 'Model' && highlightState?.isHighlighted;
    const color = isHighlighted ? highlightColor : baseColor;
    const isVisible = !partVisibility || partVisibility['Model'] !== false;

    return (
        <mesh 
            ref={meshRef}
            geometry={geometry}
            castShadow
            receiveShadow
            onClick={handleClick}
            visible={isVisible}
        >
            <meshStandardMaterial 
                color={color}
                roughness={0.7} 
                metalness={0.1} 
            />
        </mesh>
    );
};

// -------------------------------------------------------------
// 2. 场景环境设置 (相机 + 网格 + 坐标轴)
// -------------------------------------------------------------
const SceneSetup = ({ cameraType, upAxis, isGridVisible }) => { // 💥 接收 isGridVisible
    const upVector = upAxis === 'z' ? [0, 0, 1] : [0, 1, 0];
    const gridRotation = upAxis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];

    return (
        <>
            {cameraType === 'orthographic' ? (
                <OrthographicCamera 
                    makeDefault 
                    position={[50, 50, 50]} 
                    zoom={15} 
                    up={upVector}
                    near={0.1} 
                    far={2000} 
                />
            ) : (
                <PerspectiveCamera 
                    makeDefault 
                    position={[80, 80, 80]} 
                    fov={45} 
                    up={upVector}
                    near={0.1} 
                    far={2000} 
                />
            )}

            {/* 💥 使用 group 的 visible 属性来控制显示/隐藏 */}
            <group visible={isGridVisible}>
                <gridHelper args={[200, 50, 0x888888, 0x444444]} rotation={gridRotation} />
                <axesHelper args={[50]} />
            </group>
        </>
    );
};

// -------------------------------------------------------------
// 3. 截图处理器
// -------------------------------------------------------------
const CaptureHandler = forwardRef((props, ref) => {
    const { gl, scene, camera } = useThree();

    useImperativeHandle(ref, () => ({
        triggerSnapshot: (width, height, fileName = 'model_snapshot.png') => {
            const originalSize = new THREE.Vector2();
            gl.getSize(originalSize);
            const originalAspect = camera.aspect; 
            
            const originalOrtho = {
                left: camera.left,
                right: camera.right,
                top: camera.top,
                bottom: camera.bottom,
                zoom: camera.zoom
            };

            gl.setSize(width, height);
            const newAspect = width / height;

            if (camera.isPerspectiveCamera) {
                camera.aspect = newAspect;
                camera.updateProjectionMatrix();
            } else if (camera.isOrthographicCamera) {
                const frustumHeight = (camera.top - camera.bottom);
                camera.left = -frustumHeight * newAspect / 2;
                camera.right = frustumHeight * newAspect / 2;
                camera.top = frustumHeight / 2;
                camera.bottom = -frustumHeight / 2;
                camera.updateProjectionMatrix();
            }
            
            gl.render(scene, camera);
            const dataURL = gl.domElement.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            gl.setSize(originalSize.x, originalSize.y);
            
            if (camera.isPerspectiveCamera) {
                camera.aspect = originalSize.x / originalSize.y; 
                camera.updateProjectionMatrix();
            } else if (camera.isOrthographicCamera) {
                camera.left = originalOrtho.left;
                camera.right = originalOrtho.right;
                camera.top = originalOrtho.top;
                camera.bottom = originalOrtho.bottom;
                camera.updateProjectionMatrix();
            }
        }
    }));
    return null;
});

// -------------------------------------------------------------
// 4. ThreeDViewer Component
// -------------------------------------------------------------
const ThreeDViewer = forwardRef(({ 
    modelUrl, 
    highlightState, 
    setHighlightState, 
    partVisibility, 
    onPartsLoaded,
    quality = 'medium',
    cameraType = 'perspective', 
    upAxis = 'z',
    isViewLocked = false,
    isGridVisible = true // 💥 接收新参数，默认为 true
}, ref) => {
    const defaultBgColor = new Color('#f0f0f0'); 
    
    const captureRef = useRef();

    useImperativeHandle(ref, () => ({
        captureSnapshot: (w, h) => {
            if (captureRef.current) {
                captureRef.current.triggerSnapshot(w, h);
            }
        }
    }));

    const config = useMemo(() => {
        switch (quality) {
            case 'low': return { dpr: 0.5, shadowMapSize: 512, antialias: false };
            case 'high': return { dpr: [1, 3], shadowMapSize: 2048, antialias: true };
            case 'medium': default: return { dpr: [1, 1.5], shadowMapSize: 1024, antialias: true };
        }
    }, [quality]);

    const handlePointerMissed = () => {
        if (setHighlightState) {
            setHighlightState({ name: null, isHighlighted: false });
        }
    };

    return (
        <Canvas
            dpr={config.dpr}
            style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '8px' }}
            gl={{ 
                antialias: config.antialias, 
                alpha: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: true 
            }}
            onCreated={({ gl }) => {
                gl.setClearColor(defaultBgColor);
                gl.shadowMap.enabled = true;
                gl.shadowMap.type = PCFSoftShadowMap;
            }}
            onPointerMissed={handlePointerMissed}
        >
            {/* 💥 传递 isGridVisible 给 SceneSetup */}
            <SceneSetup 
                cameraType={cameraType} 
                upAxis={upAxis} 
                isGridVisible={isGridVisible} 
            />
            
            <CaptureHandler ref={captureRef} />

            <React.Fragment>
                <hemisphereLight intensity={0.8} skyColor="#ffffff" groundColor="#bbbbff" />
                <ambientLight intensity={0.5} />
                <spotLight 
                    position={[180, 200, 180]} 
                    angle={0.4} 
                    penumbra={0.5} 
                    decay={1} 
                    intensity={10} 
                    castShadow 
                    shadow-mapSize-width={config.shadowMapSize}
                    shadow-mapSize-height={config.shadowMapSize}
                    shadow-bias={-0.0001} 
                    shadow-normalBias={0.05}
                />
                <spotLight position={[-180, 100, -180]} angle={0.5} penumbra={1} intensity={5} decay={1} />

                {/* 地面 */}
                <mesh 
                    rotation={upAxis === 'z' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]} 
                    position={[0, -10, 0]} 
                    receiveShadow
                >
                    <planeGeometry args={[1000, 1000]} />
                    <shadowMaterial transparent opacity={0.1} />
                </mesh>
            </React.Fragment>

            <Suspense fallback={
                <Html center>
                    <div className="text-gray-600 bg-white p-2 rounded shadow text-xs">
                        Loading...
                    </div>
                </Html>
            }>
                {modelUrl && (
                    <StlModel 
                        url={modelUrl} 
                        highlightState={highlightState}
                        setHighlightState={setHighlightState}
                        partVisibility={partVisibility}
                        onPartsLoaded={onPartsLoaded}
                    />
                )}
            </Suspense>

            <OrbitControls 
                makeDefault 
                enableZoom={!isViewLocked} 
                enablePan={!isViewLocked} 
                enableRotate={!isViewLocked} 
            />
        </Canvas>
    );
});

export default ThreeDViewer;