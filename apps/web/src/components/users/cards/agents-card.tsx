import { Bot, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserModel } from "@/models/User";

interface AgentsCardProps {
  userId: string;
}

export default async function AgentsCard({ userId }: AgentsCardProps) {
  const agentsCount = await UserModel.getUserAgentsCount(userId);

  return (
    <Card className="group transition-all hover:shadow-md">
      <Link href={ROUTES.USERS.AGENTS(userId)} className="block">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5" />
            Evaluators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-3xl font-bold">{agentsCount}</p>
            <p className="text-muted-foreground text-sm">
              Evaluators created by this user
            </p>
          </div>
          <div className="text-muted-foreground group-hover:text-foreground flex items-center text-sm font-medium">
            View all evaluators
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
