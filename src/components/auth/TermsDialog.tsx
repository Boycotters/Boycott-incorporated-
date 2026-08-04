import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TermsDialogProps {
  trigger: React.ReactNode;
  defaultTab?: "terms" | "privacy";
  onAccept?: () => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-1">
    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
    <div className="text-xs text-muted-foreground leading-relaxed space-y-1">{children}</div>
  </section>
);

export function TermsDialog({ trigger, defaultTab = "terms", onAccept }: TermsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Terms of Service & Privacy Policy</DialogTitle>
          <DialogDescription>
            Please read these before creating a Boycott Incorporated account.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <ScrollArea className="h-[45vh] pr-3">
              <div className="space-y-4 py-2">
                <Section title="1. Acceptance">
                  <p>
                    By creating an account you agree to be bound by these Terms. If you do not agree,
                    do not use Boycott Incorporated.
                  </p>
                </Section>
                <Section title="2. Eligibility">
                  <p>You must be at least 18 years old and resident in Zambia. One account per person.</p>
                </Section>
                <Section title="3. Earning points">
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Partnership task: 75 points (1 per day)</li>
                    <li>Surveys: 15 points each (3 per day)</li>
                    <li>Mini games: up to 10 points per play (3 plays per day)</li>
                    <li>Ads / Watch & Earn: 5 points per video (5 per day, 80% watch required)</li>
                    <li>Standard tasks: ~12.5 points each (2 per day)</li>
                    <li>A strict daily cap of 200 points applies (400 during an active campaign)</li>
                  </ul>
                  <p>Point values, slots and caps may be adjusted at any time.</p>
                </Section>
                <Section title="4. Withdrawals & rewards">
                  <p>
                    150 points = K10. A verified phone number and 2 referrals are required before your
                    first withdrawal. Redeemed items expire 30 days after redemption. Requests may take
                    up to 48 hours and are subject to fraud review.
                  </p>
                </Section>
                <Section title="5. Prohibited conduct">
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Bots, scripts, emulators or automation of any kind</li>
                    <li>Multiple or fake accounts, or false verification information</li>
                    <li>Exploiting bugs, abusing referrals, or manipulating point balances</li>
                  </ul>
                  <p>Violations result in termination and forfeiture of all points.</p>
                </Section>
                <Section title="6. Availability">
                  <p>
                    Tasks run Monday to Friday unless a weekend campaign is active. The service is
                    provided "as is" with no guarantee of uninterrupted access or earning availability.
                  </p>
                </Section>
                <Section title="7. Changes">
                  <p>Continued use after we update these Terms constitutes acceptance of the new Terms.</p>
                </Section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="privacy">
            <ScrollArea className="h-[45vh] pr-3">
              <div className="space-y-4 py-2">
                <Section title="What we collect">
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Account details: name, email, phone number</li>
                    <li>Activity: tasks, surveys, videos, games, points and transactions</li>
                    <li>Verification data: screenshots and GPS location for location-based tasks</li>
                    <li>Device and push notification tokens</li>
                  </ul>
                </Section>
                <Section title="How we use it">
                  <p>
                    To award points, prevent fraud, process withdrawals, personalise tasks, and send
                    you service notifications. Survey responses may be shared with partners in
                    aggregated, de-identified form.
                  </p>
                </Section>
                <Section title="Your rights">
                  <p>
                    You may request a copy or deletion of your data at any time from Settings, or by
                    contacting support. Deleting your account forfeits any unredeemed points.
                  </p>
                </Section>
                <Section title="Security">
                  <p>
                    Data is stored on encrypted infrastructure with row-level access controls. We never
                    sell your personal identity data.
                  </p>
                </Section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Button
          className="w-full"
          onClick={() => {
            onAccept?.();
            setOpen(false);
          }}
        >
          I have read and agree
        </Button>
      </DialogContent>
    </Dialog>
  );
}
