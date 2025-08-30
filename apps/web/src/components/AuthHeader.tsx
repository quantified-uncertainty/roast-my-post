"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { User, UserCircle, FlaskConical, Settings, LogOut } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthHeader() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <>
      {isLoading ? (
        <Skeleton className="h-8 w-8 rounded-full" />
      ) : session ? (
        <>
          {session.user && !session.user.name && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/welcome">Complete profile</Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-200 transition-colors hover:bg-gray-300">
                    <User className="h-4 w-4 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem asChild>
                <Link
                  href={`/users/${session.user?.id}`}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/experiments"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <FlaskConical className="h-4 w-4" />
                  Experiments
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/settings/keys"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/api/auth/signout"
                  className="flex cursor-pointer items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost">
            <Link href={ROUTES.AUTH.SIGNIN}>Log In</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.AUTH.SIGNUP}>Sign Up</Link>
          </Button>
        </div>
      )}
    </>
  );
}
