"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CapturePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          Laden...
        </div>
      }
    >
      <CaptureContent />
    </Suspense>
  );
}

function CaptureContent() {
  const params = useSearchParams();
  const clientName = params.get("client") ?? "Onbekend";
  const photoType = (params.get("type") as "before" | "after") ?? "before";

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("GPS niet beschikbaar op dit apparaat");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Locatie-toegang geweigerd. Schakel GPS in."
            : "Kon locatie niet bepalen"
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      requestLocation();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    // TODO: upload to Supabase Storage + insert into photos table
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold">
          {photoType === "before" ? "Voor" : "Na"}-foto verstuurd!
        </h2>
        <p className="text-gray-500">{clientName}</p>
        <Link
          href="/worker"
          className="mt-4 py-3 px-6 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
        >
          Terug naar opdrachten
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          {photoType === "before" ? "Voor" : "Na"}-foto
        </h1>
        <p className="text-gray-500">{clientName}</p>
      </div>

      {!capturedImage ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-2xl bg-green-50 hover:bg-green-100 transition min-h-[300px]"
        >
          <span className="text-5xl mb-3">📸</span>
          <span className="text-green-700 font-medium">
            Tik om foto te maken
          </span>
          <span className="text-sm text-gray-400 mt-1">
            Camera opent automatisch
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Gemaakte foto"
              className="w-full max-h-[400px] object-cover"
            />
            <span
              className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium text-white ${
                photoType === "before" ? "bg-orange-500" : "bg-green-600"
              }`}
            >
              {photoType === "before" ? "VOOR" : "NA"}
            </span>
          </div>

          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>📍</span>
              <span>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          )}
          {locationError && (
            <div className="text-sm text-red-500">⚠️ {locationError}</div>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Opmerking (optioneel)"
            className="w-full p-3 border border-gray-200 rounded-xl resize-none h-20 text-sm"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {capturedImage && (
        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            Verstuur {photoType === "before" ? "voor" : "na"}-foto
          </button>
          <button
            onClick={() => {
              setCapturedImage(null);
              setLocation(null);
            }}
            className="w-full py-3 bg-white text-gray-600 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            Opnieuw maken
          </button>
        </div>
      )}
    </div>
  );
}
