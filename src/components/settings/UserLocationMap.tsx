import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, ExternalLink, LocateFixed, Radio, StopCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
const GMAPS_BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

type SharedPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 5000,
};

const toSharedPosition = (coords: GeolocationCoordinates): SharedPosition => ({
  lat: coords.latitude,
  lng: coords.longitude,
  accuracy: coords.accuracy ?? null,
  updatedAt: new Date().toISOString(),
});

const getMapsLink = (p: SharedPosition) =>
  `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;

const getDirectionsLink = (p: SharedPosition) =>
  `https://www.openstreetmap.org/directions?from=&to=${p.lat}%2C${p.lng}`;

const getLocationErrorMessage = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED: return "Location access was denied. Please allow access and try again.";
    case error.POSITION_UNAVAILABLE: return "Your device could not determine a location right now.";
    case error.TIMEOUT: return "The location request timed out. Retrying...";
    default: return "Unable to get your location right now.";
  }
};

function RecenterMap({ pos }: { pos: SharedPosition | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], 15, { animate: true });
  }, [pos, map]);
  return null;
}

export function UserLocationMap() {
  const { user } = useAuth();
  const [currentPos, setCurrentPos] = useState<SharedPosition | null>(null);
  const [livePos, setLivePos] = useState<SharedPosition | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveIntentRef = useRef(false);

  const visiblePosition = useMemo(() => livePos ?? currentPos, [livePos, currentPos]);

  const persistLocation = useCallback(
    async (coords: GeolocationCoordinates, options?: { notify?: boolean; throttleMs?: number }) => {
      if (!user?.id) return true;
      const throttleMs = options?.throttleMs ?? 0;
      const now = Date.now();
      if (throttleMs > 0 && now - lastPersistedAtRef.current < throttleMs) return false;
      lastPersistedAtRef.current = now;

      const { error } = await supabase.from("user_gps_locations").insert({
        user_id: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        speed: coords.speed,
        heading: coords.heading,
        horizontal_accuracy: coords.accuracy,
        vertical_accuracy: coords.altitudeAccuracy,
      });

      if (error) {
        console.error("GPS insert error:", error);
        if (options?.notify) toast.error("Location captured but could not sync.");
        return false;
      }
      if (options?.notify) toast.success("Location synced to dashboard.");
      return true;
    },
    [user?.id]
  );

  const startWatcher = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const next = toSharedPosition(pos.coords);
        setLivePos(next);
        setCurrentPos(next);
        setStartingLive(false);
        setIsLiveSharing(true);
        setErrorCount(0);
        await persistLocation(pos.coords, { throttleMs: 8000 });
      },
      (err) => {
        console.warn("GPS watch error:", err.message);
        setErrorCount(p => p + 1);
        if (err.code !== err.PERMISSION_DENIED && liveIntentRef.current) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          retryTimerRef.current = setTimeout(() => { if (liveIntentRef.current) startWatcher(); }, 3000);
        } else {
          setStartingLive(false);
          setIsLiveSharing(false);
          liveIntentRef.current = false;
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          toast.error(getLocationErrorMessage(err));
        }
      },
      GEO_OPTIONS
    );
  }, [persistLocation]);

  const stopLiveLocation = useCallback(() => {
    liveIntentRef.current = false;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveSharing(false);
    setErrorCount(0);
    toast.success("Live location stopped.");
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLoadingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = toSharedPosition(pos.coords);
        setCurrentPos(next);
        setLoadingCurrent(false);
        if (user?.id) await persistLocation(pos.coords, { notify: true });
        else toast.success("Location captured.");
      },
      (err) => { setLoadingCurrent(false); toast.error(getLocationErrorMessage(err)); },
      { ...GEO_OPTIONS, maximumAge: 0 }
    );
  }, [persistLocation, user?.id]);

  const startLiveLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    if (watchIdRef.current !== null) return;
    liveIntentRef.current = true;
    setStartingLive(true);
    setErrorCount(0);
    startWatcher();
  }, [startWatcher]);

  useEffect(() => {
    if (!isLiveSharing) return;
    const interval = setInterval(() => {
      if (liveIntentRef.current && watchIdRef.current === null) startWatcher();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLiveSharing, startWatcher]);

  useEffect(() => {
    return () => {
      liveIntentRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary p-2 rounded-xl">
          <MapPin className="w-5 h-5 text-secondary-foreground" />
        </div>
        <h3 className="font-semibold text-lg">My Location</h3>
        {isLiveSharing && (
          <Badge className="gap-1 ml-auto animate-pulse">
            <Radio className="w-3 h-3" />
            Live
          </Badge>
        )}
      </div>

      <div className="bg-muted/20 rounded-xl p-4 mb-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Powered by OpenStreetMap. Live mode keeps updating until you stop it.
        </p>

        {visiblePosition ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <LocateFixed className="w-3 h-3" />
                Tracked
              </Badge>
              {errorCount > 0 && isLiveSharing && (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300">
                  <AlertCircle className="w-3 h-3" />
                  Reconnecting ({errorCount})
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coordinates</p>
              <p className="font-mono text-base font-semibold break-all">
                {visiblePosition.lat.toFixed(6)}, {visiblePosition.lng.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground">
                Accuracy: {visiblePosition.accuracy ? `${Math.round(visiblePosition.accuracy)}m` : "Unknown"} · Updated {new Date(visiblePosition.updatedAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-border bg-background">
              <MapContainer
                center={[visiblePosition.lat, visiblePosition.lng]}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: 220, width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[visiblePosition.lat, visiblePosition.lng]}>
                  <Popup>
                    You are here<br />
                    {visiblePosition.lat.toFixed(5)}, {visiblePosition.lng.toFixed(5)}
                  </Popup>
                </Marker>
                <RecenterMap pos={visiblePosition} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={() => window.open(getMapsLink(visiblePosition), "_blank")}>
                <ExternalLink className="w-4 h-4" />
                Open in OSM
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => window.open(getDirectionsLink(visiblePosition), "_blank")}>
                <Navigation className="w-4 h-4" />
                Directions
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Share your location to capture coordinates and make them visible in the admin dashboard.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button onClick={getCurrentLocation} disabled={loadingCurrent || startingLive} className="w-full gap-2">
          {loadingCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {loadingCurrent ? "Getting Location..." : visiblePosition ? "Refresh Location" : "Get My Location"}
        </Button>

        {isLiveSharing ? (
          <Button variant="outline" onClick={stopLiveLocation} className="w-full gap-2">
            <StopCircle className="w-4 h-4" />
            Stop Live Location
          </Button>
        ) : (
          <Button variant="outline" onClick={startLiveLocation} disabled={loadingCurrent || startingLive} className="w-full gap-2">
            {startingLive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            {startingLive ? "Starting..." : "Start Live Location"}
          </Button>
        )}
      </div>
    </Card>
  );
}
