import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  Coins,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  subtitle?: string;
  icon: "dollar-sign" | "receipt" | "chart-line" | "coins";
  color: "green" | "blue" | "purple" | "amber";
}

const iconMap = {
  "dollar-sign": DollarSign,
  "receipt": Receipt,
  "chart-line": TrendingUp,
  "coins": Coins,
};

const colorMap = {
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600", 
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
};

const changeColorMap = {
  positive: "text-green-600",
  negative: "text-red-600",
};

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeType, 
  subtitle,
  icon, 
  color 
}: StatsCardProps) {
  const Icon = iconMap[icon];
  
  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {change && (
              <p className={`text-xs mt-1 ${changeColorMap[changeType || "positive"]}`}>
                {changeType === "positive" ? (
                  <ArrowUp className="inline mr-1" size={12} />
                ) : (
                  <ArrowDown className="inline mr-1" size={12} />
                )}
                {change}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
