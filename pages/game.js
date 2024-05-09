import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChakraProvider } from '@chakra-ui/react';
import Engine from '../components/Game/Engine';

export default function Game() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const { map, npcCount } = router.query;

  useEffect(() => {
    console.log('useEffect in game.js is running');
    // Ensure that the router's query parameters are available before initializing the game
    if (router.isReady && map && npcCount) {
      // Parse npcCount as an integer
      const parsedNpcCount = parseInt(npcCount, 10);
      if (!isNaN(parsedNpcCount)) {
        setIsReady(true);
        console.log(`Game initialized with map: ${map} and NPC count: ${parsedNpcCount}`);
      }
    }
  }, [router.isReady, map, npcCount]);

  console.log('Rendering Engine component, isReady:', isReady);

  return (
    <ChakraProvider>
      <div>
        {/* Render the Engine component only when isReady is true */}
        {isReady && (
          <Engine map={map} npcCount={parseInt(npcCount, 10)} />
        )}
      </div>
    </ChakraProvider>
  );
}
