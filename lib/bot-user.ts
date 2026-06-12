import { getServerClient } from "./supabase";
import { isLinkCodeValid } from "./link-code";
import type { User } from "@/types/database";

const supabase = getServerClient();

export async function resolveUserByChatId(chatId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("[bot-user] resolve error:", error);
    return null;
  }
  return data as User | null;
}

export type LinkError = "not_found" | "expired" | "db";

// Koppelt een Telegram-chat aan een medewerker via eenmalige code.
export async function linkUserByCode(
  chatId: number,
  code: string
): Promise<{ user: User } | { error: LinkError }> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("link_code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("[bot-user] link query error:", error);
    return { error: "db" };
  }
  if (!data) return { error: "not_found" };
  if (!isLinkCodeValid(data.link_code_expires_at)) return { error: "expired" };

  const { error: updateError } = await supabase
    .from("users")
    .update({ telegram_chat_id: chatId, link_code: null, link_code_expires_at: null })
    .eq("id", data.id);
  if (updateError) {
    console.error("[bot-user] link update error:", updateError);
    return { error: "db" };
  }
  return { user: { ...data, telegram_chat_id: chatId } as User };
}
