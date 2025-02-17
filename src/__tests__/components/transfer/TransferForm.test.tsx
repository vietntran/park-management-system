import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

import { TransferForm } from "@/components/transfer/TransferForm";
import { alertStyles } from "@/components/ui/Alert";
import type { Reservation, SelectedUser } from "@/types/reservation";

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Updated UserSearch mock with UUID
jest.mock("@/components/reservation/UserSearch", () => ({
  UserSearch: jest.fn(
    ({ onUserSelect, selectedUsers, maxUsers, isLoading }) => (
      <div data-testid="user-search">
        <button
          onClick={() =>
            onUserSelect([
              {
                id: "123e4567-e89b-12d3-a456-426614174003",
                name: "Bob Wilson",
                email: "bob@example.com",
              },
            ])
          }
          disabled={isLoading}
          data-testid="mock-select-user"
        >
          Select User
        </button>
        <div data-testid="selected-users">
          {selectedUsers.map((user: SelectedUser) => (
            <div key={user.id}>{user.name || "Bob Wilson"}</div>
          ))}
        </div>
        <div data-testid="max-users">{maxUsers}</div>
      </div>
    ),
  ),
}));

jest.mock("@/lib/errors/clientErrorHandler", () => ({
  handleFormError: jest.fn((error) =>
    error instanceof Error ? error.message : "An error occurred",
  ),
}));

