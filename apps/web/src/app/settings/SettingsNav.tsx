"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyIcon,
  UserIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Profile", href: "/settings/profile", icon: UserIcon },
  { name: "API Keys", href: "/settings/keys", icon: KeyIcon },
  { name: "Costs", href: "/settings/costs", icon: CurrencyDollarIcon },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <item.icon
              className={cn(
                "mr-3 h-4 w-4 transition-colors",
                isActive
                  ? "text-accent-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
