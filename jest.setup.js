require("@testing-library/jest-dom");
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

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

// Mock NextResponse
const mockNextResponse = {
  json: (data, init) => {
    const resp = new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });

    Object.defineProperty(resp, "status", {
      get() {
        return init?.status || 200;
      },
    });

    return resp;
  },
};

jest.mock("next/server", () => ({
  NextResponse: mockNextResponse,
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
