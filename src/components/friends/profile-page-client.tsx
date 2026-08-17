"use client";

import { IconLock } from "@/components/ui/icons";
import { useState } from "react";
import { useParams } from "next/navigation";

import { AchievementTile } from "@/components/achievements/achievement-tile";
import {
  ProfileInsightsGrid,
  ProfileInsightsSkeleton,
} from "@/components/friends/profile-insights";
import { UserListRow } from "@/components/friends/user-list-row";
import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WorkoutFeedCard,
  WorkoutFeedSkeleton,
  personInitials,
} from "@/components/workouts/workout-feed-card";
import { useProfileAchievements } from "@/features/achievements/hooks";
import {
  useFollowUser,
  useFollowers,
  useFollowing,
  useProfileInsights,
  useProfileWorkouts,
  useSocialProfile,
  useUnfollowUser,
} from "@/features/social/hooks";

export function ProfilePageClient() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const [tab, setTab] = useState("workouts");
  const profileQuery = useSocialProfile(username);
  const profile = profileQuery.data;
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const canViewWorkouts = Boolean(profile?.canViewWorkouts);
  const workoutsQuery = useProfileWorkouts(username, canViewWorkouts);
  const insightsQuery = useProfileInsights(username, canViewWorkouts);
  const achievementsQuery = useProfileAchievements(username, canViewWorkouts);
  const followersQuery = useFollowers(username);
  const followingQuery = useFollowing(username);

  const busy = follow.isPending || unfollow.isPending;

  return (
    <AppShellScroll>
      <AppShellHeader
        actions={
          profile && profile.relationship !== "self" ? (
            <FollowButton
              busy={busy}
              onFollow={() => follow.mutate(profile.username)}
              onUnfollow={() => unfollow.mutate(profile.username)}
              relationship={profile.relationship}
            />
          ) : null
        }
        backHref="/friends"
        title={username ? `@${username}` : "Profile"}
      />
      <AppShellBody>
        <div className="flex flex-col gap-6 px-4 py-4 md:p-6">
          {profileQuery.isLoading ? (
            <AppShellLoading />
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
                <Avatar className="size-16" size="lg">
                  {profile.image ? (
                    <AvatarImage alt="" src={profile.image} />
                  ) : null}
                  <AvatarFallback>{personInitials(profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-tight tracking-tight">
                    {profile.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    @{profile.username}
                  </p>
                </div>
              </div>

              {canViewWorkouts ? (
                insightsQuery.isLoading ? (
                  <ProfileInsightsSkeleton />
                ) : insightsQuery.data ? (
                  <ProfileInsightsGrid
                    insights={insightsQuery.data}
                    onOpenAchievements={() => setTab("achievements")}
                  />
                ) : null
              ) : null}

              <Tabs onValueChange={setTab} value={tab}>
                <TabsList
                  className="w-full min-w-0 justify-start overflow-x-auto overscroll-x-contain scrollbar-none"
                  variant="line"
                >
                  <TabsTrigger className="flex-none" value="workouts">
                    Workouts
                  </TabsTrigger>
                  <TabsTrigger className="flex-none" value="achievements">
                    Achievements
                  </TabsTrigger>
                  <TabsTrigger className="flex-none" value="followers">
                    Followers
                  </TabsTrigger>
                  <TabsTrigger className="flex-none" value="following">
                    Following
                  </TabsTrigger>
                </TabsList>

                <TabsContent className="mt-4" value="workouts">
                  {!canViewWorkouts ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
                      <IconLock className="size-6" />
                      <p className="text-sm font-medium text-foreground">
                        This account is private
                      </p>
                      <p className="max-w-xs text-sm">
                        Follow to see {profile.name}&apos;s workouts.
                      </p>
                    </div>
                  ) : workoutsQuery.isLoading ? (
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      {Array.from({ length: 4 }, (_, index) => (
                        <li key={index}>
                          <WorkoutFeedSkeleton className="w-full" index={index} />
                        </li>
                      ))}
                    </ul>
                  ) : (workoutsQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No workouts yet.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      {workoutsQuery.data?.items.map((workout) => (
                        <li key={workout.id}>
                          <WorkoutFeedCard
                            className="w-full"
                            owner={profile}
                            workout={workout}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent className="mt-4" value="achievements">
                  {!canViewWorkouts ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
                      <IconLock className="size-6" />
                      <p className="text-sm font-medium text-foreground">
                        This account is private
                      </p>
                      <p className="max-w-xs text-sm">
                        Follow to see {profile.name}&apos;s achievements.
                      </p>
                    </div>
                  ) : achievementsQuery.isLoading ? (
                    <AppShellLoading className="min-h-0 py-10" />
                  ) : achievementsQuery.isError ? (
                    <p className="text-muted-foreground text-sm">
                      Couldn’t load achievements.
                    </p>
                  ) : (achievementsQuery.data?.unlockedCount ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No achievements unlocked yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-sm">
                        {achievementsQuery.data?.gamerscore}G ·{" "}
                        {achievementsQuery.data?.unlockedCount} unlocked
                      </p>
                      {achievementsQuery.data?.items
                        .filter((item) => item.unlocked)
                        .sort(
                          (a, b) =>
                            new Date(b.unlockedAt as Date | string).getTime() -
                            new Date(a.unlockedAt as Date | string).getTime(),
                        )
                        .map((item) => (
                          <AchievementTile
                            item={item}
                            key={`${item.id}:${item.workoutId ?? ""}`}
                          />
                        ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent className="mt-4" value="followers">
                  {followersQuery.isLoading ? (
                    <AppShellLoading className="min-h-0 py-10" />
                  ) : (followersQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No followers yet.
                    </p>
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
                    <AppShellLoading className="min-h-0 py-10" />
                  ) : (followingQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      Not following anyone yet.
                    </p>
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
