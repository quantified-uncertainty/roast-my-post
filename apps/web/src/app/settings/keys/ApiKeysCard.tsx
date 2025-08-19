"use client";

import { useState } from "react";
import { Plus, Search, Info, Trash2 } from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiKeyDialog } from "./ApiKeyDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HelpBox } from "@/components/ui/help-box";
import type { Prisma } from "@roast/db";

// Type for API keys with string dates (from SSR serialization)
interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

interface ApiKeysCardProps {
  initialApiKeys: ApiKey[];
}

export function ApiKeysCard({ initialApiKeys }: ApiKeysCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete API key");

      // Reload the page to get fresh data from SSR
      router.refresh();
      toast.success("API key deleted successfully!");
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const handleKeyCreated = () => {
    // Close dialog and reload the page to get fresh data from SSR
    setShowCreateDialog(false);
    router.refresh();
  };

  const filteredKeys = initialApiKeys.filter((key) =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return "Never";

    const date = parseISO(lastUsedAt);
    const daysAgo = Math.floor(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysAgo > 30) {
      return "Over 30 days ago";
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
        <HelpBox variant="info">
          API keys are owned by your account and remain active even after
          sessions expire
        </HelpBox>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {searchQuery
                      ? "No keys found matching your search"
                      : "No API keys yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-sm">
                      rmp_••••••••••••
                    </TableCell>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(key.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatLastUsed(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.expiresAt
                        ? format(parseISO(key.expiresAt), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApiKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onKeyCreated={handleKeyCreated}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  );
}
