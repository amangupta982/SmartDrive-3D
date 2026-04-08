import { SimulationCanvas } from '@/components/simulation/SimulationCanvas';
import { HUD } from '@/components/simulation/HUD';
import { PotholeOverlay } from '@/components/simulation/PotholeOverlay';

const Index = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <SimulationCanvas />
      <PotholeOverlay />
      <HUD />
    </div>
  );
};

export default Index;
