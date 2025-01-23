// src/__tests__/setup.ts
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Need to explicitly cast the global assignment to avoid type mismatches
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock for zod resolver
jest.mock("@hookform/resolvers/zod", () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

// Mock fetch with proper Response constructor
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
  ),
);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
