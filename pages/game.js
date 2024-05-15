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
        setIsReady(true);
      } else {
        console.error('Invalid map or npcCount:', { map: router.query.map, npcCount: router.query.npcCount });
      }
    }
  }, [router.isReady, router.query]);

  // Function to handle the start of the game
  const handleStartGame = () => {
    // Check if gameParams have been set before starting the game
    if (gameParams.map && gameParams.npcCount) {
      setIsReady(true);
    } else {
      console.error('Cannot start game: map or npcCount is not set.');
    }
  };

  console.log('Rendering Engine component, isReady:', isReady);

  return (
    <ChakraProvider>
      <div>
        {/* Start button to initialize the game */}
        <Button id="start-button" colorScheme="teal" size="lg" onClick={handleStartGame} disabled={!router.isReady}>
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
