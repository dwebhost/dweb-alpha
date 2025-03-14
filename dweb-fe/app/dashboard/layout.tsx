export default function DashboardLayout({
                                          children,
                                          ensdomains,
                                          deployments,
                                        }: {
  children: React.ReactNode,
  ensdomains: React.ReactNode,
  deployments: React.ReactNode,
}) {
  return (
    <div className="flex flex-col">
      <div className="flex justify-end">
        {children}
      </div>
      <div className="flex flex-row">
        <div className="w-1/3">
          {ensdomains}
        </div>
        <div className="w-1/3">
          {deployments}
        </div>
      </div>
    </div>
  );

}