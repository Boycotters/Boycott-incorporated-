import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, ExternalLink, LocateFixed, Radio, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type SharedPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

const toSharedPosition = (coords: GeolocationCoordinates): SharedPosition => ({
  lat: coords.latitude,
  lng: coords.longitude,
  accuracy: coords.accuracy ?? null,
  updatedAt: new Date().toISOString(),
});

const getMapsLink = (position: SharedPosition) =>
  `https://www.google.com/maps?q=${position.lat},${position.lng}`;

const getMapsEmbedLink = (position: SharedPosition) =>
  `https://maps.google.com/maps?q=${position.lat},${position.lng}&z=15&output=embed`;

const getLocationErrorMessage = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access was denied. Please allow access and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your device could not determine a location right now.";
    case error.TIMEOUT:
      return "The location request timed out. Please try again.";
    default:
      return "Unable to get your location right now.";
  }
};

export function UserLocationMap() {
  const { user } = useAuth();
  const [currentPos, setCurrentPos] = useState<SharedPosition | null>(null);
  const [livePos, setLivePos] = useState<SharedPosition | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);

  const visiblePosition = useMemo(() => livePos ?? currentPos, [livePos, currentPos]);

  const persistLocation = useCallback(
    async (
      coords: GeolocationCoordinates,
      options?: { notify?: boolean; throttleMs?: number }
    ) => {
      if (!user?.id) {
        return true;
      }

      const throttleMs = options?.throttleMs ?? 0;
      const now = Date.now();

      if (throttleMs > 0 && now - lastPersistedAtRef.current < throttleMs) {
        return false;
      }

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
        toast.error("Location was captured, but it could not sync to the admin dashboard.");
        return false;
      }

      if (options?.notify) {
        toast.success("Location captured and synced to the dashboard.");
      }

      return true;
    },
    [user?.id]
  );

  const stopLiveLocation = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsLiveSharing(false);
    toast.success("Live location sharing stopped.");
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    const confirmed = window.confirm("Share your current location with Boycott now?");
    if (!confirmed) return;

    setLoadingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextPosition = toSharedPosition(pos.coords);
        setCurrentPos(nextPosition);
        setLoadingCurrent(false);

        if (user?.id) {
          await persistLocation(pos.coords, { notify: true });
        } else {
          toast.success("Location captured on this device.");
        }
      },
      (err) => {
        setLoadingCurrent(false);
        toast.error(getLocationErrorMessage(err));
      },
      GEO_OPTIONS
    );
  }, [persistLocation, user?.id]);

  const startLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    const confirmed = window.confirm(
      "Share your live location with Boycott and keep updating the admin dashboard until you stop?"
    );

    if (!confirmed) return;

    setStartingLive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const nextPosition = toSharedPosition(pos.coords);
        setLivePos(nextPosition);
        setCurrentPos(nextPosition);
        setStartingLive(false);
        setIsLiveSharing(true);
        await persistLocation(pos.coords, { throttleMs: 8000 });
      },
      (err) => {
        setStartingLive(false);
        setIsLiveSharing(false);
        toast.error(getLocationErrorMessage(err));

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      GEO_OPTIONS
    );
  }, [persistLocation]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const openInGoogleMaps = () => {
    if (!visiblePosition) return;
    window.open(getMapsLink(visiblePosition), "_blank");
  };

  const openDirections = () => {
    if (!visiblePosition) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${visiblePosition.lat},${visiblePosition.lng}`,
      "_blank"
    );
  };

  return (
    <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary p-2 rounded-xl">
          <MapPin className="w-5 h-5 text-secondary-foreground" />
        </div>
        <h3 className="font-semibold text-lg">My Location</h3>
      </div>

      <div className="bg-muted/20 rounded-xl p-4 mb-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Current location captures coordinates once. Live location keeps updating until you stop it.
        </p>

        {visiblePosition ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <LocateFixed className="w-3 h-3" />
                Current saved
              </Badge>
              {isLiveSharing && (
                <Badge className="gap-1">
                  <Radio className="w-3 h-3" />
                  Live location on
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coordinates</p>
              <p className="font-mono text-base font-semibold break-all">
                {visiblePosition.lat.toFixed(6)}, {visiblePosition.lng.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground">
                Accuracy: {visiblePosition.accuracy ? `${Math.round(visiblePosition.accuracy)}m` : "Unknown"} • Updated {new Date(visiblePosition.updatedAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-border bg-background">
              <iframe
                title="Live location map"
                src={getMapsEmbedLink(visiblePosition)}
                className="w-full h-52 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={openInGoogleMaps}>
                <ExternalLink className="w-4 h-4" />
                View Live Location
              </Button>
              <Button variant="outline" className="gap-2" onClick={openDirections}>
                <Navigation className="w-4 h-4" />
                Open Directions
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
        <Button
          onClick={getCurrentLocation}
          disabled={loadingCurrent || startingLive}
          className="w-full gap-2"
        >
          {loadingCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {loadingCurrent ? "Getting Location..." : visiblePosition ? "Refresh Current Location" : "Get My Location"}
        </Button>

        {isLiveSharing ? (
          <Button variant="outline" onClick={stopLiveLocation} className="w-full gap-2">
            <StopCircle className="w-4 h-4" />
            Stop Live Location
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={startLiveLocation}
            disabled={loadingCurrent || startingLive}
            className="w-full gap-2"
          >
            {startingLive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            {startingLive ? "Starting Live View..." : "Start Live Location"}
          </Button>
        )}
      </div>
    </Card>
  );
}
