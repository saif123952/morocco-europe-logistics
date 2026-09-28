import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix standard marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const driverIcon = L.divIcon({
  className: 'driver-live-marker',
  html: `<div style="
    width: 24px;
    height: 24px;
    background-color: #3b82f6;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createNumberIcon = (number, color = '#f97316') => L.divIcon({
  className: 'custom-number-marker',
  html: `<div style="
    background-color: ${color};
    color: white;
    font-weight: bold;
    font-size: 11px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  ">${number}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const pickupIcon = L.divIcon({
  className: 'pickup-marker',
  html: `<div style="background-color: #f97316; color: white; border-radius: 4px; padding: 3px 6px; font-weight: bold; font-size: 10px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">PICKUP</div>`,
  iconSize: [50, 20],
  iconAnchor: [25, 10],
});

const deliveryIcon = L.divIcon({
  className: 'delivery-marker',
  html: `<div style="background-color: #10b981; color: white; border-radius: 4px; padding: 3px 6px; font-weight: bold; font-size: 10px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">DELIVERY</div>`,
  iconSize: [60, 20],
  iconAnchor: [30, 10],
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function DriverMap({
  driverPos = [39.4699, -0.3763],
  radiusKm = 25,
  nearbyShipments = [],
  stops = [],
  onAcceptShipment,
  height = '500px',
}) {
  const center = [driverPos.latitude || driverPos[0], driverPos.longitude || driverPos[1]];

  // Generate route polyline points if active tour stops exist
  const polylineCoords = [center];
  stops.forEach((stop) => {
    if (stop.latitude && stop.longitude) {
      polylineCoords.push([parseFloat(stop.latitude), parseFloat(stop.longitude)]);
    }
  });

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color, #e5e7eb)', position: 'relative' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />

        {/* Driver Current Location Marker */}
        <Marker position={center} icon={driverIcon}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <strong style={{ color: '#2563eb' }}>Your Live Position</strong>
              <br />
              Lat: {center[0].toFixed(4)}, Lng: {center[1].toFixed(4)}
            </div>
          </Popup>
        </Marker>

        {/* Search Radius Overlay Circle */}
        {radiusKm > 0 && (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, dashArray: '6, 6' }}
          />
        )}

        {/* Active Tour Route Line */}
        {stops.length > 0 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
          />
        )}

        {/* Tour Stops */}
        {stops.map((stop, idx) => {
          const lat = parseFloat(stop.latitude);
          const lng = parseFloat(stop.longitude);
          if (!lat || !lng) return null;
          const isPickup = stop.stop_type === 'pickup';

          return (
            <Marker
              key={`stop-${stop.id || idx}`}
              position={[lat, lng]}
              icon={createNumberIcon(stop.stop_order || idx + 1, isPickup ? '#f97316' : '#10b981')}
            >
              <Popup>
                <div style={{ minWidth: '180px', padding: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: isPickup ? '#ea580c' : '#059669' }}>
                    Stop #{stop.stop_order}: {stop.stop_type?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#4b5563' }}>
                    <strong>Track:</strong> {stop.shipment?.tracking_number || 'N/A'}<br />
                    <strong>City:</strong> {stop.city || 'N/A'}<br />
                    <strong>Address:</strong> {stop.address || 'N/A'}<br />
                    <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{stop.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Nearby Available Shipments */}
        {nearbyShipments.map((item, idx) => {
          const shipment = item.shipment || item;
          const lat = parseFloat(shipment.sender_latitude);
          const lng = parseFloat(shipment.sender_longitude);
          if (!lat || !lng) return null;

          return (
            <Marker key={`nearby-${shipment.id || idx}`} position={[lat, lng]} icon={pickupIcon}>
              <Popup>
                <div style={{ minWidth: '200px', padding: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                    📦 {shipment.tracking_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>
                    From: {shipment.sender_city} → To: {shipment.recipient_city}<br />
                    Weight: {shipment.weight_kg}kg | Vol: {shipment.volume_m3}m³<br />
                    Distance: <strong>{item.distance_km || item.distance_to_pickup_km || '?'} km</strong>
                  </div>
                  {onAcceptShipment && (
                    <button
                      onClick={() => onAcceptShipment(shipment.id)}
                      disabled={item.is_over_capacity}
                      style={{
                        width: '100%',
                        marginTop: '6px',
                        padding: '6px 12px',
                        backgroundColor: item.is_over_capacity ? '#94a3b8' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: item.is_over_capacity ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      {item.is_over_capacity ? 'Exceeds Capacity' : 'Accept Order'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
