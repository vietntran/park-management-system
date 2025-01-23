import "@testing-library/jest-dom";

const { TextEncoder, TextDecoder } = require("util");

const nodeFetch = require("node-fetch");

global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;
global.Headers = nodeFetch.Headers;
global.fetch = nodeFetch;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock NextResponse
jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server");

  return {
    ...originalModule,
    NextResponse: {
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
    },
  };
});
