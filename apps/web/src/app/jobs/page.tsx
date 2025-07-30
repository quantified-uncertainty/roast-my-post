import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    take: 50, // Reasonable limit for jobs list
    include: {
      evaluation: {
        include: {
          document: true,
          agent: {
            include: {
              versions: {
                orderBy: {
                  version: "desc",
                },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Jobs Dashboard</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                ID
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Document
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Agent
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Created
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Duration
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {job.id.substring(0, 8)}...
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      job.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : job.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : job.status === "RUNNING"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <Link
                    href={`/docs/${job.evaluation.document.id}/reader`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {job.evaluation.document.id.substring(0, 8)}...
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <Link
                    href={`/agents/${job.evaluation.agent.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {job.evaluation.agent.versions[0]?.name || "Unknown"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {job.createdAt
                    ? formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                      })
                    : "N/A"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {job.durationInSeconds ? `${job.durationInSeconds}s` : "N/A"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {job.priceInDollars
                    ? `$${parseFloat(job.priceInDollars.toString()).toFixed(4)}`
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
