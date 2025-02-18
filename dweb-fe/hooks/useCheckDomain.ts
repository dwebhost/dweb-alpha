"use client"

import useSWRMutation from "swr/mutation"
import {backendUrl} from "@/hooks/useSignDomain";

/**
 * Type for the payload we send to the API
 */
interface CheckDomainPayload {
  domains: string[]
}

/**
 * The fetcher that actually calls the external API endpoint with POST.
 */
async function checkDomainFetcher(
  url: string,
  // `arg` is the second parameter from the SWR trigger function.
  {arg}: { arg: CheckDomainPayload }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(arg),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const message = errorBody?.message || "Error checking domain"
    throw new Error(message)
  }

  return res.json()
}

/**
 * A custom hook that calls the external endpoint (e.g. http://localhost:5100/api/domain/sign).
 * You can rename "your-api.com" to your actual domain or endpoint.
 */
export function useCheckDomain() {
  const {
    trigger,      // function to manually invoke the mutation
    data,         // holds success response data
    error,        // holds error object if the request fails
    isMutating,   // boolean for loading state
  } = useSWRMutation(backendUrl + "/domain/check", checkDomainFetcher)

  /**
   * Wrap trigger() in a user-friendly function.
   */
  async function checkDomain(payload: CheckDomainPayload) {
    return trigger(payload)
  }

  return {
    checkDomain, // the function to call from your component
    data,
    error,
    isMutating,
  }
}
