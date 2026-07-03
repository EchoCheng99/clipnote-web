"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/reading", label: "精读" },
  { href: "/library", label: "表达库" },
  { href: "/practice", label: "练习" },
  { href: "/history", label: "记录" },
  { href: "/settings", label: "设置" }
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex justify-between items-end border-b-2 border-ink pb-3 mb-6">
      <div className="flex gap-1">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "font-serif text-sm font-semibold px-4 py-2 rounded-t-md relative top-px border border-b-0 " +
                (active
                  ? "bg-card text-ink border-ink"
                  : "bg-card2 text-inksoft border-linestrong")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <button onClick={handleLogout} className="text-xs text-inkfaint underline">
        退出登录
      </button>
    </div>
  );
}
