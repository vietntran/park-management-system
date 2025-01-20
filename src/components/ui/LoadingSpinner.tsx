// src/components/ui/LoadingSpinner.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );
}
