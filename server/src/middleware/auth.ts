import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });
    const token = header.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.user = { id: payload.id, email: payload.email };
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}