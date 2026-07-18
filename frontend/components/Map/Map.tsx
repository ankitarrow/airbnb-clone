"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  title: string;
  pricePerNight: number;
}

const MARKER_COLOR = "#c026d3"; // fuchsia-600

function buildPinIcon() {
  return L.divIcon({
    className: "listing-map-pin",
    html: `
      <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 27 17 27s17-14.25 17-27C34 7.6 26.4 0 17 0z"
          fill="${MARKER_COLOR}"
        />
        <circle cx="17" cy="17" r="7" fill="white" />
      </svg>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

export default function ListingMap({ lat, lng, title, pricePerNight }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="z-0 h-[320px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={buildPinIcon()}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{title}</p>
            <p style={{ color: MARKER_COLOR }} className="font-medium">
              ₹{pricePerNight.toLocaleString("en-IN")} <span className="font-normal text-muted-foreground">night</span>
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}