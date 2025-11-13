import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

type MonthlyAggregate = {
  monthLabel: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  billCount: number;
};

export default function SixMonthChart({ data }: { data: MonthlyAggregate[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (monthLabel: string) => {
    const [year, month] = monthLabel.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Last 6 Months - Bill Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tickFormatter={formatMonth}
              className="text-xs"
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              className="text-xs"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
            />
            <Tooltip 
              formatter={(value: any, name: string) => {
                if (name === 'billCount') return [value, 'Bills'];
                return [formatCurrency(value), name];
              }}
              labelFormatter={formatMonth}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="paidAmount" 
              name="Paid Amount"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="left"
              dataKey="unpaidAmount" 
              name="Unpaid Amount"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="billCount" 
              name="Bill Count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
