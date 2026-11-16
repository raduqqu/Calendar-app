import { Suspense } from "react";
import { signInWithGoogle } from "@/app/auth/actions";
import { SignInError } from "@/components/auth/SignInError";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

/**
 * The landing screen for signed-out visitors.
 * Signed-in visitors never see it: proxy.ts sends them straight to Today.
 */
export default function LandingPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-6 py-12 text-center">
      <div className="flex flex-col items-center">
        <Logo size={64} />
        <h1 className="mt-4 text-[32px] leading-tight font-semibold tracking-tight">
          {APP_NAME.toLowerCase()}
        </h1>
        <p className="text-body text-ink-secondary mt-3 max-w-xs">
          {APP_TAGLINE}
        </p>
      </div>

      <div className="mt-10">
        <Suspense fallback={null}>
          <SignInError searchParams={searchParams} />
        </Suspense>
        <form action={signInWithGoogle}>
          <Button type="submit" fullWidth className="min-h-12">
            Continue with Google
          </Button>
        </form>
        <p className="text-meta text-ink-secondary mt-4">
          {APP_NAME} asks for read-only access to your calendar. It can never
          change or delete your events.
        </p>
      </div>
    </main>
  );
}
