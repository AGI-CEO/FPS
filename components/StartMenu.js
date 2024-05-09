import React, { useState } from 'react';
import {
  Box,
  Button,
  Select,
  VStack,
  Heading,
  Text,
  Input,
  useToast
} from '@chakra-ui/react';

const StartMenu = () => {
  const [map, setMap] = useState('');
  const [npcCount, setNpcCount] = useState(1);
  const toast = useToast();

  const handleStartGame = () => {
    if (!map) {
      toast({
        title: 'Map Selection Required',
        description: "Please select a map before starting the game.",
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    // Placeholder for starting the game
    console.log(`Starting game with map: ${map} and NPC count: ${npcCount}`);
  };

  return (
    <VStack spacing={4} align="stretch">
      <Heading as="h1" size="xl" textAlign="center">Start Game</Heading>
      <Box>
        <Text mb={2}>Select Map:</Text>
        <Select placeholder="Select map" onChange={(e) => setMap(e.target.value)}>
          <option value="map1">Map 1</option>
          <option value="map2">Map 2</option>
          {/* Additional maps can be added here */}
        </Select>
      </Box>
      <Box>
        <Text mb={2}>Number of NPCs:</Text>
        <Input
          type="number"
          value={npcCount}
          onChange={(e) => setNpcCount(Math.max(1, parseInt(e.target.value, 10)))}
          min={1}
          max={10}
          step={1}
        />
      </Box>
      <Button colorScheme="blue" onClick={handleStartGame}>Start Game</Button>
    </VStack>
  );
};

export default StartMenu;
