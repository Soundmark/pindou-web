import { z } from "zod";

export const listDiagramsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  keyword: z.string().optional(),
  tag: z.string().optional(),
  minSize: z.coerce.number().optional(),
  maxSize: z.coerce.number().optional(),
  sort: z.enum(["newest", "popular", "colors"]).default("newest"),
});

export const createDiagramSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  width: z.number().int().min(1).max(200),
  height: z.number().int().min(1).max(200),
  pixels: z.array(z.array(z.number())),
  brand: z.string().default("MARD"),
  tags: z.array(z.string()).default([]),
  colorCount: z.number().int().default(0),
  isPublic: z.boolean().default(true),
});

export const updateDiagramSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export const saveMyDiagramSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1).max(50),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().optional(),
  width: z.number().int().min(1).max(200),
  height: z.number().int().min(1).max(200),
  pixels: z.array(z.array(z.number())),
  brand: z.string().default("MARD"),
  colorCount: z.number().int().default(0),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(20),
  color: z.string().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const uploadSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
});