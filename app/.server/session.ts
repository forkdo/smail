import { env } from "cloudflare:workers";
import type { SessionStorage, Session } from "react-router";
import { createCookie, createSession } from "react-router";
import { createDB } from "~/lib/db";
import { sessions } from "~/db/schema";
import { eq } from "drizzle-orm";

const sessionCookie = createCookie("__session", {
	secrets: [env.SESSION_SECRET],
	sameSite: true,
});

type SessionData = {
	email: string;
};

function createD1SessionStorage(): SessionStorage<SessionData, SessionData> {
	return {
		async getSession(cookieHeader) {
			const id = (await sessionCookie.parse(cookieHeader || null)) || "";
			if (!id) return createSession<SessionData>();

			const db = createDB();
			const result = await db
				.select()
				.from(sessions)
				.where(eq(sessions.id, id))
				.get();

			if (!result || result.expiresAt < new Date()) {
				return createSession<SessionData>();
			}

			const data = JSON.parse(result.data) as SessionData;
			return createSession<SessionData>(data, id);
		},

		async commitSession(session) {
			const db = createDB();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			const sessionId = session.id || crypto.randomUUID();

			await db
				.insert(sessions)
				.values({
					id: sessionId,
					data: JSON.stringify(session.data),
					expiresAt,
				})
				.onConflictDoUpdate({
					target: sessions.id,
					set: {
						data: JSON.stringify(session.data),
						expiresAt,
					},
				});

			return sessionCookie.serialize(sessionId);
		},

		async destroySession(session) {
			const db = createDB();
			if (session.id) {
				await db.delete(sessions).where(eq(sessions.id, session.id));
			}
			return sessionCookie.serialize("", { maxAge: 0 });
		},
	};
}

const storage = createD1SessionStorage();

export const getSession = (cookieHeader: string | null) =>
	storage.getSession(cookieHeader);
export const commitSession = (session: Session<SessionData, SessionData>) =>
	storage.commitSession(session);
export const destroySession = (session: Session<SessionData, SessionData>) =>
	storage.destroySession(session);
