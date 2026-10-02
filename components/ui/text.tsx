import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/ui/utils"

// Semantic type levels — see DESIGN.md → Typography.
const textVariants = cva("", {
  variants: {
    variant: {
      display: "font-serif text-[length:var(--text-display-size)] [font-weight:var(--text-display-weight)] leading-[var(--text-display-line)] tracking-[var(--text-display-tracking)]",
      headline: "font-serif text-[length:var(--text-headline-size)] [font-weight:var(--text-headline-weight)] leading-[var(--text-headline-line)] tracking-[var(--text-headline-tracking)]",
      "headline-sm": "font-serif text-[length:var(--text-headline-sm-size)] [font-weight:var(--text-headline-sm-weight)] leading-[var(--text-headline-sm-line)] tracking-[var(--text-headline-sm-tracking)]",
      // Titles — Public Sans SemiBold, lh 1.2
      "title-xl": "font-sans text-[length:var(--text-title-xl-size)] [font-weight:var(--text-title-xl-weight)] leading-[var(--text-title-xl-line)] tracking-[var(--text-title-xl-tracking)]",
      "title-lg": "font-sans text-[length:var(--text-title-lg-size)] [font-weight:var(--text-title-lg-weight)] leading-[var(--text-title-lg-line)] tracking-[var(--text-title-lg-tracking)]",
      title: "font-sans text-[length:var(--text-title-size)] [font-weight:var(--text-title-weight)] leading-[var(--text-title-line)] tracking-[var(--text-title-tracking)]",
      "title-sm": "font-sans text-[length:var(--text-title-sm-size)] [font-weight:var(--text-title-sm-weight)] leading-[var(--text-title-sm-line)] tracking-[var(--text-title-sm-tracking)]",
      // Body — Public Sans Regular, lh 1.3
      "body-lg": "font-sans text-[length:var(--text-body-lg-size)] [font-weight:var(--text-body-lg-weight)] leading-[var(--text-body-lg-line)]",
      body: "font-sans text-[length:var(--text-body-size)] [font-weight:var(--text-body-weight)] leading-[var(--text-body-line)]",
      "body-sm": "font-sans text-[length:var(--text-body-sm-size)] [font-weight:var(--text-body-sm-weight)] leading-[var(--text-body-sm-line)]",
      // Labels & meta — Public Sans
      label: "font-sans text-[length:var(--text-label-size)] [font-weight:var(--text-label-weight)] leading-[var(--text-label-line)]",
      "label-sm": "font-sans text-[length:var(--text-label-sm-size)] [font-weight:var(--text-label-sm-weight)] leading-[var(--text-label-sm-line)]",
      "label-xs": "font-sans text-[length:var(--text-label-xs-size)] [font-weight:var(--text-label-xs-weight)] leading-[var(--text-label-xs-line)]",
      overline: "font-sans text-[length:var(--text-overline-size)] [font-weight:var(--text-overline-weight)] leading-[var(--text-overline-line)] tracking-[var(--text-overline-tracking)] uppercase",
      caption: "font-sans text-[length:var(--text-caption-size)] [font-weight:var(--text-caption-weight)] leading-[var(--text-caption-line)]",

      "display-legacy": "font-display text-2xl min-[375px]:text-3xl min-[414px]:text-4xl font-normal leading-[1.1] tracking-[-0.0125em]",
      "headline-legacy": "font-display text-xl min-[375px]:text-2xl min-[414px]:text-3xl font-normal leading-[1.1] tracking-[-0.0125em]",
      "title-lg-legacy": "font-display text-xl min-[375px]:text-2xl min-[414px]:text-[1.75rem] font-normal leading-[1.2] tracking-[-0.0125em]",
      "title-legacy": "font-display text-lg min-[375px]:text-xl min-[414px]:text-2xl font-normal leading-[1.25] tracking-[-0.0125em]",
      "body-lg-legacy": "font-serif text-base min-[375px]:text-lg min-[414px]:text-xl font-normal leading-tight tracking-[-0.0125em]",
      "body-legacy": "font-serif text-sm min-[375px]:text-base min-[414px]:text-lg font-normal leading-[1.6] tracking-[-0.0125em]",
      // Deprecated UI sizes (old sans). Also migrate → new scale, then delete.
      "ui-lg": "font-sans text-base font-normal leading-[1.5]",
      "ui": "font-sans text-sm font-normal leading-[1.5]",
      "ui-sm": "font-sans text-xs font-normal leading-[1.5]",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
    },
    weight: {
      regular: "[font-weight:400]",
      strong: "[font-weight:500]",
      heavy: "[font-weight:600]",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
  },
})

export type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>

export interface TextProps
  extends React.ComponentProps<"p">,
    VariantProps<typeof textVariants> {
  asChild?: boolean
}

function Text({ className, variant, tone, weight, asChild = false, ...props }: TextProps) {
  const Comp = asChild ? Slot.Root : "p"
  return (
    <Comp
      data-slot="text"
      data-variant={variant ?? "body"}
      data-tone={tone ?? "default"}
      data-weight={weight}
      className={cn(textVariants({ variant, tone, weight }), className)}
      {...props}
    />
  )
}

export { Text, textVariants }
