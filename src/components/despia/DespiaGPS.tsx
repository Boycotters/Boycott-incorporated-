import { useState, useCallback } from "react";
import despia from "despia-native";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  altitude: number;
  horizontalAccuracy: number;
}

interface DespiaGPSProps {
  onLocationUpdate?: (locations: LocationPoint[]) => void;
  bufferSeconds?: number;
  serverEndpoint?: string;
}

export function DespiaGPS({
  onLocationUpdate,
  bufferSeconds = 10,
  serverEndpoint,
}: DespiaGPSProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const isNative = navigator.userAgent.includes("despia");

  const startTracking = useCallback(() => {
    if (!isNative) {
      toast.info("GPS tracking is available in the native app only.");
      return;
    }

    let url = `location://?buffer=${bufferSeconds}`;
    if (serverEndpoint) {
      url += `&server=${encodeURIComponent(serverEndpoint)}`;
    }

    despia(url);
    setIsTracking(true);
    toast.success("GPS tracking started");
  }, [isNative, bufferSeconds, serverEndpoint]);

  const stopTracking = useCallback(async () => {
    if (!isNative) return;
    setIsLoading(true);

    try {
      const data = await despia("stoplocation://", ["locationData"]);
      const locationData = (data as any)?.locationData || [];
      setLocations(locationData);
      setIsTracking(false);
      onLocationUpdate?.(locationData);
      toast.success(`Collected ${locationData.length} location points`);
    } catch (err: any) {
      toast.error("Failed to stop tracking");
    } finally {
      setIsLoading(false);
    }
  }, [isNative, onLocationUpdate]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {!isTracking ? (
          <Button onClick={startTracking} className="gap-2 flex-1" disabled={!isNative}>
            <MapPin className="w-4 h-4" />
            Start GPS Tracking
          </Button>
        ) : (
          <Button onClick={stopTracking} variant="destructive" className="gap-2 flex-1" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Stop Tracking
          </Button>
        )}
      </div>

      {!isNative && (
        <p className="text-xs text-muted-foreground">
          Background GPS tracking requires the native app.
        </p>
      )}

      {locations.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">{locations.length} points collected</p>
          {locations.slice(-3).map((loc, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              📍 {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} 
              {loc.speed != null && ` • ${loc.speed.toFixed(1)} m/s`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
