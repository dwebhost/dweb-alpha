"use client";

import {usePathname} from "next/navigation";
import {useAccount} from "wagmi";
import NotConnected from "@/components/not-connected";

export default function DashboardLayout({
                                          children,
                                          ensdomains,
                                          deployments,
                                        }: {
  children: React.ReactNode,
  ensdomains: React.ReactNode,
  deployments: React.ReactNode,
}) {
  const {address, isConnected} = useAccount();
  const pathname = usePathname();

  if (!isConnected || !address) {
    return <NotConnected/>;
  }

  // Exclude layout for dynamic project pages (/[projectId])
  if (pathname.match(/^\/[^\/]+$/)) {
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