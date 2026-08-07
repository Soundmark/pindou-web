import mongoose, { Schema, Document } from "mongoose";

export interface IMyDiagram extends Document {
  userId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  pixels: number[][];
  brand: string;
  colorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MyDiagramSchema = new Schema<IMyDiagram>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    pixels: { type: [[Number]], required: true },
    brand: { type: String, default: "MARD" },
    colorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MyDiagramSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.MyDiagram || mongoose.model<IMyDiagram>("MyDiagram", MyDiagramSchema);