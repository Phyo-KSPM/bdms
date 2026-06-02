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
import { readAuthSession } from "@/lib/auth"
import {
  BellIcon,
  Building2Icon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  HeartHandshakeIcon,
} from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
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
      icon: (
        <LayoutDashboardIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Donor",
      url: "/donor",
      icon: <HeartHandshakeIcon />,
      items: [
        {
          title: "Donor Registration",
          url: "/donor/registration",
        },
        {
          title: "Donation Records",
          url: "/donor/donations",
        },
        {
          title: "56-day Eligibility",
          url: "/donor/eligibility",
        },
        {
          title: "Donor History",
          url: "/donor/history",
        },
        {
          title: "Donor Card / Certificate",
          url: "/donor/certificate",
        },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <PackageIcon />,
    },
    {
      title: "Testing & Screening",
      url: "/testing-screening",
      icon: <FlaskConicalIcon />,
    },
    {
      title: "Hospital Recipient",
      url: "/hospital-recipient",
      icon: <Building2Icon />,
    },
    {
      title: "Notification & Communication",
      url: "/notifications",
      icon: <BellIcon />,
    },
    {
      title: "Report & Analytics",
      url: "/reports",
      icon: <BarChart3Icon />,
    },
    {
      title: "User Management & Security",
      url: "/user-management",
      icon: <ShieldCheckIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = readAuthSession()
  const { locale } = useLocale()

  const navMain = React.useMemo(() => {
    if (locale === "en") return data.navMain

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
      "Donation Records": "လှူဒါန်းမှတ်တမ်း",
      "56-day Eligibility": "56 ရက် cooldown အသိပေးချက်",
      "Donor History": "Donor သမိုင်းကြောင်း",
      "Donor Card / Certificate": "Donor Card / Certificate",
    }

    const dashboardSubMap: Record<string, string> = {
      Overview: "Overview",
    }

    return data.navMain.map((item) => {
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
  }, [locale])

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
            name: session?.username ?? data.user.name,
            email:
              session?.username === "admin"
                ? "admin@bdms.local"
                : data.user.email,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
