'use client';

import { useStats } from '@/hooks/useStats';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Stats() {
  const { data, error, isLoading } = useStats();

  const items = [
    { label: 'Total ENS', value: data?.numENS },
    { label: 'Total Website', value: data?.numContentHash },
    { label: 'Pinned Files', value: data?.numPinned },
    { label: 'Storage Used', value: data?.storageUsed },
  ];

  if (error) {
    return (
      <div className="text-red-500 bg-red-50 p-4 rounded-lg shadow">
        Failed to load stats from pinning service.
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center bg-background md:py-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-5xl px-4">
        {items.map((item) => (
          <Card
            key={item.label}
            className="rounded-3xl bg-gray-900 border border-gray-700 shadow-md h-48 flex items-center justify-center"
          >
            <CardContent className="text-center space-y-2">
              <p className="text-base font-medium text-muted-foreground">{item.label}</p>
              {!isLoading && item.value !== undefined ? (
                <p className="text-4xl font-extrabold text-white">{item.value}</p>
              ) : (
                <Skeleton className="h-10 w-32 mx-auto" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}