'use client';

import React, { useState, useEffect } from 'react';
import { LandingPage } from '../components/LandingPage';
import { AwwwardsPreloader } from '../components/AwwwardsPreloader';

export default function HomePage() {
  const [showPreloader, setShowPreloader] = useState<boolean>(false);

  useEffect(() => {
    // Only show preloader on initial visit to provide a sleek, fast experience
    const hasSeenPreloader = sessionStorage.getItem('argus_preloader_seen');
    if (!hasSeenPreloader) {
      setShowPreloader(true);
    }
  }, []);

  const handlePreloaderComplete = () => {
    sessionStorage.setItem('argus_preloader_seen', 'true');
    setShowPreloader(false);
  };

  return (
    <>
      {showPreloader && <AwwwardsPreloader onComplete={handlePreloaderComplete} />}
      <LandingPage onEnterPlatform={() => {}} />
    </>
  );
}
