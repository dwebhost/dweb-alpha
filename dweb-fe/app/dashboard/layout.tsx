"use client";

import {usePathname} from "next/navigation";

export default function DashboardLayout({
                                          children,
                                          ensdomains,
                                          deployments,
                                        }: {
  children: React.ReactNode,
  ensdomains: React.ReactNode,
  deployments: React.ReactNode,
}) {
  const pathname = usePathname();

  // Exclude layout for dynamic project pages (/dashboard/[projectId])
  if (pathname.match(/^\/dashboard\/[^\/]+$/)) {
    return (
      <div className="flex flex-col">
        <div className="flex justify-center">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-end">
        {children}
      </div>
      <div className="flex flex-row">
        <div className="w-1/3">
          {ensdomains}
        </div>
        <div className="w-2/3">
          {deployments}
        </div>
      </div>
    </div>
  );

}