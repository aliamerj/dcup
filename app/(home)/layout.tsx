import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';
import { Navbar } from '@/components/Navbar/Navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation'

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {

  const sesstion = await getServerSession(authOptions)
  if (sesstion) return redirect("/dashboard")

    const navLinks = [
    { name: "Pricing", href: "/" },
    { name: "Docs", href: "/docs" },
    { name: "Blog", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "FAQ", href: "/fgq" },
  ];

  return <HomeLayout {...baseOptions}>
    <Navbar navLinks={navLinks} />
    {children}
  </HomeLayout>;
}
