"use client";

import { IconChevronRight, IconLoader2, IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { UserListRow } from "@/components/friends/user-list-row";
import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFollowUser,
  useFollowers,
  useFollowing,
  useProfileWorkouts,
  useSocialProfile,
  useUnfollowUser,
} from "@/features/social/hooks";
import { cn } from "@/shared/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfilePageClient() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const profileQuery = useSocialProfile(username);
  const profile = profileQuery.data;
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const workoutsQuery = useProfileWorkouts(
    username,
    Boolean(profile?.canViewWorkouts),
  );
  const followersQuery = useFollowers(username);
  const followingQuery = useFollowing(username);

  const busy = follow.isPending || unfollow.isPending;

  return (
    <AppShellScroll>
      <AppShellHeader backHref="/friends" title={username ? `@${username}` : "Profile"} />
      <AppShellBody>
        <div className="flex flex-col gap-6 px-4 py-4 md:p-6">
          {profileQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <IconLoader2 className="size-4 animate-spin" />
              Loading profile…
            </div>
          ) : null}

          {profileQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Failed to load profile"}
            </p>
          ) : null}

          {profile ? (
            <>
              <div className="flex items-start gap-4">
                <Avatar size="lg">
                  {profile.image ? (
                    <AvatarImage alt="" src={profile.image} />
                  ) : null}
                  <AvatarFallback>{initials(profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-lg font-semibold leading-tight">
                      {profile.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      @{profile.username}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="font-semibold">
                        {profile.followersCount}
                      </span>{" "}
                      followers
                    </span>
                    <span>
                      <span className="font-semibold">
                        {profile.followingCount}
                      </span>{" "}
                      following
                    </span>
                  </div>
                  {profile.relationship !== "self" ? (
                    <FollowButton
                      busy={busy}
                      onFollow={() => follow.mutate(profile.username)}
                      onUnfollow={() => unfollow.mutate(profile.username)}
                      relationship={profile.relationship}
                    />
                  ) : null}
                </div>
              </div>

              <Tabs defaultValue="workouts">
                <TabsList className="w-full" variant="line">
                  <TabsTrigger value="workouts">Workouts</TabsTrigger>
                  <TabsTrigger value="followers">Followers</TabsTrigger>
                  <TabsTrigger value="following">Following</TabsTrigger>
                </TabsList>

                <TabsContent className="mt-4" value="workouts">
                  {!profile.canViewWorkouts ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
                      <IconLock className="size-6" />
                      <p className="font-medium text-foreground">
                        This account is private
                      </p>
                      <p>Follow to see their workouts.</p>
                    </div>
                  ) : workoutsQuery.isLoading ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <IconLoader2 className="size-4 animate-spin" />
                      Loading workouts…
                    </div>
                  ) : (workoutsQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No workouts yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col">
                      {workoutsQuery.data?.items.map((workout) => (
                        <li key={workout.id}>
                          <Link
                            className={cn(
                              "hover:bg-muted/50 flex items-center gap-3 px-1 py-3 transition-colors md:rounded-xl",
                            )}
                            href={`/workouts/${workout.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-snug">
                                {workout.name}
                              </p>
                            </div>
                            <IconChevronRight className="text-muted-foreground size-4 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent className="mt-4" value="followers">
                  {followersQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : (
                    <ul className="flex flex-col">
                      {followersQuery.data?.items.map((user) => (
                        <li key={user.id}>
                          <UserListRow className="px-0" user={user} />
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent className="mt-4" value="following">
                  {followingQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : (
                    <ul className="flex flex-col">
                      {followingQuery.data?.items.map((user) => (
                        <li key={user.id}>
                          <UserListRow className="px-0" user={user} />
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}

function FollowButton({
  relationship,
  busy,
  onFollow,
  onUnfollow,
}: {
  relationship: "none" | "following" | "requested";
  busy: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  if (relationship === "following") {
    return (
      <Button disabled={busy} onClick={onUnfollow} size="sm" variant="outline">
        Following
      </Button>
    );
  }
  if (relationship === "requested") {
    return (
      <Button disabled={busy} onClick={onUnfollow} size="sm" variant="outline">
        Requested
      </Button>
    );
  }
  return (
    <Button disabled={busy} onClick={onFollow} size="sm">
      Follow
    </Button>
  );
}
