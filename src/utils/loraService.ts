// src/utils/loraService.ts
import { useSimulationStore } from '@/stores/simulationStore';

export interface RoadDamageAlert {
  mode: string;
  location: string;
  speed: number;
  type?: 'pothole' | 'debris' | 'rock' | 'fallen_tree';
  distance?: string;
}

export const sendLoRaAlert = async (damageData: RoadDamageAlert): Promise<void> => {
  try {
    // Push to store for UI display
    const severity = damageData.type === 'pothole' ? 'warning' 
      : damageData.type === 'rock' ? 'info'
      : damageData.type === 'fallen_tree' ? 'critical'
      : damageData.type === 'debris' ? 'critical'
      : 'warning';

    useSimulationStore.getState().addDetectionAlert({
      type: damageData.type || 'pothole',
      severity,
      distance: damageData.distance || damageData.location,
      location: damageData.location,
      mode: damageData.mode as 'city' | 'village' | 'jungle',
    });

    // ✅ FIXED PORT (5050 instead of 5000)
    const response = await fetch('http://localhost:5050/api/road-damage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: damageData.mode,
        location: damageData.location,
        speed: damageData.speed,
        type: damageData.type || 'unknown',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send alert');
    }

    const result = await response.json();

    console.log('✅ LoRa Alert Sent:', result);

    showNotification(`⚠️ ${(damageData.type || 'Road damage').toUpperCase()} detected ahead!`);

  } catch (error) {

    console.error('❌ Failed to send LoRa alert:', error);

  }
};

export const showNotification = (message: string): void => {

  const notification = document.createElement('div');

  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 15px 30px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;

  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);

};