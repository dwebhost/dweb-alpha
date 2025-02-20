import {NextRequest, NextResponse} from "next/server"
import {gql, request} from "graphql-request";

const SUBGRAPH_URL = process.env.SECRET_SUBGRAPH_URL

const query = gql`
  query GetDomainsByOwner($owner: String!) {
    nameWrappeds(where: { owner: $owner}) {
      id
      name
      expiryDate
      owner {
        id
      },
      domain {
        id
      }
    }
  }
`;

/**
 * Fetch domains by owner address.
 * @param ownerAddress
 * @returns array of domains owned by the address
 */
async function fetchDomainsByOwner(ownerAddress: string) {
  try {
    const variables = {
      owner: ownerAddress.toLowerCase(), // Convert to lowercase for consistency
    };

    console.log('Fetching domains for owner:', ownerAddress);

    return await request(SUBGRAPH_URL!, query, variables);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchENSData(ownerAddress: string) {
  // const url = "https://api.studio.thegraph.com/query/49574/enssepolia/version/latest";
  try {
    const variables = {
      owner: ownerAddress.toLowerCase(), // Convert to lowercase for consistency
    };

    return  await request(SUBGRAPH_URL!, query, variables);
  } catch (error) {
    console.error("Error fetching ENS data:", error);
  }
}

/**
 * GET/POST endpoint for retrieving domains by owner.
 *
 * - GET: /api/ens?owner=0xAddress
 * - POST: /api/ens { "owner": "0xAddress" }
 */
export async function GET(request: NextRequest) {
  try {
    // Extract "owner" from query params
    const { searchParams } = new URL(request.url)
    const ownerParam = searchParams.get("owner")

    if (!ownerParam) {
      return NextResponse.json({ error: "Missing 'owner' parameter" }, { status: 400 })
    }

    // const data = await fetchDomainsByOwner(ownerParam)
    const data = await fetchENSData(ownerParam)
    return NextResponse.json(data)
  } catch (err) {
    console.error("Error in GET /api/ens:", err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}