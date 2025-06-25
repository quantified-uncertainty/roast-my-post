import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCost } from "@/utils/costCalculator";
import { prisma } from "@/lib/prisma";

async function getDailySpending(userId: string, days: number = 30) {
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
      costInCents: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by day
  const dailySpending = new Map<string, { costInCents: number; evaluationCount: number }>();
  
  // Initialize all days with zero spending
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailySpending.set(dateKey, { costInCents: 0, evaluationCount: 0 });
  }

  // Aggregate spending by day
  let totalCostInCents = 0;
  let totalEvaluations = 0;

  for (const job of jobs) {
    const dateKey = job.createdAt.toISOString().split('T')[0];
    const existing = dailySpending.get(dateKey) || { costInCents: 0, evaluationCount: 0 };
    
    existing.costInCents += job.costInCents || 0;
    existing.evaluationCount += 1;
    
    dailySpending.set(dateKey, existing);
    
    totalCostInCents += job.costInCents || 0;
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
    error = e instanceof Error ? e.message : 'Failed to load spending data';
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Costs</h1>
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Daily Spending (Last 30 Days)</h2>
            <p className="mt-1 text-sm text-gray-500">
              Your evaluation costs per day. Costs are calculated based on token usage.
            </p>
          </div>

          {error ? (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          ) : !spendingData ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading spending data...</p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Evaluations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Daily Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {spendingData.dailySpending
                      .filter((day: any) => day.evaluationCount > 0)
                      .map((day: any) => (
                        <tr key={day.date}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {day.evaluationCount}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {formatCost(day.costInCents / 100)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {spendingData.totalEvaluations}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCost(spendingData.totalCostInCents / 100)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {spendingData.dailySpending.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No spending data for the selected period.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}