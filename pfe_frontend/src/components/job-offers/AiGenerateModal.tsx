"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAiGenerateJobOffer } from "@/features/jobs/hooks/useJobOffers";
import type { AiGeneratedJobOffer } from "@/domain/models/JobOffer";

// Mirrors the backend's limits on the AI prompt.
const MIN_PROMPT_LENGTH = 8;
const MAX_PROMPT_LENGTH = 400;

interface AiGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (generated: AiGeneratedJobOffer) => void;
}

export function AiGenerateModal({
  isOpen,
  onClose,
  onApply,
}: AiGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const aiMutation = useAiGenerateJobOffer();

  const handleGenerate = async () => {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      toast.error(`Please describe the role in at least ${MIN_PROMPT_LENGTH} characters.`);
      return;
    }

    try {
      const generated = await aiMutation.mutateAsync(prompt.trim());
      onApply(generated);
      toast.success("AI draft generated and applied to the form.");
      setPrompt("");
      onClose();
    } catch {
      toast.error("AI generation failed. Please try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Job With AI"
      description="Describe the role in one sentence and we will pre-fill the form."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <textarea
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Need React developer remote urgently with 5+ years experience in SaaS"
          maxLength={MAX_PROMPT_LENGTH}
          aria-describedby="ai-prompt-hint"
          className="form-textarea"
        />
        <p id="ai-prompt-hint" className="flex justify-between text-xs text-gray-500">
          <span>
            {MIN_PROMPT_LENGTH} to {MAX_PROMPT_LENGTH} characters. Mention the role, level and key
            skills.
          </span>
          <span>
            {prompt.length}/{MAX_PROMPT_LENGTH}
          </span>
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            isLoading={aiMutation.isPending}
          >
            Generate Draft
          </Button>
        </div>
      </div>
    </Modal>
  );
}
