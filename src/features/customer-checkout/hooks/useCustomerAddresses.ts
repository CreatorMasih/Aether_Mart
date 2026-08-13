import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { addressService, type CreateAddressInput } from '../services/address-service';
import { useCustomerStore } from '../../customer-catalog/store/customer-store';
import { useAuthStore } from '../../auth/store/auth-store';
import { useToast } from '../../../hooks/useToast';
import { parseApiError } from '../../../core/network/api-error-parser';
import type { Address, SelectedLocation } from '../../../types';

export function useCustomerAddresses() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setSelectedAddress } = useCustomerStore();
  const { showToast } = useToast();

  const {
    data: addresses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Address[]>({
    queryKey: queryKeys.customerAddresses(),
    queryFn: () => addressService.getAddresses(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const createAddressMutation = useMutation({
    mutationFn: (input: CreateAddressInput) => addressService.createAddress(input),
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses() });
      
      // Auto-select newly saved address in customer store
      const selectedLoc: SelectedLocation = {
        id: newAddress.id,
        selectionType: 'SAVED',
        label: newAddress.label,
        streetAddress: newAddress.streetAddress,
        city: newAddress.city,
        postalCode: newAddress.postalCode,
        coordinates: {
          latitude: newAddress.latitude ?? newAddress.coordinates?.latitude ?? 21.1085,
          longitude: newAddress.longitude ?? newAddress.coordinates?.longitude ?? 82.0965,
        },
        isServiceable: true,
      };
      setSelectedAddress(selectedLoc);

      showToast({
        type: 'success',
        title: 'Address Saved',
        description: 'Address saved successfully.',
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: parsed.message || "Couldn't save this address. Please try again.",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateAddressInput> }) =>
      addressService.updateAddress(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses() });
      showToast({
        type: 'success',
        title: 'Address Updated',
        description: 'Address updated successfully.',
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        description: parsed.message || "Couldn't update this address. Please try again.",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => addressService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerAddresses() });
      showToast({
        type: 'info',
        title: 'Address Deleted',
        description: 'Address deleted successfully.',
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        description: parsed.message || "Couldn't delete address. Please try again.",
      });
    },
  });

  return {
    addresses,
    isLoading,
    isError,
    refetch,
    createAddress: createAddressMutation.mutateAsync,
    isCreating: createAddressMutation.isPending,
    updateAddress: updateAddressMutation.mutateAsync,
    isUpdating: updateAddressMutation.isPending,
    deleteAddress: deleteAddressMutation.mutateAsync,
    isDeleting: deleteAddressMutation.isPending,
  };
}
