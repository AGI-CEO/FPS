import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChakraProvider, Button } from '@chakra-ui/react';
import Engine from '../components/Game/Engine';

export default function Game() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const { map, npcCount } = router.query;

  useEffect(() => {
    console.log('useEffect in game.js is running');
    // Ensure that the router's query parameters are available before initializing the game
    if (router.isReady) {
      // Parse npcCount as an integer
      const parsedNpcCount = parseInt(npcCount, 10);
      if (map && !isNaN(parsedNpcCount)) {
        setIsReady(true);
        console.log(`Game initialized with map: ${map} and NPC count: ${parsedNpcCount}`);
      } else {
        console.error('Invalid map or npcCount:', { map, npcCount });
        // If the parameters are not ready, set a timeout to retry initialization
        const timeoutId = setTimeout(() => {
          // Re-check if the router's query parameters are available
          if (router.query.map && !isNaN(parseInt(router.query.npcCount, 10))) {
            setIsReady(true);
            console.log(`Game initialized with map: ${router.query.map} and NPC count: ${parseInt(router.query.npcCount, 10)}`);
          }
        }, 1000); // Retry after 1 second
        // Cleanup the timeout when the component unmounts
        return () => clearTimeout(timeoutId);
      }
    }
  }, [router.isReady, map, npcCount, router.query.map, router.query.npcCount]);

  console.log('Rendering Engine component, isReady:', isReady);

  // Function to handle the start of the game
  const handleStartGame = () => {
    setIsReady(true);
  };

  return (
    <ChakraProvider>
      <div>
        {/* Render the Engine component only when isReady is true */}
        {isReady ? (
          <Engine map={map} npcCount={parseInt(npcCount, 10)} />
        ) : (
          <>
            <div>Loading game...</div>
            {/* Start button to initialize the game */}
            <Button id="start-button" colorScheme="teal" size="lg" onClick={handleStartGame}>
              Start Game
            </Button>
          </>
        )}
      </div>
    </ChakraProvider>
  );
}
