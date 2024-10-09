import { model, Schema,Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
interface Videos{
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  views?: number;
  duration: number;
  isPublished: boolean;
  owner: Types.ObjectId;
}
const videoSchema = new Schema<Videos>(
  {
    videoFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);
export const Video = model<Videos>("Vidoe", videoSchema);
