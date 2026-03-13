import './ui/styles.css';
import { createGameController } from './ui/gameController';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Root element #app not found');
}

createGameController(app);
