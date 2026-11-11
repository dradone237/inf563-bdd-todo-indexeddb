# language: fr
@persistance
Fonctionnalité: Sauvegarde des projets et des tâches dans IndexedDB
  Afin de retrouver mon travail après avoir fermé ou rechargé la page
  En tant qu'utilisateur de l'application To-Do
  Je veux que mes projets et mes tâches soient enregistrés dans le navigateur

  Scénario: Une nouvelle base est vide
    Soit j'ouvre l'application To-Do avec une base vide
    Alors la liste des tâches est vide
    Et le compteur indique "Aucune tâche"
    Et la base IndexedDB ne contient aucun projet
    Et la base IndexedDB ne contient aucune tâche

  Scénario: Les données survivent au rechargement de la page
    Soit j'ouvre l'application To-Do avec une base vide
    Et le projet "Maison" existe
    Et la tâche "Arroser les plantes" existe dans le projet "Maison"
    Et je coche la tâche "Arroser les plantes"
    Quand je recharge la page
    Alors la tâche "Arroser les plantes" est affichée dans le projet "Maison"
    Et la tâche "Arroser les plantes" est marquée comme terminée

  Scénario: Les données survivent à la fermeture de l'onglet
    Soit j'ouvre l'application To-Do avec une base vide
    Et le projet "Travail" existe
    Et la tâche "Envoyer le compte rendu" existe dans le projet "Travail"
    Quand je ferme l'onglet et j'ouvre l'application dans un nouvel onglet
    Alors la tâche "Envoyer le compte rendu" est affichée dans le projet "Travail"

  Scénario: L'application affiche les données déjà présentes dans IndexedDB
    Soit la base IndexedDB contient déjà :
      | tâche                   | projet  | terminée |
      | Préparer la réunion     | Travail | non      |
      | Envoyer le compte rendu | Travail | oui      |
      | Réparer le robinet      | Maison  | non      |
    Quand j'ouvre l'application To-Do
    Alors je vois uniquement les tâches :
      | Préparer la réunion     |
      | Envoyer le compte rendu |
      | Réparer le robinet      |
    Et la tâche "Envoyer le compte rendu" est marquée comme terminée
    Et le compteur indique "3 tâches, dont 1 terminée"
