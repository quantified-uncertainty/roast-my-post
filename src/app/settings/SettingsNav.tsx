"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  KeyIcon,
  UserIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Profile", href: "/settings/profile", icon: UserIcon },
  { name: "Email Preferences", href: "/settings/preferences", icon: EnvelopeIcon },
  { name: "API Keys", href: "/settings/keys", icon: KeyIcon },
  { name: "Costs", href: "/settings/costs", icon: CurrencyDollarIcon },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="px-3">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              isActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <item.icon
              className={`mr-3 h-5 w-5 ${
                isActive ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
              }`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}