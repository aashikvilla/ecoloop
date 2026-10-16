import type { HTMLAttributes, ElementType } from "react";

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" };
const sizes: Record<NonNullable<HeadingProps["as"]>, string> = { h1: "text-[2rem] leading-tight sm:text-4xl", h2: "text-xl leading-snug sm:text-2xl", h3: "text-base leading-snug" };

export function Heading({ as = "h2", className = "", ...props }: HeadingProps) {
  const Tag = as as ElementType;
  return <Tag className={`font-bold tracking-[-0.035em] text-primary ${sizes[as]} ${className}`} {...props} />;
}
