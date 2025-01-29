import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, subDays } from "date-fns";
import { act } from "react";

import { ReservationForm } from "@/components/reservation/ReservationForm";
import { reservationService } from "@/services/reservationService";
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
    handleSubmit: (fn: any) => (data: any) => fn(data),
    watch: jest.fn((field) => {
      if (field === "additionalUsers") return [];
      if (field === "reservationDate") return undefined;
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
    getValues: jest.fn(),
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
            aria-selected={selected?.getDate() === i + 1}
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

// Tests
describe("ReservationForm", () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const yesterday = subDays(today, 1);

  beforeEach(() => {
    // Reset all mocks before each test
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    const tomorrow = addDays(new Date(), 1);
    const dayAfterTomorrow = addDays(tomorrow, 1);
    (reservationService.getAvailableDates as jest.Mock).mockResolvedValue({
      availableDates: [tomorrow, dayAfterTomorrow].map((d) => d.toISOString()),
    });
    (reservationService.getUserReservations as jest.Mock).mockResolvedValue({
      reservations: [],
    });
    (reservationService.validateUsers as jest.Mock).mockResolvedValue({
      valid: true,
    });
    (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue({
      isAvailable: true,
    });
    (reservationService.createReservation as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it("loads available dates and user reservations on mount", async () => {
    await act(async () => {
      render(<ReservationForm />);
    });

    expect(reservationService.getAvailableDates).toHaveBeenCalled();
    expect(reservationService.getUserReservations).toHaveBeenCalled();
  });

  it("prevents selecting dates before today", async () => {
    await act(async () => {
      render(<ReservationForm />);
    });

    // Check that today's date is disabled
    const calendarEl = screen.getByTestId("calendar");
    const todayButton = within(calendarEl).getByRole("button", {
      name: today.getDate().toString(),
    });
    expect(todayButton).toBeDisabled();

    // Check that yesterday's date is disabled
    const yesterdayButton = within(calendarEl).getByRole("button", {
      name: yesterday.getDate().toString(),
    });
    expect(yesterdayButton).toBeDisabled();
  });

  it("prevents selecting unavailable dates", async () => {
    const unavailableDate = addDays(today, 2);
    (reservationService.getAvailableDates as jest.Mock).mockResolvedValue({
      availableDates: [today, tomorrow].map((d) => d.toISOString()), // unavailableDate not included
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
      valid: false,
    });

    await act(async () => {
      render(<ReservationForm />);
    });

    // Select a date
    const calendarEl = screen.getByTestId("calendar");
    const dateButton = within(calendarEl).getByRole("button", { name: "26" });
    await act(async () => {
      await userEvent.click(dateButton);
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /Create Reservation/,
    });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("alert-description")).toHaveTextContent(
        "One or more selected users are not registered in the system",
      );
    });
  });

  it("shows error when date becomes unavailable during submission", async () => {
    (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue({
      isAvailable: false,
      reason: "Date is no longer available",
    });

    await act(async () => {
      render(<ReservationForm />);
    });

    // Select a date
    const calendarEl = screen.getByTestId("calendar");
    const dateButton = within(calendarEl).getByRole("button", { name: "26" });
    await act(async () => {
      await userEvent.click(dateButton);
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /Create Reservation/,
    });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("alert-description")).toHaveTextContent(
        "Date is no longer available",
      );
    });
  });

  it("redirects to dashboard on successful submission", async () => {
    // Mock services for successful submission
    (reservationService.validateUsers as jest.Mock).mockResolvedValue({
      valid: true,
    });
    (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue({
      isAvailable: true,
    });
    (reservationService.createReservation as jest.Mock).mockResolvedValue({
      success: true,
    });
    (reservationService.getAvailableDates as jest.Mock).mockResolvedValue({
      availableDates: Array.from({ length: 31 }, (_, i) =>
        new Date(2025, 0, i + 1).toISOString(),
      ),
    });

    await act(async () => {
      render(<ReservationForm />);
    });

    // Select a date
    const calendarEl = screen.getByTestId("calendar");
    const dateButton = within(calendarEl).getByRole("button", { name: "26" });
    await act(async () => {
      await userEvent.click(dateButton);
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /Create Reservation/,
    });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/dashboard?status=success&message=reservation-created",
      );
    });
  });

  it("disables today's date selection", async () => {
    await act(async () => {
      render(<ReservationForm />);
    });

    const calendarEl = screen.getByTestId("calendar");
    const today = new Date();
    const todayButton = within(calendarEl).getByRole("button", {
      name: today.getDate().toString(),
    });

    // Verify the button is disabled
    expect(todayButton).toBeDisabled();

    // Verify no alert message is present (since the date can't be clicked)
    expect(screen.queryByTestId("alert-description")).not.toBeInTheDocument();
  });

  it("allows selecting tomorrow's date", async () => {
    await act(async () => {
      render(<ReservationForm />);
    });

    // Select tomorrow's date
    const calendarEl = screen.getByTestId("calendar");
    const dateButton = within(calendarEl).getByRole("button", {
      name: tomorrow.getDate().toString(),
    });

    await act(async () => {
      await userEvent.click(dateButton);
    });

    // Should not show error message
    await waitFor(() => {
      expect(screen.queryByTestId("alert-description")).not.toBeInTheDocument();
    });
  });
});
