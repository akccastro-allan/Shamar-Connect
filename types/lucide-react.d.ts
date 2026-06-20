declare module "lucide-react" {
  import * as React from "react";

  export type LucideProps = React.SVGProps<SVGSVGElement> & {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Activity: LucideIcon;
  export const AtSign: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Bot: LucideIcon;
  export const Building2: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Clock: LucideIcon;
  export const Cloud: LucideIcon;
  export const ContactRound: LucideIcon;
  export const Download: LucideIcon;
  export const FileText: LucideIcon;
  export const FlaskConical: LucideIcon;
  export const GitBranch: LucideIcon;
  export const Inbox: LucideIcon;
  export const KanbanSquare: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const LifeBuoy: LucideIcon;
  export const List: LucideIcon;
  export const ListChecks: LucideIcon;
  export const Mail: LucideIcon;
  export const Megaphone: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const MessageSquareReply: LucideIcon;
  export const MessageSquareText: LucideIcon;
  export const Palette: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCcw: LucideIcon;
  export const Rocket: LucideIcon;
  export const RotateCw: LucideIcon;
  export const Save: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const StickyNote: LucideIcon;
  export const Tags: LucideIcon;
  export const TestTube2: LucideIcon;
  export const Ticket: LucideIcon;
  export const Trello: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Upload: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserRound: LucideIcon;
  export const Users: LucideIcon;
  export const Wallet: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Workflow: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}
