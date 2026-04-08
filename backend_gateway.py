from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
from datetime import datetime

app = Flask(__name__)
CORS(app)

# LoRa transmitter setup
UDP_IP = "255.255.255.255"  # Broadcast to all devices
UDP_PORT = 5005
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

@app.route('/api/road-damage', methods=['POST'])
def report_damage():
    data = request.json
    
    # Handle both legacy format and new detection format
    detections = data.get('detections', [])
    
    if detections:
        # New format: multiple detections with world positions
        for det in detections:
            message = (
                f"🚨 ROAD DAMAGE ALERT | "
                f"Type: {det.get('type', 'unknown').upper()} | "
                f"Mode: {data.get('mode', 'Unknown').upper()} | "
                f"Distance: {det.get('distance', 0):.1f}m | "
                f"Confidence: {det.get('confidence', 0):.0%} | "
                f"Speed: {data.get('speed', 0):.0f} KM/H | "
                f"Time: {datetime.now().strftime('%H:%M:%S')}"
            )
            sock.sendto(message.encode(), (UDP_IP, UDP_PORT))
            print(f"[LoRa SENT] {message}")
        
        # Return detection coordinates for the overlay
        pothole_coords = []
        for det in detections:
            wp = det.get('worldPosition', [0, 0, 0])
            pothole_coords.append({
                'type': det.get('type', 'pothole'),
                'worldPosition': wp,
                'distance': det.get('distance', 0),
                'confidence': det.get('confidence', 0.8),
                'boundingBox': {
                    'x': wp[0] - 1.0,
                    'y': wp[1],
                    'z': wp[2] - 1.0,
                    'width': 2.0,
                    'height': 0.5,
                    'depth': 2.0,
                }
            })
        
        return jsonify({
            "status": "success",
            "message": f"{len(detections)} road damage(s) detected and reported via LoRa",
            "detections": pothole_coords,
            "timestamp": datetime.now().isoformat(),
        })
    else:
        # Legacy single-alert format
        message = (
            f"🚨 ROAD DAMAGE ALERT | "
            f"Mode: {data.get('mode', 'Unknown').upper()} | "
            f"Location: {data.get('location', 'N/A')} | "
            f"Speed: {data.get('speed', 0)} KM/H | "
            f"Time: {datetime.now().strftime('%H:%M:%S')}"
        )
        sock.sendto(message.encode(), (UDP_IP, UDP_PORT))
        print(f"[LoRa SENT] {message}")
        
        return jsonify({
            "status": "success",
            "message": "Road damage alert sent via LoRa",
            "data": data
        })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "service": "LoRa Gateway + Road Damage Detection"})

if __name__ == '__main__':
    print("=" * 60)
    print("🚗 Vehicle LoRa Communication System Started")
    print("   + Real-Time Road Damage Detection API")
    print("=" * 60)
    print("API Endpoint: http://localhost:5050/api/road-damage")
    print("Broadcasting on UDP port 5005")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5050, debug=True)