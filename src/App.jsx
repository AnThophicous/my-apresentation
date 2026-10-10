import { useEffect, useRef } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { initScroll, shiftScroll } from './lib/scroll';
import { store } from './lib/store';
import Cursor from './components/Cursor';
import Hud from './components/Hud';
import Preloader from './components/Preloader';
import Scrollbar from './components/Scrollbar';
import SpaceStage from './components/space/SpaceStage';
import Skills from './components/Skills';
import Crystal from './components/Crystal';
import Why from './components/Why';
import Paint from './components/Paint';
import Timeline from './components/Timeline';

const AWAY_TITLE = 'A linha continua aqui.';

function useAwayTitle() {
  useEffect(() => {
    const title = document.title;
    const onChange = () => (document.title = document.hidden ? AWAY_TITLE : title);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
}

export default function App() {
  const { scrollY } = useScroll();
  const jumping = useRef(false);

  useEffect(() => {
    initScroll();
  }, []);
  useAwayTitle();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const { loopY } = store.get();
    if (!jumping.current && Number.isFinite(loopY) && y >= loopY - 0.5) {
      jumping.current = true;
      shiftScroll(-loopY);
      requestAnimationFrame(() => requestAnimationFrame(() => (jumping.current = false)));
    }
  });

  return (
    <>
      <Preloader />
      <Cursor />
      <Hud />
      <Scrollbar />
      <div className="grain" aria-hidden />
      <main>
        <SpaceStage />
        <Skills />
        <Crystal />
        <Why />
        <Paint />
        <Timeline />
      </main>
    </>
  );
}
