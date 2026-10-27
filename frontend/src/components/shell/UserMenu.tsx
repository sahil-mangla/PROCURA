import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { logout } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { roleLabel } from "@/lib/format";

/** Signed-in user and sign-out. Reads the session, so render it inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/requests?filter=Needs+my+action"
        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Action required"
        title="Requests needing my action"
      >
        <Bell className="size-4" aria-hidden />
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
