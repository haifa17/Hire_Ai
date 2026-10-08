# Données ESCO

Ce dossier accueille l'export CSV officiel d'ESCO (European Skills, Competences,
Qualifications and Occupations), téléchargeable gratuitement sur :

https://esco.ec.europa.eu/en/use-esco/download

Télécharger le "classification package" au format CSV (v1.2.0 ou plus récent) et
placer ici les deux fichiers suivants (renommer si besoin) :

- `skills.csv` — colonnes attendues : `conceptUri`, `preferredLabel`, `altLabels`,
  `description`, `skillType` (`skill/competence` ou `knowledge`)
- `occupations.csv` — colonnes attendues : `conceptUri`, `preferredLabel`,
  `altLabels`, `description`

Ces fichiers ne sont **pas** commités dans le dépôt (voir `.gitignore`). Une fois
déposés, lancer :

```bash
python -m app.scripts.import_esco
```

pour peupler la table `skills_taxonomy` (colonnes `esco_uri`, `esco_type`,
`preferred_label_en`, `preferred_label_fr`).

Si ce dossier est vide ou les fichiers absents, le moteur de matching bascule
automatiquement sur la taxonomie custom existante (`SKILL_ALIASES` +
`skills_taxonomy` sans données ESCO) — voir `app/agents/matching/rule_based/esco_taxonomy.py`.
