import { useQuery } from '@tanstack/react-query';

// Admin Stats Type
export interface AdminStats {
  totalTrees: number;
  totalIndividuals: number;
  totalCompanies: number;
  totalWellWishers: number;
  totalRevenue: number;
}

// Admin Dashboard Stats Hook
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
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

      const result: AdminStats = {
        totalTrees: treesData.success ? treesData.data.length : 0,
        totalIndividuals: individualsData.success ? individualsData.data.length : 0,
        totalCompanies: companiesData.success ? companiesData.data.length : 0,
        totalWellWishers: wellWishersData.success ? wellWishersData.data.length : 0,
        totalRevenue,
      };
      
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    // No automatic refetch interval - only refetch on user actions
  });
}

// Tree Type
export interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  treeType?: string;
  packageQuantity?: number;
  packagePrice?: number;
  scientificSpecies?: string;
  speciesInfoAvailable?: boolean;
  co2?: number;
  foodSecurity?: number;
  economicDevelopment?: number;
  co2Absorption?: number;
  environmentalProtection?: number;
  localUses?: string[];
  smallImageUrls?: string[];
  createdAt: string;
}

// Trees Hook
export function useTrees() {
  return useQuery({
    queryKey: ['admin', 'trees'],
    queryFn: async (): Promise<Tree[]> => {
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
        const trees: Tree[] = data.data || [];
        return trees;
      } catch (error) {
        // Log error for debugging
        console.error('Error fetching trees:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    // No automatic refetch interval - only refetch on user actions
    retry: 2, // Retry failed requests 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });
}

// Individual User Type
export interface IndividualUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  role: string;
  userType: string;
}

// Individual Users Hook
export function useIndividualUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'individuals'],
    queryFn: async (): Promise<IndividualUser[]> => {
      const response = await fetch('/api/admin/users?type=individual', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      const users: IndividualUser[] = data.data || [];
      return users;
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    // No automatic refetch interval - only refetch on user actions
  });
}

// Company User Type
export interface CompanyUser {
  _id: string;
  companyName: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  createdAt: string;
  role: string;
  userType: string;
}

// Company Users Hook
export function useCompanyUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'companies'],
    queryFn: async (): Promise<CompanyUser[]> => {
      const response = await fetch('/api/admin/users?type=company', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      const users: CompanyUser[] = data.data || [];
      return users;
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    // No automatic refetch interval - only refetch on user actions
  });
}

// WellWisher Type
export interface WellWisher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  upcomingTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  updatingTasks: number;
  hasPassword?: boolean;
}

// Well-Wishers Hook with real-time updates
export function useWellWishers() {
  return useQuery({
    queryKey: ['admin', 'wellwishers'],
    queryFn: async (): Promise<WellWisher[]> => {
      const response = await fetch('/api/admin/wellwishers', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      const wellWishers: WellWisher[] = data.data || [];
      return wellWishers;
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    // No automatic refetch interval - only refetch on user actions
  });
}
