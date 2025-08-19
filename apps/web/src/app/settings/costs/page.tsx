import { auth } from "@/infrastructure/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@roast/db";
import { decimalToNumber } from "@/infrastructure/database/prisma-serializers";
import { CostsCard } from "./CostsCard";

async function getDailySpending(
  userId: string,
  days: number = 30
): Promise<{
  dailySpending: Array<{
    date: string;
    priceInDollars: number;
    evaluationCount: number;
  }>;
  totalCostInCents: number;
  totalEvaluations: number;
  startDate: string;
  endDate: string;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all jobs for the user in the date range
  const jobs = await prisma.job.findMany({
    where: {
      evaluation: {
        document: {
          submittedById: userId,
        },
      },
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      priceInDollars: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group by day
  const dailySpending = new Map<
    string,
    { priceInDollars: number; evaluationCount: number }
  >();

  // Initialize all days with zero spending
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    dailySpending.set(dateKey, { priceInDollars: 0, evaluationCount: 0 });
  }

  // Aggregate spending by day
  let totalCostInCents = 0;
  let totalEvaluations = 0;

  for (const job of jobs) {
    const dateKey = job.createdAt.toISOString().split("T")[0];
    const existing = dailySpending.get(dateKey) || {
      priceInDollars: 0,
      evaluationCount: 0,
    };

    // Convert Decimal to number and then to cents
    const priceInDollars = job.priceInDollars
      ? Math.round((decimalToNumber(job.priceInDollars) || 0) * 100)
      : 0;

    existing.priceInDollars += priceInDollars;
    existing.evaluationCount += 1;

    dailySpending.set(dateKey, existing);

    totalCostInCents += priceInDollars;
    totalEvaluations += 1;
  }

  // Convert to array and sort by date (newest first)
  const dailySpendingArray = Array.from(dailySpending.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    dailySpending: dailySpendingArray,
    totalCostInCents,
    totalEvaluations,
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
  };
}

export default async function CostsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/api/auth/signin");
  }

  let spendingData;
  let error = null;

  try {
    spendingData = await getDailySpending(userId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load spending data";
  }

  if (error || !spendingData) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Costs</h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error || "Failed to load spending data"}
          </p>
        </div>
      </div>
    );
  }

  return <CostsCard spendingData={spendingData} />;
}
