// src/__tests__/components/reservation/ReservationForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format } from "date-fns";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { ReservationForm } from "@/components/reservation/ReservationForm";
import type { ReservationFormData } from "@/types/reservation";

// FormProvider wrapper for tests
const FormProviderWrapper = ({ children }: { children: ReactNode }) => {
  const methods = useForm<ReservationFormData>({
    defaultValues: {
      reservationDate: undefined,
      additionalUsers: [],
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

// Custom render function with providers
const customRender = (ui: React.ReactElement) => {
  return render(<FormProviderWrapper>{ui}</FormProviderWrapper>);
};

// Mock data
const mockAvailableDates = [
  addDays(new Date(), 1),
  addDays(new Date(), 2),
  addDays(new Date(), 3),
].map((date) => date.toISOString());

const mockUsers = [
  { id: "1", name: "Test User 1", email: "test1@example.com" },
  { id: "2", name: "Test User 2", email: "test2@example.com" },
  { id: "3", name: "Test User 3", email: "test3@example.com" },
];

describe("ReservationForm", () => {
  beforeEach(() => {
    // Reset and configure fetch mock
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/api/reservations/availability")) {
        return Promise.resolve(
          new Response(JSON.stringify({ availableDates: mockAvailableDates }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (url.includes("/api/reservations/check-availability")) {
        return Promise.resolve(
          new Response(JSON.stringify({ isAvailable: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (url.includes("/api/users/search")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockUsers), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (url.includes("/api/reservations/create")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "test-reservation-id" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Render", () => {
    test("renders form with all required elements", async () => {
      customRender(<ReservationForm />);

      expect(
        screen.getByRole("heading", { name: /make a reservation/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/select date/i)).toBeInTheDocument();
      expect(screen.getByText(/add additional users/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create reservation/i }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/reservations\/availability/),
        );
      });
    });
  });

  describe("Date Selection", () => {
    test("allows selection of available future dates", async () => {
      const user = userEvent.setup();
      customRender(<ReservationForm />);

      await waitFor(() => {
        expect(screen.getByText(/select date/i)).toBeInTheDocument();
      });

      const futureDate = format(addDays(new Date(), 1), "PP");
      const dateButton = screen.getByRole("button", { name: futureDate });
      await user.click(dateButton);

      expect(screen.getByText(`Selected: ${futureDate}`)).toBeInTheDocument();
    });

    test("disables past dates", async () => {
      customRender(<ReservationForm />);

      await waitFor(() => {
        expect(screen.getByText(/select date/i)).toBeInTheDocument();
      });

      const today = format(new Date(), "PP");
      const dateButton = screen.getByRole("button", { name: today });

      expect(dateButton).toHaveAttribute("disabled");
    });
  });

  describe("User Selection", () => {
    test("allows searching and selecting users", async () => {
      const user = userEvent.setup();
      customRender(<ReservationForm />);

      const searchButton = screen.getByRole("combobox");
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText(
        /search by name or email/i,
      );
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test User 1")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test User 1"));
      expect(screen.getByText("test1@example.com")).toBeInTheDocument();
    });

    test("limits additional users to three", async () => {
      const user = userEvent.setup();
      customRender(<ReservationForm />);

      // Add three users
      for (let i = 0; i < 3; i++) {
        const searchButton = screen.getByRole("combobox");
        await user.click(searchButton);

        const searchInput = screen.getByPlaceholderText(
          /search by name or email/i,
        );
        await user.type(searchInput, `test${i + 1}`);

        await waitFor(() => {
          expect(screen.getByText(mockUsers[i].name)).toBeInTheDocument();
        });

        await user.click(screen.getByText(mockUsers[i].name));
      }

      // Verify limit is enforced
      expect(screen.getByText(/maximum users reached/i)).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    test("submits form with valid data", async () => {
      const user = userEvent.setup();
      customRender(<ReservationForm />);

      // Select date
      await waitFor(() => {
        expect(screen.getByText(/select date/i)).toBeInTheDocument();
      });

      const futureDate = format(addDays(new Date(), 1), "PP");
      await user.click(screen.getByRole("button", { name: futureDate }));

      // Add user
      const searchButton = screen.getByRole("combobox");
      await user.click(searchButton);

      const searchInput = screen.getByPlaceholderText(
        /search by name or email/i,
      );
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test User 1")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test User 1"));

      // Submit form
      await user.click(
        screen.getByRole("button", { name: /create reservation/i }),
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/reservations/create",
          expect.any(Object),
        );
      });
    });

    test("shows error message on failed submission", async () => {
      const user = userEvent.setup();
      customRender(<ReservationForm />);

      // Mock error response for this test only
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: "Failed to create reservation" }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          ),
        ),
      );

      await user.click(
        screen.getByRole("button", { name: /create reservation/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/failed to create reservation/i),
        ).toBeInTheDocument();
      });
    });
  });
});
