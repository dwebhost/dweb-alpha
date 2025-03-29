'use client';

import ContentHashTable from "@/components/content-hashes-table";
import Stats from "@/components/stats";

export default function StatsPage() {

  return (
    <div className="w-full flex flex-col gap-4">
      <Stats/>
      <ContentHashTable/>
    </div>
  );
}