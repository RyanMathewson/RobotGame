import { PixiStage } from '../render/PixiStage';
import { Hud } from './Hud';
import { ProgramEditor } from './ProgramEditor';
import { SaveControls } from './SaveControls';
import { OnboardingOverlay } from './OnboardingOverlay';

export function App() {
  return (
    <div className="app">
      <PixiStage />
      <Hud />
      <ProgramEditor />
      <SaveControls />
      <OnboardingOverlay />
    </div>
  );
}
