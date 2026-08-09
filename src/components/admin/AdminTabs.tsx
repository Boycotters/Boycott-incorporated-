import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, DollarSign, Users, ClipboardList, Video, FileText, Settings, ShieldCheck 
} from "lucide-react";

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingWithdrawals: number;
  unexportedSurveys: number;
}

export function AdminTabs({ activeTab, onTabChange, pendingWithdrawals, unexportedSurveys }: AdminTabsProps) {
  const tabs = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    { value: "withdrawals", label: "Payouts", icon: DollarSign, badge: pendingWithdrawals > 0 ? pendingWithdrawals : undefined, badgeVariant: "destructive" as const },
    { value: "users", label: "Users", icon: Users },
    { value: "tasks", label: "Tasks", icon: ClipboardList },
    { value: "videos", label: "Videos", icon: Video },
    { value: "surveys", label: "Surveys", icon: FileText, badge: unexportedSurveys > 0 ? unexportedSurveys : undefined, badgeVariant: "default" as const },
    { value: "algorithms", label: "Config", icon: Settings },
  ];

  return (
    <div className="w-full overflow-hidden">
      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex gap-2 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium 
                  transition-all shrink-0 min-w-fit
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <Badge 
                    variant={tab.badgeVariant} 
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
