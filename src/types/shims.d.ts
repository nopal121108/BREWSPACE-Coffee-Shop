// Ambient Type Definitions for Next.js, Node.js, and Lucide React

declare module 'next/server' {
  export interface RequestCookie {
    name: string;
    value: string;
  }

  export class NextRequest extends Request {
    cookies: {
      get(name: string): RequestCookie | undefined;
      getAll(): RequestCookie[];
      set(name: string, value: string): void;
      delete(name: string): void;
    };
    nextUrl: URL;
  }

  export class NextResponse extends Response {
    static json<T = any>(body: T, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static next(): NextResponse;
    cookies: {
      get(name: string): RequestCookie | undefined;
      set(name: string, value: string, options?: any): void;
      delete(name: string): void;
    };
  }
}

declare module 'next/link' {
  import React from 'react';
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
    scroll?: boolean;
    prefetch?: boolean;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
    prefetch(href: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string>>(): T;
}

declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: any);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export interface StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  }
}

declare module 'lucide-react' {
  import React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type LucideIcon = React.FC<LucideProps>;

  export const LayoutDashboard: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Coffee: LucideIcon;
  export const Tags: LucideIcon;
  export const Boxes: LucideIcon;
  export const Receipt: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Users: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Calendar: LucideIcon;
  export const Clock: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Lock: LucideIcon;
  export const User: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const Search: LucideIcon;
  export const Trash2: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Info: LucideIcon;
  export const X: LucideIcon;
  export const DollarSign: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Eye: LucideIcon;
  export const Edit2: LucideIcon;
  export const ToggleLeft: LucideIcon;
  export const ToggleRight: LucideIcon;
  export const History: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const ArrowUpDown: LucideIcon;
  export const Store: LucideIcon;
  export const Save: LucideIcon;
  export const Percent: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const PieChart: LucideIcon;
  export const Printer: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Banknote: LucideIcon;
  export const FileText: LucideIcon;
}

