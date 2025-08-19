"use client";

import { format } from "date-fns";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { formatCost } from "@/shared/utils/formatting";
import { HelpBox } from "@/components/ui/help-box";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DailySpending {
  date: string;
  evaluationCount: number;
  priceInDollars: number;
}

interface SpendingData {
  dailySpending: DailySpending[];
  totalCostInCents: number;
  totalEvaluations: number;
  startDate: string;
  endDate: string;
}

interface CostsCardProps {
  spendingData: SpendingData;
}

export function CostsCard({ spendingData }: CostsCardProps) {
  const filteredSpending = spendingData.dailySpending.filter(
    (day) => day.evaluationCount > 0
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Costs</h1>
        <HelpBox variant="info">
          Your evaluation costs per day. Costs are calculated based on token
          usage.
        </HelpBox>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Spending (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Track your daily evaluation costs and usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600">Total Cost</p>
                      <p className="text-lg font-semibold text-blue-800">
                        {formatCost(spendingData.totalCostInCents / 100)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600">
                        Total Evaluations
                      </p>
                      <p className="text-lg font-semibold text-green-800">
                        {spendingData.totalEvaluations}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spending Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Evaluations</TableHead>
                  <TableHead>Daily Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpending.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No spending data for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSpending.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {format(new Date(day.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {day.evaluationCount}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCost(day.priceInDollars / 100)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-muted-foreground">
                    {spendingData.totalEvaluations}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCost(spendingData.totalCostInCents / 100)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
