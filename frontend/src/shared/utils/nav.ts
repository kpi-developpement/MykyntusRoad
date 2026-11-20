import type { NavItem, NavSection } from "../types/navigation";

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Current page and its section, for the breadcrumb. */
export function findNavItem(nav: NavSection[], pathname: string): { section: NavSection; item: NavItem } | null {
  for (const section of nav) {
    for (const item of section.items) {
      if (isActivePath(pathname, item.href)) return { section, item };
    }
  }
  return null;
}
