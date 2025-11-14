import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ sessions: [] });
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ sessions: [] });
    }

    const token = authHeader.replace("Bearer ", "");
    
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
      return NextResponse.json({ sessions: [] });
    }

    // Fetch user's session (only one per user)
    const { data: sessionData, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // If table doesn't exist (PGRST205) or no session exists (PGRST116), return empty array
      if (error.code === "PGRST205" || error.code === "PGRST116") {
        return NextResponse.json({ sessions: [] });
      }
      // Only log unexpected errors
      logger.error("Error fetching chat session:", error);
      return NextResponse.json({ sessions: [] });
    }

    if (!sessionData) {
      return NextResponse.json({ sessions: [] });
    }

    // Transform to match expected format
    const session = {
      id: sessionData.id,
      title: sessionData.title,
      createdAt: sessionData.created_at,
      messageCount: sessionData.message_count,
      lastMessage: sessionData.last_message || "",
    };

    return NextResponse.json({ sessions: [session] });
  } catch (error) {
    logger.error("Error in GET /api/chat/sessions:", error);
    return NextResponse.json({ sessions: [] });
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
    const { id, title, messageCount, lastMessage } = body;

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

    // Upsert session (insert or update) - ensures only one session per user
    const { data: sessionData, error } = await supabase
      .from("chat_sessions")
      .upsert(
        {
          id: id || Date.now().toString(),
          user_id: user.id,
          title: title || "Cuộc trò chuyện mới",
          message_count: messageCount || 0,
          last_message: lastMessage || "",
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      // If table doesn't exist (PGRST205), return success but don't persist
      // This allows the app to work with local storage only
      if (error.code === "PGRST205") {
        return NextResponse.json({ 
          session: {
            id: id || Date.now().toString(),
            title: title || "Cuộc trò chuyện mới",
            createdAt: new Date().toISOString(),
            messageCount: messageCount || 0,
            lastMessage: lastMessage || "",
          }
        });
      }
      logger.error("Error upserting chat session:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const session = {
      id: sessionData.id,
      title: sessionData.title,
      createdAt: sessionData.created_at,
      messageCount: sessionData.message_count,
      lastMessage: sessionData.last_message || "",
    };

    return NextResponse.json({ session });
  } catch (error) {
    logger.error("Error in POST /api/chat/sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

