import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BubbleChatQuestionIcon,
  Clock01Icon,
  Copy01Icon,
  DashedLineCircleIcon,
  GridViewIcon,
  Link01Icon,
  Mic02Icon,
  Cancel01Icon,
  Refresh01Icon,
  Search01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "../../lib/utils";

const ICON_MAP = {
  BubbleChatQuestion: BubbleChatQuestionIcon,
  Cancel: Cancel01Icon,
  ChevronLeft: ArrowLeft01Icon,
  ChevronRight: ArrowRight01Icon,
  Clock: Clock01Icon,
  Copy: Copy01Icon,
  GridView: GridViewIcon,
  Link: Link01Icon,
  Mic: Mic02Icon,
  RotateCcw: Refresh01Icon,
  Search: Search01Icon,
  Sent: SentIcon,
  Spinner: DashedLineCircleIcon,
} as const satisfies Record<string, IconSvgElement>;

type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function Icon({
  name,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: IconProps) {
  return (
    <HugeiconsIcon
      icon={ICON_MAP[name]}
      className={cn(className)}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      data-icon={name}
    />
  );
}
