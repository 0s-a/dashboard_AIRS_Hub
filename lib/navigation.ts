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
    Ruler,
    Sparkles,
    Bookmark,
    ShieldCheck,
    Search,
    Tags,
    LucideIcon
} from "lucide-react"

export interface NavigationItem {
    href: string;
    label: string;
    icon: LucideIcon;
    keywords?: string;
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
            { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, keywords: "dashboard home الرئيسية" },
        ]
    },
    {
        title: "المبيعات والمنتجات",
        items: [
            { href: "/orders", label: "الطلبات", icon: ShoppingCart, keywords: "orders sales طلبات مبيعات فاتورة" },
            { href: "/products", label: "المنتجات", icon: Package, keywords: "products منتجات مخزون أصناف" },
            { href: "/inventory/new-tags", label: "المنتجات الجديدة", icon: Sparkles, keywords: "new tags جديد" },
            { href: "/inventory/search-engine", label: "محرك البحث", icon: Search, keywords: "search meilisearch بحث" },
            { href: "/categories", label: "التصنيفات", icon: Layers, keywords: "categories تصنيفات أقسام" },
            { href: "/brands", label: "البراندات", icon: Bookmark, keywords: "brands براندات ماركات" },
            { href: "/product-attributes", label: "صفات المنتج", icon: Tags, keywords: "attributes صفات لون مقاس سعة وزن" },
            { href: "/gallery", label: "معرض الصور", icon: Images, keywords: "gallery images صور معرض" },
        ]
    },
    {
        title: "العملاء والمشرفون",
        items: [
            { href: "/customers", label: "العملاء", icon: Users, keywords: "customers عملاء زبائن" },
            { href: "/supervisors", label: "المشرفون", icon: ShieldCheck, keywords: "supervisors مشرفون" },
        ]
    },
    {
        title: "الإشعارات",
        items: [
            { href: "/notifications", label: "الإشعارات", icon: Bell, keywords: "notifications alerts إشعارات تنبيهات" },
        ]
    },
    {
        title: "النظام والمالية",
        items: [
            { href: "/users", label: "المستخدمين", icon: UsersRound, keywords: "users admin مستخدمين" },
            { href: "/price-labels", label: "مسميات التسعيرات", icon: Tag, keywords: "price labels تسعيرات أسعار" },
            { href: "/currencies", label: "العملات", icon: Coins, keywords: "currencies عملات صرف" },
            { href: "/units", label: "وحدات القياس", icon: Ruler, keywords: "units وحدات قياس" },
        ]
    }
]

export const settingsNavigationItem: NavigationItem = {
    href: "/settings",
    label: "إعدادات المتجر",
    icon: Store,
    keywords: "settings store إعدادات متجر",
}
