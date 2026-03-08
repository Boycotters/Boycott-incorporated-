import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, RefreshCw, Users, Clock, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

const activeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const inactiveIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface GPSLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  horizontal_accuracy: number | null;
  timestamp: string;
  task_id: string | null;
  is_partnered_task: boolean | null;
  session_id: string | null;
}

interface UserWithLocation {
  userId: string;
  userName: string;
  email: string;
  latestLocation: GPSLocation;
  locationCount: number;
  isActive: boolean; // active within last 10 min
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [positions, map]);
  return null;
}

export function GPSTrackingDashboard() {
  const [timeFilter, setTimeFilter] = useState("1h");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const getTimeAgo = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case "15m": return new Date(now.getTime() - 15 * 60000).toISOString();
      case "1h": return new Date(now.getTime() - 3600000).toISOString();
      case "6h": return new Date(now.getTime() - 6 * 3600000).toISOString();
      case "24h": return new Date(now.getTime() - 86400000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 86400000).toISOString();
      default: return new Date(now.getTime() - 3600000).toISOString();
    }
  };

  // Fetch all GPS locations within timeframe
  const { data: locations = [], refetch, isLoading } = useQuery({
    queryKey: ["admin-gps-locations", timeFilter],
    queryFn: async () => {
      const since = getTimeAgo(timeFilter);
      const { data, error } = await supabase
        .from("user_gps_locations")
        .select("*")
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as GPSLocation[];
    },
    refetchInterval: 15000, // Auto-refresh every 15s
  });

  // Fetch user info for displayed users
  const userIds = [...new Set(locations.map((l) => l.user_id))];
  const { data: usersData = [] } = useQuery({
    queryKey: ["admin-gps-users", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  // Group locations by user
  const userLocations: UserWithLocation[] = userIds.map((uid) => {
    const userLocs = locations.filter((l) => l.user_id === uid);
    const latest = userLocs[0];
    const userData = usersData.find((u) => u.id === uid);
    const tenMinAgo = new Date(Date.now() - 600000).toISOString();
    
    return {
      userId: uid,
      userName: userData?.full_name || "Unknown",
      email: userData?.email || "",
      latestLocation: latest,
      locationCount: userLocs.length,
      isActive: latest.timestamp > tenMinAgo,
    };
  });

  const activeUsers = userLocations.filter((u) => u.isActive);
  
  // Get selected user's path
  const selectedPath = selectedUser
    ? locations
        .filter((l) => l.user_id === selectedUser)
        .map((l) => [l.latitude, l.longitude] as [number, number])
        .reverse()
    : [];

  const allPositions: [number, number][] = locations.length > 0
    ? userLocations.map((u) => [u.latestLocation.latitude, u.latestLocation.longitude])
    : [[-15.3875, 28.3228]]; // Default Lusaka

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">Last 15 min</SelectItem>
            <SelectItem value="1h">Last 1 hour</SelectItem>
            <SelectItem value="6h">Last 6 hours</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {userLocations.length} tracked
          </Badge>
          <Badge variant="default" className="gap-1 bg-green-600">
            <Navigation className="w-3 h-3" />
            {activeUsers.length} active
          </Badge>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 450 }}>
        <MapContainer
          center={[-15.3875, 28.3228]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userLocations.map((user) => (
            <Marker
              key={user.userId}
              position={[user.latestLocation.latitude, user.latestLocation.longitude]}
              icon={user.isActive ? activeIcon : inactiveIcon}
              eventHandlers={{
                click: () => setSelectedUser(user.userId),
              }}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-semibold">{user.userName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <hr className="my-1" />
                  <p className="text-xs">
                    📍 {user.latestLocation.latitude.toFixed(5)}, {user.latestLocation.longitude.toFixed(5)}
                  </p>
                  {user.latestLocation.speed != null && (
                    <p className="text-xs">🏃 {user.latestLocation.speed.toFixed(1)} m/s</p>
                  )}
                  <p className="text-xs">
                    🕐 {new Date(user.latestLocation.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-xs">{user.locationCount} points recorded</p>
                  <p className={`text-xs font-medium ${user.isActive ? "text-green-600" : "text-red-500"}`}>
                    {user.isActive ? "● Active now" : "○ Inactive"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedPath.length > 1 && (
            <Polyline positions={selectedPath} color="#3b82f6" weight={3} opacity={0.8} />
          )}

          {allPositions.length > 0 && <FitBounds positions={allPositions} />}
        </MapContainer>
      </div>

      {/* User List */}
      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {userLocations.map((user) => (
          <Card
            key={user.userId}
            className={`cursor-pointer transition-colors ${
              selectedUser === user.userId ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelectedUser(selectedUser === user.userId ? null : user.userId)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${user.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono">
                  {user.latestLocation.latitude.toFixed(4)}, {user.latestLocation.longitude.toFixed(4)}
                </p>
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.latestLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {user.locationCount} pts
              </Badge>
            </CardContent>
          </Card>
        ))}

        {userLocations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No GPS data in the selected timeframe</p>
          </div>
        )}
      </div>
    </div>
  );
}
