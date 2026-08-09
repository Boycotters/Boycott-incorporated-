import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useKyc } from "@/hooks/useKyc";
import { useToast } from "@/hooks/use-toast";

const ID_TYPES = [
  { value: "nrc", label: "NRC (Zambian ID)" },
  { value: "passport", label: "Passport" },
  { value: "drivers_licence", label: "Driver's licence" },
  { value: "student_id", label: "Student / school ID (under 16)" },
  { value: "birth_certificate", label: "Birth certificate (under 16)" },
];

/** ID types that mean the person has no NRC yet and needs a guardian to co-sign. */
const MINOR_TYPES = ["student_id", "birth_certificate"];

const baseSchema = z.object({
  full_name: z.string().trim().min(3, "Enter your full legal name").max(100),
  nrc_number: z.string().trim().min(4, "Enter your ID / document number").max(30),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  address: z.string().trim().min(4, "Enter your residential address").max(200),
  city: z.string().trim().min(2, "City is required").max(60),
  province: z.string().trim().max(60).optional(),
});

const guardianSchema = z.object({
  guardian_name: z.string().trim().min(3, "Guardian's full name is required").max(100),
  guardian_id_number: z.string().trim().min(6, "Guardian's NRC / passport number is required").max(30),
  guardian_phone: z.string().trim().min(9, "Guardian's phone number is required").max(20),
  guardian_relationship: z.string().trim().min(3, "State the relationship (e.g. Mother)").max(40),
});

const MAX_FILE = 5 * 1024 * 1024;

export function KycDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { kyc, status, refetch } = useKyc();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id_type: "nrc",
    full_name: "", nrc_number: "", date_of_birth: "", address: "", city: "", province: "",
    guardian_name: "", guardian_id_number: "", guardian_phone: "", guardian_relationship: "",
  });
  const [files, setFiles] = useState<{ id_front?: File; id_back?: File; selfie?: File }>({});

  useEffect(() => {
    if (kyc) {
      const k = kyc as unknown as Record<string, string | null>;
      setForm({
        id_type: k.id_type || "nrc",
        full_name: kyc.full_name || "",
        nrc_number: kyc.nrc_number || "",
        date_of_birth: kyc.date_of_birth || "",
        address: kyc.address || "",
        city: kyc.city || "",
        province: kyc.province || "",
        guardian_name: k.guardian_name || "",
        guardian_id_number: k.guardian_id_number || "",
        guardian_phone: k.guardian_phone || "",
        guardian_relationship: k.guardian_relationship || "",
      });
    }
  }, [kyc]);

  const readOnly = status === "pending" || status === "approved";

  /** Age derived from the entered date of birth. */
  const age = useMemo(() => {
    if (!form.date_of_birth) return null;
    const dob = new Date(form.date_of_birth);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
    return a;
  }, [form.date_of_birth]);

  const isMinorFlow = MINOR_TYPES.includes(form.id_type) || (age !== null && age < 16);

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
    const parsed = baseSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    let guardian: z.infer<typeof guardianSchema> | null = null;
    if (isMinorFlow) {
      const g = guardianSchema.safeParse(form);
      if (!g.success) {
        toast({ title: "Guardian details needed", description: g.error.errors[0].message, variant: "destructive" });
        return;
      }
      guardian = g.data;
    }
    if (age !== null && age < 13) {
      toast({ title: "Not eligible", description: "You must be at least 13 to use Boycott Incorporated.", variant: "destructive" });
      return;
    }
    if (!kyc && (!files.id_front || !files.selfie)) {
      toast({ title: "Documents required", description: "Upload your ID document and a selfie.", variant: "destructive" });
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
        id_type: form.id_type,
        guardian_name: guardian?.guardian_name ?? null,
        guardian_id_number: guardian?.guardian_id_number ?? null,
        guardian_phone: guardian?.guardian_phone ?? null,
        guardian_relationship: guardian?.guardian_relationship ?? null,
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

  const docLabels: [keyof typeof files, string][] = isMinorFlow
    ? [
        ["id_front", "Your school ID or birth certificate (required)"],
        ["id_back", "Guardian's NRC / passport"],
        ["selfie", "Selfie with your guardian (required)"],
      ]
    : [
        ["id_front", "ID front (required)"],
        ["id_back", "ID back"],
        ["selfie", "Selfie holding your ID (required)"],
      ];

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
            <Label htmlFor="kyc-idtype">Document type</Label>
            <Select value={form.id_type} disabled={readOnly}
              onValueChange={(v) => setForm({ ...form, id_type: v })}>
              <SelectTrigger id="kyc-idtype"><SelectValue placeholder="Select document" /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="kyc-name">Full legal name</Label>
            <Input id="kyc-name" disabled={readOnly} value={form.full_name} maxLength={100}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="As shown on your document" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kyc-nrc">Document number</Label>
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

          {isMinorFlow && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-primary" />
                No NRC yet? Under-16s can verify with a parent or guardian. Cash-outs are paid to the guardian's
                mobile money number, and the guardian is responsible for the account.
              </p>
              <div>
                <Label htmlFor="kyc-gname">Guardian's full name</Label>
                <Input id="kyc-gname" disabled={readOnly} value={form.guardian_name} maxLength={100}
                  onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} placeholder="Parent / guardian" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="kyc-gid">Guardian's NRC</Label>
                  <Input id="kyc-gid" disabled={readOnly} value={form.guardian_id_number} maxLength={30}
                    onChange={(e) => setForm({ ...form, guardian_id_number: e.target.value })} placeholder="123456/78/1" />
                </div>
                <div>
                  <Label htmlFor="kyc-gphone">Guardian's phone</Label>
                  <Input id="kyc-gphone" disabled={readOnly} value={form.guardian_phone} maxLength={20}
                    onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} placeholder="09XXXXXXXX" />
                </div>
              </div>
              <div>
                <Label htmlFor="kyc-grel">Relationship to you</Label>
                <Input id="kyc-grel" disabled={readOnly} value={form.guardian_relationship} maxLength={40}
                  onChange={(e) => setForm({ ...form, guardian_relationship: e.target.value })} placeholder="Mother, Father, Guardian" />
              </div>
            </div>
          )}

          {!readOnly && (
            <div className="space-y-2">
              {docLabels.map(([key, label]) => (
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
