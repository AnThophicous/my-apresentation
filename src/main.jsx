import { createRoot } from 'react-dom/client';
import App from './App';
import { measureViewport } from './lib/store';
import './styles.css';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

measureViewport(true);
let t = 0;
window.addEventListener('resize', () => {
  clearTimeout(t);
  t = setTimeout(() => measureViewport(), 120);
});

createRoot(document.getElementById('root')).render(<App />);
