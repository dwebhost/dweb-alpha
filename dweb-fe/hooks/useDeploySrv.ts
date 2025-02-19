"use client"

import useSWRMutation from "swr/mutation"
import useSWR from "swr";

export const backendUrl = process.env.NEXT_PUBLIC_DEPLOY_SRV_URL || "http://localhost:5200/api"

/**
 * Type for the payload we send to the API
 */
interface DeployPayload {
  uploadId: string
}

/**
 * The fetcher that actually calls the external API endpoint with POST.
 */
async function deployFetcher(
  url: string,
  {arg}: { arg: DeployPayload }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(arg),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const message = errorBody?.message || "Error deploy by github"
    throw new Error(message)
  }

  return res.json()
}

/**
 * The fetcher that checks the deployment status
 */
async function statusFetcher(url: string) {
  const res = await fetch(url, {method: "GET"})

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const message = errorBody?.message || "Error checking deployment status"
    throw new Error(message)
  }

  return res.json()
}

/**
 * A custom hook that calls the external endpoint (e.g. http://localhost:5200/api/deploy/start).
 * You can rename "your-api.com" to your actual domain or endpoint.
 */
export function useDeploySrv() {
  const {
    trigger,      // function to manually invoke the mutation
    data,         // holds success response data
    error,        // holds error object if the request fails
    isMutating,   // boolean for loading state
  } = useSWRMutation(backendUrl + "/deploy/start", deployFetcher)

  /**
   * Wrap trigger() in a user-friendly function.
   */
  async function deploy(payload: DeployPayload) {
    return trigger(payload)
  }

  function useDeployStatus(uploadId: string) {
    const {data, error, isLoading} = useSWR(uploadId && uploadId != "" ?`${backendUrl}/deploy/status/${uploadId}`: null,
      statusFetcher,
      {refreshInterval: 5000} // Polling every 5s
    )

    return {
      data,
      error,
      isLoading
    }
  }

  return {
    deploy,
    data,
    error,
    isMutating,
    useDeployStatus
  }
}
