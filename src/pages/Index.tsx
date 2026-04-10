import { SimulationCanvas } from '@/components/simulation/SimulationCanvas';
import { HUD } from '@/components/simulation/HUD';
import { PotholeOverlay } from '@/components/simulation/PotholeOverlay';
import { LaneOverlay } from '@/components/simulation/LaneOverlay';

const Index = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <SimulationCanvas />
      <LaneOverlay />
      <PotholeOverlay />
      <HUD />
    </div>
  );
};

export default Index;
