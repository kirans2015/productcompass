import { useState } from "react";
import { PMModal, PMModalHeader, PMModalTitle, PMModalContent, PMModalFooter } from "@/components/ui/pm-modal";
import { PMInput } from "@/components/ui/pm-input";
import { PMButton } from "@/components/ui/pm-button";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ open, onClose }: FeedbackModalProps) => {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    toast.success("Thanks for your feedback!");
    setFeedback("");
    onClose();
  };

  return (
    <PMModal open={open} onClose={onClose} showCloseButton={false}>
      <PMModalHeader>
        <PMModalTitle>What were you looking for?</PMModalTitle>
      </PMModalHeader>
      <PMModalContent>
        <PMInput
          placeholder="Describe what you expected to find..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </PMModalContent>
      <PMModalFooter>
        <PMButton variant="secondary" onClick={onClose}>
          Cancel
        </PMButton>
        <PMButton onClick={handleSubmit} disabled={!feedback.trim()}>
          Submit
        </PMButton>
      </PMModalFooter>
    </PMModal>
  );
};

export default FeedbackModal;
