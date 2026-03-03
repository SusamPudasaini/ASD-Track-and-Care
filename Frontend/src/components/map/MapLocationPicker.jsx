import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = [27.7172, 85.324]; // Kathmandu
const PICKER_ICON = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

if (!L.Icon.Default.prototype._asdTrackPatched) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
  L.Icon.Default.prototype._asdTrackPatched = true;
}

function RecenterOnSelection({ selected }) {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(selected) && selected.length === 2) {
      map.setView(selected, Math.max(map.getZoom(), 13), { animate: true });
    }
  }, [map, selected]);

  return null;
}

function ClickSelector({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function MapLocationPicker({
  label = "Pick location on map",
  hint = "Click on the map to place your location pin.",
  latitude,
  longitude,
  onChange,
  heightClass = "h-64",
}) {
  const selected =
    typeof latitude === "number" && typeof longitude === "number"
      ? [latitude, longitude]
      : null;

  const center = selected || DEFAULT_CENTER;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {selected ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Lat {latitude.toFixed(6)}, Lng {longitude.toFixed(6)}
          </span>
        ) : null}
      </div>

      <p className="mb-3 text-xs text-gray-500">{hint}</p>

      <div className={`overflow-hidden rounded-2xl border border-gray-200 ${heightClass}`}>
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickSelector onPick={onChange} />
          <RecenterOnSelection selected={selected} />
          {selected ? <Marker position={selected} icon={PICKER_ICON} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
