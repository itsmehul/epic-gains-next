import type { ComponentProps } from "react";

import { cn } from "@/shared/utils";

export type IconProps = Omit<ComponentProps<"span">, "children"> & {
  fill?: number | boolean;
  stroke?: number;
  strokeWidth?: number;
};

function MaterialIcon({
  name,
  filled = false,
  className,
  fill,
  stroke: _stroke,
  strokeWidth: _strokeWidth,
  ...props
}: IconProps & { name: string; filled?: boolean }) {
  const isFilled = filled || Boolean(fill);

  return (
    <span
      aria-hidden
      className={cn("ms-icon inline-flex size-5", className)}
      {...props}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        }}
      >
        {name}
      </span>
    </span>
  );
}

function createIcon(name: string, filled = false) {
  function Icon(props: IconProps) {
    return <MaterialIcon name={name} filled={filled} {...props} />;
  }
  Icon.displayName = `Icon(${name}${filled ? ":fill" : ""})`;
  return Icon;
}

export const IconAwardStar = createIcon("award_star");
export const IconAlertTriangle = createIcon("warning");
export const IconArrowLeft = createIcon("arrow_back");
export const IconArrowRight = createIcon("arrow_forward");
export const IconArrowsMaximize = createIcon("open_in_full");
export const IconArrowsMinimize = createIcon("close_fullscreen");
export const IconBadgeCc = createIcon("closed_caption");
export const IconBarbell = createIcon("fitness_center");
export const IconBrain = createIcon("psychology");
export const IconBrandYoutube = createIcon("smart_display");
export const IconBrandYoutubeFilled = createIcon("smart_display", true);
export const IconCalendarEvent = createIcon("calendar_month");
export const IconChartBar = createIcon("bar_chart");
export const IconChartLine = createIcon("show_chart");
export const IconCheck = createIcon("check");
export const IconChessPawn = createIcon("chess_pawn");
export const IconChevronDown = createIcon("expand_more");
export const IconChevronRight = createIcon("chevron_right");
export const IconChevronUp = createIcon("expand_less");
export const IconCircleCheckFilled = createIcon("check_circle", true);
export const IconCrown = createIcon("crown");
export const IconCopy = createIcon("content_copy");
export const IconDiamondShine = createIcon("diamond_shine");
export const IconDotsVertical = createIcon("more_vert");
export const IconExternalLink = createIcon("open_in_new");
export const IconFeedback = createIcon("feedback");
export const IconFlame = createIcon("local_fire_department");
export const IconHeadphones = createIcon("headphones");
export const IconFocus2 = createIcon("center_focus_strong");
export const IconGamepad = createIcon("sports_esports");
export const IconKey = createIcon("vpn_key");
export const IconLayoutSidebar = createIcon("view_sidebar");
export const IconListChecks = createIcon("checklist");
export const IconLoader2 = createIcon("progress_activity");
export const IconLock = createIcon("lock");
export const IconLogout = createIcon("logout");
export const IconMaximize = createIcon("fullscreen");
export const IconMilitaryTech = createIcon("military_tech");
export const IconMessage2 = createIcon("chat");
export const IconMinimize = createIcon("fullscreen_exit");
export const IconMoon = createIcon("dark_mode");
export const IconNotebook = createIcon("auto_stories");
export const IconPlayerPauseFilled = createIcon("pause", true);
export const IconPlayerPlay = createIcon("play_arrow");
export const IconPlayerPlayFilled = createIcon("play_arrow", true);
export const IconPlugConnected = createIcon("electrical_services");
export const IconPlus = createIcon("add");
export const IconRefresh = createIcon("refresh");
export const IconSearch = createIcon("search");
export const IconSelector = createIcon("unfold_more");
export const IconSend = createIcon("send");
export const IconSparkles = createIcon("auto_awesome");
export const IconStop = createIcon("stop", true);
export const IconTimer = createIcon("timer");
export const IconStack2 = createIcon("stacks");
export const IconTrash = createIcon("delete");
export const IconTrendingDown = createIcon("trending_down");
export const IconTrendingUp = createIcon("trending_up");
export const IconTrophy = createIcon("emoji_events");
export const IconUsers = createIcon("group");
export const IconX = createIcon("close");
