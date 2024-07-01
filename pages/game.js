import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Engine = dynamic(() => import('../components/Game/Engine'), { ssr: false });

const Game = () => {
  const [isReady, setIsReady] = useState(false);

  const handleStartGame = () => {
    setIsReady(true);
  };

  useEffect(() => {
    // Add any necessary initialization logic here
  }, []);

  return (
    <div>
      {!isReady ? (
        <div>
          <h1>Start Game</h1>
          <button onClick={handleStartGame}>Start Game</button>
        </div>
      ) : (
        <Engine />
      )}
    </div>
  );
};

export default Game;
