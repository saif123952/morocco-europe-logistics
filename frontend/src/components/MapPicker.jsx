import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Fix Leaflet default icon paths in React Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, onSelectLocation }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const newPos = [lat, lng];
      setPosition(newPos);
      if (onSelectLocation) {
        onSelectLocation(lat.toFixed(6), lng.toFixed(6));
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        Selected Location<br />
        Lat: {position[0].toFixed(5)}, Lng: {position[1].toFixed(5)}
      </Popup>
    </Marker>
  );
}

const CITY_COORDS = {
  Casablanca: [33.5731, -7.5898],
  Rabat: [34.0209, -6.8416],
  Marrakech: [31.6295, -7.9811],
  Tangier: [35.7595, -5.8340],
  Agadir: [30.4278, -9.5981],
  Fez: [34.0331, -5.0003],
};

const MapPicker = ({ lat, lng, city, onSelectLocation, label = "Select Location on Map" }) => {
  const initialLat = parseFloat(lat) || (CITY_COORDS[city]?.[0] ?? 33.5731);
  const initialLng = parseFloat(lng) || (CITY_COORDS[city]?.[1] ?? -7.5898);

  const [position, setPosition] = useState([initialLat, initialLng]);

  useEffect(() => {
    if (CITY_COORDS[city]) {
      const newCoords = CITY_COORDS[city];
      setPosition(newCoords);
      if (onSelectLocation && (!lat || !lng)) {
        onSelectLocation(newCoords[0].toFixed(6), newCoords[1].toFixed(6));
      }
    }
  }, [city]);

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={16} color="var(--primary)" /> {label}
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Click map to pin GPS: {position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'None'}
        </span>
      </div>

      <div style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onSelectLocation={onSelectLocation} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPicker;
