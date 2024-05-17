import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChakraProvider, Button, Box, Text, Select } from '@chakra-ui/react';
import Engine from '../components/Game/Engine';

export default function Game() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false);
  const [gameParams, setGameParams] = useState({ map: null, npcCount: null });
  const [error, setError] = useState('');

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
        setError('Invalid map or npcCount provided. Please select from the options.');
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
      setError('Cannot start game: map or npcCount is not set.');
    }
  };

  // Function to handle the selection of default game parameters
  const handleSelectDefaultParams = (selectedMap, npcCount) => {
    setGameParams({ map: selectedMap, npcCount });
    setError('');
  };

  console.log('Rendering Engine component, isReady:', isReady);

  return (
    <ChakraProvider>
      <Box textAlign="center" fontSize="xl">
        <Box p={6}>
          <Text mb={4}>
            {isAudioReady ? 'Audio is ready.' : 'Audio not ready. Please interact with the page to enable audio.'}
          </Text>
          <Text mb={4}>
            {isEnvironmentReady ? 'Game environment is ready.' : 'Loading game environment...'}
          </Text>
          {error && <Text color="red.500">{error}</Text>}
          <Select placeholder="Select map" onChange={(e) => handleSelectDefaultParams(e.target.value, 5)}>
            <option value="defaultMap">Default Map</option>
            <option value="map1">Map 1</option>
            <option value="map2">Map 2</option>
          </Select>
          {/* Start button to initialize the game */}
          <Button id="start-button" colorScheme="teal" size="lg" onClick={handleStartGame} disabled={!isEnvironmentReady || !isAudioReady}>
            Start Game
          </Button>
        </Box>
        {/* Render the Engine component only when isReady is true */}
        {isReady && (
          <Engine
            map={gameParams.map}
            npcCount={gameParams.npcCount}
            setIsAudioReady={setIsAudioReady}
            setIsEnvironmentReady={setIsEnvironmentReady}
          />
        )}
      </Box>
    </ChakraProvider>
  );
}
