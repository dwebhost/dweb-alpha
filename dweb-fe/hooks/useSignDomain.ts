"use client"

import useSWRMutation from "swr/mutation"

export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5100/api"

/**
 * Type for the payload we send to the API
 */
interface SignDomainPayload {
  domain: string
  expiration: number
  owner: `0x${string}`
}

/**
 * The fetcher that actually calls the external API endpoint with POST.
 */
async function signDomainFetcher(
  url: string,
  // `arg` is the second parameter from the SWR trigger function.
  {arg}: { arg: SignDomainPayload }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(arg),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const message = errorBody?.message || "Error signing domain"
    throw new Error(message)
  }

  return res.json()
}

/**
 * A custom hook that calls the external endpoint (e.g. http://localhost:5100/api/domain/sign).
 * You can rename "your-api.com" to your actual domain or endpoint.
 */
export function useSignDomain() {
  const {
    trigger,      // function to manually invoke the mutation
    data,         // holds success response data
    error,        // holds error object if the request fails
    isMutating,   // boolean for loading state
  } = useSWRMutation(backendUrl + "/domain/sign", signDomainFetcher)

  /**
   * Wrap trigger() in a user-friendly function.
   */
  async function signDomain(payload: SignDomainPayload) {
    return trigger(payload)
  }

  return {
    signDomain, // the function to call from your component
    data,
    error,
    isMutating,
  }
}
