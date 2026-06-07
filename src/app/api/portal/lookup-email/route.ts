import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const normalizedTarget = email.trim().toLowerCase();

    // 1. Fetch all clients
    const clientsSnapshot = await adminDb.collection("clients").get();
    let matchedClient = null;

    for (const doc of clientsSnapshot.docs) {
      const data = doc.data();
      if (!data.mail) continue;

      const emails = data.mail.split(/[;, ]+/).map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      if (emails.includes(normalizedTarget)) {
        matchedClient = { id: doc.id, emails };
        break;
      }
    }

    if (!matchedClient) {
      return NextResponse.json({ isClient: false }, { status: 404 });
    }

    // 2. Find which of these emails is registered in Firebase Auth
    let primaryEmail = null;
    for (const e of matchedClient.emails) {
      try {
        await adminAuth.getUserByEmail(e);
        primaryEmail = e;
        break; // Found it!
      } catch (err: any) {
        if (err.code === "auth/user-not-found") continue;
        console.error("Error getting user by email:", err);
      }
    }

    return NextResponse.json({ 
      isClient: true,
      clientId: matchedClient.id,
      primaryEmail 
    });
  } catch (error: any) {
    console.error("Lookup Email Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
