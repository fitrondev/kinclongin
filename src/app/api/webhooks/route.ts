import { NextRequest, NextResponse } from "next/server";

import type { WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import {
  deactivateClerkUserInDatabase,
  syncClerkUserToDatabase,
} from "@/lib/auth/clerk-sync";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message:
      "KerjaNTB Clerk Webhook endpoint is active. POST webhook requests with valid Svix signatures to this route.",
  });
}

export async function POST(req: NextRequest) {
  const signingSecret =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET;

  if (!signingSecret) {
    console.error(
      "[Webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET or CLERK_WEBHOOK_SECRET in environment variables."
    );
    return new NextResponse(
      "Missing webhook signing secret configuration in environment variables",
      { status: 500 }
    );
  }

  let evt: WebhookEvent;

  try {
    evt = (await verifyWebhook(req, {
      signingSecret,
    })) as WebhookEvent;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown verification error";
    console.error("[Webhook] Error verifying webhook signature:", errorMessage);
    return new NextResponse(`Error verifying webhook: ${errorMessage}`, {
      status: 400,
    });
  }

  const eventType = evt.type;
  console.log(`[Webhook] Processing event: ${eventType} (ID: ${evt.data.id})`);

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        await syncClerkUserToDatabase(evt.data);
        break;
      }
      case "user.deleted": {
        if (evt.data.id) {
          await deactivateClerkUserInDatabase(evt.data.id);
        }
        break;
      }
      default: {
        console.log(`[Webhook] Received unhandled event type: ${eventType}`);
        break;
      }
    }

    return NextResponse.json(
      { success: true, message: `Webhook ${eventType} handled successfully` },
      { status: 200 }
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal processing error";
    console.error(`[Webhook] Failed to process ${eventType}:`, errorMessage);
    return new NextResponse(
      `Failed to process webhook event: ${errorMessage}`,
      { status: 500 }
    );
  }
}
