import randomName from "@scaleway/random-name";
import { Loader2Icon, Mail, RefreshCcwIcon } from "lucide-react";
import { customAlphabet } from "nanoid";
import React from "react";
import {
	Form,
	Link,
	data,
	redirect,
	useNavigation,
	useRevalidator,
} from "react-router";

import { commitSession, getSession } from "~/.server/session";
import { CopyButton } from "~/components/copy-button";
import { MailItem } from "~/components/mail-item";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
	createDB,
	getEmailsByAddress,
	getMailboxStats,
	getOrCreateMailbox,
} from "~/lib/db";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	const domain = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
	return [
		{
			title:
				"Smail - 免费临时邮箱生成器 | 一次性邮箱地址生成 | 24小时有效保护隐私",
		},
		{
			name: "description",
			content:
				"Smail提供最专业的免费临时邮箱服务，无需注册即可获得一次性邮件地址。24小时有效期，支持附件下载，完全匿名保护隐私。告别垃圾邮件，立即免费使用临时邮箱！",
		},
		{
			name: "keywords",
			content:
				"临时邮箱,一次性邮箱,临时邮件,临时email,免费邮箱,隐私保护,垃圾邮件防护,临时邮箱网站,免费临时邮箱,临时邮箱服务,24小时邮箱,无需注册邮箱",
		},

		// Open Graph 优化
		{
			property: "og:title",
			content: "Smail - 免费临时邮箱生成器 | 一次性邮件地址",
		},
		{
			property: "og:description",
			content:
				"保护隐私的免费临时邮箱，无需注册，即时使用，24小时有效，支持附件下载。",
		},
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: `https://${domain}` },
		{ property: "og:site_name", content: "Smail" },
		{ property: "og:locale", content: "zh_CN" },

		// Twitter Card
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: "Smail - 免费临时邮箱生成器" },
		{
			name: "twitter:description",
			content: "保护隐私的免费临时邮箱，无需注册，即时使用。",
		},

		// 额外的SEO优化
		{
			name: "robots",
			content:
				"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
		},
		{ name: "googlebot", content: "index, follow" },
		{ name: "bingbot", content: "index, follow" },
		{ name: "format-detection", content: "telephone=no" },
		{ name: "theme-color", content: "#2563eb" },

		// 结构化数据
		{ name: "application-name", content: "Smail" },
		{ name: "apple-mobile-web-app-title", content: "Smail" },
		{ name: "msapplication-TileColor", content: "#2563eb" },
	];
}

