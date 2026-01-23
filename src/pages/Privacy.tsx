import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Privacy() {
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
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>
        </div>

        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6 text-sm text-muted-foreground pr-4">
              <section>
                <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Introduction
                </h2>
                <p>
                  ZambiaCash ("we", "our", or "us") is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, and safeguard your information 
                  when you use our mobile application.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Information We Collect</h2>
                <p className="mb-2">We collect the following types of information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, phone number</li>
                  <li><strong>Identity Verification:</strong> NRC number, date of birth, gender (for withdrawal verification)</li>
                  <li><strong>Usage Data:</strong> Tasks completed, points earned, app interactions</li>
                  <li><strong>Device Information:</strong> Device type, operating system, app version</li>
                  <li><strong>Survey Responses:</strong> Answers provided in surveys and questionnaires</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>To create and manage your account</li>
                  <li>To process point redemptions and mobile money transfers</li>
                  <li>To personalize task recommendations</li>
                  <li>To improve our services and user experience</li>
                  <li>To communicate with you about your account and updates</li>
                  <li>To prevent fraud and ensure platform security</li>
                  <li>To aggregate anonymized data for market research</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Survey Data</h2>
                <p>
                  Survey responses are collected for market research purposes. Your individual responses 
                  may be shared with our research partners in anonymized or aggregated form. We never 
                  share personally identifiable information with third parties without your explicit consent.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Data Security</h2>
                <p>
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure authentication protocols</li>
                  <li>Regular security audits</li>
                  <li>Limited access to personal data</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Data Sharing</h2>
                <p className="mb-2">We may share your information with:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Payment Providers:</strong> Mobile money operators to process withdrawals</li>
                  <li><strong>Research Partners:</strong> Anonymized survey data for market research</li>
                  <li><strong>Service Providers:</strong> Cloud hosting and analytics services</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Your Rights</h2>
                <p className="mb-2">You have the right to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Export your data</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Data Retention</h2>
                <p>
                  We retain your personal data for as long as your account is active or as needed to 
                  provide services. We may retain certain information for legal compliance, dispute 
                  resolution, or fraud prevention purposes.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Children's Privacy</h2>
                <p>
                  Our App is not intended for users under 18 years of age. We do not knowingly 
                  collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  significant changes through the App or via email.
                </p>
              </section>

              <section>
                <h2 className="font-semibold text-foreground mb-2">Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy or our data practices, 
                  please contact us at privacy@zambiacash.com.
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
