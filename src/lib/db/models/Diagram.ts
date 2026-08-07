import mongoose, { Schema, Document } from "mongoose";

export interface IDiagram extends Document {
  userId: string;
  userName: string;
  userAvatar?: string;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  pixels: number[][];
  brand: string;
  tags: string[];
  colorCount: number;
  isPublic: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiagramSchema = new Schema<IDiagram>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    pixels: { type: [[Number]], required: true },
    brand: { type: String, default: "MARD" },
    tags: { type: [String], default: [] },
    colorCount: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DiagramSchema.index({ tags: 1, createdAt: -1 });
DiagramSchema.index({ userId: 1, createdAt: -1 });
DiagramSchema.index({ isPublic: 1, createdAt: -1 });
DiagramSchema.index({ name: "text" });

export default mongoose.models.Diagram || mongoose.model<IDiagram>("Diagram", DiagramSchema);