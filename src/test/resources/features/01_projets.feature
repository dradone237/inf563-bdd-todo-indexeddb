# language: fr
@projets
Fonctionnalité: Organiser mes tâches par projet
  Afin de séparer mes différentes activités
  En tant qu'utilisateur de l'application To-Do
  Je veux créer des projets auxquels mes tâches appartiennent

  Contexte:
    Soit j'ouvre l'application To-Do avec une base vide

  Scénario: Créer un projet
    Quand je crée le projet "Mémoire M2"
    Alors le projet "Mémoire M2" apparaît dans la liste des projets
    Et la base IndexedDB contient exactement les projets :
      | Mémoire M2 |

  Scénario: Refuser un projet sans nom
    Quand je crée le projet "   "
    Alors le message "Le nom du projet est obligatoire." s'affiche
    Et la base IndexedDB ne contient aucun projet

  Plan du scénario: Refuser un projet en double (<cas>)
    Soit le projet "Maison" existe
    Quand je crée le projet "<nom saisi>"
    Alors le message "Le projet « Maison » existe déjà." s'affiche
    Et la base IndexedDB contient exactement les projets :
      | Maison |

    Exemples:
      | cas                 | nom saisi   |
      | même nom            | Maison      |
      | casse différente    | maison      |
      | majuscules          | MAISON      |

  Scénario: Refuser un projet en double saisi avec des espaces autour
    Soit le projet "Maison" existe
    Quand je crée le projet "  Maison  "
    Alors le message "Le projet « Maison » existe déjà." s'affiche
    Et la base IndexedDB contient exactement les projets :
      | Maison |

  Scénario: Filtrer les tâches par projet
    Soit le projet "Maison" existe
    Et le projet "Travail" existe
    Et la tâche "Faire les courses" existe dans le projet "Maison"
    Et la tâche "Écrire le rapport" existe dans le projet "Travail"
    Et la tâche "Préparer la soutenance" existe dans le projet "Travail"
    Quand je sélectionne le projet "Travail"
    Alors je vois uniquement les tâches :
      | Écrire le rapport      |
      | Préparer la soutenance |
    Quand je sélectionne tous les projets
    Alors je vois uniquement les tâches :
      | Faire les courses      |
      | Écrire le rapport      |
      | Préparer la soutenance |

  Scénario: Supprimer un projet supprime aussi ses tâches
    Soit le projet "Maison" existe
    Et le projet "Travail" existe
    Et la tâche "Faire les courses" existe dans le projet "Maison"
    Et la tâche "Écrire le rapport" existe dans le projet "Travail"
    Quand je supprime le projet "Maison"
    Alors le projet "Maison" n'apparaît plus dans la liste des projets
    Et je vois uniquement les tâches :
      | Écrire le rapport |
    Et la base IndexedDB contient exactement les tâches :
      | tâche             | projet  | terminée |
      | Écrire le rapport | Travail | non      |
