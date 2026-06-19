import { PixiStage } from '../render/PixiStage';
import { Hud } from './Hud';

export function App() {
  return (
    <div className="app">
      <PixiStage />
      <Hud />
    </div>
  );
}
