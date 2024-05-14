import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChakraProvider, Button } from '@chakra-ui/react';
import Engine from '../components/Game/Engine';

export default function Game() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [gameParams, setGameParams] = useState({ map: null, npcCount: null });

  useEffect(() => {
    console.log('useEffect in game.js is running');
    // Ensure that the router's query parameters are available before initializing the game
    if (router.isReady) {
      // Parse npcCount as an integer
      const parsedNpcCount = parseInt(router.query.npcCount, 10);
      if (router.query.map && !isNaN(parsedNpcCount)) {
        setGameParams({ map: router.query.map, npcCount: parsedNpcCount });
        console.log(`Game initialized with map: ${router.query.map} and NPC count: ${parsedNpcCount}`);
      } else {
        console.error('Invalid map or npcCount:', { map: router.query.map, npcCount: router.query.npcCount });
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (gameParams.map && gameParams.npcCount) {
      setIsReady(true);
    }
  }, [gameParams]);

  console.log('Rendering Engine component, isReady:', isReady);

  // Function to handle the start of the game
  const handleStartGame = () => {
    setIsReady(true);
  };

  return (
    <ChakraProvider>
      <div>
        {/* Start button to initialize the game */}
        <Button id="start-button" colorScheme="teal" size="lg" onClick={handleStartGame}>
          Start Game
        </Button>
        {/* Render the Engine component only when isReady is true */}
        {isReady && (
          <Engine map={gameParams.map} npcCount={gameParams.npcCount} />
        )}
      </div>
    </ChakraProvider>
  );
}
