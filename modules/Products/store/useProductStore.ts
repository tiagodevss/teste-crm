import toast from 'react-hot-toast';
import { create } from 'zustand';
import { Product, ProductGroup, PaginationParams, PaginatedResponse, SortOrder } from '../../../types';
import { api } from '../../../lib/axios';
import { buildPaginationParams } from '../../../utils/apiParams';
import { getApiErrorMessage } from '../../../lib/api-error';

export interface ProductCounts {
  groups: Record<string, number>;
  subgroups: Record<string, number>;
}

interface ProductState {
  products: Product[];
  productsPagination: { page: number; limit: number; total: number; totalPages: number };
  productsSort: { sortBy?: string; sortOrder?: SortOrder };
  lastProductsParams: (PaginationParams & { groupId?: string; subgroupId?: string; search?: string }) | null;
  groups: ProductGroup[];
  productCounts: ProductCounts | null;
  isLoading: boolean;
  productsFetchError: string | null;
  groupsLoading: boolean;
  groupsFetchError: string | null;
  fetchProducts: (params?: PaginationParams & { groupId?: string; subgroupId?: string; search?: string }) => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchProductCounts: () => Promise<void>;
  createProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  createGroup: (group: Partial<ProductGroup>) => Promise<void>;
  updateGroup: (id: string, group: Partial<ProductGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  productsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  productsSort: { sortBy: 'id', sortOrder: SortOrder.DESC },
  lastProductsParams: null,
  groups: [],
  productCounts: null,
  isLoading: false,
  productsFetchError: null,
  groupsLoading: false,
  groupsFetchError: null,

  fetchProducts: async (params) => {
    set({ isLoading: true, productsFetchError: null });
    try {
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        sortBy: params?.sortBy ?? 'id',
        sortOrder: params?.sortOrder ?? SortOrder.DESC,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
      const search = new URLSearchParams(q);
      if (params?.groupId) search.set('groupId', params.groupId);
      if (params?.subgroupId) search.set('subgroupId', params.subgroupId);
      if (params?.search?.trim()) search.set('search', params.search.trim());
      const url = `/products?${search.toString()}`;
      const response = await api.get<PaginatedResponse<Product>>(url);
      const { data, page, limit, total, totalPages } = response.data;
      const lastParams = params
        ? {
            page,
            limit,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            groupId: params.groupId,
            subgroupId: params.subgroupId,
            search: params.search?.trim() || undefined,
          }
        : null;
      set({
        products: data,
        productsPagination: { page, limit, total, totalPages },
        productsSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
        lastProductsParams: lastParams,
        isLoading: false,
        productsFetchError: null,
      });
    } catch (error) {
      console.error('Error fetching products', error);
      set({
        isLoading: false,
        productsFetchError: getApiErrorMessage(error, 'Não foi possível carregar os produtos. Tente novamente.'),
      });
    }
  },

  fetchProductCounts: async () => {
    try {
      const response = await api.get<ProductCounts>('/products/counts');
      set({ productCounts: response.data });
    } catch (error) {
      set({ productCounts: null });
    }
  },

  fetchGroups: async () => {
    set({ groupsLoading: true, groupsFetchError: null });
    try {
      const response = await api.get('/product-groups');
      set({
        groups: response.data,
        groupsLoading: false,
        groupsFetchError: null,
      });
    } catch (error) {
      console.error('Error fetching groups', error);
      set({
        groupsLoading: false,
        groupsFetchError: getApiErrorMessage(
          error,
          'Não foi possível carregar os grupos. Tente novamente.',
        ),
      });
    }
  },

  createProduct: async (product) => {
    try {
      await api.post('/products', product);
      const state = get();
      const p = state.lastProductsParams;
      state.fetchProducts(p ?? {
        page: state.productsPagination.page,
        limit: state.productsPagination.limit,
        sortBy: state.productsSort.sortBy,
        sortOrder: state.productsSort.sortOrder,
        groupId: product.groupId,
        subgroupId: product.subgroupId,
      });
      state.fetchProductCounts();
    } catch (error) {
      console.error('Error creating product', error);
      toast.error('Erro ao criar produto. Tente novamente.');
      throw error;
    }
  },

  updateProduct: async (id, product) => {
    try {
      const state = get();
      const currentProduct = state.products.find((item) => item.id === id);
      const leadFormFields = product.leadFormFields?.map((field) => {
        const original = currentProduct?.leadFormFields?.find((item) => item.key === field.key);
        return original ? { ...original, ...field } : field;
      });
      const payload = leadFormFields ? { ...product, leadFormFields } : product;

      await api.put(`/products/${id}`, payload);
      const p = state.lastProductsParams;
      state.fetchProducts(p ?? {
        page: state.productsPagination.page,
        limit: state.productsPagination.limit,
        sortBy: state.productsSort.sortBy,
        sortOrder: state.productsSort.sortOrder,
        groupId: payload.groupId,
        subgroupId: payload.subgroupId,
      });
      state.fetchProductCounts();
    } catch (error) {
      console.error('Error updating product', error);
      toast.error('Erro ao atualizar produto. Tente novamente.');
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      await api.delete(`/products/${id}`);
      const state = get();
      const p = state.lastProductsParams;
      await state.fetchProducts(
        p ?? {
          page: state.productsPagination.page,
          limit: state.productsPagination.limit,
          sortBy: state.productsSort.sortBy,
          sortOrder: state.productsSort.sortOrder,
        },
      );
      await state.fetchProductCounts();
      toast.success('Produto excluído com sucesso.');
    } catch (error) {
      console.error('Error deleting product', error);
      toast.error(getApiErrorMessage(error, 'Erro ao excluir produto. Tente novamente.'));
      throw error;
    }
  },

  createGroup: async (group) => {
    try {
      const response = await api.post('/product-groups', group);
      set((state) => ({ groups: [...state.groups, response.data] }));
    } catch (error) {
      console.error('Error creating group', error);
      toast.error(getApiErrorMessage(error, 'Erro ao criar grupo. Tente novamente.'));
      throw error;
    }
  },

  updateGroup: async (id, group) => {
    try {
      const response = await api.put(`/product-groups/${id}`, group);
      set((state) => ({
        groups: state.groups.map(g => g.id === id ? response.data : g)
      }));
    } catch (error) {
      console.error('Error updating group', error);
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar grupo. Tente novamente.'));
      throw error;
    }
  },

  deleteGroup: async (id) => {
      try {
          await api.delete(`/product-groups/${id}`);
          set((state) => ({ groups: state.groups.filter(g => g.id !== id) }));
          get().fetchProductCounts();
      } catch (error) {
          console.error('Error deleting group', error);
          toast.error(getApiErrorMessage(error, 'Erro ao excluir grupo. Tente novamente.'));
          throw error;
      }
  }
}));