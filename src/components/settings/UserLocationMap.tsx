import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function UserLocationMap() {
  const { user } = useAuth();
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        setLoading(false);

        if (user?.id) {
          const { error } = await supabase.from("user_gps_locations").insert({
            user_id: user.id,
            latitude,
            longitude,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            horizontal_accuracy: pos.coords.accuracy,
            vertical_accuracy: pos.coords.altitudeAccuracy,
          });
          if (error) {
            console.error("GPS insert error:", error);
            toast.error("Location captured but failed to save to server");
          } else {
            toast.success("Location captured & saved!");
          }
        } else {
          toast.success("Location captured!");
        }
      },
      (err) => {
        setLoading(false);
        toast.error("Location access denied. Please enable location in your browser/phone settings.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [user?.id]);

  const openInGoogleMaps = () => {
    if (!currentPos) return;
    window.open(
      `https://www.google.com/maps?q=${currentPos.lat},${currentPos.lng}`,
      "_blank"
    );
  };

  const openDirections = () => {
    if (!currentPos) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${currentPos.lat},${currentPos.lng}`,
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

      {/* Location Display */}
      {currentPos ? (
        <div className="space-y-3 mb-4">
          <div className="bg-muted/30 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Your Coordinates</p>
            <p className="font-mono text-lg font-semibold">
              {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
            </p>
            <Badge variant="default" className="mt-2">
              <Navigation className="w-3 h-3 mr-1" />
              Location captured
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2" onClick={openInGoogleMaps}>
              <ExternalLink className="w-4 h-4" />
              View on Map
            </Button>
            <Button variant="outline" className="gap-2" onClick={openDirections}>
              <Navigation className="w-4 h-4" />
              Get Directions
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-muted/20 rounded-xl p-6 mb-4 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Tap below to capture your current location
          </p>
        </div>
      )}

      <Button
        onClick={getCurrentLocation}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4" />
        )}
        {loading ? "Getting Location..." : currentPos ? "Update Location" : "Get My Location"}
      </Button>
    </Card>
  );
}
