import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";
import { cn } from "@/shared/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center overflow-hidden rounded-[18.8%] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON} alt="" className="h-full w-full" aria-hidden />
          </span>
          <p className="text-sm font-medium text-muted-foreground">{APP_NAME}</p>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Build muscle. Log every rep.
        </h1>
        <p className="max-w-xl text-muted-foreground">{APP_DESCRIPTION}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className={cn(buttonVariants())} href="/sign-in">
          Sign in
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "outline" }))}
          href="/sign-up"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