describe("TransferForm", () => {
  const mockDate = new Date(2025, 1, 15);
  const mockReservation: Reservation = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    reservationDate: mockDate,
    createdAt: mockDate,
    primaryUserId: "123e4567-e89b-12d3-a456-426614174001",
    status: ReservationStatus.ACTIVE,
    canTransfer: true,
    reservationUsers: [
      {
        reservationId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174001",
        isPrimary: true,
        status: ReservationUserStatus.ACTIVE,
        addedAt: new Date(2025, 1, 14),
        cancelledAt: null,
        user: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "John Doe",
          email: "john@example.com",
          emailVerified: new Date(2024, 1, 1),
          isProfileComplete: true,
        },
      },
      {
        reservationId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174002",
        isPrimary: false,
        status: ReservationUserStatus.ACTIVE,
        addedAt: new Date(2025, 1, 14),
        cancelledAt: null,
        user: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          name: "Jane Smith",
          email: "jane@example.com",
          emailVerified: new Date(2024, 1, 1),
          isProfileComplete: true,
        },
      },
    ],
    dateCapacity: {
      totalBookings: 1,
      remainingSpots: 59,
    },
  };

  const mockHandleSubmit = jest.fn();
  const mockHandleCancel = jest.fn();

  const defaultProps = {
    reservation: mockReservation,
    onSubmit: mockHandleSubmit,
    onCancel: mockHandleCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Render", () => {
    it("displays transfer rules and form elements", () => {
      render(<TransferForm {...defaultProps} />);

      expect(screen.getByText("Transfer Rules")).toBeInTheDocument();
      expect(screen.getByText(/Transfer To/)).toBeInTheDocument();
      expect(screen.getByText(/Select Spots to Transfer/)).toBeInTheDocument();
    });

    it("shows primary transfer option only for primary user", async () => {
      const { unmount } = render(<TransferForm {...defaultProps} />);
      expect(screen.getByText(/Transfer Primary Role/)).toBeInTheDocument();

      unmount();

      const nonPrimaryReservation = {
        ...mockReservation,
        primaryUserId: "user2",
      };
      render(
        <TransferForm {...defaultProps} reservation={nonPrimaryReservation} />,
      );

      expect(
        screen.queryByText(/Transfer Primary Role/),
      ).not.toBeInTheDocument();
    });

    it("initializes UserSearch with correct props", () => {
      render(<TransferForm {...defaultProps} />);

      const userSearch = screen.getByTestId("user-search");
      expect(within(userSearch).getByTestId("max-users")).toHaveTextContent(
        "1",
      );
      expect(
        within(userSearch).getByTestId("selected-users"),
      ).toBeInTheDocument();
    });
  });

  describe("User Selection", () => {
    it("handles user selection and updates form state", async () => {
      const user = userEvent.setup();
      render(<TransferForm {...defaultProps} />);

      await act(async () => {
        await user.click(screen.getByTestId("mock-select-user"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("selected-users")).toHaveTextContent(
          "Bob Wilson",
        );
      });
    });

    it("shows loading state during user validation", async () => {
      const user = userEvent.setup();
      render(<TransferForm {...defaultProps} />);

      const selectButton = screen.getByTestId("mock-select-user");
      await act(async () => {
        await user.click(selectButton);
      });

      expect(selectButton).not.toBeDisabled();
    });
  });

  describe("Spot Selection", () => {
    it("allows selecting transferable spots", async () => {
      const user = userEvent.setup();
      render(<TransferForm {...defaultProps} />);

      const spotCheckboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        await user.click(spotCheckboxes[0]);
      });

      expect(spotCheckboxes[0]).toBeChecked();
    });

    it("shows correct number of available spots", () => {
      render(<TransferForm {...defaultProps} />);

      expect(screen.getByText("0/2 Spots")).toBeInTheDocument();
    });
  });

  describe("Form Validation and Submission", () => {
    it("requires user selection before submission", async () => {
      const user = userEvent.setup();
      render(<TransferForm {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /Create Transfer/i,
      });
      await act(async () => {
        await user.click(submitButton);
      });

      expect(screen.getByText("Please select a recipient")).toBeInTheDocument();
    });

    it("requires at least one spot selection", async () => {
      const user = userEvent.setup();
      render(<TransferForm {...defaultProps} />);

      // Select user but no spots
      await act(async () => {
        await user.click(screen.getByTestId("mock-select-user"));
      });

      const submitButton = screen.getByRole("button", {
        name: /Create Transfer/i,
      });
      await act(async () => {
        await user.click(submitButton);
      });

      expect(
        screen.getByText("Select at least one spot to transfer"),
      ).toBeInTheDocument();
    });

    it("handles successful form submission", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<TransferForm {...defaultProps} onSubmit={onSubmit} />);

      // Select user
      await act(async () => {
        await user.click(screen.getByTestId("mock-select-user"));
      });

      // Wait for validation to complete
      await waitFor(() => {
        // Check specific form state rather than error message
        expect(screen.getByTestId("selected-users")).toHaveTextContent(
          "Bob Wilson",
        );
      });

      // Select spot
      const [firstSpotCheckbox] = screen.getAllByRole("checkbox");
      await act(async () => {
        await user.click(firstSpotCheckbox);
      });

      // Wait for spot selection to be reflected
      await waitFor(() => {
        expect(screen.getByText(/1\/2 Spots/)).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /Create Transfer/i,
      });

      await act(async () => {
        await user.click(submitButton);
      });

      // Check if form submission occurred
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          reservationId: "123e4567-e89b-12d3-a456-426614174000",
          toUserId: "123e4567-e89b-12d3-a456-426614174003",
          spotsToTransfer: ["123e4567-e89b-12d3-a456-426614174001"],
          isPrimaryTransfer: false,
        });
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );

      render(<TransferForm {...defaultProps} onSubmit={mockSubmit} />);

      // Select user
      await act(async () => {
        await user.click(screen.getByTestId("mock-select-user"));
      });

      // Select spot
      const spotCheckbox = screen.getAllByRole("checkbox")[0];
      await act(async () => {
        await user.click(spotCheckbox);
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /^Create Transfer$/i,
      });

      await act(async () => {
        await user.click(submitButton);
      });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Creating Transfer...");
    });

    it("displays error message on submission failure", async () => {
      const user = userEvent.setup();
      const errorMessage = "Transfer creation failed";
      const mockSubmit = jest.fn().mockRejectedValue(new Error(errorMessage));

      render(<TransferForm {...defaultProps} onSubmit={mockSubmit} />);

      // Select user
      await act(async () => {
        await user.click(screen.getByTestId("mock-select-user"));
      });

      // Select spot
      const spotCheckbox = screen.getAllByRole("checkbox")[0];
      await act(async () => {
        await user.click(spotCheckbox);
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /^Create Transfer$/i,
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        // Find the error alert by its variant-specific class
        const errorAlert = screen.getByRole("alert", {
          name: (_, element) => element.className.includes(alertStyles.error),
        });
        expect(within(errorAlert).getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });
});
