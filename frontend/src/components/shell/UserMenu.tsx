import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { logout } from "@/lib/actions";
import { api } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/auth";
import { roleLabel } from "@/lib/format";

/** Signed-in user and sign-out. Reads the session, so render it inside <Suspense>. */
export async function UserMenu() {
  const client = await api();
  // The bell is decoration; a failed count must not break the header.
  const [user, unread] = await Promise.all([
    getCurrentUser(),
    client.GET("/notifications", { params: { query: { unreadOnly: true, size: 1 } } }).then((r) => r.data?.unreadCount ?? 0).catch(() => 0),
  ]);
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/notifications"
        className="relative grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tnum">{unread > 99 ? "99+" : unread}</span>}
      </Link>
      <span className="hidden text-right text-xs leading-tight sm:block">
        <span className="block font-semibold">{user.name}</span>
        <span className="block text-muted-foreground">
          {roleLabel[user.role]}
          {user.department ? `, ${user.department.name}` : ""}
        </span>
      </span>
      <form action={logout}>
        <button type="submit" className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Sign out">
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
