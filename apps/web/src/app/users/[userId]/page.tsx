import { notFound } from "next/navigation";
import { Suspense } from "react";
import { User, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/infrastructure/auth/auth";
import { UserModel } from "@/models/User";
import { USER_DISPLAY } from "@/shared/constants/constants";
import { DocumentsCard, AgentsCard } from "@/components/users/cards";

export default async function UserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  const currentUserId = session?.user?.id;

  const user = await UserModel.getUser(resolvedParams.userId, currentUserId);

  if (!user) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* User Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">
              {user.name || USER_DISPLAY.GUEST_NAME}
            </h1>
            {user.email && (
              <p className="text-muted-foreground text-sm">{user.email}</p>
            )}
          </div>
        </div>

        {user.isCurrentUser && (
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/settings/profile">
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <DocumentsCard userId={user.id} />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <AgentsCard userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}
