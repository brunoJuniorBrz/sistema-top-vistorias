import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RegisterSession } from "@shared/schema";

export function useRegister() {
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery<RegisterSession>({
    queryKey: ["/api/register"],
  });

  const openRegister = useMutation({
    mutationFn: (data: { openingBalance: number; operatorName: string }) =>
      apiRequest("POST", "/api/register/open", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
    },
  });

  const closeRegister = useMutation({
    mutationFn: () => apiRequest("POST", "/api/register/close", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
    },
  });

  const reconcileRegister = useMutation({
    mutationFn: (data: { physicalBalance: number; notes?: string }) =>
      apiRequest("POST", "/api/register/reconcile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
    },
  });

  return {
    session,
    isLoading,
    openRegister,
    closeRegister,
    reconcileRegister,
    isOpen: session?.isOpen || false,
    currentBalance: parseFloat(session?.currentBalance || "0"),
    expectedBalance: parseFloat(session?.expectedBalance || "0"),
  };
}
