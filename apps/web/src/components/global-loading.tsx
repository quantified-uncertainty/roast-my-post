import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="p-8">
      {/* Full page skeleton */}
      <Skeleton className="h-screen w-full" />
    </div>
  );
}
