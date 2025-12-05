// Admin Stats Type
export interface AdminStats {
  totalTrees: number;
  totalIndividuals: number;
  totalCompanies: number;
  totalWellWishers: number;
  totalRevenue: number;
}

// Admin Dashboard Stats API Function
export async function fetchAdminStats(): Promise<AdminStats> {
  const [treesRes, individualsRes, companiesRes, wellWishersRes, ordersRes] = await Promise.all([
    fetch('/api/admin/trees', { cache: 'no-store' }),
    fetch('/api/admin/users?type=individual', { cache: 'no-store' }),
    fetch('/api/admin/users?type=company', { cache: 'no-store' }),
    fetch('/api/admin/wellwishers', { cache: 'no-store' }),
    fetch('/api/admin/adoptions/all?metricsOnly=true', { cache: 'no-store' }),
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

// Trees API Function
export async function fetchTrees(): Promise<Tree[]> {
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

// Individual Users API Function
export async function fetchIndividualUsers(): Promise<IndividualUser[]> {
  const response = await fetch('/api/admin/users?type=individual', {
    cache: 'no-store', // Always fetch fresh data from server
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  const users: IndividualUser[] = data.data || [];
  return users;
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

// Company Users API Function
export async function fetchCompanyUsers(): Promise<CompanyUser[]> {
  const response = await fetch('/api/admin/users?type=company', {
    cache: 'no-store', // Always fetch fresh data from server
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  const users: CompanyUser[] = data.data || [];
  return users;
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

// Well-Wishers API Function
export async function fetchWellWishers(): Promise<WellWisher[]> {
  const response = await fetch('/api/admin/wellwishers', {
    cache: 'no-store', // Always fetch fresh data from server
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  const wellWishers: WellWisher[] = data.data || [];
  return wellWishers;
}
