import { 
    LayoutDashboard, 
    Package, 
    Users, 
    Layers, 
    Images, 
    Tag, 
    UserCog, 
    Coins,
    ShoppingCart,
    Bell,
    UsersRound,
    Store,
    Megaphone,
    Ruler,
    Sparkles,
    Bookmark,
    LucideIcon
} from "lucide-react"

export interface NavigationItem {
    href: string;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
    hidden?: boolean;
    badge?: string;
}

export interface NavigationGroup {
    title: string;
    items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
    {
        title: "الرئيسية",
        items: [
            { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
        ]
    },
    {
        title: "المبيعات والمخزون",
        items: [
            { href: "/orders", label: "الطلبات", icon: ShoppingCart, disabled: true },
            { href: "/inventory",  label: "المخزون",     icon: Package  },
            { href: "/categories", label: "التصنيفات",  icon: Layers   },
            { href: "/brands",     label: "البراندات",   icon: Bookmark },
            { href: "/gallery", label: "معرض الصور", icon: Images },
        ]
    },
    {
        title: "العملاء والشركاء",
        items: [
            { href: "/persons", label: "الأشخاص", icon: Users },
            { href: "/persons/archived", label: "الأرشيف", icon: UserCog },
        ]
    },
    {
        title: "الذكاء الاصطناعي والإشعارات",
        items: [
            { href: "/announcements",           label: "الإعلانات",   icon: Megaphone, disabled: true },
            { href: "/announcements/templates",  label: "قوالب الرسائل", icon: Sparkles, disabled: true  },
            { href: "/notifications",            label: "الإشعارات",   icon: Bell      },
        ]
    },
    {
        title: "النظام والمالية",
        items: [
            { href: "/users", label: "المستخدمين", icon: UsersRound },
            { href: "/price-labels", label: "مسميات التسعيرات", icon: Tag },
            { href: "/currencies", label: "العملات", icon: Coins },
            { href: "/units", label: "وحدات القياس", icon: Ruler },
        ]
    }
]

export const settingsNavigationItem: NavigationItem = {
    href: "/settings",
    label: "إعدادات المتجر",
    icon: Store
}
