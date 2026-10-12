import type { Context } from '@/app/Context';
import type { SectionId } from '@/story/sections';
import { BookCard } from '@/ui/BookCard';
import { HorizonLine } from '@/webgl/surface/HorizonLine';
import { ArchiveChapter } from './archive/ArchiveChapter';
import type { Chapter } from './Chapter';
import { EndingChapter } from './ending/EndingChapter';
import { GlassChapter } from './glass/GlassChapter';
import { HelloChapter } from './hello/HelloChapter';
import { HorizonChapter } from './horizon/HorizonChapter';
import { IdentityChapter } from './identity/IdentityChapter';
import { OceanChapter } from './ocean/OceanChapter';
import { RoomChapter } from './room/RoomChapter';
import { StarsChapter } from './stars/StarsChapter';
import { WelcomeChapter } from './welcome/WelcomeChapter';

export function createChapters(context: Context): Map<SectionId, Chapter> {
  const line = new HorizonLine();
  const card = new BookCard();
  const ocean = new OceanChapter(context, line, card);
  const stars = new StarsChapter(context);
  const chapters: Record<SectionId, Chapter> = {
    welcome: new WelcomeChapter(context, line),
    ocean,
    room: new RoomChapter(context),
    hello: new HelloChapter(context),
    horizon: new HorizonChapter(context),
    stars,
    glass: new GlassChapter(context, stars),
    identity: new IdentityChapter(context),
    archive: new ArchiveChapter(context, ocean),
    ending: new EndingChapter(context, line),
  };
  return new Map(Object.entries(chapters) as [SectionId, Chapter][]);
}
