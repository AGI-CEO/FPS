import React from 'react';
import Head from 'next/head';
import { ChakraProvider } from '@chakra-ui/react';
import StartMenu from '../components/StartMenu';

export default function Home() {
  return (
    <ChakraProvider>
      <div>
        <Head>
          <title>CS Clone NextJS</title>
          <meta name="description" content="Counter-Strike clone built with NextJS and ThreeJS" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main>
          <StartMenu />
        </main>

        <footer>
          {/* Footer can be added here */}
        </footer>
      </div>
    </ChakraProvider>
  )
}
