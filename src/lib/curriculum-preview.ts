import curriculum from "../../data/curriculum/curriculum.json";
import type { Locale } from "@/i18n/config";

export type PreviewUnit = { label: string; title: string; semester: number; topics: string[] };
export type PreviewGrade = { nummer: number; units: PreviewUnit[] };

// Unit and lesson titles for the start page, straight from the generated curriculum file
// (the same source as supabase/seed.sql), so the page needs no database call.
export function getCurriculumPreview(lang: Locale): PreviewGrade[] {
  return curriculum.grades.map((grade) => ({
    nummer: grade.nummer,
    units: grade.chapters.map((chapter) => ({
      label: chapter.label[lang],
      title: chapter.title[lang],
      semester: chapter.semester,
      topics: chapter.topics.map((topic) => topic.title[lang]),
    })),
  }));
}
