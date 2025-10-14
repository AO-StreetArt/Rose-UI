import { useEffect, useRef } from 'react';
import {
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders';

const BabylonScene = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera(
      'camera1',
      Math.PI / 2,
      Math.PI / 2.5,
      8,
      new Vector3(0, 0, 0),
      scene,
    );
    camera.attachControl(canvas, true);

    new HemisphericLight('light1', new Vector3(0, 1, 0), scene);
    MeshBuilder.CreateBox('box', { size: 2 }, scene);

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="babylon-canvas" />;
};

export default BabylonScene;
