import { MapContainer, Marker, TileLayer, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

const OWNER_COORDS = [28.7041, 77.1025]; 
const ownerIcon = L.icon({
  iconUrl: '/Subject.png',
  iconSize: [36, 52],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});
const visitorIcon = L.icon({
  iconUrl: '/marker.webp',
  iconSize: [52, 52],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  function toRad(x) {
    return (x * Math.PI) / 180;
  }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function FitBounds({ bounds, onComplete }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

    map.flyToBounds(bounds, {
      padding: [50, 50],
      animate: true,
      duration: 2,
    });

    const handleMoveEnd = () => {
      if (onComplete) onComplete();
    };

    map.once("moveend", handleMoveEnd); // listen once

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [bounds, map, onComplete]);

  return null;
}

export default function App() {
  const [visitorcoords, setVisitorCoords] = useState(null);
  const [showLine, setShowLine] = useState(false);
  const [showOwnerMarker, setShowOwnerMarker] = useState(false);
  const [lineEnd, setLineEnd] = useState(null);
  const [mapZoomedOut, setMapZoomedOut] = useState(false);
  const [fitBoundsNow, setFitBoundsNow] = useState(false);
  const [zoomFinished, setZoomFinished] = useState(false);
  const [showDistanceBox, setShowDistanceBox] = useState(false);

  // Fetch visitor's location
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const { latitude, longitude } = data;
        if (typeof latitude === "number" && typeof longitude === "number") {
          setVisitorCoords([latitude, longitude]);
        }
      });
  }, []);

  // Animation sequence (only runs after visitorcoords is available)
useEffect(() => {
  if (
    visitorcoords &&
    Array.isArray(visitorcoords) &&
    typeof visitorcoords[0] === "number" &&
    typeof visitorcoords[1] === "number"
  ) {
    setShowLine(false);
    setShowOwnerMarker(false);
    setLineEnd(null);
    setZoomFinished(false);
    setFitBoundsNow(true);
  }
}, [visitorcoords]);

useEffect(() => {
  if (zoomFinished) {
    setShowLine(true);
    animateLine(visitorcoords, OWNER_COORDS, setLineEnd, () => {
      setShowOwnerMarker(true);
      setTimeout(() => {
        setShowDistanceBox(true);
      }, 300); // optional: delay for extra polish
    });
  }
}, [zoomFinished]);

  function animateLine(start, end, setLineEnd, onDone) {
    let progress = 0;
    const steps = 30;
    const interval = 20;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function step() {
      progress++;
      const t = progress / steps;
      const lat = lerp(start[0], end[0], t);
      const lng = lerp(start[1], end[1], t);
      setLineEnd([lat, lng]);
      if (progress < steps) {
        setTimeout(step, interval);
      } else {
        setLineEnd(end);
        if (onDone) onDone();
      }
    }
    step();
  }

if (!visitorcoords) {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center text-white text-sm">
      Loading...
    </div>
  );
}

  let distance = null;
  if (
    visitorcoords &&
    Array.isArray(visitorcoords) &&
    typeof visitorcoords[0] === "number" &&
    typeof visitorcoords[1] === "number"
  ) {
    distance = haversineDistance(OWNER_COORDS, visitorcoords).toFixed(2);
  }

  let mapCenter = visitorcoords;
  let mapZoom = mapZoomedOut ? 4 : 10;

 return (
  <div className="relative w-screen h-screen font-sans">
    <MapContainer
      className="z-0"
      style={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
    >
     {fitBoundsNow && (
  <FitBounds
    bounds={[visitorcoords, OWNER_COORDS]}
    onComplete={() => setZoomFinished(true)}
  />
)}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={visitorcoords} icon={visitorIcon}>
        <Popup>
          <div className="text-sm">
            <span className="font-semibold text-blue-600">YOU ARE HERE</span>
            <br />
          </div>
        </Popup>
      </Marker>
      {showLine && lineEnd && (
        <Polyline
          positions={[visitorcoords, lineEnd]}
          pathOptions={{ color: "red", dashArray: "8 8" }}
        />
      )}
      {showOwnerMarker && (
        <Marker position={OWNER_COORDS} icon={ownerIcon}>
          <Popup>
            <span className="text-sm font-semibold text-pink-600">
              MANYA IS HERE
            </span>
          </Popup>
        </Marker>
      )}
    </MapContainer>


 {showDistanceBox && (
  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-300 backdrop-blur-sm text-white py-4 px-6 rounded-lg shadow-lg w-72 max-w-md text-center opacity-0 transition-opacity duration-700 ease-out"
       style={{ opacity: showDistanceBox ? 1 : 0 }}>
    <p>
      <span className="font-medium">
        I am from Delhi, India, roughly {distance} km away from your current location.
      </span>
    </p>
  </div>
)}
</div>
);
}