import { useQuery } from '@tanstack/react-query';

// Admin Dashboard Stats Hook
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [treesRes, individualsRes, companiesRes, wellWishersRes, ordersRes] = await Promise.all([
        fetch('/api/admin/trees', { cache: 'no-store' }),
        fetch('/api/admin/users?type=individual', { cache: 'no-store' }),
        fetch('/api/admin/users?type=company', { cache: 'no-store' }),
        fetch('/api/admin/wellwishers', { cache: 'no-store' }),
        fetch('/api/admin/adoptions/all', { cache: 'no-store' }),
      ]);

      const [treesData, individualsData, companiesData, wellWishersData, ordersData] = await Promise.all([
        treesRes.json(),
        individualsRes.json(),
        companiesRes.json(),
        wellWishersRes.json(),
        ordersRes.json(),
      ]);

      // Calculate total revenue from all orders
      const totalRevenue = ordersData.success && ordersData.metrics 
        ? ordersData.metrics.totalRevenue || 0
        : 0;

      return {
        totalTrees: treesData.success ? treesData.data.length : 0,
        totalIndividuals: individualsData.success ? individualsData.data.length : 0,
        totalCompanies: companiesData.success ? companiesData.data.length : 0,
        totalWellWishers: wellWishersData.success ? wellWishersData.data.length : 0,
        totalRevenue,
      };
    },
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No cache - remove immediately when unused
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    cacheTime: 0, // Legacy prop for older React Query versions - no cache
  });
}

// Trees Hook
export function useTrees() {
  return useQuery({
    queryKey: ['admin', 'trees'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/trees', {
          cache: 'no-store', // Always fetch fresh data from server
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch trees: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to fetch trees');
        }
        return data.data || [];
      } catch (error) {
        // Log error for debugging
        console.error('Error fetching trees:', error);
        throw error;
      }
    },
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No cache - remove immediately when unused
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    cacheTime: 0, // Legacy prop for older React Query versions - no cache
    retry: 2, // Retry failed requests 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });
}

// Individual Users Hook
export function useIndividualUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'individuals'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?type=individual', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No cache - remove immediately when unused
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    cacheTime: 0, // Legacy prop for older React Query versions - no cache
  });
}

// Company Users Hook
export function useCompanyUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'companies'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?type=company', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No cache - remove immediately when unused
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    cacheTime: 0, // Legacy prop for older React Query versions - no cache
  });
}

// Well-Wishers Hook with real-time updates
export function useWellWishers() {
  return useQuery({
    queryKey: ['admin', 'wellwishers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/wellwishers', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No cache - remove immediately when unused
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    cacheTime: 0, // Legacy prop for older React Query versions - no cache
  });
}
