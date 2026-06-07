import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, RefreshCw, Users, Clock, Navigation, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  session_id: string | null;
}

interface UserWithLocation {
  userId: string;
  userName: string;
  email: string;
  latestLocation: GPSLocation;
  locationCount: number;
  isActive: boolean;
}

export function GPSTrackingDashboard() {
  const [timeFilter, setTimeFilter] = useState("1h");

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
    refetchInterval: 15000,
  });

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

      {/* User Location Table */}
      {userLocations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No GPS data in the selected timeframe</p>
          <p className="text-sm mt-1">User locations will appear here when they share their location</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Updates</TableHead>
                <TableHead>Map</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userLocations.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          user.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                        }`}
                      />
                      <span className="text-xs">
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.userName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">
                      {user.latestLocation.latitude.toFixed(5)},{" "}
                      {user.latestLocation.longitude.toFixed(5)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {user.latestLocation.speed != null ? (
                      <span className="text-sm">{user.latestLocation.speed.toFixed(1)} m/s</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">
                        {new Date(user.latestLocation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {user.locationCount} updates
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps?q=${user.latestLocation.latitude},${user.latestLocation.longitude}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Live map of most recent active user */}
      {activeUsers.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium bg-muted/40 border-b">
            Live map · {activeUsers[0].userName}
          </div>
          <iframe
            title="Admin live location"
            src={`https://maps.google.com/maps?q=${activeUsers[0].latestLocation.latitude},${activeUsers[0].latestLocation.longitude}&z=15&output=embed`}
            style={{ height: 320, width: "100%", border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}
