import type { Metadata } from "next";
import { InboxList } from "@/components/inbox/InboxList";
import { PageHeader, SampleNote } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox" />
      <SampleNote>
        Sample data. The Debrief and Skip buttons switch on in steps 3 and 5.
      </SampleNote>
      <InboxList />
    </>
  );
}
