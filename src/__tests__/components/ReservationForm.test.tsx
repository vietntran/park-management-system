import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, subDays } from "date-fns";
import { act } from "react";

import { ReservationForm } from "@/components/reservation/ReservationForm";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { reservationService } from "@/services/reservationService";
import type { Reservation, ReservationStatus } from "@/types/reservation";

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("react-hook-form", () => ({
  useForm: jest.fn().mockImplementation(() => ({
    handleSubmit: (fn: any) => async (e?: any) => {
      e?.preventDefault?.();
      const mockData = {
        reservationDate: new Date(2025, 0, 26),
        additionalUsers: [],
      };
      return fn(mockData);
    },
    watch: jest.fn((field) => {
      if (field === "additionalUsers") return [];
      if (field === "reservationDate") return new Date(2025, 0, 26);
      if (field === "selectedDates") return [];
      return undefined;
    }),
    setValue: jest.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
    reset: jest.fn(),
    register: jest.fn(),
    control: {},
    getValues: jest.fn(() => ({
      reservationDate: new Date(2025, 0, 26),
      additionalUsers: [],
    })),
  })),
  zodResolver: jest.fn(),
}));

jest.mock("@/components/ui/Alert", () => ({
  Alert: jest.fn(({ children, variant }) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  )),
  AlertDescription: jest.fn(({ children }) => (
    <div data-testid="alert-description">{children}</div>
  )),
}));

jest.mock("@/components/ui/button", () => ({
  Button: jest.fn(({ children, role, ...props }) => (
    <button role={role} {...props}>
      {children}
    </button>
  )),
}));

