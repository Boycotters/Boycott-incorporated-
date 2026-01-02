import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Gift, Smartphone, ShoppingBag, Ticket, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "all": <Sparkles className="w-4 h-4" />,
  "gift_cards": <Gift className="w-4 h-4" />,
  "mobile": <Smartphone className="w-4 h-4" />,
  "shopping": <ShoppingBag className="w-4 h-4" />,
  "vouchers": <Ticket className="w-4 h-4" />,
  "cash": <CreditCard className="w-4 h-4" />,
};

const categoryLabels: Record<string, string> = {
  "all": "All",
  "gift_cards": "Gift Cards",
  "mobile": "Mobile",
  "shopping": "Shopping",
  "vouchers": "Vouchers",
  "cash": "Cash",
};

export function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryFilterProps) {
  const allCategories = ["all", ...categories];

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {allCategories.map((category) => {
          const isSelected = 
            (category === "all" && !selectedCategory) || 
            category === selectedCategory;
          
          return (
            <Button
              key={category}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(category === "all" ? null : category)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 shrink-0 transition-all",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-card hover:bg-muted"
              )}
            >
              {categoryIcons[category] || <Gift className="w-4 h-4" />}
              <span className="text-xs font-medium">
                {categoryLabels[category] || category}
              </span>
            </Button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
