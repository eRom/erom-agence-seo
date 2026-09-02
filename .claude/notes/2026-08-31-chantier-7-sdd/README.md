# Journal d'exécution du chantier 7 (protocole subagent-driven)

Sauvé ici le 02/09 avant le retrait du worktree `/Users/recarnot/dev/erom-seo-chantier-7`,
où ces fichiers vivaient sous `.superpowers/sdd/` sans être versionnés. Le retrait du
worktree les aurait détruits.

- `progress.md` : le ledger du chantier, les 26 décisions prises en cours d'exécution,
  chacune avec son coût si elle est fausse. C'est la pièce à lire en premier.
- `contraintes.md`, `revue-plan.md`, `final-fix-report.md` : le cadrage et les revues.
- `task-N-brief.md` / `task-N-report.md` : ce qui a été demandé à chaque implémenteur
  et ce qu'il a rendu.

**Les 14 fichiers `review-<sha>..<sha>.diff` n'ont pas été copiés** : ils sont
regénérables, tous les commits étant désormais dans `main`. Par exemple :

```bash
git diff 09ab9bb..368a81c
```