jest.mock("@/components/ui/calendar/Calendar", () => ({
  Calendar: jest.fn(({ onSelect, disabled, selected }) => (
    <div data-testid="calendar">
      {Array.from({ length: 31 }, (_, i) => {
        const date = new Date(2025, 0, i + 1);
        return (
          <button
            key={i + 1}
            onClick={() => onSelect?.(date)}
            disabled={disabled?.(date)}
            aria-label={String(i + 1)}
            aria-pressed={selected?.getDate() === i + 1}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  )),
}));

jest.mock("@/components/ui/card", () => ({
  Card: jest.fn(({ children }) => <div>{children}</div>),
  CardHeader: jest.fn(({ children }) => <div>{children}</div>),
  CardContent: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock("@/components/reservation/UserSearch", () => ({
  UserSearch: jest.fn(() => <div data-testid="user-search" />),
}));

jest.mock("@/services/reservationService", () => ({
  reservationService: {
    getAvailableDates: jest.fn(),
    getUserReservations: jest.fn(),
    validateUsers: jest.fn(),
    checkDateAvailability: jest.fn(),
    createReservation: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/errors/clientErrorHandler", () => ({
  handleFormError: jest.fn((error) =>
    error instanceof Error ? error.message : "An error occurred",
  ),
}));

describe("ReservationForm", () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const yesterday = subDays(today, 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);

  const mockReservation: Reservation = {
    id: "1",
    primaryUserId: "user1",
    reservationDate: new Date(),
    createdAt: new Date(),
    status: "ACTIVE" as ReservationStatus,
    canTransfer: false,
    reservationUsers: [],
    dateCapacity: {
      totalBookings: 0,
      remainingSpots: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    },
  };

  const defaultMockResponses = {
    getAvailableDates: {
      success: true,
      data: {
        availableDates: [tomorrow, dayAfterTomorrow].map((d) =>
          d.toISOString(),
        ),
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
    },
    getUserReservations: [
      {
        success: true,
        data: mockReservation,
      },
    ],
    validateUsers: {
      success: true,
      data: { valid: true },
    },
    checkDateAvailability: {
      success: true,
      data: { isAvailable: true },
    },
    createReservation: {
      success: true,
      data: { id: "123" },
    },
  };

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.entries(defaultMockResponses).forEach(([key, value]) => {
      (
        reservationService[key as keyof typeof reservationService] as jest.Mock
      ).mockResolvedValue(value);
    });
  });

  describe("Initialization", () => {
    it("loads available dates and user reservations on mount", async () => {
      await act(async () => {
        render(<ReservationForm />);
      });

      await waitFor(() => {
        expect(reservationService.getAvailableDates).toHaveBeenCalled();
        expect(reservationService.getUserReservations).toHaveBeenCalled();
      });
    });

    it("cleans up requests on unmount", async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, "abort");

      let unmount: () => void;
      await act(async () => {
        const rendered = render(<ReservationForm />);
        unmount = rendered.unmount;
      });

      await waitFor(() => {
        expect(reservationService.getAvailableDates).toHaveBeenCalled();
        expect(reservationService.getUserReservations).toHaveBeenCalled();
      });

      await act(async () => {
        unmount();
      });

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe("Date Selection", () => {
    it("prevents selecting dates before today", async () => {
      await act(async () => {
        render(<ReservationForm />);
      });

      const calendarEl = screen.getByTestId("calendar");
      const todayButton = within(calendarEl).getByRole("button", {
        name: today.getDate().toString(),
      });
      expect(todayButton).toBeDisabled();

      const yesterdayButton = within(calendarEl).getByRole("button", {
        name: yesterday.getDate().toString(),
      });
      expect(yesterdayButton).toBeDisabled();
    });

    it("prevents selecting unavailable dates", async () => {
      const unavailableDate = addDays(today, 2);
      (reservationService.getAvailableDates as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          availableDates: [today, tomorrow].map((d) => d.toISOString()),
          maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
        },
      });

      await act(async () => {
        render(<ReservationForm />);
      });

      const calendarEl = screen.getByTestId("calendar");
      const dateButton = within(calendarEl).getByRole("button", {
        name: unavailableDate.getDate().toString(),
      });
      expect(dateButton).toBeDisabled();
    });

    it("disables today's date selection", async () => {
      await act(async () => {
        render(<ReservationForm />);
      });

      await waitFor(() => {
        expect(reservationService.getAvailableDates).toHaveBeenCalled();
        expect(reservationService.getUserReservations).toHaveBeenCalled();
      });

      const calendarEl = screen.getByTestId("calendar");
      const todayButton = within(calendarEl).getByRole("button", {
        name: today.getDate().toString(),
      });

      expect(todayButton).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.queryByTestId("alert-description"),
        ).not.toBeInTheDocument();
      });
    });

    it("allows selecting tomorrow's date", async () => {
      await act(async () => {
        render(<ReservationForm />);
      });

      await waitFor(() => {
        expect(reservationService.getAvailableDates).toHaveBeenCalled();
        expect(reservationService.getUserReservations).toHaveBeenCalled();
      });

      const calendarEl = screen.getByTestId("calendar");
      const dateButton = within(calendarEl).getByRole("button", {
        name: tomorrow.getDate().toString(),
      });

      await act(async () => {
        await userEvent.click(dateButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId("alert-description"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("User Management", () => {
    it("prevents adding more than 3 additional users", async () => {
      const { UserSearch } = jest.requireMock(
        "@/components/reservation/UserSearch",
      );

      await act(async () => {
        render(<ReservationForm />);
      });

      expect(UserSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          maxUsers: 3,
        }),
        expect.any(Object),
      );
    });

    it("validates selected users before submission", async () => {
      (reservationService.validateUsers as jest.Mock).mockResolvedValue({
        success: true,
        data: { valid: false },
      });

      await act(async () => {
        render(<ReservationForm />);
      });

      const calendarEl = screen.getByTestId("calendar");
      const dateButton = within(calendarEl).getByRole("button", { name: "26" });
      await act(async () => {
        await userEvent.click(dateButton);
      });

      const form = screen.getByLabelText("reservation-form");
      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("alert-description")).toHaveTextContent(
          "One or more selected users are not registered in the system",
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("handles API response errors appropriately", async () => {
      const errorMessage = "Failed to load available dates";
      (reservationService.getAvailableDates as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      (reservationService.getUserReservations as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      await act(async () => {
        render(<ReservationForm />);
      });

      await waitFor(
        () => {
          const alert = screen.getByTestId("alert");
          expect(alert).toBeInTheDocument();

          const alertDescription =
            within(alert).getByTestId("alert-description");
          expect(alertDescription).toBeInTheDocument();
          expect(alertDescription).toHaveTextContent(errorMessage);
        },
        {
          timeout: 3000,
        },
      );
    });

    it("shows error when date becomes unavailable during submission", async () => {
      (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue(
        {
          success: true,
          data: {
            isAvailable: false,
            reason: "Date is not available",
          },
        },
      );

      await act(async () => {
        render(<ReservationForm />);
      });

      const calendarEl = screen.getByTestId("calendar");
      const dateButton = within(calendarEl).getByRole("button", { name: "26" });
      await act(async () => {
        await userEvent.click(dateButton);
      });

      const form = screen.getByLabelText("reservation-form");
      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("alert-description")).toHaveTextContent(
          "Date is not available",
        );
      });
    });
  });

  describe("Form Submission", () => {
    it("redirects to dashboard on successful submission", async () => {
      const selectedDate = new Date(2025, 0, 26);

      (reservationService.getAvailableDates as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          availableDates: [selectedDate.toISOString()],
          maxCapacity: 60,
        },
      });

      await act(async () => {
        render(<ReservationForm />);
      });

      await waitFor(() => {
        expect(reservationService.getAvailableDates).toHaveBeenCalled();
        expect(reservationService.getUserReservations).toHaveBeenCalled();
      });

      const form = screen.getByLabelText("reservation-form");

      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      });

      await waitFor(
        () => {
          expect(reservationService.validateUsers).toHaveBeenCalled();
          expect(reservationService.checkDateAvailability).toHaveBeenCalledWith(
            selectedDate,
          );
          expect(reservationService.createReservation).toHaveBeenCalledWith({
            reservationDate: selectedDate,
            additionalUsers: [],
          });
        },
        { timeout: 3000 },
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          "/dashboard?status=success&message=reservation-created",
        );
      });
    });
  });
});
