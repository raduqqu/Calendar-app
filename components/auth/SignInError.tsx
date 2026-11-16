const messages: Record<string, string> = {
  denied:
    "Sign-in was cancelled. Ply needs read-only calendar access to work, so please try again and allow it.",
  nocode: "Sign-in did not finish. Please try again.",
  exchange: "Sign-in could not be completed. Please try again.",
  start: "Sign-in could not be started. Please try again in a moment.",
};

/** Explains a failed sign-in, based on ?error=… in the address bar. */
export async function SignInError({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;

  return (
    <p
      role="alert"
      className="text-meta rounded-button border-danger/30 text-danger mb-4 border bg-red-50 px-3 py-2 text-left"
    >
      {messages[error] ?? "Something went wrong. Please try again."}
    </p>
  );
}
