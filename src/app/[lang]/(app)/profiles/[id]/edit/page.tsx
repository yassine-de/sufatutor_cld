import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getAvatars, getChild, getGrades } from "@/lib/data";
import { deleteChild, updateChild } from "../../../actions";
import { ChildForm } from "../../child-form";
import { ConfirmDelete } from "@/components/confirm-delete";

export default async function EditChildPage({ params }: PageProps<"/[lang]/profiles/[id]/edit">) {
  // Only the language is read here: `params` also holds the child id, which is request-time data
  // and is therefore resolved inside the Suspense boundary below.
  const lang = await getLang();
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.profiles.editTitle}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <EditChildForm lang={lang} params={params} />
      </Suspense>
    </main>
  );
}

async function EditChildForm({ lang, params }: { lang: Locale; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, user, avatars, grades, child] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
    getAvatars(lang),
    getGrades(lang),
    getChild(id),
  ]);
  if (!child) notFound();

  return (
    <>
      <ChildForm
        lang={lang}
        parentId={user.id}
        dict={dict}
        avatars={avatars}
        grades={grades}
        child={child}
        action={updateChild.bind(null, lang, child.id)}
      />
      <ConfirmDelete
        action={deleteChild.bind(null, lang, child.id)}
        labels={{
          delete: dict.profiles.delete,
          warning: dict.profiles.deleteConfirm,
          confirm: dict.profiles.confirmDelete,
          cancel: dict.profiles.cancel,
        }}
      />
    </>
  );
}
