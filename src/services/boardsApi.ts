/**
 * Boards API — personal + team board management.
 *
 * SQL to run once in the Supabase SQL editor (in order):
 *
 * -- 1. boards table
 * create table public.boards (
 *   id         uuid primary key default gen_random_uuid(),
 *   owner_id   uuid references auth.users(id) on delete cascade not null,
 *   name       text not null,
 *   type       text not null check (type in ('personal','team')),
 *   join_code  text unique,
 *   created_at timestamptz not null default now()
 * );
 * alter table public.boards enable row level security;
 * create unique index boards_one_personal_per_user on public.boards(owner_id) where type = 'personal';
 * create policy "boards_owner" on public.boards for all
 *   using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
 * create policy "boards_member_view" on public.boards for select
 *   using (exists (select 1 from public.board_members where board_id = boards.id and user_id = auth.uid()));
 *
 * -- 2. board_members table
 * create table public.board_members (
 *   board_id  uuid references public.boards(id) on delete cascade not null,
 *   user_id   uuid references auth.users(id) on delete cascade not null,
 *   joined_at timestamptz not null default now(),
 *   primary key (board_id, user_id)
 * );
 * alter table public.board_members enable row level security;
 * create policy "members_own" on public.board_members for all
 *   using (user_id = auth.uid()) with check (user_id = auth.uid());
 *
 * -- 3. Add board_id to existing tables (nullable first for migration)
 * alter table public.columns add column if not exists board_id uuid references public.boards(id) on delete cascade;
 * alter table public.archived_cards add column if not exists board_id uuid references public.boards(id) on delete cascade;
 *
 * -- 4. Update RLS on columns (drop old, add board-aware)
 * drop policy if exists "own_columns" on public.columns;
 * create policy "board_columns" on public.columns for all
 *   using (
 *     (board_id is null and user_id = auth.uid()) or
 *     (board_id is not null and (
 *       exists (select 1 from public.boards where id = columns.board_id and owner_id = auth.uid()) or
 *       exists (select 1 from public.board_members where board_id = columns.board_id and user_id = auth.uid())
 *     ))
 *   )
 *   with check (
 *     (board_id is null and user_id = auth.uid()) or
 *     (board_id is not null and (
 *       exists (select 1 from public.boards where id = columns.board_id and owner_id = auth.uid()) or
 *       exists (select 1 from public.board_members where board_id = columns.board_id and user_id = auth.uid())
 *     ))
 *   );
 *
 * -- 5. Update RLS on archived_cards
 * drop policy if exists "own_archived" on public.archived_cards;
 * create policy "board_archived" on public.archived_cards for all
 *   using (
 *     (board_id is null and user_id = auth.uid()) or
 *     (board_id is not null and (
 *       exists (select 1 from public.boards where id = archived_cards.board_id and owner_id = auth.uid()) or
 *       exists (select 1 from public.board_members where board_id = archived_cards.board_id and user_id = auth.uid())
 *     ))
 *   )
 *   with check (
 *     (board_id is null and user_id = auth.uid()) or
 *     (board_id is not null and (
 *       exists (select 1 from public.boards where id = archived_cards.board_id and owner_id = auth.uid()) or
 *       exists (select 1 from public.board_members where board_id = archived_cards.board_id and user_id = auth.uid())
 *     ))
 *   );
 *
 * -- 6. Update RLS on cards (allow team members to access each other's cards)
 * drop policy if exists "own_cards" on public.cards;
 * create policy "board_cards" on public.cards for all
 *   using (
 *     user_id = auth.uid() or
 *     exists (
 *       select 1 from public.columns c where c.id = cards.column_id and c.board_id is not null and (
 *         exists (select 1 from public.boards where id = c.board_id and owner_id = auth.uid()) or
 *         exists (select 1 from public.board_members where board_id = c.board_id and user_id = auth.uid())
 *       )
 *     )
 *   )
 *   with check (
 *     user_id = auth.uid() or
 *     exists (
 *       select 1 from public.columns c where c.id = column_id and c.board_id is not null and (
 *         exists (select 1 from public.boards where id = c.board_id and owner_id = auth.uid()) or
 *         exists (select 1 from public.board_members where board_id = c.board_id and user_id = auth.uid())
 *       )
 *     )
 *   );
 *
 * -- 7. RPC for joining a board by code (bypasses RLS for the lookup)
 * create or replace function public.join_board_by_code(p_code text)
 * returns uuid language plpgsql security definer as $$
 * declare v_id uuid;
 * begin
 *   select id into v_id from public.boards where join_code = upper(trim(p_code)) and type = 'team';
 *   if v_id is null then raise exception 'Board not found'; end if;
 *   insert into public.board_members(board_id, user_id) values(v_id, auth.uid()) on conflict do nothing;
 *   return v_id;
 * end;
 * $$;
 * grant execute on function public.join_board_by_code to authenticated;
 *
 * -- 8. RPC to list all members of a board (owner + joined members) with emails and display names
 * create or replace function public.get_board_members(p_board_id uuid)
 * returns table(user_id uuid, email text, display_name text) language sql security definer as $$
 *   select b.owner_id as user_id, au.email,
 *          au.raw_user_meta_data->>'display_name' as display_name
 *   from public.boards b
 *   join auth.users au on au.id = b.owner_id
 *   where b.id = p_board_id
 *   union
 *   select bm.user_id, au.email,
 *          au.raw_user_meta_data->>'display_name' as display_name
 *   from public.board_members bm
 *   join auth.users au on au.id = bm.user_id
 *   where bm.board_id = p_board_id;
 * $$;
 * grant execute on function public.get_board_members to authenticated;
 */

