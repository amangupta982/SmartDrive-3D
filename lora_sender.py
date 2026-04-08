import socket
import json
import time
import random

UDP_IP = "255.255.255.255"  # localhost for single PC, or "255.255.255.255" for broadcast
UDP_PORT = 5005

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
if UDP_IP == "255.255.255.255":
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

print("📡 LoRa Sender Started (Simulated)")
print(f"Broadcasting to {UDP_IP}:{UDP_PORT}")
print("-" * 50)

packet_count = 0

while True:
    # Simulate sensor data
    data = {
        "device_id": "LORA_001",
        "packet_id": packet_count,
        "temperature": round(random.uniform(20, 30), 1),
        "humidity": round(random.uniform(40, 80), 1),
        "battery": round(random.uniform(3.5, 4.2), 2),
        "rssi": random.randint(-120, -40),
        "timestamp": time.time()
    }
    
    message = json.dumps(data)
    sock.sendto(message.encode(), (UDP_IP, UDP_PORT))
    
    print(f"[SENT #{packet_count}] Temp: {data['temperature']}°C | Humidity: {data['humidity']}%")
    
    packet_count += 1
    time.sleep(3)  # Send every 3 seconds