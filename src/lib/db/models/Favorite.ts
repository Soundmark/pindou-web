import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: string;
  diagramId: string;
  diagramSnapshot: {
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
    userName: string;
    width: number;
    height: number;
  };
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: String, required: true },
    diagramId: { type: String, required: true },
    diagramSnapshot: {
      name: { type: String },
      imageUrl: { type: String },
      thumbnailUrl: { type: String },
      userName: { type: String },
      width: { type: Number },
      height: { type: Number },
    },
  },
  { timestamps: true }
);

FavoriteSchema.index({ userId: 1, diagramId: 1 }, { unique: true });
FavoriteSchema.index({ diagramId: 1 });

export default mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema);