"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { usePublishJobOffer } from "@/features/jobs/hooks/useJobOffers";

interface PublishButtonProps {
  jobOfferId: string;
  disabled?: boolean;
  onPublished?: () => void;
}

export function PublishButton({
  jobOfferId,
  disabled,
  onPublished,
}: PublishButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const publishMutation = usePublishJobOffer();

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await publishMutation.mutateAsync(jobOfferId);
      toast.success("Job offer published successfully.");
      onPublished?.();
    } catch {
      toast.error("Could not publish this job offer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handlePublish}
      isLoading={isSubmitting}
      disabled={disabled || publishMutation.isPending}
    >
      Publish
    </Button>
  );
}
