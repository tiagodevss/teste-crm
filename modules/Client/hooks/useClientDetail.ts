import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClientsStore } from '../../Clients/store';
import { useProductStore } from '../store';
import { AppPath, getIdFromPathname } from '../../../routes';

export function useClientDetail() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isClientDetail = pathname.startsWith(`${AppPath.CLIENT}/`);
    const clientId = isClientDetail ? getIdFromPathname(pathname) : null;

    const { clientDetail, fetchClientById, clearClientDetail, isDetailLoading, detailError } = useClientsStore();
    const { products, fetchProducts } = useProductStore();

    useEffect(() => {
        if (clientId) {
            fetchClientById(clientId);
            return () => clearClientDetail();
        }
    }, [clientId, fetchClientById, clearClientDetail]);

    useEffect(() => {
        fetchProducts({ page: 1, limit: 100 });
    }, [fetchProducts]);

    return {
        clientDetail,
        isDetailLoading,
        detailError,
        clientId,
        products,
        fetchClientById,
    };
}
