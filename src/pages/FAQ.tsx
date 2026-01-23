import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "How do I earn points?",
        answer: "You can earn points by completing tasks, watching videos, taking surveys, playing games, and maintaining daily login streaks. Each activity awards different amounts of points based on difficulty and time required."
      },
      {
        question: "What is the daily earning cap?",
        answer: "You can earn a maximum of 180 points (K18) per day across all activities. This includes: 3 surveys (20 pts each), 4 ad videos (10 pts each), 4 mini-game attempts, and 2 digital tasks (20 pts each)."
      },
      {
        question: "When can I complete tasks?",
        answer: "Regular tasks are available Monday through Friday. Weekends are rest days unless there's a special weekend campaign running. Check back on Monday for new tasks!"
      }
    ]
  },
  {
    category: "Points & Rewards",
    questions: [
      {
        question: "How do I redeem my points?",
        answer: "Go to the Marketplace tab and browse available rewards. You can redeem points for data bundles, airtime, digital items like avatar frames and badges, and more. Each reward shows its point cost."
      },
      {
        question: "Do my points expire?",
        answer: "No, your earned points never expire. However, some digital items like avatar frames and badges may have a 30-day expiry after redemption."
      },
      {
        question: "What is the point-to-Kwacha ratio?",
        answer: "10 points equals K1 (1 Zambian Kwacha). So 100 points = K10, 500 points = K50, and so on."
      }
    ]
  },
  {
    category: "Withdrawals",
    questions: [
      {
        question: "How do I withdraw my earnings?",
        answer: "Go to Profile > Withdraw to cash out your points via Mobile Money (MTN, Airtel, Zamtel). You need a minimum of 100 points (K10) to withdraw."
      },
      {
        question: "Why do I need to verify my phone number?",
        answer: "Phone verification is required for withdrawals to ensure security and prevent fraud. It also helps us send your mobile money payments to the correct number."
      },
      {
        question: "How long do withdrawals take?",
        answer: "Most withdrawals are processed within 24-48 hours. You'll receive a notification once your payment has been sent."
      }
    ]
  },
  {
    category: "VIP & Streaks",
    questions: [
      {
        question: "What are VIP tiers?",
        answer: "VIP tiers (Bronze, Silver, Gold, Platinum, Diamond) unlock bonus benefits like extra daily tasks, point multipliers, and exclusive rewards. You can upgrade by earning points or purchasing upgrades."
      },
      {
        question: "How do daily streaks work?",
        answer: "Log in every day to maintain your streak! Longer streaks earn you bonus points. If you miss a day, you can recover your streak by spending 50 points within 48 hours."
      },
      {
        question: "What are streak milestones?",
        answer: "Reach 7, 14, and 30-day streaks to earn bonus milestone rewards: 50 pts at 7 days, 100 pts at 14 days, and 250 pts at 30 days!"
      }
    ]
  },
  {
    category: "Referrals",
    questions: [
      {
        question: "How does the referral program work?",
        answer: "Share your unique referral link with friends. When they sign up and complete their first task, you both earn bonus points!"
      },
      {
        question: "Where do I find my referral code?",
        answer: "Your referral code and shareable link are on your Profile page. Tap 'Copy Link' to share it with friends."
      },
      {
        question: "Is there a limit to referrals?",
        answer: "No! You can refer as many friends as you want and earn bonus points for each successful referral."
      }
    ]
  },
  {
    category: "Account & Security",
    questions: [
      {
        question: "How do I change my password?",
        answer: "Go to Settings > Security > Change Password. You can also reset your password via email if you've forgotten it."
      },
      {
        question: "Is my data safe?",
        answer: "Yes! We use industry-standard encryption and never share your personal information with third parties. See our Privacy Policy for details."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can request account deletion by contacting our support team. Note that this will permanently delete all your data and any unredeemed points."
      }
    ]
  }
];

export default function FAQ() {
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
            <h1 className="text-2xl font-bold">FAQ</h1>
            <p className="text-sm text-muted-foreground">Frequently Asked Questions</p>
          </div>
        </div>

        {/* FAQ Sections */}
        {faqs.map((section, idx) => (
          <Card key={idx} className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{section.category}</h2>
            </div>
            
            <Accordion type="single" collapsible className="space-y-2">
              {section.questions.map((faq, qIdx) => (
                <AccordionItem 
                  key={qIdx} 
                  value={`${idx}-${qIdx}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <AccordionTrigger className="text-left text-sm py-3 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ))}

        {/* Contact Support */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border text-center">
          <p className="text-muted-foreground text-sm mb-2">Still have questions?</p>
          <p className="font-medium">Contact us at support@zambiacash.com</p>
        </Card>
      </div>
    </div>
  );
}
