"use client";

import { IconSearch } from "@/components/ui/icons";
import { useState } from "react";

import { UserListRow } from "@/components/friends/user-list-row";
import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFollowRequests,
  useFollowers,
  useFollowing,
  useMeSocial,
  useRespondFollowRequest,
  useSearchUsers,
} from "@/features/social/hooks";

export function FriendsPageClient() {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const meQuery = useMeSocial();
  const me = meQuery.data;
  const searchQuery = useSearchUsers(query);
  const followersQuery = useFollowers(me?.username ?? "");
  const followingQuery = useFollowing(me?.username ?? "");
  const requestsQuery = useFollowRequests();
  const respond = useRespondFollowRequest();

  const pendingCount = requestsQuery.data?.count ?? me?.pendingRequestCount ?? 0;

  return (
    <AppShellScroll>
      <AppShellHeader title="Friends" />
      <AppShellBody>
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:p-6">
          <Tabs onValueChange={setTab} value={tab}>
            <TabsList className="w-fit justify-start overflow-x-auto scrollbar-none">
              <TabsTrigger className="flex-none" value="search">
                Search
              </TabsTrigger>
              <TabsTrigger className="flex-none" value="followers">
                Followers
              </TabsTrigger>
              <TabsTrigger className="flex-none" value="following">
                Following
              </TabsTrigger>
              <TabsTrigger className="flex-none" value="requests">
                Requests
                {pendingCount > 0 ? (
                  <Badge className="ml-1" variant="secondary">
                    {pendingCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4" value="search">
              <div className="relative mb-3">
                <IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or username"
                  value={query}
                />
              </div>
              {query.trim().length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Find people to follow.
                </p>
              ) : searchQuery.isLoading ? (
                <LoadingRow />
              ) : searchQuery.isError ? (
                <ErrorText error={searchQuery.error} />
              ) : (searchQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">No users found.</p>
              ) : (
                <ul className="flex flex-col">
                  {searchQuery.data?.items.map((user) => (
                    <li key={user.id}>
                      <UserListRow user={user} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent className="mt-4" value="followers">
              {!me?.username || followersQuery.isLoading ? (
                <LoadingRow />
              ) : followersQuery.isError ? (
                <ErrorText error={followersQuery.error} />
              ) : (followersQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No followers yet.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {followersQuery.data?.items.map((user) => (
                    <li key={user.id}>
                      <UserListRow user={user} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent className="mt-4" value="following">
              {!me?.username || followingQuery.isLoading ? (
                <LoadingRow />
              ) : followingQuery.isError ? (
                <ErrorText error={followingQuery.error} />
              ) : (followingQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You are not following anyone yet.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {followingQuery.data?.items.map((user) => (
                    <li key={user.id}>
                      <UserListRow user={user} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent className="mt-4" value="requests">
              {requestsQuery.isLoading ? (
                <LoadingRow />
              ) : requestsQuery.isError ? (
                <ErrorText error={requestsQuery.error} />
              ) : (requestsQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No pending follow requests.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {requestsQuery.data?.items.map((request) => (
                    <li key={request.id}>
                      <UserListRow
                        trailing={
                          <div className="flex gap-2">
                            <Button
                              disabled={respond.isPending}
                              onClick={() =>
                                respond.mutate({
                                  id: request.id,
                                  action: "accept",
                                })
                              }
                              size="sm"
                            >
                              Accept
                            </Button>
                            <Button
                              disabled={respond.isPending}
                              onClick={() =>
                                respond.mutate({
                                  id: request.id,
                                  action: "reject",
                                })
                              }
                              size="sm"
                              variant="outline"
                            >
                              Reject
                            </Button>
                          </div>
                        }
                        user={request.requester}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}

function LoadingRow() {
  return <AppShellLoading className="min-h-0 py-10" />;
}

function ErrorText({ error }: { error: unknown }) {
  return (
    <p className="text-destructive text-sm" role="alert">
      {error instanceof Error ? error.message : "Something went wrong"}
    </p>
  );
}
