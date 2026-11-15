import { NextRequest, NextResponse } from "next/server";
import { search, type EntityType } from "@/server/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: EntityType[] = [
  "eip", "erc", "rip", "pr", "issue", "contributor", "upgrade", "blog",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types");
  const types = typesParam
    ? (typesParam.split(",").filter((t) => VALID.includes(t as EntityType)) as EntityType[])
    : undefined;

  const result = await search(q, { types });
  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
