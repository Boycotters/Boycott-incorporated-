import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useKyc } from "@/hooks/useKyc";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(3, "Enter your full legal name").max(100),
  nrc_number: z.string().trim().min(6, "Enter a valid NRC / passport number").max(30),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  address: z.string().trim().min(4, "Enter your residential address").max(200),
  city: z.string().trim().min(2, "City is required").max(60),
  province: z.string().trim().max(60).optional(),
});

const MAX_FILE = 5 * 1024 * 1024;

export function KycDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { kyc, status, refetch } = useKyc();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", nrc_number: "", date_of_birth: "", address: "", city: "", province: "",
  });
  const [files, setFiles] = useState<{ id_front?: File; id_back?: File; selfie?: File }>({});

  useEffect(() => {
    if (kyc) {
      setForm({
        full_name: kyc.full_name || "",
        nrc_number: kyc.nrc_number || "",
        date_of_birth: kyc.date_of_birth || "",
        address: kyc.address || "",
        city: kyc.city || "",
        province: kyc.province || "",
      });
    }
  }, [kyc]);

  const readOnly = status === "pending" || status === "approved";

  const upload = async (file: File | undefined, slot: string) => {
    if (!file || !user) return null;
    if (file.size > MAX_FILE) throw new Error(`${slot} must be under 5MB`);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!kyc && (!files.id_front || !files.selfie)) {
      toast({ title: "Documents required", description: "Upload your NRC front and a selfie.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const [front, back, selfie] = await Promise.all([
        upload(files.id_front, "id-front"),
        upload(files.id_back, "id-back"),
        upload(files.selfie, "selfie"),
      ]);

      const payload: Record<string, unknown> = {
        user_id: user.id,
        ...parsed.data,
        province: parsed.data.province || null,
        status: "pending",
      };
      if (front) payload.id_front_path = front;
      if (back) payload.id_back_path = back;
      if (selfie) payload.selfie_path = selfie;

      const { error } = kyc
        ? await supabase.from("kyc_verifications").update(payload as never).eq("user_id", user.id)
        : await supabase.from("kyc_verifications").insert(payload as never);
      if (error) throw error;

      toast({ title: "Submitted for review", description: "We'll verify your identity shortly." });
      await refetch();
      onOpenChange(false);
    } catch (e: unknown) {
      toast({ title: "Submission failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Identity Verification
          </DialogTitle>
          <DialogDescription>
            Required before you can cash out, transfer points or upgrade tiers. Your documents are stored privately.
          </DialogDescription>
        </DialogHeader>

        {status !== "none" && (
          <div className="flex items-center gap-2">
            <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"} className="capitalize">
              {status === "approved" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : status === "rejected" ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {status}
            </Badge>
            {kyc?.review_notes && <span className="text-xs text-muted-foreground">{kyc.review_notes}</span>}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="kyc-name">Full legal name</Label>
            <Input id="kyc-name" disabled={readOnly} value={form.full_name} maxLength={100}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="As shown on your NRC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kyc-nrc">NRC / Passport</Label>
              <Input id="kyc-nrc" disabled={readOnly} value={form.nrc_number} maxLength={30}
                onChange={(e) => setForm({ ...form, nrc_number: e.target.value })} placeholder="123456/78/1" />
            </div>
            <div>
              <Label htmlFor="kyc-dob">Date of birth</Label>
              <Input id="kyc-dob" type="date" disabled={readOnly} value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="kyc-addr">Residential address</Label>
            <Input id="kyc-addr" disabled={readOnly} value={form.address} maxLength={200}
              onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House no, area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kyc-city">City</Label>
              <Input id="kyc-city" disabled={readOnly} value={form.city} maxLength={60}
                onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lusaka" />
            </div>
            <div>
              <Label htmlFor="kyc-prov">Province</Label>
              <Input id="kyc-prov" disabled={readOnly} value={form.province} maxLength={60}
                onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Lusaka" />
            </div>
          </div>

          {!readOnly && (
            <div className="space-y-2">
              {([
                ["id_front", "NRC front (required)"],
                ["id_back", "NRC back"],
                ["selfie", "Selfie holding your NRC (required)"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`kyc-${key}`} className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input id={`kyc-${key}`} type="file" accept="image/*"
                      onChange={(e) => setFiles({ ...files, [key]: e.target.files?.[0] })} className="text-xs" />
                    {files[key] && <Upload className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {readOnly ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          ) : (
            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit for verification"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
