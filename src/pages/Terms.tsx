import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Terms & Conditions</h1>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>
        </div>

        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6 text-sm text-muted-foreground pr-4">
              <section>
                <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing or using ZambiaCash ("the App"), you agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not use the App.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">2. Eligibility</h2>
                <p>
                  You must be at least 18 years old and a resident of Zambia to use this App. 
                  By using the App, you represent and warrant that you meet these requirements.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">3. Account Registration</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>You must provide accurate and complete information when creating an account</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You may not create multiple accounts or use fake identities</li>
                  <li>We reserve the right to suspend or terminate accounts that violate our policies</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">4. Earning Points</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Partnership task: 75 points (1 per day)</li>
                  <li>Surveys: 15 points each (3 per day)</li>
                  <li>Mini games: up to 10 points per play (3 plays per day)</li>
                  <li>Ads / Watch &amp; Earn: 5 points per video (5 per day, 80% of the video must be watched)</li>
                  <li>Standard tasks: approximately 12.5 points each (2 per day)</li>
                  <li>A strict daily cap of 200 points applies (400 during an active campaign)</li>
                  <li>Fraudulent activity, including but not limited to using bots, creating fake accounts, or manipulating the system, will result in immediate account termination and forfeiture of all points</li>
                  <li>We reserve the right to adjust point values and earning limits at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">5. Redeeming Points</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Points can be redeemed for rewards as listed in the Marketplace</li>
                  <li>Minimum withdrawal thresholds may apply</li>
                  <li>Phone verification is required for mobile money withdrawals</li>
                  <li>Redemption requests are subject to verification and may take up to 48 hours to process</li>
                  <li>We reserve the right to refuse redemption requests if fraud is suspected</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">6. Point Expiration</h2>
                <p>
                  Earned points do not expire as long as your account remains active. However, accounts 
                  inactive for more than 12 months may be subject to point expiration or account closure.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">7. Prohibited Activities</h2>
                <p className="mb-2">Users are prohibited from:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Using automated tools, bots, or scripts</li>
                  <li>Creating multiple accounts</li>
                  <li>Providing false information during verification</li>
                  <li>Attempting to exploit bugs or vulnerabilities</li>
                  <li>Engaging in any fraudulent activity</li>
                  <li>Abusing the referral system</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">8. Privacy</h2>
                <p>
                  Your privacy is important to us. Please review our Privacy Policy to understand how 
                  we collect, use, and protect your personal information.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">9. Disclaimer</h2>
                <p>
                  The App is provided "as is" without warranties of any kind. We do not guarantee 
                  continuous, uninterrupted access to the App. Earning opportunities may vary and 
                  are subject to availability.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, ZambiaCash shall not be liable for any 
                  indirect, incidental, special, or consequential damages arising from your use of the App.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">11. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these terms at any time. Continued use of the App 
                  after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">12. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at support@zambiacash.com.
                </p>
              </section>

              <section className="pt-4 border-t border-border">
                <p className="text-xs text-center">
                  © 2026 ZambiaCash. All rights reserved.
                </p>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
