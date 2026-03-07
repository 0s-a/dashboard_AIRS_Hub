import { 
    LayoutDashboard, 
    Package, 
    Users, 
    Layers, 
    Images, 
    Tag, 
    UserCog, 
    Coins 
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
            { href: "/currencies", label: "العملات", icon: Coins },
        ]
    },
    {
        title: "الوسائط",
        items: [
            { href: "/gallery", label: "معرض الصور", icon: Images },
        ]
    }
]
