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
    Ruler
} from "lucide-react"

export const navigationGroups = [
    {
        title: "الرئيسية",
        items: [
            { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
        ]
    },
    {
        title: "إدارة المخزون",
        items: [
            { href: "/inventory", label: "المخزون", icon: Package },
            { href: "/categories", label: "التصنيفات", icon: Layers },
        ]
    },
    {
        title: "المبيعات",
        items: [
            { href: "/orders", label: "الطلبات", icon: ShoppingCart },
        ]
    },
    {
        title: "العملاء والشركاء",
        items: [
            { href: "/persons", label: "الأشخاص", icon: Users },
            { href: "/person-types", label: "أنواع الأشخاص", icon: UserCog },
        ]
    },
    {
        title: "النظام والتسعير",
        items: [
            { href: "/price-labels", label: "مسميات التسعيرات", icon: Tag },
            { href: "/units", label: "وحدات القياس", icon: Ruler },
            { href: "/currencies", label: "العملات", icon: Coins },
            { href: "/users", label: "المستخدمين", icon: UsersRound },
            { href: "/settings", label: "إعدادات المتجر", icon: Store },
        ]
    },
    {
        title: "الذكاء الاصطناعي",
        items: [
            { href: "/announcements", label: "الإعلانات", icon: Megaphone },
            { href: "/notifications", label: "الإشعارات", icon: Bell },
        ]
    },
    {
        title: "الوسائط",
        items: [
            { href: "/gallery", label: "معرض الصور", icon: Images },
        ]
    }
]
