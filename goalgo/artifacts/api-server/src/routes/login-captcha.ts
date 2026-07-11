import { Router, type IRouter } from "express";
import { issueLoginMathCaptcha } from "../lib/loginMathCaptcha.js";

const router: IRouter = Router();

/** GET /api/public/login-captcha — editör / işletme giriş doğrulama sorusu */
router.get("/public/login-captcha", (_req, res): void => {
  res.json(issueLoginMathCaptcha());
});

export default router;
