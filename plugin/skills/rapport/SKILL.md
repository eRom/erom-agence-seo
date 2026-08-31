---
name: rapport
description: Rapport d'audit SEO destiné au client final, en HTML autonome imprimable. Lit un audit déjà sur disque et le reformule sans jargon autour d'une seule action à faire dans la semaine. Ne collecte rien, ne corrige rien. Triggers : '/erom-seo:rapport', 'fais le rapport pour le client', 'le livrable client', 'un rapport présentable', 'envoyer l'audit au client'.
argument-hint: "[dossier d'audit] [--rendre-seul]"
---

# Rapport client

Tu produis un document que le client lit seul, sans toi, et sur lequel il agit. Il ne connaît pas le SEO. Tu ne peux rien affirmer qui ne soit pas déjà dans `report.md` : tu le dis autrement.

## 1. Préparer

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/rapport/scripts/rapport.ts --preparer [dossier]
```

Sans dossier, le dernier audit sous `seo/audits/` est pris. La sortie donne le site, la date, les trouvailles graves avec leur pourquoi et leur correctif, les points forts, et le nombre de points mineurs à annoncer.

Si aucun audit n'existe, la commande le dit : lancer `/erom-seo:audit <url>` d'abord.

## 2. Écrire

Écrire `<dossier>/rapport-client.md` d'après `references/gabarit.md`, en appliquant `references/registre.md`.

Le travail de jugement tient en trois gestes :
- **Choisir l'action.** Une seule, faisable dans la semaine par quelqu'un qui n'est pas technicien, avec le geste exact et le texte prêt à coller quand c'est possible. Elle se déduit des trouvailles, jamais d'un conseil générique.
- **Regrouper.** Trois trouvailles de balises se disent en un paragraphe. Le commentaire `<!-- couvre: TAG-01, TAG-02, TAG-04 -->` porte les identifiants ; le client ne les voit jamais.
- **Gloser.** Chaque terme technique est expliqué en une demi-phrase à sa première apparition.

Toutes les trouvailles Critique et Important doivent être couvertes. Aucune Mineur ni Info ne doit l'être : leur nombre suffit, dans la section Méthode.

## 3. Relire

Relire le texte en cherchant cinq défauts précis, dans cet ordre.

1. **Un identifiant déclaré dans un `couvre:` dont le texte ne parle pas.** Pour chacun, retrouve la phrase qui le porte. Si elle n'existe pas, écris-la ; ne retire jamais l'identifiant pour faire passer le lint. C'est le seul défaut qu'aucune commande ne peut voir : la couverture est un pointage d'identifiant, pas une correspondance de contenu, et un rapport peut donc déclarer traiter une trouvaille dont il ne dit pas un mot.
2. Une affirmation qui va au-delà de la preuve.
3. Un terme technique non glosé.
4. Un passage qui submerge un débutant.
5. Une dramatisation.

Corriger avant de rendre.

## 4. Rendre

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/rapport/scripts/rapport.ts --rendre <dossier>
```

Le lint passe d'abord ; s'il refuse, il nomme chaque point et rien n'est écrit. Corriger le Markdown et relancer.

Afficher ensuite le chemin du HTML, et dire au client ce qu'il en fait : l'ouvrir d'un double-clic, l'imprimer en PDF par Cmd+P. Après une correction manuelle du Markdown, `--rendre-seul <dossier>` refait le HTML sans repasser par les temps 1 à 3.
