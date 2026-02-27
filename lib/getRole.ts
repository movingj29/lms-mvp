import { supabase } from "./supabaseClient";

export async function getMyRole(): Promise<"teacher" | "student" | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return (data?.role as any) ?? null;
}