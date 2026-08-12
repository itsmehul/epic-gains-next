"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMeSocial, useUpdateMeSocial } from "@/features/social/hooks";
import { ApiError } from "@/shared/api";

export function FriendsSettingsPageClient() {
  const router = useRouter();
  const meQuery = useMeSocial();
  const update = useUpdateMeSocial();
  const [username, setUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meQuery.data) return;
    setUsername(meQuery.data.username);
    setIsPrivate(meQuery.data.isPrivate);
  }, [meQuery.data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        username: username.trim().toLowerCase(),
        isPrivate,
      });
      router.push("/friends");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save",
      );
    }
  }

  return (
    <AppShellScroll>
      <AppShellHeader backHref="/friends" title="Friends settings" />
      <AppShellBody>
        <div className="flex flex-col gap-6 px-4 py-4 md:p-6">
          {meQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <IconLoader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <form className="flex max-w-md flex-col gap-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  maxLength={30}
                  minLength={3}
                  onChange={(event) => setUsername(event.target.value)}
                  pattern="[a-zA-Z0-9_]{3,30}"
                  required
                  value={username}
                />
                <p className="text-muted-foreground text-xs">
                  3–30 characters: letters, numbers, underscore.
                </p>
              </div>

              <label className="flex items-start gap-3">
                <Checkbox
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked === true)}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    Private account
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    People must request to follow you before they can see your
                    workouts.
                  </span>
                </span>
              </label>

              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}

              <Button disabled={update.isPending} type="submit">
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
