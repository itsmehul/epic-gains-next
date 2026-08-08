"use client";

import { AppShellHeader } from "@/components/layout/app-shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkoutsPage() {
  return (
    <>
      <AppShellHeader title="Workouts" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Workouts</CardTitle>
            <CardDescription>
              Plan and track your training sessions here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
