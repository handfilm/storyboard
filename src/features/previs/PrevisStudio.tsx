/**
 * RAWx Studio — Camera, Previs & 2D Blocking Stage
 * Public API: PrevisStudio component
 * Features 2D overhead blocking floor plan with actor/camera frustum cones,
 * 3D Three.js previs stage with focal lens matching, and instant "Capture Still" to storyboard.
 */

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStudioStore } from '../../core/store';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
import { 
  Box, 
  Camera, 
  Aperture,
  Layers,
  Users,
  Check
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
    updateShot
  } = useStudioStore();

  const [previsMode, setPrevisMode] = useState<'3D' | '2D'>('3D');
  const [focalLength, setFocalLength] = useState<number>(50); // mm
  const [aperture, setAperture] = useState<number>(1.4);
  const [cameraAngle, setCameraAngle] = useState<number>(0); // degrees
  const [capturedToast, setCapturedToast] = useState(false);

  // 2D Blocking Actor Tokens
  const [actors, setActors] = useState<ActorToken[]>([
    { id: 'cam', name: 'CAMERA 1', x: 50, y: 80, color: '#D4AF37' },
    { id: 'act-a', name: 'RAKIB', x: 45, y: 40, color: '#00FFCC' },
    { id: 'act-b', name: 'SHADOW', x: 55, y: 35, color: '#FF4B4B' },
    { id: 'light', name: 'KEY LIGHT', x: 25, y: 60, color: '#FFE066' }
  ]);

  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  // Three.js Mount Ref
  const threeMountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (previsMode !== '3D' || !threeMountRef.current) return;

    const width = threeMountRef.current.clientWidth;
    const height = threeMountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

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

    const gridHelper = new THREE.GridHelper(20, 20, 0xd4af37, 0x222222);
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffe066, 1.5);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00ffcc, 1.0);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.25, 1.4, 16);
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });

    const heroBody = new THREE.Mesh(bodyGeometry, goldMat);
    heroBody.position.set(0, 0.7, 0);
    const heroHead = new THREE.Mesh(headGeometry, goldMat);
    heroHead.position.set(0, 1.55, 0);
    const heroGroup = new THREE.Group();
    heroGroup.add(heroBody, heroHead);
    scene.add(heroGroup);

    const propGeo = new THREE.BoxGeometry(0.8, 3.5, 0.4);
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.1 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(1.5, 1.75, -2);
    scene.add(prop);

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

  const handleCaptureStill = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    updateShot(activeShotIndex, { imageUrl: dataUrl });
    setCapturedToast(true);
    setTimeout(() => setCapturedToast(false), 1800);
  };

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
      <div className="flex-1 flex flex-col border-r border-white/[0.08] overflow-hidden">
        {/* Top Control Bar */}
        <div className="h-12 border-b border-white/[0.08] bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <CinemaBadgeHeader
              icon={<Camera className="w-3.5 h-3.5 text-amber-400" />}
              label="PREVIS 3D"
              accent="amber"
            />
            <span className="text-zinc-400 font-black text-[10px]">
              {focalLength}MM f/{aperture}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CinemaToolHUD
              title="3D STAGE VIEWPORT"
              en="Real-time WebGL 3D camera blocking with true focal-length FOV."
              bn="কীভাবে ব্যবহার করবেন: 3D ক্যামেরা ও ব্লকিং দেখতে 3D STAGE বেছে নিন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => setPrevisMode('3D')}
                data-active={previsMode === '3D' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber min-h-[36px] px-2.5 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <Box className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>3D STAGE</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="2D OVERHEAD FLOOR"
              en="Top-down stage floor plan for camera cone and actor blocking."
              bn="কীভাবে ব্যবহার করবেন: ওপর থেকে ক্যামেরা ও অ্যাক্টরের পজিশন সাজাতে 2D FLOOR চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => setPrevisMode('2D')}
                data-active={previsMode === '2D' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan min-h-[36px] px-2.5 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>2D FLOOR</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="CAPTURE PREVIS STILL"
              en="Render current 3D angle directly into active storyboard shot."
              bn="কীভাবে ব্যবহার করবেন: 3D দৃশ্যটির ছবি তুলে বর্তমান শটে সেভ করতে CAPTURE চাপুন।"
              accent="emerald"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleCaptureStill}
                data-active={capturedToast ? 'true' : 'false'}
                className="cinema-tile cinema-tile-emerald min-h-[36px] px-3 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                {capturedToast ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Camera className="w-3.5 h-3.5" strokeWidth={2.2} />}
                <span>{capturedToast ? 'SAVED' : 'CAPTURE'}</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-[#030304] relative overflow-hidden flex items-center justify-center">
          {previsMode === '3D' ? (
            <div ref={threeMountRef} className="w-full h-full relative" />
          ) : (
            <div 
              onClick={handleFloorClick}
              className="w-full max-w-2xl aspect-square bg-[#080808] border-2 border-[#D4AF37]/30 rounded-xl relative p-4 cursor-crosshair shadow-2xl"
              style={{
                backgroundImage: 'radial-gradient(rgba(212,175,55,0.15) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            >
              <div className="absolute top-3 left-3 text-[10px] font-black tracking-wider text-zinc-500">
                20M × 20M GRID
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
                  <span className="text-[9px] font-black text-[#EDEDED] bg-black/80 px-1 rounded mt-0.5 whitespace-nowrap">
                    {actor.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Camera Info HUD Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1.5 rounded border border-[#26282E] text-[10px] font-black tracking-wider text-zinc-400 flex items-center gap-4">
            <span>{focalLength}MM</span>
            <span className="text-amber-400">f/{aperture}</span>
            <span>SUPER 35</span>
          </div>
        </div>
      </div>

      {/* Right Camera & Lens Controls */}
      <div className="w-full md:w-80 bg-[#0B0B0B] p-4 flex flex-col gap-4 text-xs overflow-y-auto custom-scrollbar">
        <CinemaBadgeHeader
          icon={<Aperture className="w-3.5 h-3.5 text-amber-400" />}
          label="OPTIC RIG"
          accent="amber"
        />

        {/* Lens Focal Length Presets */}
        <div className="grid grid-cols-3 gap-1.5">
          {[18, 24, 35, 50, 85, 135].map(mm => (
            <CinemaToolHUD
              key={mm}
              title={`${mm}MM PRIME LENS`}
              en={`Set virtual 3D camera field of view to ${mm}mm.`}
              bn={`কীভাবে ব্যবহার করবেন: ক্যামেরা লেন্স ${mm}mm-এ সেট করতে চাপুন।`}
              accent="amber"
              side="left"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setFocalLength(mm)}
                data-active={focalLength === mm ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full min-h-[42px] text-center font-black tracking-wider text-xs"
              >
                {mm}MM
              </button>
            </CinemaToolHUD>
          ))}
        </div>

        {/* Aperture Slider */}
        <div className="border-t border-white/[0.08] pt-3">
          <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
            <span>APERTURE</span>
            <span className="text-amber-400">f/{aperture}</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="16"
            step="0.2"
            value={aperture}
            onChange={(e) => setAperture(Number(e.target.value))}
            className="w-full accent-amber-400 mt-1"
          />
        </div>

        {/* Camera Pan Angle */}
        <div className="border-t border-white/[0.08] pt-3">
          <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
            <span>PAN ANGLE</span>
            <span className="text-cyan-300">{cameraAngle}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={cameraAngle}
            onChange={(e) => setCameraAngle(Number(e.target.value))}
            className="w-full accent-cyan-400 mt-1"
          />
        </div>

        {/* 2D Actor Tokens Manager */}
        {previsMode === '2D' && (
          <div className="border-t border-white/[0.08] pt-3 flex flex-col gap-2">
            <CinemaBadgeHeader
              icon={<Users className="w-3 h-3 text-cyan-400" />}
              label="FLOOR TOKENS"
              accent="cyan"
            />
            {actors.map(actor => (
              <CinemaToolHUD
                key={actor.id}
                title={`MOVE ${actor.name}`}
                en="Select token, then click anywhere on the floor grid to reposition."
                bn={`কীভাবে ব্যবহার করবেন: ${actor.name} সিলেক্ট করে বাম দিকের ফ্লোর গ্রিডে ক্লিক করুন।`}
                accent="cyan"
                side="left"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={() => setSelectedActor(actor.id)}
                  data-active={selectedActor === actor.id ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-cyan w-full min-h-[42px] px-3 flex items-center justify-between text-[10.5px] font-black tracking-wider uppercase"
                >
                  <span>{actor.name}</span>
                  <span className="text-[9.5px] opacity-75">{actor.x}%,{actor.y}%</span>
                </button>
              </CinemaToolHUD>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
