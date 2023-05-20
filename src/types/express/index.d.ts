import express from "express";

declare global {
    namespace Express {
        interface Request {
            userInfo?: Record<string,any>
        }
    }
}