import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ClaimEvaluationsList } from './ClaimEvaluationsList';

export const metadata = {
  title: 'Claim Evaluations',
  description: 'Browse and search your claim evaluations',
};

function LoadingSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mb-4 h-12 w-full animate-pulse rounded-lg bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default function ClaimEvaluationsPage() {
  return (
    <div className="w-full px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Claim Evaluations</h1>
        <Button asChild size="xs">
          <Link href="/tools/claim-evaluator/try">
            Create New Evaluation
          </Link>
        </Button>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ClaimEvaluationsList />
      </Suspense>
    </div>
  );
}
