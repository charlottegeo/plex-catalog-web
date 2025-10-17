import { useMemo } from "react";
import { getUseOidcAccessToken } from "../SSODisabledDefaults";
import { SSOEnabled } from "../configuration";

type ApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function useApiFetch(): ApiFetch {
  const useOidcAccessTokenHook = getUseOidcAccessToken();
  const { accessToken } = useOidcAccessTokenHook();

  return useMemo<ApiFetch>(() => {
    return async (input, init) => {
      const isApiRequest = typeof input === "string"
        ? input.startsWith("/api")
        : input instanceof URL
          ? input.pathname.startsWith("/api")
          : ("url" in (input as Request)) && (input as Request).url.includes("/api");

      if (!isApiRequest) {
        return fetch(input as RequestInfo | URL, init);
      }

      const headers = new Headers(init?.headers || {});

      if (SSOEnabled && accessToken && accessToken.trim() !== "") {
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${accessToken}`);
          console.log("Added Authorization header");
        }
      } else {
        console.log("No Authorization header added:", {
          SSOEnabled,
          hasAccessToken: !!accessToken,
          tokenEmpty: accessToken?.trim() === ""
        });
      }

      const nextInit: RequestInit = { ...init, headers };
      return fetch(input as RequestInfo | URL, nextInit);
    };
  }, [accessToken]);
}


