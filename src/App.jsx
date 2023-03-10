import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Stats,
  KeyboardControls,
  useKeyboardControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { MeshNormalMaterial, BoxGeometry } from "three";
import { io } from "socket.io-client";

const ControlsWrapper = ({ socket }) => {
  const controlsRef = useRef();
  const [updateCallback, setUpdateCallback] = useState(null);
  const [, get] = useKeyboardControls();

  const camera = useThree((state) => state.camera);
  const { forward, backward, left, right, jump } = get();
  // Register the update event and clean up
  useFrame(() => {
    // console.log(controlsRef.current.object.position);
    if (forward) {
      console.log("camera", camera.position);
    }
  }, [forward, controlsRef, socket]);
  useEffect(() => {
    const onControlsChange = (val) => {
      // console.log(val);
      const { position, rotation } = val.target.object;
      const { id } = socket;

      const posArray = [];
      const rotArray = [];

      position.toArray(posArray);
      rotation.toArray(rotArray);

      socket.emit("move", {
        id,
        rotation: rotArray,
        position: posArray,
      });
    };

    if (controlsRef.current) {
      setUpdateCallback(
        controlsRef.current.addEventListener("change", onControlsChange)
      );
    }
    console.log(controlsRef.current);

    // Dispose;
    return () => {
      if (updateCallback && controlsRef.current)
        controlsRef.current.removeEventListener("change", onControlsChange);
    };
  }, [controlsRef, socket]);

  return (
    <>
      <OrbitControls ref={controlsRef} />
      {/* <PerspectiveCamera ref={controlsRef} /> */}
    </>
  );
};

const UserWrapper = ({ position, rotation, id }) => {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={new BoxGeometry()}
      material={new MeshNormalMaterial()}
    >
      {/* Optionally show the ID above the user's mesh */}
      <Text
        position={[0, 1.0, 0]}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {id}
      </Text>
    </mesh>
  );
};

function App() {
  const [socketClient, setSocketClient] = useState(null);
  const [clients, setClients] = useState({});

  useEffect(() => {
    // On mount initialize the socket connection
    setSocketClient(io("http://localhost:4444"));

    // Dispose gracefuly
    return () => {
      if (socketClient) socketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketClient) {
      socketClient.on("move", (clients) => {
        setClients(clients);
      });
    }
  }, [socketClient]);

  return (
    socketClient && (
      <KeyboardControls
        map={[
          { name: "forward", keys: ["ArrowUp", "w", "W"] },
          { name: "backward", keys: ["ArrowDown", "s", "S"] },
          { name: "left", keys: ["ArrowLeft", "a", "A"] },
          { name: "right", keys: ["ArrowRight", "d", "D"] },
          { name: "jump", keys: ["Space"] },
        ]}
      >
        <Canvas camera={{ position: [0, 1, -5], near: 0.1, far: 1000 }}>
          <Stats />
          <ControlsWrapper socket={socketClient} />
          <gridHelper rotation={[0, 0, 0]} />

          {/* Filter myself from the client list and create user boxes with IDs */}
          {Object.keys(clients)
            .filter((clientKey) => clientKey !== socketClient.id)
            .map((client) => {
              const { position, rotation } = clients[client];
              return (
                <UserWrapper
                  key={client}
                  id={client}
                  position={position}
                  rotation={rotation}
                />
              );
            })}
        </Canvas>
      </KeyboardControls>
    )
  );
}

export default App;
