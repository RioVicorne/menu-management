import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ messages: [] });
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ messages: [] });
    }

    const token = authHeader.replace("Bearer ", "");
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ messages: [] });
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ messages: [] });
    }

    // Verify session belongs to user
    const { data: sessionData, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError) {
      // If table doesn't exist (PGRST205), return empty array (fallback to local storage)
      if (sessionError.code === "PGRST205") {
        return NextResponse.json({ messages: [] });
      }
      // If no session found (PGRST116), return empty array
      if (sessionError.code === "PGRST116") {
        return NextResponse.json({ messages: [] });
      }
    }

    if (!sessionData) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages for this session
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      // If table doesn't exist (PGRST205), return empty array (fallback to local storage)
      if (error.code === "PGRST205") {
        return NextResponse.json({ messages: [] });
      }
      // Only log unexpected errors
      logger.error("Error fetching chat messages:", error);
      return NextResponse.json({ messages: [] });
    }

    // Transform to match expected format
    const messages = (messagesData || []).map((msg) => ({
      id: msg.id,
      sessionId: msg.session_id,
      sender: msg.sender,
      text: msg.text,
      type: msg.type,
      aiData: msg.ai_data,
      createdAt: msg.created_at,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error("Error in GET /api/chat/messages:", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { sessionId, messages } = body;

    if (!sessionId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session belongs to user
    const { data: sessionData, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError) {
      // If table doesn't exist (PGRST205), return success (fallback to local storage)
      if (sessionError.code === "PGRST205") {
        return NextResponse.json({ success: true, messages: [] });
      }
      // If session not found (PGRST116), return 404
      if (sessionError.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete existing messages and insert new ones
    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("session_id", sessionId);

    if (deleteError) {
      // If table doesn't exist (PGRST205), skip deletion (fallback to local storage)
      if (deleteError.code !== "PGRST205") {
        logger.error("Error deleting old messages:", deleteError);
      }
    }

    // Insert new messages
    const messagesToInsert = messages.map((msg: any) => ({
      id: msg.id,
      session_id: sessionId,
      sender: msg.sender,
      text: msg.text,
      type: msg.type || "text",
      ai_data: msg.aiData || null,
    }));

    const { data: insertedMessages, error: insertError } = await supabase
      .from("chat_messages")
      .insert(messagesToInsert)
      .select();

    if (insertError) {
      // If table doesn't exist (PGRST205), return success (fallback to local storage)
      if (insertError.code === "PGRST205") {
        return NextResponse.json({ success: true, messages: [] });
      }
      logger.error("Error inserting messages:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update session message count and last message
    const lastMessage = messages[messages.length - 1];
    const { error: updateError } = await supabase
      .from("chat_sessions")
      .update({
        message_count: messages.length,
        last_message: lastMessage?.text?.substring(0, 100) || "",
      })
      .eq("id", sessionId);

    if (updateError) {
      // If table doesn't exist (PGRST205), skip update (fallback to local storage)
      if (updateError.code !== "PGRST205") {
        logger.error("Error updating session:", updateError);
      }
    }

    return NextResponse.json({ success: true, messages: insertedMessages });
  } catch (error) {
    logger.error("Error in POST /api/chat/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

