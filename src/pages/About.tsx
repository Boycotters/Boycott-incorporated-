import { ArrowLeft, Zap, Users, Target, Heart, Star, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function About() {
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
            <h1 className="text-2xl font-bold">About Us</h1>
            <p className="text-sm text-muted-foreground">Learn more about ZambiaCash</p>
          </div>
        </div>

        {/* Hero */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-2xl shadow-card border border-primary/20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ZambiaCash</h2>
          <p className="text-muted-foreground">
            Empowering Zambians to earn rewards through simple tasks
          </p>
          <p className="text-xs text-muted-foreground mt-2">Version 1.0.0</p>
        </Card>

        {/* Mission */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Our Mission</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            To create economic opportunities for Zambians by connecting them with brands 
            and businesses seeking genuine feedback and engagement. We believe everyone 
            deserves a chance to earn from their time and opinions.
          </p>
        </Card>

        {/* What We Do */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-500/10 p-2 rounded-xl">
              <Star className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-semibold">What We Do</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Connect users with paid surveys from local and international brands
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Offer engaging tasks that reward your time and attention
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Provide instant cashout to Mobile Money (MTN, Airtel, Zamtel)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Create fun ways to earn through games and challenges
            </li>
          </ul>
        </Card>

        {/* Values */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-500/10 p-2 rounded-xl">
              <Heart className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="font-semibold">Our Values</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 p-3 rounded-xl text-center">
              <p className="font-medium text-sm">Transparency</p>
              <p className="text-xs text-muted-foreground">Clear earnings, no hidden fees</p>
            </div>
            <div className="bg-secondary/30 p-3 rounded-xl text-center">
              <p className="font-medium text-sm">Fairness</p>
              <p className="text-xs text-muted-foreground">Fair pay for your time</p>
            </div>
            <div className="bg-secondary/30 p-3 rounded-xl text-center">
              <p className="font-medium text-sm">Security</p>
              <p className="text-xs text-muted-foreground">Your data is protected</p>
            </div>
            <div className="bg-secondary/30 p-3 rounded-xl text-center">
              <p className="font-medium text-sm">Community</p>
              <p className="text-xs text-muted-foreground">Growing together</p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500/10 p-2 rounded-xl">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold">Our Community</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">10K+</p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">K50K+</p>
              <p className="text-xs text-muted-foreground">Paid Out</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">100K+</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-500/10 p-2 rounded-xl">
              <Globe className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-semibold">Get In Touch</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Email:</span> support@zambiacash.com
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">WhatsApp:</span> +260 XXX XXX XXX
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Location:</span> Lusaka, Zambia
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Made with ❤️ in Zambia
        </p>
      </div>
    </div>
  );
}
