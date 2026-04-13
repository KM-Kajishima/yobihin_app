import { z } from "zod";

// --- 倉庫マスタのバリデーション ---
export const warehouseSchema = z.object({
  倉庫no: z.string()
    .min(1, "倉庫NOは必須です")
    .max(2, "倉庫NOは2文字以内で入力してください"),
  倉庫名: z.string()
    .max(30, "倉庫名は30文字以内で入力してください")
    .optional(),
});

// --- 社員マスタ（担当者）のバリデーション ---
export const staffSchema = z.object({
  社員no: z.string()
    .min(1, "社員NOは必須です")
    .max(8, "社員NOは8文字以内で入力してください"),
  社員名: z.string()
    .max(30, "社員名は30文字以内で入力してください")
    .optional(),
  部署: z.string()
    .max(20, "部署名は20文字以内で入力してください")
    .optional(),
});

// --- 工具マスタのバリデーション ---
export const toolSchema = z.object({
  工具no: z.string()
    .min(1, "工具NOは必須です")
    .max(12, "工具NOは12文字以内で入力してください"),
  名称: z.string().max(50, "名称は50文字以内です").optional(),
  略称: z.string().max(20, "略称は20文字以内です").optional(),
  詳細: z.string().max(50, "詳細は50文字以内です").optional(),
  備考: z.string().max(100, "備考は100文字以内です").optional(),
});