function generateEmail(domain: string) {
	const name = randomName();
	const random = customAlphabet("0123456789", 4)();
	return `${name}-${random}@${domain}`;
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get("Cookie"));
	let email = session.get("email");

	if (!email) {
		email = generateEmail(context.cloudflare.env.DOMAIN);
		session.set("email", email);
		return data(
			{
				email,
				mails: [],
				stats: { total: 0, unread: 0 },
			},
			{
				headers: {
					"Set-Cookie": await commitSession(session),
				},
			},
		);
	}

	try {
		// 创建数据库连接
		const db = createDB();

		// 获取或创建邮箱
		const mailbox = await getOrCreateMailbox(db, email);

		// 获取邮件列表
		const emails = await getEmailsByAddress(db, email);

		// 获取统计信息
		const stats = await getMailboxStats(db, mailbox.id);

		// 转换邮件数据格式以适配前端组件
		const mails = emails.map((emailRecord) => ({
			id: emailRecord.id,
			name: emailRecord.fromAddress.split("@")[0] || emailRecord.fromAddress,
			email: emailRecord.fromAddress,
			subject: emailRecord.subject || "(无主题)",
			date: emailRecord.receivedAt.toISOString().split("T")[0], // 格式化日期
			isRead: emailRecord.isRead,
		}));

		return { email, mails, stats };
	} catch (error) {
		console.error("Error loading emails:", error);
		// 出错时返回空数据
		return {
			email,
			mails: [],
			stats: { total: 0, unread: 0 },
		};
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	const formData = await request.formData();
	const action = formData.get("action");
	if (action === "refresh") {
		return redirect("/");
	}
	if (action === "delete") {
		const session = await getSession(request.headers.get("Cookie"));
		session.set("email", generateEmail(context.cloudflare.env.DOMAIN));
		await commitSession(session);
		return redirect("/");
	}
	return null;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const revalidator = useRevalidator();
	const isSubmitting = navigation.state === "submitting";
	const isRefreshing =
		navigation.formData?.get("action") === "refresh" && isSubmitting;
	const isDeleting =
		navigation.formData?.get("action") === "delete" && isSubmitting;

	// 自动刷新逻辑 - 每30秒自动重新验证数据
	React.useEffect(() => {
		const interval = setInterval(() => {
			// 只有在页面可见且没有正在进行其他操作时才自动刷新
			if (
				document.visibilityState === "visible" &&
				navigation.state === "idle" &&
				revalidator.state === "idle"
			) {
				revalidator.revalidate();
			}
		}, 10000); // 10秒

		// 页面重新获得焦点时也刷新一次
		const handleFocus = () => {
			if (navigation.state === "idle" && revalidator.state === "idle") {
				revalidator.revalidate();
			}
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			clearInterval(interval);
			window.removeEventListener("focus", handleFocus);
		};
	}, [navigation.state, revalidator]);

	// 判断是否正在自动刷新
	const isAutoRefreshing =
		revalidator.state === "loading" && navigation.state === "idle";

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Hero Section */}
					<div className="text-center mb-12">
						<h2 className="text-5xl font-bold mb-4">
							<span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
								临时邮箱
							</span>
						</h2>
						<p className="text-lg text-gray-600 max-w-2xl mx-auto">
							无需注册 • 即时使用 • 24小时有效 • 完全免费
						</p>
					</div>

					<div className="grid lg:grid-cols-2 gap-8">
						{/* 左侧：邮箱地址 */}
						<div className="space-y-6">
							{/* 邮箱地址卡片 */}
							<Card className="border-0 shadow-xl bg-white/90 backdrop-blur h-full">
								<CardHeader className="pb-4">
									<CardTitle className="flex items-center space-x-2 text-xl">
										<div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-2.5 shadow-lg">
											<Mail className="h-5 w-5 text-white" />
										</div>
										<span className="text-gray-800">您的临时邮箱</span>
									</CardTitle>
									<div className="flex flex-wrap items-center gap-2 text-sm">
										<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
											✓ 24小时有效
										</span>
										<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
											⚡ 自动刷新
										</span>
										<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
											🎁 完全免费
										</span>
									</div>
								</CardHeader>
								<CardContent>
									{/* 邮箱地址显示区域 */}
									<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 mb-6 shadow-inner">
										<div className="text-center">
											<p className="text-xs text-gray-600 mb-3 font-medium uppercase tracking-wide">
												您的专属邮箱地址
											</p>
											<span className="font-mono text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-wide select-all break-all block">
												{loaderData.email}
											</span>
										</div>
									</div>

									{/* Action Buttons */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
										<CopyButton
											text={loaderData.email}
											size="default"
											variant="default"
											className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all font-medium"
										/>
										<Form method="post" className="w-full">
											<Button
												variant="outline"
												size="default"
												type="submit"
												name="action"
												value="delete"
												disabled={isDeleting}
												className="w-full h-11 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
											>
												{isDeleting ? (
													<>
														<Loader2Icon className="w-4 h-4 animate-spin mr-2" />
														生成中...
													</>
												) : (
													<>🔄 生成新邮箱</>
												)}
											</Button>
										</Form>
									</div>

									{/* Tips */}
									<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
										<div className="flex items-start gap-3">
											<div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
												<span className="text-white text-sm">💡</span>
											</div>
											<div className="text-sm">
												<p className="font-semibold text-blue-900 mb-1">
													使用提示
												</p>
												<p className="text-blue-800 leading-relaxed">
													发送邮件到此地址即可在右侧收件箱查看，邮箱24小时后自动过期。收件箱每10秒自动刷新。
												</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* 右侧：收件箱 */}
						<div>
							<Card className="h-full border-0 shadow-xl bg-white/90 backdrop-blur">
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<CardTitle className="flex items-center space-x-2">
												<span>收件箱</span>
											</CardTitle>
											<span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
												{loaderData.stats.unread} 未读
											</span>
											<span className="text-gray-500 text-xs">
												共 {loaderData.stats.total} 封
											</span>
										</div>
										<Form method="post">
											<Button
												variant="secondary"
												size="sm"
												name="action"
												value="refresh"
												disabled={isRefreshing || isAutoRefreshing}
												className="text-xs shadow-md hover:shadow-lg transition-all"
											>
												{isRefreshing ? (
													<>
														<Loader2Icon className="w-3 h-3 animate-spin mr-1" />
														刷新中...
													</>
												) : (
													<>
														<RefreshCcwIcon className="w-3 h-3 mr-1" />
														手动刷新
													</>
												)}
											</Button>
										</Form>
									</div>
									{isAutoRefreshing && (
										<div className="text-xs text-blue-600 flex items-center gap-1 mt-2">
											<Loader2Icon className="w-3 h-3 animate-spin" />
											自动刷新中...
										</div>
									)}
								</CardHeader>
								<CardContent className="p-0">
									<ScrollArea className="h-96">
										{loaderData.mails.length > 0 ? (
											<div className="divide-y">
												{loaderData.mails.map((mail) => (
													<MailItem key={mail.id} {...mail} />
												))}
											</div>
										) : (
											<div className="flex flex-col items-center justify-center py-16 text-gray-500 px-4">
												<div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
													<span className="text-4xl">📭</span>
												</div>
												<h3 className="text-lg font-semibold mb-2 text-center text-gray-800">
													收件箱为空
												</h3>
												<p className="text-sm text-center text-gray-600">
													您还没有收到任何邮件
												</p>
												<p className="text-xs text-gray-400 mt-3 text-center break-all max-w-xs">
													发送邮件到 <span className="font-mono text-blue-600">{loaderData.email}</span> 来测试
												</p>
											</div>
										)}
									</ScrollArea>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
