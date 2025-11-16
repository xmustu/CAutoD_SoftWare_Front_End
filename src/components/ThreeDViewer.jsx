import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber'; // 💥 Import useLoader from fiber
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'; // 💥 Import STLLoader
import { Color } from 'three';
import * as THREE from 'three';

// -------------------------------------------------------------
// Model Component: Responsible for loading and rendering the STL file
// -------------------------------------------------------------
const StlModel = ({ url }) => {
    // 💥 Use the standard useLoader hook: pass STLLoader and model URL
    // useLoader returns the loaded BufferGeometry object
    const geometry = useLoader(STLLoader, url);
    
    // Calculate the bounding box and center the model
    const meshRef = React.useRef();
    React.useLayoutEffect(() => {
        if (meshRef.current) {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            meshRef.current.position.sub(center); // Center the mesh
        }
    }, [geometry]);


    return (
        // <mesh> is the THREE.Mesh object in Three.js
        <mesh 
            ref={meshRef}
            geometry={geometry}
            castShadow
            receiveShadow
        >
            {/* Basic material for displaying the geometry shape */}
            <meshStandardMaterial 
                color="#888888" 
                roughness={0.5} 
                metalness={0.5} 
            />
        </mesh>
    );
};

// -------------------------------------------------------------
// ThreeDViewer Component: Sets up the 3D scene, lighting, and camera controls
// -------------------------------------------------------------
const ThreeDViewer = ({ modelUrl }) => {
    // Set the default background color for the Canvas
    const defaultBgColor = new Color('#f0f0f0'); 

    return (
        <Canvas
            // The style and size must be determined by the parent container
            style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '8px' }}
            // Adjust the initial camera position to view the model
            camera={{ position: [50, 50, 50], fov: 75 }} 
            gl={{ antialias: true, alpha: false }} // Enable antialiasing
            onCreated={({ gl }) => {
                gl.setClearColor(defaultBgColor); // Set the background color
                gl.shadowMap.enabled = true; // Enable shadows
            }}
        >
            {/* Ambient Light: Softly illuminates all objects */}
            <ambientLight intensity={1} /> 
            
            {/* Directional Light: Provides shadows and dimensionality */}
            <spotLight 
                position={[200, 200, 200]} 
                angle={0.3} 
                penumbra={1} 
                intensity={5000} 
                castShadow 
            /> 
            
            {/* Add a simple floor plane for shadows and context */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
                <planeGeometry args={[1000, 1000]} />
                <shadowMaterial transparent opacity={0.1} />
            </mesh>


            {/* 🌟 Suspense: Handles asynchronous model loading 🌟 */}
            <Suspense fallback={
                <Html center>
                    <div className="text-gray-600 animate-pulse bg-white p-3 rounded shadow-md">
                        加载 3D 模型中...
                    </div>
                </Html>
            }>
                {modelUrl ? (
                    <StlModel url={modelUrl} />
                ) : (
                    <Html center>
                        <div className="text-red-600 bg-white p-3 rounded shadow-md">
                            模型URL缺失，无法加载。
                        </div>
                    </Html>
                )}
            </Suspense>

            {/* Orbit Controls: Allows users to rotate, zoom, and pan the model with the mouse */}
            <OrbitControls makeDefault enableZoom enablePan enableRotate /> 
            
            {/* 🚨 关键修复：暂时移除或替换 Environment 组件，以避免 useEnvironment 的崩溃 */}
            {/* <Environment files={null} background={false} /> */}
            
        </Canvas>
    );
};

export default ThreeDViewer;