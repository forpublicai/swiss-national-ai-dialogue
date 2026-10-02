import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/ui/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-sans shrink-0 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring gap-2 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 rounded-[var(--button-radius)] [font-weight:var(--button-font-weight)]",
  {
    variants: {
      variant: {
        primary:
          "[background:var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-[var(--button-shadow)]",
        outline:
          "border border-input bg-transparent not-disabled:hover:border-border data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--button-shadow)] transition-shadow duration-200 not-disabled:hover:shadow-md",
        agree:
          "[background:var(--button-agree-bg)] text-[var(--button-agree-fg)] border-[1.5px] border-[var(--button-agree-border)] not-disabled:hover:shadow-[var(--button-shadow)] not-disabled:hover:bg-[var(--color-agree-50)] transition-all duration-200 disabled:border-input disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-100",
        disagree:
          "[background:var(--button-disagree-bg)] text-[var(--button-disagree-fg)] border-[1.5px] border-[var(--button-disagree-border)] not-disabled:hover:shadow-[var(--button-shadow)] not-disabled:hover:bg-[var(--color-disagree-50)] transition-all duration-200 disabled:border-input disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-100",
        destructive:
          "bg-destructive text-destructive-foreground not-disabled:hover:bg-destructive/80",
        ghost:
          "border border-transparent text-[var(--button-ghost-fg,inherit)] not-disabled:hover:text-accent-foreground",
        link: "text-[var(--button-link-color)] underline decoration-[var(--button-link-decoration)] underline-offset-2 not-disabled:hover:decoration-[var(--button-link-hover-decoration)]",
      },
      size: {
        base: "h-[var(--button-h-base)] px-[var(--button-px-base)] py-2 text-[length:var(--text-label-sm-size)] leading-none has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3",
        xs: "h-[var(--button-h-xs)] gap-1 px-[var(--button-px-xs)] py-1 text-[length:var(--text-label-sm-size)] leading-none has-[>svg:first-child]:pl-1.5 has-[>svg:last-child]:pr-1.5 rounded-[var(--button-radius-xs,var(--button-radius))]",
        sm: "h-[var(--button-h-sm)] gap-1.5 px-[var(--button-px-sm)] text-[length:var(--text-label-sm-size)] leading-none has-[>svg:first-child]:pl-2.5 has-[>svg:last-child]:pr-2.5 rounded-[var(--button-radius-sm,var(--button-radius))]",
        lg: "h-[var(--button-h-lg)] px-[var(--button-px-lg)] text-[length:var(--text-label-sm-size)] leading-none has-[>svg:first-child]:pl-3.5 has-[>svg:last-child]:pr-3.5",
        icon: "size-9 rounded-full",
        "icon-xs": "size-6 rounded-full",
        "icon-sm": "size-7 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        size: "icon",
        class: "no-underline border border-transparent hover:border-ring",
      },
      {
        variant: "link",
        size: "icon-xs",
        class: "no-underline border border-transparent hover:border-ring",
      },
      {
        variant: "link",
        size: "icon-sm",
        class: "no-underline border border-transparent hover:border-ring",
      },
      {
        variant: "link",
        size: "icon-lg",
        class: "no-underline border border-transparent hover:border-ring",
      },
      {
        variant: "ghost",
        size: "icon",
        class: "not-disabled:hover:border-ring",
      },
      {
        variant: "ghost",
        size: "icon-xs",
        class: "not-disabled:hover:border-ring",
      },
      {
        variant: "ghost",
        size: "icon-sm",
        class: "not-disabled:hover:border-ring",
      },
      {
        variant: "ghost",
        size: "icon-lg",
        class: "not-disabled:hover:border-ring",
      },
      {
        variant: "outline",
        size: "xs",
        class: "rounded-[var(--button-outline-radius-xs,var(--button-radius-xs,var(--button-radius)))]",
      },
      {
        variant: "outline",
        size: "sm",
        class: "rounded-[var(--button-outline-radius-sm,var(--button-radius-sm,var(--button-radius)))]",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "base",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "base",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
