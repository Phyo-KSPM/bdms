"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useLocale } from "@/components/i18n/locale-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { hasPermission, readAuthSession, type AuthSession } from "@/lib/auth"
import { getUserById, type Permission } from "@/lib/user-store"
import {
  BellIcon,
  Building2Icon,
  LayoutDashboardIcon,
  PackageIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  HeartHandshakeIcon,
} from "lucide-react"

const data = {
  user: {
    name: "BDMS User",
    email: "user@bdms.local",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "BDMS Inc",
      logo: (
        <img src="/logo.png" alt="BDMS logo" className="size-4 rounded-sm object-contain" />
      ),
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
      permission: "dashboard.read" as Permission,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
          permission: "dashboard.read" as Permission,
        },
      ],
    },
    {
      title: "Donor",
      url: "/donor",
      icon: <HeartHandshakeIcon />,
      permission: "donors.read" as Permission,
      items: [
        {
          title: "Donor Registration",
          url: "/donor/registration",
          permission: "donors.write" as Permission,
        },
        {
          title: "Testing & Screening",
          url: "/testing-screening",
          permission: "screening.read" as Permission,
        },
        {
          title: "Blood Collection",
          url: "/donor/collection",
          permission: "donations.write" as Permission,
        },
        {
          title: "Donation Records",
          url: "/donor/donations",
          permission: "donations.read" as Permission,
        },
        {
          title: "56-day Eligibility",
          url: "/donor/eligibility",
          permission: "donors.read" as Permission,
        },
        {
          title: "Donor History",
          url: "/donor/history",
          permission: "donors.read" as Permission,
        },
        {
          title: "Donor EID Card",
          url: "/donor/certificate",
          permission: "donors.read" as Permission,
        },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <PackageIcon />,
      permission: "inventory.read" as Permission,
    },
    {
      title: "Hospital Recipient",
      url: "/hospital-recipient",
      icon: <Building2Icon />,
      permission: "donors.read" as Permission,
    },
    {
      title: "Notification & Communication",
      url: "/notifications",
      icon: <BellIcon />,
      permission: "reports.read" as Permission,
    },
    {
      title: "Report & Analytics",
      url: "/reports",
      icon: <BarChart3Icon />,
      permission: "reports.read" as Permission,
    },
    {
      title: "User Management & Security",
      url: "/user-management",
      icon: <ShieldCheckIcon />,
      permission: "users.manage" as Permission,
    },
  ],
}

type NavItem = (typeof data.navMain)[number]

function canSeeNavItem(session: AuthSession | null, permission?: Permission) {
  if (!permission) return true
  return hasPermission(session, permission)
}

function filterNavItems(session: AuthSession | null, items: NavItem[]) {
  return items
    .map((item) => {
      if (item.items) {
        const visibleItems = item.items.filter((sub) =>
          canSeeNavItem(session, sub.permission)
        )
        if (visibleItems.length === 0) return null
        return { ...item, items: visibleItems }
      }
      if (!canSeeNavItem(session, item.permission)) return null
      return item
    })
    .filter(Boolean) as NavItem[]
}

export function AppSidebar({
  session: sessionProp,
  ...props
}: React.ComponentProps<typeof Sidebar> & { session?: AuthSession | null }) {
  const session = sessionProp ?? readAuthSession()
  const { locale } = useLocale()
  const currentUser = session ? getUserById(session.userId) : null

  const navMain = React.useMemo(() => {
    const visibleItems = filterNavItems(session, data.navMain)

    if (locale === "en") return visibleItems

    const topMap: Record<string, string> = {
      Dashboard: "Dashboard",
      Donor: "Donor",
      Inventory: "သွေးဘဏ် စတော့/သိုလှောင်မှု",
      "Testing & Screening": "စစ်ဆေးမှု နှင့် စကရင်းနင်း",
      "Hospital Recipient": "ဆေးရုံ လက်ခံသူ",
      "Notification & Communication": "အသိပေးချက် နှင့် ဆက်သွယ်ရေး",
      "Report & Analytics": "အစီရင်ခံစာ နှင့် သုံးသပ်ချက်",
      "User Management & Security": "အသုံးပြုသူ စီမံခန့်ခွဲမှု နှင့် လုံခြုံရေး",
    }

    const donorSubMap: Record<string, string> = {
      "Donor Registration": "Donor မှတ်ပုံတင်ခြင်း",
      "Testing & Screening": "စစ်ဆေးမှု နှင့် စကရင်းနင်း",
      "Blood Collection": "သွေးကောက်ယူမှု",
      "Donation Records": "လှူဒါန်းမှတ်တမ်း",
      "56-day Eligibility": "56 ရက် cooldown အသိပေးချက်",
      "Donor History": "Donor သမိုင်းကြောင်း",
      "Donor EID Card": "Donor EID Card",
    }

    const dashboardSubMap: Record<string, string> = {
      Overview: "Overview",
    }

    return visibleItems.map((item) => {
      if (item.title === "Dashboard") {
        return {
          ...item,
          title: topMap[item.title] ?? item.title,
          items: item.items?.map((sub) => ({
            ...sub,
            title: dashboardSubMap[sub.title] ?? sub.title,
          })),
        }
      }
      if (item.title === "Donor") {
        return {
          ...item,
          title: topMap[item.title] ?? item.title,
          items: item.items?.map((sub) => ({
            ...sub,
            title: donorSubMap[sub.title] ?? sub.title,
          })),
        }
      }

      return topMap[item.title] ? { ...item, title: topMap[item.title]! } : item
    })
  }, [locale, session])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            ...data.user,
            name: session?.displayName ?? data.user.name,
            email: currentUser?.email || `${session?.username ?? "user"}@bdms.local`,
            role: session?.role,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
