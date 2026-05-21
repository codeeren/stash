import { CATEGORY_ICON_MAP } from "@/lib/categoryIcons";

type CategoryIconProps = {
  icon?: string | null;
  className?: string;
};

// Renders a category's icon. New categories store a line-icon key (see
// categoryIcons.ts). Categories created before the icon picker may still
// hold a raw emoji string — those fall back to rendering as text.
export function CategoryIcon({ icon, className }: CategoryIconProps) {
  if (!icon) return null;
  const Icon = CATEGORY_ICON_MAP[icon];
  if (Icon) return <Icon className={className} />;
  return <span className="text-base leading-none">{icon}</span>;
}
