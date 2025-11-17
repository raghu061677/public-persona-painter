import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { PerformanceTracker } from '@/lib/performance';

/**
 * Optimized query hook with performance tracking and smart caching
 */
export function useOptimizedQuery<TData, TError = Error>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceTag?: string;
  }
) {
  const { performanceTag, ...queryOptions } = options || {};

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      const tag = performanceTag || queryKey.join('-');
      PerformanceTracker.mark(`query-${tag}-start`);
      
      try {
        const result = await queryFn();
        PerformanceTracker.measure(`query-${tag}`, `query-${tag}-start`);
        return result;
      } finally {
        PerformanceTracker.clearMark(`query-${tag}-start`);
      }
    },
    // Smart caching defaults
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
}

/**
 * Optimized mutation hook with performance tracking
 */
export function useOptimizedMutation<TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  performanceTag?: string
) {
  return async (variables: TVariables) => {
    const tag = performanceTag || 'mutation';
    PerformanceTracker.mark(`mutation-${tag}-start`);
    
    try {
      const result = await mutationFn(variables);
      PerformanceTracker.measure(`mutation-${tag}`, `mutation-${tag}-start`);
      return result;
    } finally {
      PerformanceTracker.clearMark(`mutation-${tag}-start`);
    }
  };
}
