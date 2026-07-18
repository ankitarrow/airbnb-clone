"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Star, Plane, MessageCircle, Warehouse } from "lucide-react";

type NavUser = {
  is_host?: boolean;
} | null | undefined;

function NavLinkItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const currentPath = usePathname();
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-muted ${
        currentPath === href ? "text-primary" : "text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function DesktopNavLinks({ activeUser }: { activeUser: NavUser }) {
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      <NavLinkItem href="/" label="Explore" icon={<House className="h-4 w-4" />} />
      <NavLinkItem href="/wishlists" label="Wishlists" icon={<Star className="h-4 w-4" />} />
      <NavLinkItem href="/trips" label="Trips" icon={<Plane className="h-4 w-4" />} />
      {activeUser && (
        <NavLinkItem href="/inbox" label="Inbox" icon={<MessageCircle className="h-4 w-4" />} />
      )}
      {activeUser?.is_host && (
        <NavLinkItem href="/hosts" label="Hosting" icon={<Warehouse className="h-4 w-4" />} />
      )}
    </nav>
  );
}