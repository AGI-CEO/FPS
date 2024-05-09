import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChakraProvider } from '@chakra-ui/react';
import Engine from '../components/Game/Engine';

export default function Game() {
  const router = useRouter();
  const { map, npcCount } = router.query;

  useEffect(() => {
    // This is where we would initialize the game with the selected map and NPC count.
    // For now, we'll just log these values to confirm they're being passed correctly.
    console.log(`Game initialized with map: ${map} and NPC count: ${npcCount}`);
  }, [map, npcCount]);

  return (
    <ChakraProvider>
      <div>
        {/* The Engine component will handle rendering the game environment, player, NPCs, etc. */}
        <Engine map={map} npcCount={npcCount} />
      </div>
    </ChakraProvider>
  );
}
