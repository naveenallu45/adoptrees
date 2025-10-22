import { useQuery } from '@tanstack/react-query';

// Admin Dashboard Stats Hook
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [treesRes, individualsRes, companiesRes, wellWishersRes] = await Promise.all([
        fetch('/api/admin/trees'),
        fetch('/api/admin/users?type=individual'),
        fetch('/api/admin/users?type=company'),
        fetch('/api/admin/wellwishers'),
      ]);

      const [treesData, individualsData, companiesData, wellWishersData] = await Promise.all([
        treesRes.json(),
        individualsRes.json(),
        companiesRes.json(),
        wellWishersRes.json(),
      ]);

      return {
        totalTrees: treesData.success ? treesData.data.length : 0,
        totalIndividuals: individualsData.success ? individualsData.data.length : 0,
        totalCompanies: companiesData.success ? companiesData.data.length : 0,
        totalWellWishers: wellWishersData.success ? wellWishersData.data.length : 0,
        totalRevenue: 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Trees Hook
export function useTrees() {
  return useQuery({
    queryKey: ['admin', 'trees'],
    queryFn: async () => {
      const response = await fetch('/api/admin/trees');
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Individual Users Hook
export function useIndividualUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'individuals'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?type=individual');
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Company Users Hook
export function useCompanyUsers() {
  return useQuery({
    queryKey: ['admin', 'users', 'companies'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?type=company');
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Well-Wishers Hook
export function useWellWishers() {
  return useQuery({
    queryKey: ['admin', 'wellwishers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/wellwishers');
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
