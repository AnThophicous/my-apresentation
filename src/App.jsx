import { useEffect, useRef } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { initScroll, shiftScroll } from './lib/scroll';
import { store } from './lib/store';
import Cursor from './components/Cursor';
import Hud from './components/Hud';
import Scrollbar from './components/Scrollbar';
import SpaceStage from './components/space/SpaceStage';
import Skills from './components/Skills';
import Keyboard from './components/Keyboard';
import Why from './components/Why';
import Paint from './components/Paint';
import Timeline from './components/Timeline';

export default function App() {
  const { scrollY } = useScroll();
  const jumping = useRef(false);

  useEffect(() => {
    initScroll();
  }, []);

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
      <Cursor />
      <Hud />
      <Scrollbar />
      <main>
        <SpaceStage />
        <Skills />
        <Keyboard />
        <Why />
        <Paint />
        <Timeline />
      </main>
    </>
  );
}
