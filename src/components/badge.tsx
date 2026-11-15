import { cn, tokenize } from "@/lib/utils";
import { meaningFor } from "@/lib/meanings";

/**
 * The semantic-constant primitive. Pass any status/type/category/role and it
 * renders with its fixed, theme-harmonized color, and, when the value has a
 * known plain-English meaning, a hover tooltip explaining it.
 *   <Badge value="Final" />  <Badge value="Core" />  <Badge value="Editor" />
 */
export function Badge({
  value,
  plain = false,
  tip = true,
  className,
}: {
  value: string;
  plain?: boolean;
  tip?: boolean;
  className?: string;
}) {
  const meaning = tip ? meaningFor(value) : undefined;
  return (
    <span
      className={cn("badge", plain && "badge-plain", meaning && "tip", className)}
      data-token={tokenize(value)}
      data-tip={meaning || undefined}
    >
      {value}
    </span>
  );
}
