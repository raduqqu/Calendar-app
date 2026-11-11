import { redirect } from "next/navigation";

/**
 * The landing screen with "Continue with Google" arrives in milestone 2.
 * Until then the home address goes straight to Today.
 */
export default function Home() {
  redirect("/today");
}
