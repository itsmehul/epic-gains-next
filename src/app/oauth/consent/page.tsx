import { Suspense } from "react";

import { OAuthConsentClient } from "@/components/auth/oauth-consent-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function ConsentFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorize MCP access</CardTitle>
          <CardDescription>Confirm access for an MCP client.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Spinner className="size-6" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<ConsentFallback />}>
      <OAuthConsentClient />
    </Suspense>
  );
}
