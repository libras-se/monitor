import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
	variable: "--font-jakarta",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Libras Status",
	description:
		"Status page dos serviços Libras — API, Huet, Tils, Worker e infra",
	icons: {
		icon: "/logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full font-sans selection:bg-[rgba(79,209,197,0.24)]">
				{children}
			</body>
		</html>
	);
}
