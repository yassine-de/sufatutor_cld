"""Builds curriculum.json and seed.sql for TA3LIM (Maths, primary years 1-3, Morocco).

Source of truth for titles: 'المنهاج الدراسي للتعليم الابتدائي', Direction des curricula,
juillet 2021 (final full version). The annual distribution tables ("التوزيع السنوي") give
units (الوحدات) and weekly topics per grade; those are modelled as chapters and topics.

Usage: python build.py   (writes curriculum.json here and ../../supabase/seed.sql)
"""
import json
import uuid
from pathlib import Path

HERE = Path(__file__).parent
SEED_PATH = HERE.parent.parent / "supabase" / "seed.sql"
NS = uuid.UUID("7a1c0de5-0a31-4a1d-9d3a-7a31143a0001")  # fixed namespace -> stable ids

# domain codes -> (ar, fr), as in the table columns of the annual distribution
DOMAINS = {
    "N": ("الأعداد والحساب", "Nombres et calcul"),
    "G": ("الهندسة", "Géométrie"),
    "M": ("القياس", "Mesures"),
    "D": ("تنظيم ومعالجة البيانات", "Organisation et traitement de données"),
}

# table column code -> topic_domain enum value in the database
DOMAIN_ENUM = {"N": "number", "G": "geometry", "M": "measure", "D": "data"}

