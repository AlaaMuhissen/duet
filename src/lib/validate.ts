import { z } from "zod";
import { MAX_SONGS_STORED } from "./blend";

export const songSchema = z.object({
  key: z.string().min(1).max(300),
  title: z.string().max(300),
  artist: z.string().max(200),
  plays: z.number().int().min(1).max(1_000_000),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
});

export const historySchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(30),
  songs: z.array(songSchema).min(1, "No songs found in your history").max(MAX_SONGS_STORED),
  stats: z.object({
    musicPlays: z.number().int().min(0),
    uniqueSongs: z.number().int().min(0),
    from: z.string().nullable(),
    to: z.string().nullable(),
  }),
});

export type HistoryPayload = z.infer<typeof historySchema>;

export const blendIdSchema = z.string().regex(/^[a-z0-9]{8}$/);
