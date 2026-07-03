import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Download, Trash2, Search, FileImage, FileVideo, FileText, Folder, RefreshCw, ExternalLink } from "lucide-react";

const BUCKETS = [
  { id: "task-proofs", label: "Task Proofs", public: false },
  { id: "content-submissions", label: "Content Submissions", public: true },
  { id: "entertainment-videos", label: "Entertainment Videos", public: true },
];

interface StorageObject {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  metadata: { size?: number; mimetype?: string } | null;
}

function humanBytes(n?: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function iconFor(mimetype?: string) {
  if (!mimetype) return FileText;
  if (mimetype.startsWith("image/")) return FileImage;
  if (mimetype.startsWith("video/")) return FileVideo;
  return FileText;
}

export function StorageBucketExplorer() {
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState(BUCKETS[0].id);
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");

  const { data: objects = [], isLoading, refetch } = useQuery({
    queryKey: ["storage-list", bucket, prefix],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix || undefined, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data || []) as StorageObject[];
    },
  });

  // Realtime: refresh when storage.objects change (best-effort)
  useEffect(() => {
    const channel = supabase
      .channel(`storage-rt-${bucket}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "storage", table: "objects", filter: `bucket_id=eq.${bucket}` },
        () => queryClient.invalidateQueries({ queryKey: ["storage-list", bucket] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bucket, queryClient]);

  const filtered = useMemo(
    () => objects.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())),
    [objects, search]
  );

  const totalBytes = useMemo(
    () => objects.reduce((sum, o) => sum + (o.metadata?.size || 0), 0),
    [objects]
  );

  const bucketMeta = BUCKETS.find((b) => b.id === bucket)!;

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete "${path}"? This cannot be undone.`)) return;
    const { error } = await supabase.storage.from(bucket).remove([prefix ? `${prefix}/${path}` : path]);
    if (error) return toast.error(error.message);
    toast.success("File deleted");
    refetch();
  };

  const handleView = async (path: string) => {
    const full = prefix ? `${prefix}/${path}` : path;
    if (bucketMeta.public) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(full);
      window.open(data.publicUrl, "_blank");
    } else {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(full, 300);
      if (error) return toast.error(error.message);
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleDownload = async (path: string) => {
    const full = prefix ? `${prefix}/${path}` : path;
    const { data, error } = await supabase.storage.from(bucket).download(full);
    if (error) return toast.error(error.message);
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = path;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Storage Bucket Explorer
        </CardTitle>
        <CardDescription>Browse, preview, download, and delete files across all storage buckets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bucket picker + stats */}
        <div className="grid gap-2 sm:grid-cols-4">
          <Select value={bucket} onValueChange={(v) => { setBucket(v); setPrefix(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUCKETS.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
            <p className="text-lg font-bold">{objects.length}</p>
            <p className="text-[10px] text-muted-foreground">Files</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
            <p className="text-lg font-bold">{humanBytes(totalBytes)}</p>
            <p className="text-[10px] text-muted-foreground">Total size</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-center flex items-center justify-center gap-2">
            <Badge variant={bucketMeta.public ? "default" : "secondary"}>{bucketMeta.public ? "Public" : "Private"}</Badge>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Input placeholder="Folder prefix (optional)" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-56" />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading files...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Folder className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No files in this bucket{prefix ? ` under "${prefix}"` : ""}.</p>
          </div>
        ) : (
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-1.5">
              {filtered.map((obj) => {
                const Icon = iconFor(obj.metadata?.mimetype);
                const isFolder = !obj.id;
                return (
                  <div key={obj.name} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 hover:bg-muted/60 transition-colors">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{obj.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {humanBytes(obj.metadata?.size)} • {obj.metadata?.mimetype || (isFolder ? "folder" : "unknown")} •{" "}
                        {obj.created_at ? new Date(obj.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    {isFolder ? (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPrefix(prefix ? `${prefix}/${obj.name}` : obj.name)}>
                        Open
                      </Button>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(obj.name)}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(obj.name)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(obj.name)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
