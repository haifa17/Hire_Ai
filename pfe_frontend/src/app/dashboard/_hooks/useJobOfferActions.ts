import toast from "react-hot-toast";
import {
  useCloseJobOffer,
  useDeleteJobOffer,
} from "@/features/jobs/hooks/useJobOffers";

export type JobOfferActionLabels = {
  confirmDelete: string;
  closeSuccess: string;
  closeError: string;
  deleteSuccess: string;
  deleteError: string;
};

/**
 * Close and delete handlers for a job offer list, with toasts and a refetch
 * of the list after each successful change.
 */
export function useJobOfferActions(
  labels: JobOfferActionLabels,
  refetch: () => Promise<unknown>,
) {
  const closeMutation = useCloseJobOffer();
  const deleteMutation = useDeleteJobOffer();

  const handleClose = async (id: string) => {
    try {
      await closeMutation.mutateAsync(id);
      toast.success(labels.closeSuccess);
      await refetch();
    } catch {
      toast.error(labels.closeError);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = globalThis.confirm(labels.confirmDelete);
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success(labels.deleteSuccess);
      await refetch();
    } catch {
      toast.error(labels.deleteError);
    }
  };

  return { handleClose, handleDelete };
}
