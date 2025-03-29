'use client';

import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useStats} from '@/hooks/useStats';

export default function Stats() {
  const {data, error, isLoading} = useStats();

  const items = [
    {label: 'Total ENS', value: data?.numENS},
    {label: 'Total Website', value: data?.numContentHash},
    {label: 'Pinned Files', value: data?.numPinned},
    {label: 'Storage Used', value: data?.storageUsed},
  ];

  if (error) {
    return (
      <div className="text-red-500 bg-red-50 p-4 rounded-lg shadow">
        Failed to load stats from pinning service.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="rounded-2xl shadow-sm border bg-white dark:bg-gray-900">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            {!isLoading && item.value !== undefined ? (
              <p className="text-xl font-bold text-center">{item.value}</p>
            ) : (
              <Skeleton className="h-6 w-24"/>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}