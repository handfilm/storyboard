/**
 * RAWx Studio — Camera, Previs & 2D Blocking Stage
 * Public API: PrevisStudio component
 * Features 2D overhead blocking floor plan with actor/camera frustum cones,
 * 3D Three.js previs stage with focal lens matching, and instant "Capture Still" to storyboard.
 */

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStudioStore } from '../../core/store';
import { 
  Box, 
  Camera, 
  Move, 
  RotateCw, 
  Sliders, 
  Maximize, 
  Download, 
  Layers, 
  Users, 
  Sun 
} from 'lucide-react';

interface ActorToken {
  id: string;
  name: string;
  x: number; // 0-100%
  y: number; // 0-100%
  color: string;
}

export const PrevisStudio: React.FC = () => {
  const {
    activeShotIndex,
    activeLens,
    updateShot
  } = useStudioStore();

  const [previsMode, setPrevisMode] = useState<'3D' | '2D'>('3D');
  const [focalLength, setFocalLength] = useState<number>(50); // mm
  const [aperture, setAperture] = useState<number>(1.4);
  const [cameraAngle, setCameraAngle] = useState<number>(0); // degrees

  // 2D Blocking Actor Tokens
  const [actors, setActors] = useState<ActorToken[]>([
    { id: 'cam', name: 'CAMERA 1', x: 50, y: 80, color: '#D4AF37' },
    { id: 'act-a', name: 'RAKIB (HERO)', x: 45, y: 40, color: '#00FFCC' },
    { id: 'act-b', name: 'SHADOW FIG', x: 55, y: 35, color: '#FF4B4B' },
    { id: 'light', name: 'KEY LIGHT', x: 25, y: 60, color: '#FFE066' }
  ]);

  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  // Three.js Mount Ref
  const threeMountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    if (previsMode !== '3D' || !threeMountRef.current) return;

    const width = threeMountRef.current.clientWidth;
    const height = threeMountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

    // Camera with configurable FOV derived from focal length
    const fov = 2 * Math.atan(18 / focalLength) * (180 / Math.PI);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    threeMountRef.current.innerHTML = '';
    threeMountRef.current.appendChild(renderer.domElement);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(20, 20, 0xd4af37, 0x222222);
    scene.add(gridHelper);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffe066, 1.5);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00ffcc, 1.0);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // 3D Actor Blockout Mannequins
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.25, 1.4, 16);
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.5 });

    // Hero Mannequin
    const heroBody = new THREE.Mesh(bodyGeometry, goldMat);
    heroBody.position.set(0, 0.7, 0);
    const heroHead = new THREE.Mesh(headGeometry, goldMat);
    heroHead.position.set(0, 1.55, 0);
    const heroGroup = new THREE.Group();
    heroGroup.add(heroBody, heroHead);
    scene.add(heroGroup);

    // Background Monolith Prop
    const propGeo = new THREE.BoxGeometry(0.8, 3.5, 0.4);
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.1 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(1.5, 1.75, -2);
    scene.add(prop);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      heroGroup.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!threeMountRef.current || !renderer || !camera) return;
      const newW = threeMountRef.current.clientWidth;
      const newH = threeMountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [previsMode, focalLength]);

  // Capture Still from 3D Viewport directly into Active Shot
  const handleCaptureStill = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    updateShot(activeShotIndex, { imageUrl: dataUrl });
    alert(`Captured 3D Previs still into Shot #${activeShotIndex + 1}!`);
  };

  // 2D Drag interaction
  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedActor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setActors(prev => prev.map(a => a.id === selectedActor ? { ...a, x, y } : a));
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Left Previs Viewport Canvas */}
      <div className="flex-1 flex flex-col border-r border-[#D4AF37]/20 overflow-hidden">
        {/* Top Control Bar */}
        <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-[#FFE066]">PREVIS & BLOCKING STAGE</span>
            <span className="text-[#8A8A8A]">| {focalLength}mm f/{aperture}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#121212] p-0.5 rounded border border-[#D4AF37]/20">
              <button
                onClick={() => setPrevisMode('3D')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  previsMode === '3D' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'
                }`}
              >
                3D VIEWPORT
              </button>
              <button
                onClick={() => setPrevisMode('2D')}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  previsMode === '2D' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'
                }`}
              >
                2D OVERHEAD FLOOR
              </button>
            </div>

            <button
              onClick={handleCaptureStill}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>CAPTURE STILL</span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-[#030304] relative overflow-hidden flex items-center justify-center">
          {previsMode === '3D' ? (
            <div ref={threeMountRef} className="w-full h-full relative" />
          ) : (
            /* 2D Overhead Floor Plan */
            <div 
              onClick={handleFloorClick}
              className="w-full max-w-2xl aspect-square bg-[#080808] border-2 border-[#D4AF37]/30 rounded-xl relative p-4 cursor-crosshair shadow-2xl"
              style={{
                backgroundImage: 'radial-gradient(rgba(212,175,55,0.15) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            >
              <div className="absolute top-3 left-3 text-[10px] text-[#8A8A8A]">
                OVERHEAD GRID 20m x 20m // CLICK TO PLACE SELECTED TOKEN
              </div>

              {/* Camera Frustum Cone */}
              {actors.filter(a => a.id === 'cam').map(cam => (
                <div 
                  key={cam.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${cam.x}%`,
                    top: `${cam.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div 
                    className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-t-[140px] border-t-[#D4AF37]/20 absolute -top-[140px] -left-[60px]"
                    style={{ transform: `rotate(${cameraAngle}deg)` }}
                  />
                </div>
              ))}

              {/* Actor Tokens */}
              {actors.map(actor => (
                <div
                  key={actor.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedActor(actor.id);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform ${
                    selectedActor === actor.id ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                  }`}
                  style={{ left: `${actor.x}%`, top: `${actor.y}%` }}
                >
                  <div 
                    className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center font-bold text-[9px] shadow-lg"
                    style={{ backgroundColor: actor.color, color: '#000' }}
                  >
                    {actor.name.charAt(0)}
                  </div>
                  <span className="text-[9px] font-bold text-[#EDEDED] bg-black/80 px-1 rounded mt-0.5 whitespace-nowrap">
                    {actor.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Camera Info HUD Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1.5 rounded border border-[#D4AF37]/30 text-[10px] text-[#8A8A8A] flex items-center gap-4">
            <div>FOCAL: <span className="text-[#FFE066] font-bold">{focalLength}mm</span></div>
            <div>APERTURE: <span className="text-[#FFE066] font-bold">f/{aperture}</span></div>
            <div>SENSOR: <span className="text-[#FFE066] font-bold">SUPER 35 CINE</span></div>
          </div>
        </div>
      </div>

      {/* Right Camera & Lens Controls */}
      <div className="w-full md:w-80 bg-[#0B0B0B] p-4 flex flex-col gap-4 text-xs overflow-y-auto custom-scrollbar">
        <h3 className="font-bold text-[#FFE066] text-xs uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2">
          Optics & Lens Settings
        </h3>

        {/* Lens Focal Length Presets */}
        <div>
          <label className="text-[10px] text-[#8A8A8A] uppercase">Prime Lens Presets</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {[18, 24, 35, 50, 85, 135].map(mm => (
              <button
                key={mm}
                onClick={() => setFocalLength(mm)}
                className={`py-2 rounded border text-center font-bold text-xs ${
                  focalLength === mm 
                    ? 'border-[#FFE066] bg-[#D4AF37] text-black' 
                    : 'border-[#D4AF37]/20 bg-[#121212] text-[#EDEDED] hover:border-[#D4AF37]'
                }`}
              >
                {mm}mm
              </button>
            ))}
          </div>
        </div>

        {/* Aperture Slider */}
        <div className="border-t border-[#D4AF37]/10 pt-3">
          <div className="flex justify-between text-[10px] text-[#8A8A8A]">
            <span>IRIS APERTURE (DOF)</span>
            <span className="text-[#FFE066]">f/{aperture}</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="16"
            step="0.2"
            value={aperture}
            onChange={(e) => setAperture(Number(e.target.value))}
            className="w-full accent-[#D4AF37] mt-1"
          />
        </div>

        {/* Camera Pan Angle */}
        <div className="border-t border-[#D4AF37]/10 pt-3">
          <div className="flex justify-between text-[10px] text-[#8A8A8A]">
            <span>CAMERA PAN ANGLE</span>
            <span className="text-[#FFE066]">{cameraAngle}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={cameraAngle}
            onChange={(e) => setCameraAngle(Number(e.target.value))}
            className="w-full accent-[#D4AF37] mt-1"
          />
        </div>

        {/* 2D Actor Tokens Manager */}
        {previsMode === '2D' && (
          <div className="border-t border-[#D4AF37]/10 pt-3 flex flex-col gap-2">
            <label className="text-[10px] text-[#8A8A8A] uppercase">Select Active Token</label>
            {actors.map(actor => (
              <button
                key={actor.id}
                onClick={() => setSelectedActor(actor.id)}
                className={`p-2 rounded border text-left flex items-center justify-between ${
                  selectedActor === actor.id ? 'border-[#FFE066] bg-[#D4AF37]/20 text-[#FFE066]' : 'border-[#D4AF37]/20 bg-[#121212] text-[#8A8A8A]'
                }`}
              >
                <span className="font-bold">{actor.name}</span>
                <span className="text-[10px] text-[#8A8A8A]">{actor.x}%, {actor.y}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
