import type { Metadata } from "next";
import { PeopleList } from "@/components/people/PeopleList";
import { PageHeader, SampleNote } from "@/components/ui/PageHeader";
import { getDemoPeople } from "@/lib/demo/data";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader title="People" />
      <SampleNote>Invented people for now. Profiles open in step 4.</SampleNote>
      <PeopleList people={getDemoPeople()} />
    </>
  );
}
