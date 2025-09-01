import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserModel } from "@/models/User";

interface DocumentsCardProps {
  userId: string;
  requestingUserId?: string;
}

export default async function DocumentsCard({ userId, requestingUserId }: DocumentsCardProps) {
  const documentsCount = await UserModel.getUserDocumentsCount(userId, requestingUserId);

  return (
    <Card className="group transition-all hover:shadow-md">
      <Link href={`/users/${userId}/documents`} className="block">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-3xl font-bold">{documentsCount}</p>
            <p className="text-muted-foreground text-sm">
              Documents created by this user
            </p>
          </div>
          <div className="text-muted-foreground group-hover:text-foreground flex items-center text-sm font-medium">
            View all documents
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