import { supabase } from "../lib/supabase";
import type { Board } from "../types";

async function getCurrentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

function generateJoinCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBoard(row: any): Board {
  const members = Array.isArray(row.board_members) ? row.board_members : [];
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Board["type"],
    ownerId: row.owner_id as string,
    joinCode: (row.join_code as string | null) ?? null,
    memberCount: members.length,
    createdAt: row.created_at as string,
  };
}

export const supabaseBoardsApi = {
  async getMyBoards(): Promise<Board[]> {
    const { data, error } = await supabase
      .from("boards")
      .select("*, board_members(user_id)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToBoard);
  },

  async ensurePersonalBoard(): Promise<string> {
    const userId = await getCurrentUserId();
    const { data: existing } = await supabase
      .from("boards")
      .select("id")
      .eq("owner_id", userId)
      .eq("type", "personal")
      .limit(1);
    if (existing && existing.length > 0) return existing[0].id as string;

    const { data, error } = await supabase
      .from("boards")
      .insert({ owner_id: userId, name: "Personal", type: "personal" })
      .select("id")
      .single();
    if (error) {
      // Race condition: another tab may have created it
      const { data: retry } = await supabase
        .from("boards")
        .select("id")
        .eq("owner_id", userId)
        .eq("type", "personal")
        .single();
      if (retry) return retry.id as string;
      throw error;
    }
    return data.id as string;
  },

  async migrateOrphanedData(boardId: string): Promise<void> {
    const userId = await getCurrentUserId();
    await supabase
      .from("columns")
      .update({ board_id: boardId })
      .eq("user_id", userId)
      .is("board_id", null);
    await supabase
      .from("archived_cards")
      .update({ board_id: boardId })
      .eq("user_id", userId)
      .is("board_id", null);
  },

  async createTeamBoard(name: string): Promise<Board> {
    const userId = await getCurrentUserId();
    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase
        .from("boards")
        .select("id")
        .eq("join_code", joinCode)
        .limit(1);
      if (!clash || clash.length === 0) break;
      joinCode = generateJoinCode();
    }
    const { data, error } = await supabase
      .from("boards")
      .insert({ owner_id: userId, name: name.trim(), type: "team", join_code: joinCode })
      .select("*, board_members(user_id)")
      .single();
    if (error) throw error;
    return rowToBoard(data);
  },

  async joinBoardByCode(joinCode: string): Promise<Board> {
    const { data: boardId, error: rpcErr } = await supabase.rpc("join_board_by_code", {
      p_code: joinCode.trim().toUpperCase(),
    });
    if (rpcErr) throw new Error("Board not found. Check the join code.");
    const { data, error } = await supabase
      .from("boards")
      .select("*, board_members(user_id)")
      .eq("id", boardId as string)
      .single();
    if (error || !data) throw new Error("Failed to load joined board.");
    return rowToBoard(data);
  },

  async leaveBoard(boardId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from("board_members")
      .delete()
      .eq("board_id", boardId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async deleteBoard(boardId: string): Promise<void> {
    // Only the owner can delete; cascades remove all columns, cards, archived_cards
    const { error } = await supabase.from("boards").delete().eq("id", boardId);
    if (error) throw error;
  },

  async getBoardMembers(boardId: string): Promise<{ userId: string; email: string; displayName?: string }[]> {
    const { data, error } = await supabase.rpc("get_board_members", { p_board_id: boardId });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      userId: row.user_id as string,
      email: row.email as string,
      displayName: (row.display_name as string | null) ?? undefined,
    }));
  },
};
