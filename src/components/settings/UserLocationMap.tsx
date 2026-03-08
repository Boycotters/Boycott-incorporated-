import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, RefreshCw, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

export function UserLocationMap() {
  const { user } = useAuth();
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Fetch location history
  const { data: locationHistory = [] } = useQuery({
    queryKey: ["my-gps-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_gps_locations")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && showHistory,
  });

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        setLoading(false);

        // Save to DB
        if (user?.id) {
          await supabase.from("user_gps_locations").insert({
            user_id: user.id,
            latitude,
            longitude,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            horizontal_accuracy: pos.coords.accuracy,
            vertical_accuracy: pos.coords.altitudeAccuracy,
          });
        }
      },
      (err) => {
        setLoading(false);
        toast.error("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [user?.id]);

  const toggleTracking = useCallback(() => {
    if (trackingActive && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTrackingActive(false);
      toast.info("Location tracking stopped");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });

        if (user?.id) {
          await supabase.from("user_gps_locations").insert({
            user_id: user.id,
            latitude,
            longitude,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            horizontal_accuracy: pos.coords.accuracy,
            vertical_accuracy: pos.coords.altitudeAccuracy,
          });
        }
      },
      () => toast.error("Location tracking error"),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    setWatchId(id);
    setTrackingActive(true);
    toast.success("Live location tracking started");
  }, [trackingActive, watchId, user?.id]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const historyPath = locationHistory
    .filter((l) => l.latitude && l.longitude)
    .map((l) => [l.latitude, l.longitude] as [number, number])
    .reverse();

  return (
    <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary p-2 rounded-xl">
          <MapPin className="w-5 h-5 text-secondary-foreground" />
        </div>
        <h3 className="font-semibold text-lg">My Location</h3>
        {trackingActive && (
          <Badge variant="default" className="ml-auto animate-pulse">
            Live
          </Badge>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border mb-3" style={{ height: 280 }}>
        {currentPos ? (
          <MapContainer
            center={[currentPos.lat, currentPos.lng]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[currentPos.lat, currentPos.lng]} icon={userIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">You are here</p>
                  <p className="text-xs text-gray-500">
                    {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
            {showHistory && historyPath.length > 1 && (
              <Polyline positions={historyPath} color="#3b82f6" weight={3} opacity={0.7} />
            )}
            <RecenterMap lat={currentPos.lat} lng={currentPos.lng} />
          </MapContainer>
        ) : (
          <div className="h-full bg-muted/30 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Tap below to see your location</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      {currentPos && (
        <div className="bg-muted/30 rounded-xl p-3 mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coordinates</span>
            <span className="font-mono text-xs">
              {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={getCurrentLocation}
          disabled={loading}
          className="flex-1 gap-2"
          variant="outline"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Get Location
        </Button>
        <Button
          onClick={toggleTracking}
          variant={trackingActive ? "destructive" : "default"}
          className="flex-1 gap-2"
        >
          <Navigation className="w-4 h-4" />
          {trackingActive ? "Stop" : "Track Live"}
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 gap-2"
        onClick={() => setShowHistory(!showHistory)}
      >
        <History className="w-4 h-4" />
        {showHistory ? "Hide History" : "Show History Path"}
      </Button>
    </Card>
  );
}
