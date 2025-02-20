// src/lib/notifications.ts
import { toast } from "sonner";

export const transferNotifications = {
  created: () => {
    toast.success("Transfer request created successfully", {
      description: "The recipient has 24 hours to respond to your request.",
    });
  },

  creationError: (error: string) => {
    toast.error("Failed to create transfer", {
      description: error,
    });
  },

  accepted: () => {
    toast.success("Transfer accepted successfully", {
      description:
        "The reservation has been updated with the new arrangements.",
    });
  },

  declined: () => {
    toast.success("Transfer declined", {
      description: "The transfer request has been declined.",
    });
  },

  actionError: (action: string, error: string) => {
    toast.error(`Failed to ${action} transfer`, {
      description: error,
    });
  },

  expired: () => {
    toast.error("Transfer expired", {
      description:
        "This transfer request has expired and can no longer be processed.",
    });
  },

  validationError: (error: string) => {
    toast.error("Validation Error", {
      description: error,
    });
  },
};
