'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Tree } from './useAdminData';

// Trees Mutations
export function useTreeMutations() {
  const queryClient = useQueryClient();

  const createTree = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/admin/trees?t=${Date.now()}`, {
        method: 'POST',
        body: formData,
      });
      
      // Clone response to read it multiple times if needed
      const responseClone = response.clone();
      
      // Try to parse as JSON first
      let data;
      try {
        data = await response.json();
      } catch (_jsonError) {
        // If JSON parsing fails, get text response for error message
        const textResponse = await responseClone.text();
        const errorMessage = textResponse.length > 0 
          ? `Server error: ${textResponse.substring(0, 200)}`
          : `Failed to parse server response (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tree');
      }
      return data.data as Tree;
    },
    onMutate: async (formData) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['admin', 'trees'] });
      // Save previous state for rollback
      const previousTrees = queryClient.getQueryData<Tree[]>(['admin', 'trees']);
      
      // INSTANT OPTIMISTIC UPDATE: Create temporary tree in cache immediately
      const tempId = `temp-${Date.now()}`;
      const name = formData.get('name') as string;
      const priceStr = formData.get('price') as string;
      const info = formData.get('info') as string;
      const oxygenKgsStr = formData.get('oxygenKgs') as string;
      
      const optimisticTree: Tree = {
        _id: tempId,
        name: name || 'New Tree',
        price: parseFloat(priceStr) || 0,
        info: info || '',
        oxygenKgs: parseFloat(oxygenKgsStr) || 0,
        imageUrl: '/placeholder-tree.jpg',
        createdAt: new Date().toISOString(),
      };
      
      // Add optimistic tree to cache immediately - UI updates instantly!
      queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) => [optimisticTree, ...old]);
      
      return { previousTrees, tempId };
    },
    onSuccess: (newTree, _variables, context) => {
      // INSTANT UPDATE: Replace optimistic tree with real data from server
      queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) => {
        // Remove optimistic tree and add real one
        const filtered = old.filter((tree) => tree._id !== context?.tempId);
        return [newTree, ...filtered];
      });
      // NO INVALIDATION - data is already updated, no need to refetch
      toast.success('Tree created successfully!');
    },
    onError: (error, _variables, context) => {
      // Rollback on error - remove optimistic tree
      if (context?.previousTrees) {
        queryClient.setQueryData(['admin', 'trees'], context.previousTrees);
      } else {
        // Fallback: remove optimistic tree if no previous state
        queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) =>
          old.filter((tree) => tree._id !== context?.tempId)
        );
      }
      toast.error(error.message || 'Failed to create tree');
    },
  });

  const updateTree = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const response = await fetch(`/api/admin/trees/${id}?t=${Date.now()}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update tree');
      }
      return data.data as Tree;
    },
    onMutate: async ({ id, formData }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'trees'] });
      const previousTrees = queryClient.getQueryData<Tree[]>(['admin', 'trees']);
      
      // INSTANT OPTIMISTIC UPDATE: Update cache immediately with form data
      const name = formData.get('name') as string;
      const priceStr = formData.get('price') as string;
      const info = formData.get('info') as string;
      const oxygenKgsStr = formData.get('oxygenKgs') as string;
      
      queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) =>
        old.map((tree) => {
          if (tree._id === id) {
            // Return optimistic update with form data - UI updates instantly!
            return {
              ...tree,
              name: name || tree.name,
              price: parseFloat(priceStr) || tree.price,
              info: info || tree.info,
              oxygenKgs: parseFloat(oxygenKgsStr) || tree.oxygenKgs,
            } as Tree;
          }
          return tree;
        })
      );
      
      return { previousTrees };
    },
    onSuccess: (updatedTree) => {
      // INSTANT UPDATE: Replace optimistic update with real data from server
      queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) =>
        old.map((tree) => (tree._id === updatedTree._id ? updatedTree : tree))
      );
      // NO INVALIDATION - data is already updated, no need to refetch
      toast.success('Tree updated successfully!');
    },
    onError: (error, variables, context) => {
      if (context?.previousTrees) {
        queryClient.setQueryData(['admin', 'trees'], context.previousTrees);
      }
      toast.error(error.message || 'Failed to update tree');
    },
  });

  const deleteTree = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/trees/${id}?t=${Date.now()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete tree');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'trees'] });
      const previousTrees = queryClient.getQueryData<Tree[]>(['admin', 'trees']);
      // INSTANT UPDATE: Optimistically remove from cache immediately
      queryClient.setQueryData<Tree[]>(['admin', 'trees'], (old = []) =>
        old.filter((tree) => tree._id !== id)
      );
      return { previousTrees };
    },
    onSuccess: () => {
      // NO INVALIDATION - data already removed optimistically, no need to refetch
      toast.success('Tree deleted successfully!');
    },
    onError: (error, id, context) => {
      if (context?.previousTrees) {
        queryClient.setQueryData(['admin', 'trees'], context.previousTrees);
      }
      toast.error(error.message || 'Failed to delete tree');
    },
  });

  return { createTree, updateTree, deleteTree };
}

// Coupons Mutations
interface Coupon {
  _id: string;
  code: string;
  category: 'individual' | 'company';
  discountPercentage: number;
  usageLimitType: 'unlimited' | 'custom';
  totalUsageLimit?: number;
  perUserUsageLimit: number;
  usedCount: number;
  isActive: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCouponMutations() {
  const queryClient = useQueryClient();

  const createCoupon = useMutation({
    mutationFn: async (payload: Partial<Coupon>) => {
      const response = await fetch(`/api/admin/coupons?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || 'Failed to create coupon';
        throw new Error(errorMessage);
      }
      return data.data as Coupon;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'coupons'] });
    },
    onSuccess: (newCoupon) => {
      queryClient.setQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons'], (old) => {
        if (!old || !old.data) {
          return { success: true, data: [newCoupon] };
        }
        return { ...old, data: [newCoupon, ...old.data] };
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Coupon created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create coupon');
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Coupon> }) => {
      const response = await fetch(`/api/admin/coupons/${id}?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || 'Failed to update coupon';
        throw new Error(errorMessage);
      }
      return data.data as Coupon;
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'coupons'] });
      const previousCoupons = queryClient.getQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons']);
      // Optimistically update - explicitly preserve all fields including isHidden
      queryClient.setQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons'], (old) => {
        if (!old || !old.data) {
          return old || { success: true, data: [] };
        }
        return {
          ...old,
          data: old.data.map((coupon) => {
            if (coupon._id === id) {
              // Explicitly merge payload to ensure isHidden is included
              const updated = { ...coupon, ...payload, updatedAt: new Date().toISOString() };
              // Ensure isHidden is explicitly set if provided in payload
              if ('isHidden' in payload) {
                updated.isHidden = payload.isHidden;
              }
              return updated;
            }
            return coupon;
          })
        };
      });
      return { previousCoupons };
    },
    onSuccess: (updatedCoupon) => {
      // Update cache with server response - this ensures isHidden is properly set
      queryClient.setQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons'], (old) => {
        if (!old || !old.data) {
          return old || { success: true, data: [] };
        }
        return {
          ...old,
          data: old.data.map((coupon) => {
            if (coupon._id === updatedCoupon._id) {
              // Ensure all fields including isHidden are properly merged
              return { ...coupon, ...updatedCoupon };
            }
            return coupon;
          })
        };
      });
      // Don't invalidate - we've already updated the cache manually
      toast.success('Coupon updated successfully!');
    },
    onError: (error, variables, context) => {
      if (context?.previousCoupons) {
        queryClient.setQueryData(['admin', 'coupons'], context.previousCoupons);
      }
      toast.error(error.message || 'Failed to update coupon');
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/coupons/${id}?t=${Date.now()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete coupon');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'coupons'] });
      const previousCoupons = queryClient.getQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons']);
      queryClient.setQueryData<{ success: boolean; data: Coupon[] }>(['admin', 'coupons'], (old) => {
        if (!old || !old.data) {
          return old || { success: true, data: [] };
        }
        return {
          ...old,
          data: old.data.filter((coupon) => coupon._id !== id)
        };
      });
      return { previousCoupons };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Coupon deleted successfully!');
    },
    onError: (error, id, context) => {
      if (context?.previousCoupons) {
        queryClient.setQueryData(['admin', 'coupons'], context.previousCoupons);
      }
      toast.error(error.message || 'Failed to delete coupon');
    },
  });

  return { createCoupon, updateCoupon, deleteCoupon };
}

// Users Mutations
interface User {
  _id: string;
  name?: string;
  companyName?: string;
  email: string;
  phone?: string;
  userType: 'individual' | 'company';
  createdAt: string;
}

export function useUserMutations(userType: 'individual' | 'company') {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'users', userType];

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}?t=${Date.now()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousUsers = queryClient.getQueryData<User[]>(queryKey);
      queryClient.setQueryData<User[]>(queryKey, (old = []) => old.filter((user) => user._id !== id));
      return { previousUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('User deleted successfully!');
    },
    onError: (error, id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKey, context.previousUsers);
      }
      toast.error(error.message || 'Failed to delete user');
    },
  });

  return { deleteUser };
}

// WellWishers Mutations
interface WellWisher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  upcomingTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  updatingTasks: number;
}

export function useWellWisherMutations() {
  const queryClient = useQueryClient();

  const createWellWisher = useMutation({
    mutationFn: async (payload: Partial<WellWisher>) => {
      const response = await fetch(`/api/admin/wellwishers?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || 'Failed to create well-wisher';
        throw new Error(errorMessage);
      }
      return data.data as WellWisher;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'wellwishers'] });
    },
    onSuccess: (newWellWisher) => {
      queryClient.setQueryData<WellWisher[]>(['admin', 'wellwishers'], (old = []) => [
        newWellWisher,
        ...old,
      ]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'wellwishers'] });
      toast.success('Well-wisher created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create well-wisher');
    },
  });

  const updateWellWisher = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<WellWisher> }) => {
      const response = await fetch(`/api/admin/wellwishers/${id}?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || 'Failed to update well-wisher';
        throw new Error(errorMessage);
      }
      return data.data as WellWisher;
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'wellwishers'] });
      const previousWellWishers = queryClient.getQueryData<WellWisher[]>(['admin', 'wellwishers']);
      queryClient.setQueryData<WellWisher[]>(['admin', 'wellwishers'], (old = []) =>
        old.map((w) => (w._id === id ? { ...w, ...payload } : w))
      );
      return { previousWellWishers };
    },
    onSuccess: (updatedWellWisher) => {
      queryClient.setQueryData<WellWisher[]>(['admin', 'wellwishers'], (old = []) =>
        old.map((w) => (w._id === updatedWellWisher._id ? updatedWellWisher : w))
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'wellwishers'] });
      toast.success('Well-wisher updated successfully!');
    },
    onError: (error, variables, context) => {
      if (context?.previousWellWishers) {
        queryClient.setQueryData(['admin', 'wellwishers'], context.previousWellWishers);
      }
      toast.error(error.message || 'Failed to update well-wisher');
    },
  });

  const deleteWellWisher = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/wellwishers/${id}?t=${Date.now()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete well-wisher');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'wellwishers'] });
      const previousWellWishers = queryClient.getQueryData<WellWisher[]>(['admin', 'wellwishers']);
      queryClient.setQueryData<WellWisher[]>(['admin', 'wellwishers'], (old = []) =>
        old.filter((w) => w._id !== id)
      );
      return { previousWellWishers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wellwishers'] });
      toast.success('Well-wisher deleted successfully!');
    },
    onError: (error, id, context) => {
      if (context?.previousWellWishers) {
        queryClient.setQueryData(['admin', 'wellwishers'], context.previousWellWishers);
      }
      toast.error(error.message || 'Failed to delete well-wisher');
    },
  });

  return { createWellWisher, updateWellWisher, deleteWellWisher };
}

// Adoptions Mutations
interface Adoption {
  _id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  adminNotes?: string;
  createdAt: string;
}

export function useAdoptionMutations() {
  const queryClient = useQueryClient();

  const updateAdoption = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/admin/adoptions?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, notes }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update adoption');
      }
      return data.data as Adoption;
    },
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-adoptions-all'] });
      const previousData = queryClient.getQueryData<{ success: boolean; data: Adoption[] }>([
        'admin-adoptions-all',
      ]);
      // Optimistically update status in cache
      if (previousData?.data) {
        queryClient.setQueryData<{ success: boolean; data: Adoption[] }>(['admin-adoptions-all'], {
          ...previousData,
          data: previousData.data.map((adoption) =>
            adoption.orderId === orderId ? { ...adoption, status: status as Adoption['status'] } : adoption
          ),
        });
      }
      return { previousData };
    },
    onSuccess: (updatedAdoption) => {
      queryClient.setQueryData<{ success: boolean; data: Adoption[] }>(['admin-adoptions-all'], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((adoption) =>
            adoption._id === updatedAdoption._id ? updatedAdoption : adoption
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['admin-adoptions-all'] });
      toast.success('Adoption status updated successfully!');
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['admin-adoptions-all'], context.previousData);
      }
      toast.error(error.message || 'Failed to update adoption');
    },
  });

  const deleteAdoption = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/adoptions/${id}?t=${Date.now()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete adoption');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-adoptions-all'] });
      const previousData = queryClient.getQueryData<{ success: boolean; data: Adoption[] }>([
        'admin-adoptions-all',
      ]);
      // Optimistically remove from cache
      if (previousData?.data) {
        queryClient.setQueryData<{ success: boolean; data: Adoption[] }>(['admin-adoptions-all'], {
          ...previousData,
          data: previousData.data.filter((adoption) => adoption._id !== id),
        });
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-adoptions-all'] });
      toast.success('Adoption deleted successfully!');
    },
    onError: (error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['admin-adoptions-all'], context.previousData);
      }
      toast.error(error.message || 'Failed to delete adoption');
    },
  });

  return { updateAdoption, deleteAdoption };
}