# Each unit: (semester, review_week, ar_title, fr_title, [(week, domain, ar, fr), ...])
# ar_title / fr_title are DERIVED descriptions (the curriculum only numbers its units).
GRADES = {
    1: {
        "ar": "السنة الأولى من التعليم الابتدائي",
        "fr": "1re année de l'enseignement primaire",
        "source_pages": {"distribution_pdf": [299, 300], "distribution_printed": [300, 301]},
        "units": [
            (1, 6, "الأعداد من 1 إلى 5", "Les nombres de 1 à 5", [
                (2, "D", "تصنيف الأشياء حسب خاصيات اللون والشكل والحجم والطول",
                 "Classer des objets selon la couleur, la forme, la taille et la longueur"),
                (3, "N", "التواصل حدا بحد", "Correspondance terme à terme"),
                (4, "N", "تقديم الأعداد من 1 إلى 5: قراءة وكتابة (بالأرقام وبالحروف) وتمثيلا",
                 "Présenter les nombres de 1 à 5 : lecture, écriture (en chiffres et en lettres) et représentation"),
                (5, "N", "مقارنة وترتيب الأعداد من 1 إلى 5", "Comparer et ranger les nombres de 1 à 5"),
            ]),
            (1, 11, "الموضع في المكان والأعداد حتى 9", "Se repérer dans l'espace et les nombres jusqu'à 9", [
                (7, "G", "التموضع في المكان (داخل، خارج، تحت، فوق، على، أسفل، أعلى)",
                 "Se situer dans l'espace (dedans, dehors, sous, sur, au-dessus, en bas, en haut)"),
                (8, "N", "الكتابة الجمعية من 1 إلى 5", "Écritures additives de 1 à 5"),
                (9, "N", "تقديم الأعداد من 6 إلى 9", "Présenter les nombres de 6 à 9"),
                (10, "N", "مقارنة وترتيب الأعداد من 1 إلى 9", "Comparer et ranger les nombres de 1 à 9"),
            ]),
            (1, 16, "الجمع والأعداد حتى 10", "L'addition et les nombres jusqu'à 10", [
                (12, "N", "حساب مجموع عددين لا يفوق مجموعهما 9",
                 "Calculer la somme de deux nombres dont la somme ne dépasse pas 9"),
                (13, "M", "تقدير ومقارنة الأطوال", "Estimer et comparer des longueurs"),
                (14, "N", "تقديم العددين 0 و 10", "Présenter les nombres 0 et 10"),
                (15, "N", "مقارنة وترتيب الأعداد من 0 إلى 10", "Comparer et ranger les nombres de 0 à 10"),
            ]),
            (2, 22, "الأعداد حتى 20", "Les nombres jusqu'à 20", [
                (18, "N", "تعرف الأعداد من 11 إلى 20 قراءة وكتابة وتمثيلا",
                 "Reconnaître les nombres de 11 à 20 : lecture, écriture et représentation"),
                (19, "N", "مقارنة وترتيب الأعداد من 0 إلى 20", "Comparer et ranger les nombres de 0 à 20"),
                (20, "G", "تصنيف المجسمات وتعرف الأشكال الهندسية",
                 "Classer des solides et reconnaître des figures géométriques"),
                (21, "N", "الجمع باعتماد التقنية الاعتيادية في نطاق الأعداد من 0 إلى 20",
                 "Addition avec la technique usuelle pour les nombres de 0 à 20"),
            ]),
            (2, 27, "الأعداد حتى 99 والجمع", "Les nombres jusqu'à 99 et l'addition", [
                (23, "N", "تعرف الأعداد من 21 إلى 50 قراءة وكتابة وتمثيلا",
                 "Reconnaître les nombres de 21 à 50 : lecture, écriture et représentation"),
                (23, "N", "تعرف الأعداد من 51 إلى 99 قراءة وكتابة وتمثيلا",
                 "Reconnaître les nombres de 51 à 99 : lecture, écriture et représentation"),
                (24, "N", "مقارنة الأعداد من 0 إلى 99", "Comparer les nombres de 0 à 99"),
                (24, "G", "استعمال مسطرة لرسم خط بين نقطتين", "Utiliser la règle pour tracer une ligne entre deux points"),
                (25, "N", "جمع الأعداد من 0 إلى 99 دون احتفاظ", "Addition des nombres de 0 à 99 sans retenue"),
                (25, "M", "تقدير ومقارنة كتل (أثقل، أخف، لهما نفس الكتلة)",
                 "Estimer et comparer des masses (plus lourd, plus léger, même masse)"),
                (26, "N", "جمع الأعداد من 0 إلى 99 بالاحتفاظ (1)", "Addition des nombres de 0 à 99 avec retenue (1)"),
                (26, "D", "تصنيف أشياء حسب معيار واحد", "Classer des objets selon un seul critère"),
            ]),
            (2, 32, "الجمع والطرح حتى 99", "Addition et soustraction jusqu'à 99", [
                (28, "N", "جمع الأعداد من 0 إلى 99 بالاحتفاظ (2)", "Addition des nombres de 0 à 99 avec retenue (2)"),
                (28, "M", "الزمان: تعرف اليوم، الأسبوع، الشهر، السنة", "Le temps : le jour, la semaine, le mois, l'année"),
                (29, "N", "تقريب مفهوم الطرح انطلاقا من أنشطة جمعية وغيرها",
                 "Approcher la notion de soustraction à partir d'activités d'addition et autres"),
                (29, "D", "تنظيم بيانات وعرضها في جدول", "Organiser des données et les présenter dans un tableau"),
                (30, "N", "الطرح دون احتفاظ: التقنية الاعتيادية", "Soustraction sans retenue : la technique usuelle"),
                (30, "G", "رسم الأشكال الهندسية باعتماد التربيعات", "Tracer des figures géométriques sur quadrillage"),
                (31, "N", "حساب فرق عددين دون احتفاظ بتوظيف التقنية الاعتيادية",
                 "Calculer la différence de deux nombres sans retenue avec la technique usuelle"),
                (31, "M", "قراءة الساعة دون دقائق", "Lire l'heure sans les minutes"),
            ]),
        ],
    },
    2: {
        "ar": "السنة الثانية من التعليم الابتدائي",
        "fr": "2e année de l'enseignement primaire",
        "source_pages": {"distribution_pdf": [305, 306], "distribution_printed": [306, 307]},
        "units": [
            (1, 6, "الأعداد حتى 999", "Les nombres jusqu'à 999", [
                (2, "N", "الأعداد من 0 إلى 99", "Les nombres de 0 à 99"),
                (3, "N", "تعرف العدد 100 قراءة وكتابة وتمثيلا", "Reconnaître le nombre 100 : lecture, écriture et représentation"),
                (4, "G", "إنشاء أشكال هندسية على التربيعات: المثلث، المستطيل، المربع",
                 "Construire des figures géométriques sur quadrillage : triangle, rectangle, carré"),
                (5, "N", "تعرف الأعداد من 101 إلى 999 قراءة وكتابة وتمثيلا",
                 "Reconnaître les nombres de 101 à 999 : lecture, écriture et représentation"),
            ]),
            (1, 11, "المقارنة والجمع والطرح حتى 999", "Comparer, additionner et soustraire jusqu'à 999", [
                (7, "N", "مقارنة الأعداد من 0 إلى 999 وترتيبها", "Comparer et ranger les nombres de 0 à 999"),
                (8, "M", "تعرف m و cm واستعمالهما في قياس الأطوال",
                 "Connaître le m et le cm et les utiliser pour mesurer des longueurs"),
                (9, "N", "استعمال التقنية الاعتيادية للجمع (بالاحتفاظ وبدونه) في نطاق الأعداد من 0 إلى 999",
                 "Utiliser la technique usuelle de l'addition (avec et sans retenue) pour les nombres de 0 à 999"),
                (10, "N", "استعمال التقنية الاعتيادية للطرح بدون احتفاظ في نطاق الأعداد من 0 إلى 999",
                 "Utiliser la technique usuelle de la soustraction sans retenue pour les nombres de 0 à 999"),
            ]),
            (1, 16, "الكتل والطرح والضرب", "Masses, soustraction et multiplication", [
                (12, "M", "تقدير وقياس الكتل ب: kg و g", "Estimer et mesurer des masses en kg et g"),
                (13, "N", "استعمال التقنية الاعتيادية للطرح بالاحتفاظ في نطاق الأعداد من 0 إلى 999",
                 "Utiliser la technique usuelle de la soustraction avec retenue pour les nombres de 0 à 999"),
                (14, "N", "تعرف الضرب واستعماله (الجمع المتكرر والكتابة الضربية)",
                 "Connaître la multiplication et l'utiliser (addition répétée et écriture multiplicative)"),
                (15, "N", "تعرف خاصية الضرب في 2 و 5 و 10 وتوظيفها",
                 "Connaître la propriété de la multiplication par 2, 5 et 10 et l'utiliser"),
            ]),
            (2, 22, "جدول الضرب والشبكة", "Tables de multiplication et quadrillage", [
                (18, "N", "تعرف خاصية الضرب في 3 و 4", "Connaître la propriété de la multiplication par 3 et 4"),
                (19, "G", "التنقل على الشبكة (الخانة، المسار، القن، العقدة، المعلمة)",
                 "Se déplacer sur un quadrillage (case, trajet, nœud, repère)"),
                (20, "N", "تعرف خاصية الضرب في 6 و 7 وتوظيفهما",
                 "Connaître la propriété de la multiplication par 6 et 7 et l'utiliser"),
                (21, "D", "حل مسائل بسيطة باستخدام بيانات مأخوذة من جدول",
                 "Résoudre des problèmes simples à partir de données d'un tableau"),
            ]),
            (2, 27, "الضرب والمجسمات والزمن", "Multiplication, solides et temps", [
                (23, "N", "تعرف خاصية الضرب في 8 و 9 وتوظيفهما",
                 "Connaître la propriété de la multiplication par 8 et 9 et l'utiliser"),
                (23, "M", "الزمن: قراءة الساعة العقربية والرقمية بالدقائق (15، 30، 45)",
                 "Le temps : lire l'heure sur une horloge à aiguilles et numérique, en minutes (15, 30, 45)"),
                (24, "N", "الضرب: التقنية الاعتيادية دون احتفاظ في نطاق الأعداد من 0 إلى 999",
                 "Multiplication : la technique usuelle sans retenue pour les nombres de 0 à 999"),
                (24, "G", "الترصيف", "Le pavage"),
                (25, "G", "المجسمات ونشرها: المكعب، متوازي المستطيلات، الأسطوانة، الهرم",
                 "Les solides et leurs patrons : cube, pavé droit, cylindre, pyramide"),
                (25, "M", "تقدير وقياس السعة: l و cl", "Estimer et mesurer la capacité : l et cl"),
                (26, "N", "الضرب: التقنية الاعتيادية دون احتفاظ في نطاق الأعداد من 0 إلى 999",
                 "Multiplication : la technique usuelle sans retenue pour les nombres de 0 à 999"),
                (26, "G", "إنشاء الأشكال الهندسية: المستقيم والقطعة، المثلث",
                 "Construire des figures géométriques : droite et segment, triangle"),
            ]),
            (2, 32, "الجمع والطرح والضرب وحل المسائل", "Addition, soustraction, multiplication et problèmes", [
                (28, "N", "الجمع والطرح والضرب بالاحتفاظ وبدونه في نطاق الأعداد من 0 إلى 999 (1)",
                 "Addition, soustraction et multiplication avec et sans retenue pour les nombres de 0 à 999 (1)"),
                (28, "M", "تقدير وقياس الزمن: اليوم، الأسبوع، الشهر",
                 "Estimer et mesurer le temps : le jour, la semaine, le mois"),
                (29, "N", "الجمع والطرح والضرب بالاحتفاظ وبدونه في نطاق الأعداد من 0 إلى 999 (2)",
                 "Addition, soustraction et multiplication avec et sans retenue pour les nombres de 0 à 999 (2)"),
                (29, "M", "استعمال القطع النقدية والأوراق المالية المتداولة",
                 "Utiliser les pièces de monnaie et les billets en circulation"),
                (30, "G", "الزاوية القائمة", "L'angle droit"),
                (30, "D", "قراءة وتأويل بيانات واردة في جدول", "Lire et interpréter des données d'un tableau"),
                (31, "N", "الجمع والطرح والضرب: حل وضعيات مسائل",
                 "Addition, soustraction et multiplication : résoudre des situations-problèmes"),
                (31, "G", "إنشاء الأشكال الهندسية", "Construire des figures géométriques"),
            ]),
        ],
    },
    3: {
        "ar": "السنة الثالثة من التعليم الابتدائي",
        "fr": "3e année de l'enseignement primaire",
        "source_pages": {"distribution_pdf": [311, 312], "distribution_printed": [312, 313]},
        "units": [
            (1, 6, "الأعداد حتى 999 والضرب", "Les nombres jusqu'à 999 et la multiplication", [
                (2, "N", "الأعداد من 0 إلى 999: قراءة وكتابة ومقارنة وترتيبا",
                 "Les nombres de 0 à 999 : lecture, écriture, comparaison et rangement"),
                (3, "N", "الجمع والطرح في نطاق الأعداد من 0 إلى 999",
                 "Addition et soustraction pour les nombres de 0 à 999"),
                (4, "G", "الأشكال الهندسية: التوازي والتعامد", "Figures géométriques : parallélisme et perpendicularité"),
                (5, "N", "الضرب في عدد مكون من رقم واحد في نطاق الأعداد من 0 إلى 999",
                 "Multiplication par un nombre à un chiffre pour les nombres de 0 à 999"),
            ]),
            (1, 11, "الأعداد حتى 9999 والزوايا", "Les nombres jusqu'à 9999 et les angles", [
                (7, "M", "قياس الأطوال (المتر، أجزاء المتر)", "Mesurer des longueurs (le mètre et ses sous-multiples)"),
                (8, "N", "الأعداد من 0 إلى 9999: قراءة وكتابة ومقارنة وترتيبا",
                 "Les nombres de 0 à 9999 : lecture, écriture, comparaison et rangement"),
                (9, "G", "الزوايا", "Les angles"),
                (10, "N", "الجمع في نطاق الأعداد من 0 إلى 9999: التقنية الاعتيادية",
                 "Addition pour les nombres de 0 à 9999 : la technique usuelle"),
            ]),
            (1, 16, "الطرح والضرب والمحيط", "Soustraction, multiplication et périmètre", [
                (12, "N", "الطرح في نطاق الأعداد من 0 إلى 9999: التقنية الاعتيادية",
                 "Soustraction pour les nombres de 0 à 9999 : la technique usuelle"),
                (13, "N", "الضرب في عدد مكون من رقمين في نطاق الأعداد من 0 إلى 9999",
                 "Multiplication par un nombre à deux chiffres pour les nombres de 0 à 9999"),
                (14, "M", "قياس الأطوال (المتر، مضاعفاته وأجزاؤه)", "Mesurer des longueurs (le mètre, ses multiples et sous-multiples)"),
                (15, "G", "محيط المربع والمستطيل والمثلث", "Périmètre du carré, du rectangle et du triangle"),
            ]),
            (2, 22, "القسمة والأعداد الكسرية", "La division et les nombres fractionnaires", [
                (18, "N", "القسمة: تقديم", "La division : introduction"),
                (19, "N", "القسمة: حساب الخارج المضبوط", "La division : calculer le quotient exact"),
                (20, "N", "الأعداد الكسرية: تقديم، قراءة وكتابة", "Les nombres fractionnaires : introduction, lecture et écriture"),
                (21, "N", "الأعداد الكسرية: مقارنة وترتيب", "Les nombres fractionnaires : comparaison et rangement"),
            ]),
            (2, 27, "العمليات على الأعداد الكسرية والمثلثات", "Opérations sur les nombres fractionnaires et triangles", [
                (23, "N", "جمع الأعداد الكسرية", "Additionner des nombres fractionnaires"),
                (23, "M", "قياس الكتل: الكيلوغرام وأجزاؤه", "Mesurer des masses : le kilogramme et ses sous-multiples"),
                (24, "G", "التماثل المحوري", "La symétrie axiale"),
                (24, "D", "تنظيم وعرض بيانات", "Organiser et présenter des données"),
                (25, "N", "طرح الأعداد الكسرية", "Soustraire des nombres fractionnaires"),
                (25, "M", "قياس الكتل: الكيلوغرام، أجزاؤه ومضاعفاته",
                 "Mesurer des masses : le kilogramme, ses sous-multiples et multiples"),
                (26, "G", "المثلثات: تصنيف وإنشاء", "Les triangles : classement et construction"),
                (26, "M", "قياس الزمن", "Mesurer le temps"),
            ]),
            (2, 32, "القسمة والتناسبية والمجسمات", "Division, proportionnalité et solides", [
                (28, "G", "القرص والدائرة والكرة", "Le disque, le cercle et la sphère"),
                (28, "D", "قراءة وتأويل بيانات", "Lire et interpréter des données"),
                (29, "N", "القسمة على عدد من رقم واحد", "Division par un nombre à un chiffre"),
                (29, "M", "قياس السعة", "Mesurer la capacité"),
                (30, "N", "نحو التناسبية: العلاقات العددية", "Vers la proportionnalité : relations numériques"),
                (30, "G", "المجسمات وخاصياتها", "Les solides et leurs propriétés"),
                (31, "N", "تقديم التناسبية: جدول أعداد متناسبة", "Introduction à la proportionnalité : tableau de nombres proportionnels"),
                (31, "M", "قياس الأطوال والكتل والسعة", "Mesurer des longueurs, des masses et des capacités"),
            ]),
        ],
    },
}

