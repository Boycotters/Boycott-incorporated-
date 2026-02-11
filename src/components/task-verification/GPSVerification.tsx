import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MapPin, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface GPSVerificationProps {
  taskId: string;
  taskTitle?: string;
  targetLocation?: { lat: number; lng: number; radius: number; name: string };
  onComplete: () => void;
  onCancel: () => void;
}

export function GPSVerification({
  taskId,
  taskTitle,
  targetLocation,
  onComplete,
  onCancel,
}: GPSVerificationProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'checking' | 'success' | 'failed'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default location for Zambia-based tasks (Lusaka center, 50km radius)
  const target = targetLocation || { lat: -15.3875, lng: 28.3228, radius: 50000, name: "Zambia" };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const requestLocation = () => {
    setStatus('requesting');
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setStatus('failed');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setStatus('checking');

        const dist = calculateDistance(latitude, longitude, target.lat, target.lng);
        setDistance(dist);

        setTimeout(() => {
          if (dist <= target.radius) {
            setStatus('success');
            setTimeout(() => onComplete(), 1500);
          } else {
            setStatus('failed');
            setError(`You are ${(dist / 1000).toFixed(1)}km away from the required location (${target.name})`);
          }
        }, 1000);
      },
      (err) => {
        setStatus('failed');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please enable location access in your browser settings.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("An unknown error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
          status === 'success' ? 'bg-green-500/10' : status === 'failed' ? 'bg-destructive/10' : 'bg-primary/10'
        }`}>
          {status === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : status === 'failed' ? (
            <XCircle className="w-6 h-6 text-destructive" />
          ) : (
            <MapPin className="w-6 h-6 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold">
          {status === 'success' ? 'Location Verified!' : status === 'failed' ? 'Verification Failed' : 'GPS Location Check'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {status === 'idle' && `Verify your location is within ${target.name}`}
          {status === 'requesting' && 'Getting your location...'}
          {status === 'checking' && 'Verifying location...'}
          {status === 'success' && 'You are in the correct location!'}
          {status === 'failed' && (error || 'Location check failed')}
        </p>
      </div>

      {/* Progress indicator */}
      {(status === 'requesting' || status === 'checking') && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Distance info */}
      {distance !== null && status !== 'requesting' && (
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Distance from target</p>
          <p className={`text-2xl font-bold ${distance <= target.radius ? 'text-green-500' : 'text-destructive'}`}>
            {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Required: within {target.radius < 1000 ? `${target.radius}m` : `${(target.radius / 1000).toFixed(0)}km`} of {target.name}
          </p>
        </div>
      )}

      {/* Warning for failed */}
      {status === 'failed' && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={status === 'requesting' || status === 'checking'}>
          Cancel
        </Button>
        {status !== 'success' && (
          <Button 
            onClick={requestLocation} 
            className="flex-1"
            disabled={status === 'requesting' || status === 'checking'}
          >
            {status === 'requesting' || status === 'checking' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : status === 'failed' ? (
              'Try Again'
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Verify Location
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
