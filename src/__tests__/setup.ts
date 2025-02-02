import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Need to explicitly cast the global assignment to avoid type mismatches
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Add requestSubmit polyfill for testing form submissions
if (typeof window !== "undefined") {
  window.HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

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

// Mock AbortController
class MockAbortController {
  signal = { aborted: false };
  abort() {
    this.signal.aborted = true;
  }
}

global.AbortController = MockAbortController as any;
global.Response = jest.fn() as any;
global.Headers = jest.fn() as any;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
