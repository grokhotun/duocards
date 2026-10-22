import { createEmptyCard, fsrs as tsfsrs, type Card, type Grade } from "ts-fsrs"

export type Progress = Card

class FsrsService {
  private readonly scheduler = tsfsrs({
    request_retention: 0.97,
    maximum_interval: 36500,
    enable_fuzz: true,
  })

  create(): Progress {
    return createEmptyCard()
  }

  review(progress: Progress, rating: Grade) {
    const result = this.scheduler.next(progress, new Date(), rating)
    return [result.card, result.log] as const
  }
}

export const fsrs = new FsrsService()
