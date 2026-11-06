# language: fr
@taches
Fonctionnalité: Gérer les tâches d'un projet
  Afin de ne rien oublier
  En tant qu'utilisateur de l'application To-Do
  Je veux ajouter, modifier, terminer et supprimer des tâches rattachées à un projet

  Contexte:
    Soit j'ouvre l'application To-Do avec une base vide
    Et le projet "Maison" existe
    Et le projet "Travail" existe

  Scénario: Ajouter une tâche dans un projet
    Quand j'ajoute la tâche "Payer la facture ENEO" dans le projet "Maison"
    Alors la tâche "Payer la facture ENEO" est affichée dans le projet "Maison"
    Et le compteur indique "1 tâche, dont 0 terminée"
    Et la base IndexedDB contient exactement les tâches :
      | tâche                 | projet | terminée |
      | Payer la facture ENEO | Maison | non      |

  Plan du scénario: Refuser une tâche invalide (<cas>)
    Quand j'ajoute la tâche "<titre>" dans le projet "<projet>"
    Alors le message "<message>" s'affiche
    Et la base IndexedDB ne contient aucune tâche

    Exemples:
      | cas                | titre           | projet | message                               |
      | titre vide         |                 | Maison | Le titre de la tâche est obligatoire. |
      | sans projet        | Acheter du pain |        | Choisissez un projet pour la tâche.   |
      | ni titre ni projet |                 |        | Le titre de la tâche est obligatoire. |

  Scénario: Refuser une tâche dont le titre ne contient que des espaces
    Quand j'ajoute la tâche "    " dans le projet "Maison"
    Alors le message "Le titre de la tâche est obligatoire." s'affiche
    Et la base IndexedDB ne contient aucune tâche

  Scénario: Modifier le titre d'une tâche
    Soit la tâche "Apeler le plombier" existe dans le projet "Maison"
    Quand je renomme la tâche "Apeler le plombier" en "Appeler le plombier"
    Alors la tâche "Appeler le plombier" est affichée dans le projet "Maison"
    Et la tâche "Apeler le plombier" n'est plus affichée
    Et la base IndexedDB contient exactement les tâches :
      | tâche               | projet | terminée |
      | Appeler le plombier | Maison | non      |

  Scénario: Déplacer une tâche vers un autre projet
    Soit la tâche "Réviser le chapitre 4" existe dans le projet "Maison"
    Quand je déplace la tâche "Réviser le chapitre 4" vers le projet "Travail"
    Alors la tâche "Réviser le chapitre 4" est affichée dans le projet "Travail"
    Et la base IndexedDB contient exactement les tâches :
      | tâche                 | projet  | terminée |
      | Réviser le chapitre 4 | Travail | non      |

  Scénario: Une modification avec un titre vide est refusée
    Soit la tâche "Laver la voiture" existe dans le projet "Maison"
    Quand je renomme la tâche "Laver la voiture" en ""
    Alors le message "Le titre de la tâche est obligatoire." s'affiche
    Et la base IndexedDB contient exactement les tâches :
      | tâche            | projet | terminée |
      | Laver la voiture | Maison | non      |

  Scénario: Annuler une modification ne change rien
    Soit la tâche "Laver la voiture" existe dans le projet "Maison"
    Quand je commence à renommer la tâche "Laver la voiture" en "Autre chose" puis j'annule
    Alors la tâche "Laver la voiture" est affichée dans le projet "Maison"
    Et la tâche "Autre chose" n'est plus affichée

  Scénario: Marquer une tâche comme terminée puis la réouvrir
    Soit la tâche "Rendre le devoir BDD" existe dans le projet "Travail"
    Quand je coche la tâche "Rendre le devoir BDD"
    Alors la tâche "Rendre le devoir BDD" est marquée comme terminée
    Et le compteur indique "1 tâche, dont 1 terminée"
    Et la base IndexedDB contient exactement les tâches :
      | tâche                | projet  | terminée |
      | Rendre le devoir BDD | Travail | oui      |
    Quand je décoche la tâche "Rendre le devoir BDD"
    Alors la tâche "Rendre le devoir BDD" n'est pas marquée comme terminée

  Scénario: Supprimer une tâche
    Soit la tâche "Faire les courses" existe dans le projet "Maison"
    Et la tâche "Ranger le bureau" existe dans le projet "Maison"
    Quand je supprime la tâche "Faire les courses"
    Alors je vois uniquement les tâches :
      | Ranger le bureau |
    Et la base IndexedDB contient exactement les tâches :
      | tâche            | projet | terminée |
      | Ranger le bureau | Maison | non      |

  Scénario: Un titre contenant du HTML est affiché tel quel
    Quand j'ajoute la tâche "<b>urgent</b> & important" dans le projet "Travail"
    Alors la tâche "<b>urgent</b> & important" est affichée dans le projet "Travail"