# Own avatar characters (public/avatars/<slug>.svg): slug, Arabic name, French name
AVATARS = [
    ("fox", "الثعلب", "Renard"), ("owl", "البومة", "Chouette"), ("cat", "القط", "Chat"),
    ("bear", "الدب", "Ourson"), ("rabbit", "الأرنب", "Lapin"), ("lion", "الأسد", "Lion"),
    ("turtle", "السلحفاة", "Tortue"), ("robot", "الروبوت", "Robot"),
]

SUBJECT = {"code": "math", "ar": "الرياضيات", "fr": "Mathématiques"}
CURRICULUM = {
    "slug": "ma-primaire-2021",
    "land": "MA",
    "schuljahr_version": "2021-07",
    "name_ar": "المنهاج الدراسي للتعليم الابتدائي (يوليوز 2021)",
    "name_fr": "Curriculum de l'enseignement primaire (juillet 2021)",
    "name": "Maroc – Curriculum de l'enseignement primaire (juillet 2021)",
}


def uid(*parts):
    return str(uuid.uuid5(NS, "/".join(str(p) for p in parts)))


def build():
    cur_id = uid("curriculum", CURRICULUM["slug"])
    subj_id = uid("subject", CURRICULUM["slug"], SUBJECT["code"])
    data = {
        "meta": {
            "source": "المنهاج الدراسي للتعليم الابتدائي – الصيغة النهائية الكاملة، مديرية المناهج، يوليوز 2021",
            "source_file": "source/curriculum_primaire_2021.pdf",
            "quality_legend": {
                "official": "Arabic text taken from the curriculum (spelling normalised)",
                "derived": "Title composed by us (curriculum numbers units but does not name them)",
                "unreviewed": "French translation by us, not yet checked by a native speaker",
            },
        },
        "curriculum": {"id": cur_id, **CURRICULUM},
        "subject": {"id": subj_id, "curriculum_id": cur_id, "code": SUBJECT["code"],
                    "name": {"ar": SUBJECT["ar"], "fr": SUBJECT["fr"]}},
        "domains": {k: {"ar": v[0], "fr": v[1]} for k, v in DOMAINS.items()},
        "avatars": [
            {"id": uid("avatar", slug), "slug": slug, "bild_pfad": f"/avatars/{slug}.svg", "reihenfolge": i,
             "name": {"ar": ar, "fr": fr}}
            for i, (slug, ar, fr) in enumerate(AVATARS, start=1)
        ],
        "grades": [],
    }
    for num, g in GRADES.items():
        grade_id = uid("grade", CURRICULUM["slug"], "primaire", num)
        grade = {"id": grade_id, "curriculum_id": cur_id, "stufe": "primaire", "nummer": num,
                 "name": {"ar": g["ar"], "fr": g["fr"]}, "source_pages": g["source_pages"], "chapters": []}
        for ci, (sem, review_week, t_ar, t_fr, topics) in enumerate(g["units"], start=1):
            ch_slug = f"math-g{num}-u{ci}"
            chapter = {
                "id": uid("chapter", ch_slug), "slug": ch_slug, "grade_id": grade_id,
                "subject_id": subj_id, "reihenfolge": ci, "semester": sem, "review_week": review_week,
                "label": {"ar": f"الوحدة {ci}", "fr": f"Unité {ci}"},
                "title": {"ar": t_ar, "fr": t_fr},
                "topics": [],
            }
            for ti, (week, dom, ar, fr) in enumerate(topics, start=1):
                tslug = f"{ch_slug}-t{ti}"
                chapter["topics"].append({
                    "id": uid("topic", tslug), "slug": tslug, "chapter_id": chapter["id"],
                    "reihenfolge": ti, "week": week, "domain": dom,
                    "title": {"ar": ar, "fr": fr},
                })
            grade["chapters"].append(chapter)
        data["grades"].append(grade)
    return data


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


