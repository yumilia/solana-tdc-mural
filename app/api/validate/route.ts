import { NextRequest, NextResponse } from "next/server";

const RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

export async function GET(request: NextRequest) {
  const signature = request.nextUrl.searchParams.get("signature");
  if (!signature || !/^[1-9A-HJ-NP-Za-km-z]{64,96}$/.test(signature)) {
    return NextResponse.json(
      { valid: false, error: "Assinatura inválida" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "solana-tdc-mural",
        method: "getSignatureStatuses",
        params: [[signature], { searchTransactionHistory: true }],
      }),
    });
    const payload = (await response.json()) as {
      result?: { value?: Array<{ err: unknown; confirmationStatus?: string } | null> };
    };
    const status = payload.result?.value?.[0];
    const valid = Boolean(status) && status?.err === null;
    const confirmed =
      valid &&
      ["confirmed", "finalized"].includes(status?.confirmationStatus ?? "");

    return NextResponse.json(
      {
        valid,
        confirmed,
        cluster: "devnet",
        confirmationStatus: status?.confirmationStatus,
      },
      { status: valid ? 200 : 404 },
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "Falha ao consultar a devnet" },
      { status: 502 },
    );
  }
}
