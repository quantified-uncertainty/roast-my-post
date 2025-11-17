"use client";

import { Bot, BookOpen, LogOut, MessageSquare, User, Wrench } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";

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
                  href={ROUTES.AGENTS.LIST}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Evaluators
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={ROUTES.TOOLS.LIST}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Tools
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={ROUTES.CLAIM_EVALUATIONS.LIST}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Opinions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/help"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Help & Docs
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
