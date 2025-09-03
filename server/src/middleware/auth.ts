import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware de autenticação.
 * Aceita tokens assinados com payload usando uid | id | sub.
 * Preenche req.user = { id, email? }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "No token" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const uid = payload?.uid ?? payload?.id ?? payload?.sub;
        if (!uid) {
            return res.status(401).json({ error: "Invalid token payload" });
        }

        req.user = { id: uid, email: payload?.email };
        return next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}