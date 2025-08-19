"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/infrastructure/logging/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const createKeySchema = z.object({
  name: z
    .string()
    .min(1, "Key name is required")
    .max(100, "Key name must be less than 100 characters"),
  expiresIn: z.enum(["never", "7", "30", "90", "365"]),
});

type CreateKeyFormData = z.infer<typeof createKeySchema>;

// Type for the API response when creating a key
type CreateKeyResponse = {
  apiKey: {
    key: string;
    name: string;
  };
};

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyCreated: () => void;
  onClose: () => void;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  onKeyCreated,
  onClose,
}: ApiKeyDialogProps) {
  const [createdKey, setCreatedKey] = useState<
    CreateKeyResponse["apiKey"] | null
  >(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateKeyFormData>({
    resolver: zodResolver(createKeySchema),
    defaultValues: {
      name: "",
      expiresIn: "never",
    },
  });

  const onSubmit = async (data: CreateKeyFormData) => {
    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          expiresIn:
            data.expiresIn === "never" ? undefined : Number(data.expiresIn),
        }),
      });

      if (!response.ok) throw new Error("Failed to create API key");

      const responseData: CreateKeyResponse = await response.json();
      setCreatedKey(responseData.apiKey);
      toast.success("API key created successfully!");
    } catch (error) {
      logger.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    }
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset({
      name: "",
      expiresIn: "never",
    });
    setCreatedKey(null);
    onClose();
  };

  const handleDone = () => {
    onKeyCreated();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Save this API key securely. You won't be able to see it again."
              : "Create a new API key for external integrations."}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Save this API key securely. You won't be able to see it again.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-muted-foreground text-sm">{createdKey.name}</p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  readOnly
                  value={createdKey.key}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Card className="bg-muted w-full">
              <CardContent className="pt-4">
                <h4 className="mb-2 text-sm font-medium">
                  Add to your MCP configuration:
                </h4>
                <pre className="bg-background max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded p-3 text-xs">
                  {`{
  "mcpServers": {
    "roast-my-post": {
      "env": {
        "DATABASE_URL": "your-database-url",
        "ROAST_MY_POST_MCP_USER_API_KEY": "${createdKey.key}"
      }
    }
  }
}`}
                </pre>
              </CardContent>
            </Card>

            <Button onClick={handleDone} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MCP Server Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Never expires" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="flex-1"
                >
                  {form.formState.isSubmitting ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