PLANS_SQL = """-- Free pilot plan (KONZEPT.md §7: pilot is free or paid manually)
insert into plans (slug, name, preis, waehrung, laufzeit_tage, max_kinder)
values ('pilot', 'Pilot (kostenlos)', 0, 'MAD', 365, 3);"""


def to_sql(d):
    out = ["-- TA3LIM seed: Maroc, primaire, Mathématiques, années 1-3 (+ pilot plan)",
           "-- Generated by data/curriculum/build.py. Do not edit by hand. Ids are deterministic (uuid v5).",
           "-- translations.quality: official | derived | unreviewed", "begin;", ""]
    c = d["curriculum"]
    out.append("insert into curricula (id, slug, land, name, schuljahr_version) values "
               f"({q(c['id'])}, {q(c['slug'])}, {q(c['land'])}, {q(c['name'])}, {q(c['schuljahr_version'])});")
    trans = []

    def tr(etype, eid, field, ar, fr, ar_q="official", fr_q="unreviewed"):
        trans.append((etype, eid, "ar", field, ar, ar_q))
        trans.append((etype, eid, "fr", field, fr, fr_q))

    tr("curriculum", c["id"], "name", c["name_ar"], c["name_fr"])
    s = d["subject"]
    out.append(f"insert into subjects (id, curriculum_id, code) values ({q(s['id'])}, {q(c['id'])}, {q(s['code'])});")
    tr("subject", s["id"], "name", s["name"]["ar"], s["name"]["fr"])
    for g in d["grades"]:
        out.append(f"insert into grades (id, curriculum_id, stufe, nummer) values "
                   f"({q(g['id'])}, {q(c['id'])}, {q(g['stufe'])}, {g['nummer']});")
        tr("grade", g["id"], "name", g["name"]["ar"], g["name"]["fr"])
        for ch in g["chapters"]:
            out.append("insert into chapters (id, slug, grade_id, subject_id, reihenfolge, semester, review_week) values "
                       f"({q(ch['id'])}, {q(ch['slug'])}, {q(g['id'])}, {q(s['id'])}, {ch['reihenfolge']}, "
                       f"{ch['semester']}, {ch['review_week']});")
            tr("chapter", ch["id"], "label", ch["label"]["ar"], ch["label"]["fr"])
            tr("chapter", ch["id"], "title", ch["title"]["ar"], ch["title"]["fr"], "derived", "unreviewed")
            for t in ch["topics"]:
                out.append("insert into topics (id, slug, chapter_id, reihenfolge, week, domain) values "
                           f"({q(t['id'])}, {q(t['slug'])}, {q(ch['id'])}, {t['reihenfolge']}, {t['week']}, "
                           f"{q(DOMAIN_ENUM[t['domain']])});")
                tr("topic", t["id"], "title", t["title"]["ar"], t["title"]["fr"])
    for a in d["avatars"]:
        out.append("insert into avatars (id, slug, bild_pfad, reihenfolge) values "
                   f"({q(a['id'])}, {q(a['slug'])}, {q(a['bild_pfad'])}, {a['reihenfolge']});")
        tr("avatar", a["id"], "name", a["name"]["ar"], a["name"]["fr"], "derived", "unreviewed")
    out.append("")
    out.append("insert into translations (entity_type, entity_id, sprache, feld, text, quality) values")
    out.append(",\n".join(f"  ({q(e)}, {q(i)}, {q(l)}, {q(f)}, {q(t)}, {q(qu)})" for e, i, l, f, t, qu in trans) + ";")
    out += ["", PLANS_SQL, "", "commit;", ""]
    return "\n".join(out)


if __name__ == "__main__":
    d = build()
    (HERE / "curriculum.json").write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    SEED_PATH.write_text(to_sql(d), encoding="utf-8")
    n_ch = sum(len(g["chapters"]) for g in d["grades"])
    n_t = sum(len(c["topics"]) for g in d["grades"] for c in g["chapters"])
    print(f"grades={len(d['grades'])} chapters={n_ch} topics={n_t}")
