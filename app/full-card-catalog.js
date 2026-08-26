export const FULL_PROJECTS = [
  {
    "id": "card-base-acquired-company",
    "name": "Acquired Company",
    "expansion": "base",
    "source": "src/server/cards/base/AcquiredCompany.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        }
      }
    }
  },
  {
    "id": "card-base-adaptation-technology",
    "name": "Adaptation Technology",
    "expansion": "base",
    "source": "src/server/cards/base/AdaptationTechnology.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: Your global requirements are +2 or -2 steps, your choice in each case.",
    "victoryPoints": 1,
    "effectSpec": {
      "globalParameterRequirementBonus": {
        "steps": 2
      }
    }
  },
  {
    "id": "card-base-adapted-lichen",
    "name": "Adapted Lichen",
    "expansion": "base",
    "source": "src/server/cards/base/AdaptedLichen.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-advanced-alloys",
    "name": "Advanced Alloys",
    "expansion": "base",
    "source": "src/server/cards/base/AdvancedAlloys.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: Each titanium you have is worth 1 M€ extra. Effect: Each steel you have is worth 1 M€ extra.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "steelValue": 1,
        "titanumValue": 1
      }
    }
  },
  {
    "id": "card-base-advanced-ecosystems",
    "name": "Advanced Ecosystems",
    "expansion": "base",
    "source": "src/server/cards/base/AdvancedEcosystems.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Plant",
      "Microbe",
      "Animal"
    ],
    "requirements": [
      {
        "tag": "plant"
      },
      {
        "tag": "animal"
      },
      {
        "tag": "microbe"
      }
    ],
    "reqText": "[{\"tag\":\"plant\"},{\"tag\":\"animal\"},{\"tag\":\"microbe\"}]",
    "effectText": "Requires a plant tag, a microbe tag, and an animal tag.",
    "victoryPoints": 3,
    "effectSpec": {}
  },
  {
    "id": "card-base-aerobraked-ammonia-asteroid",
    "name": "Aerobraked Ammonia Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/AerobrakedAmmoniaAsteroid.ts",
    "type": "event",
    "cost": 26,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 3 steps and your plant production 1 step. Add 2 microbes to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 3,
          "plants": 1
        },
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Microbe"
        }
      }
    }
  },
  {
    "id": "card-base-ai-central",
    "name": "AI Central",
    "expansion": "base",
    "source": "src/server/cards/base/AICentral.ts",
    "type": "active",
    "cost": 21,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Action: Draw 2 cards. Requires 3 science tags to play. Decrease your energy production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        }
      },
      "action": {
        "drawCard": {
          "count": 2
        }
      }
    }
  },
  {
    "id": "card-base-algae",
    "name": "Algae",
    "expansion": "base",
    "source": "src/server/cards/base/Algae.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oceans": 5,
        "count": 5
      }
    ],
    "reqText": "[{\"oceans\":5,\"count\":5}]",
    "effectText": "Requires 5 ocean tiles. Gain 1 plant and increase your plant production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2
        },
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-anti-gravity-technology",
    "name": "Anti-Gravity Technology",
    "expansion": "base",
    "source": "src/server/cards/base/AntiGravityTechnology.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 7
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":7}]",
    "effectText": "Requires 7 science tags.",
    "victoryPoints": 3,
    "effectSpec": {
      "cardDiscount": {
        "amount": 2
      }
    }
  },
  {
    "id": "card-base-ants",
    "name": "Ants",
    "expansion": "base",
    "source": "src/server/cards/base/Ants.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "oxygen": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"count\":4}]",
    "effectText": "Requires 4% oxygen.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {}
  },
  {
    "id": "card-base-aquifer-pumping",
    "name": "Aquifer Pumping",
    "expansion": "base",
    "source": "src/server/cards/base/AquiferPumping.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 8 M€ to place 1 ocean tile. STEEL MAY BE USED as if you were playing a building card.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-archaebacteria",
    "name": "ArchaeBacteria",
    "expansion": "base",
    "source": "src/server/cards/base/ArchaeBacteria.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "temperature": -18,
        "max": true,
        "count": -18
      }
    ],
    "reqText": "[{\"temperature\":-18,\"max\":true,\"count\":-18}]",
    "effectText": "It must be -18 C or colder. Increase your plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-arctic-algae",
    "name": "Arctic Algae",
    "expansion": "base",
    "source": "src/server/cards/base/ArcticAlgae.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -12,
        "max": true,
        "count": -12
      }
    ],
    "reqText": "[{\"temperature\":-12,\"max\":true,\"count\":-12}]",
    "effectText": "It must be -12 C or colder to play. Gain 1 plant.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-artificial-lake",
    "name": "Artificial Lake",
    "expansion": "base",
    "source": "src/server/cards/base/ArtificialLake.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "temperature": -6,
        "count": -6
      }
    ],
    "reqText": "[{\"temperature\":-6,\"count\":-6}]",
    "effectText": "Requires -6 C or warmer. Place 1 ocean tile ON AN AREA NOT RESERVED FOR OCEAN.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "ocean": {
          "on": "land"
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-artificial-photosynthesis",
    "name": "Artificial Photosynthesis",
    "expansion": "base",
    "source": "src/server/cards/base/ArtificialPhotosynthesis.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step or your energy production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "production": {
                "energy": 2
              },
              "title": "Increase your energy production 2 steps"
            },
            {
              "production": {
                "plants": 1
              },
              "title": "Increase your plant production 1 step"
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-base-asteroid",
    "name": "Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/Asteroid.ts",
    "type": "event",
    "cost": 14,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 1 step and gain 2 titanium. Remove up to 3 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 2
        },
        "global": {
          "temperature": 1
        },
        "removeAnyPlants": 3
      }
    }
  },
  {
    "id": "card-base-asteroid-mining",
    "name": "Asteroid Mining",
    "expansion": "base",
    "source": "src/server/cards/base/AsteroidMining.ts",
    "type": "automated",
    "cost": 30,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 2 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 2
        }
      }
    }
  },
  {
    "id": "card-base-asteroid-mining-consortium",
    "name": "Asteroid Mining Consortium",
    "expansion": "base",
    "source": "src/server/cards/base/AsteroidMiningConsortium.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Jovian"
    ],
    "requirements": [
      {
        "production": "titanium",
        "count": 1
      }
    ],
    "reqText": "[{\"production\":\"titanium\",\"count\":1}]",
    "effectText": "Requires that you have titanium production. Decrease any titanium production 1 step and increase your own 1 step.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-beam-from-a-thorium-asteroid",
    "name": "Beam From A Thorium Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/BeamFromAThoriumAsteroid.ts",
    "type": "automated",
    "cost": 32,
    "tags": [
      "Jovian",
      "Space",
      "Power"
    ],
    "requirements": [
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"jovian\"}]",
    "effectText": "Requires a Jovian tag. Increase your heat production and energy production 3 steps each.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 3,
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-base-big-asteroid",
    "name": "Big Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/BigAsteroid.ts",
    "type": "event",
    "cost": 27,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 2 steps and gain 4 titanium. Remove up to 4 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 4
        },
        "global": {
          "temperature": 2
        },
        "removeAnyPlants": 4
      }
    }
  },
  {
    "id": "card-base-biomass-combustors",
    "name": "Biomass Combustors",
    "expansion": "base",
    "source": "src/server/cards/base/BiomassCombustors.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"oxygen\":6,\"count\":6}]",
    "effectText": "Requires 6% oxygen. Decrease any plant production 1 step and increase your energy production 2 steps.",
    "victoryPoints": -1,
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 1
        },
        "production": {
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-base-birds",
    "name": "Birds",
    "expansion": "base",
    "source": "src/server/cards/base/Birds.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oxygen": 13,
        "count": 13
      }
    ],
    "reqText": "[{\"oxygen\":13,\"count\":13}]",
    "effectText": "Action: Add an animal to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 2
        }
      },
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-black-polar-dust",
    "name": "Black Polar Dust",
    "expansion": "base",
    "source": "src/server/cards/base/BlackPolarDust.ts",
    "type": "automated",
    "cost": 15,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place an ocean tile. Decrease your M€ production 2 steps and increase your heat production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {},
        "production": {
          "megacredits": -2,
          "heat": 3
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-breathing-filters",
    "name": "Breathing Filters",
    "expansion": "base",
    "source": "src/server/cards/base/BreathingFilters.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "oxygen": 7,
        "count": 7
      }
    ],
    "reqText": "[{\"oxygen\":7,\"count\":7}]",
    "effectText": "Requires 7% oxygen.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-base-bribed-committee",
    "name": "Bribed Committee",
    "expansion": "base",
    "source": "src/server/cards/base/BribedCommittee.ts",
    "type": "event",
    "cost": 7,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 2 steps.",
    "victoryPoints": -2,
    "effectSpec": {
      "behavior": {
        "tr": 2
      }
    }
  },
  {
    "id": "card-base-building-industries",
    "name": "Building Industries",
    "expansion": "base",
    "source": "src/server/cards/base/BuildingIndustries.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your steel production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "steel": 2
        }
      }
    }
  },
  {
    "id": "card-base-bushes",
    "name": "Bushes",
    "expansion": "base",
    "source": "src/server/cards/base/Bushes.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -10,
        "count": -10
      }
    ],
    "reqText": "[{\"temperature\":-10,\"count\":-10}]",
    "effectText": "Requires -10 C or warmer. Increase your plant production 2 steps. Gain 2 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2
        },
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-business-contacts",
    "name": "Business Contacts",
    "expansion": "base",
    "source": "src/server/cards/base/BusinessContacts.ts",
    "type": "event",
    "cost": 7,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Look at the top 4 cards from the deck. Take 2 of them into hand and discard the other 2.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 4,
          "keep": 2
        }
      }
    }
  },
  {
    "id": "card-base-business-network",
    "name": "Business Network",
    "expansion": "base",
    "source": "src/server/cards/base/BusinessNetwork.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -1
        }
      },
      "action": {
        "drawCard": {
          "count": 1,
          "pay": true
        }
      }
    }
  },
  {
    "id": "card-base-callisto-penal-mines",
    "name": "Callisto Penal Mines",
    "expansion": "base",
    "source": "src/server/cards/base/CallistoPenalMines.ts",
    "type": "automated",
    "cost": 24,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 3 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        }
      }
    }
  },
  {
    "id": "card-base-capital",
    "name": "Capital",
    "expansion": "base",
    "source": "src/server/cards/base/Capital.ts",
    "type": "automated",
    "cost": 26,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "oceans": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oceans\":4,\"count\":4}]",
    "effectText": "Requires 4 ocean tiles. Place this tile. Decrease your energy production 2 steps and increase your M€ production 5 steps.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "oceans": {},
      "nextToThis": {}
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -2,
          "megacredits": 5
        },
        "tile": {
          "type": 3,
          "on": "city",
          "title": "Select space for special city tile"
        }
      }
    }
  },
  {
    "id": "card-base-carbonate-processing",
    "name": "Carbonate Processing",
    "expansion": "base",
    "source": "src/server/cards/base/CarbonateProcessing.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your heat production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "heat": 3
        }
      }
    }
  },
  {
    "id": "card-base-caretaker-contract",
    "name": "Caretaker Contract",
    "expansion": "base",
    "source": "src/server/cards/base/CaretakerContract.ts",
    "type": "active",
    "cost": 3,
    "tags": [],
    "requirements": [
      {
        "temperature": 0,
        "count": 0
      }
    ],
    "reqText": "[{\"temperature\":0,\"count\":0}]",
    "effectText": "Requires 0° C or warmer.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "heat": 8
        },
        "tr": 1
      }
    }
  },
  {
    "id": "card-base-cartel",
    "name": "Cartel",
    "expansion": "base",
    "source": "src/server/cards/base/Cartel.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each Earth tag you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "earth"
          }
        }
      }
    }
  },
  {
    "id": "card-base-ceo-s-favorite-project",
    "name": "CEO's Favorite Project",
    "expansion": "base",
    "source": "src/server/cards/base/CEOsFavoriteProject.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 1 resource to a card with at least 1 resource on it",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "count": 1,
          "min": 1,
          "mustHaveCard": true,
          "robotCards": true
        }
      }
    }
  },
  {
    "id": "card-base-cloud-seeding",
    "name": "Cloud Seeding",
    "expansion": "base",
    "source": "src/server/cards/base/CloudSeeding.ts",
    "type": "automated",
    "cost": 11,
    "tags": [],
    "requirements": [
      {
        "oceans": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"count\":3}]",
    "effectText": "Requires 3 ocean tiles. Decrease your M€ production 1 step and any heat production 1 step. Increase your plant production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -1,
          "plants": 2
        },
        "decreaseAnyProduction": {
          "type": "heat",
          "count": 1
        }
      }
    }
  },
  {
    "id": "card-base-colonizer-training-camp",
    "name": "Colonizer Training Camp",
    "expansion": "base",
    "source": "src/server/cards/base/ColonizerTrainingCamp.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Jovian",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 5,
        "max": true,
        "count": 5
      }
    ],
    "reqText": "[{\"oxygen\":5,\"max\":true,\"count\":5}]",
    "effectText": "Oxygen must be 5% or less.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-base-comet",
    "name": "Comet",
    "expansion": "base",
    "source": "src/server/cards/base/Comet.ts",
    "type": "event",
    "cost": 21,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 1 step and place an ocean tile. Remove up to 3 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 1
        },
        "ocean": {},
        "removeAnyPlants": 3
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-commercial-district",
    "name": "Commercial District",
    "expansion": "base",
    "source": "src/server/cards/base/CommercialDistrict.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile. Decrease your energy production 1 step and increase your M€ production 4 steps.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "cities": {},
      "nextToThis": {}
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 4
        },
        "tile": {
          "type": 4,
          "on": "land"
        }
      }
    }
  },
  {
    "id": "card-base-convoy-from-europa",
    "name": "Convoy From Europa",
    "expansion": "base",
    "source": "src/server/cards/base/ConvoyFromEuropa.ts",
    "type": "event",
    "cost": 15,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 1 ocean tile and draw 1 card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {},
        "drawCard": 1
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-corporate-stronghold",
    "name": "Corporate Stronghold",
    "expansion": "base",
    "source": "src/server/cards/base/CorporateStronghold.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your M€ production 3 steps. Place a city tile.",
    "victoryPoints": -2,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 3
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-cupola-city",
    "name": "Cupola City",
    "expansion": "base",
    "source": "src/server/cards/base/CupolaCity.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 9,
        "max": true,
        "count": 9
      }
    ],
    "reqText": "[{\"oxygen\":9,\"max\":true,\"count\":9}]",
    "effectText": "Oxygen must be 9% or less. Place a city tile. Decrease your energy production 1 step and increase your M€ production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 3
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-decomposers",
    "name": "Decomposers",
    "expansion": "base",
    "source": "src/server/cards/base/Decomposers.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "oxygen": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"oxygen\":3,\"count\":3}]",
    "effectText": "Requires 3% oxygen.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 3
    },
    "effectSpec": {}
  },
  {
    "id": "card-base-deep-well-heating",
    "name": "Deep Well Heating",
    "expansion": "base",
    "source": "src/server/cards/base/DeepWellHeating.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step. Increase temperature 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        },
        "global": {
          "temperature": 1
        }
      }
    }
  },
  {
    "id": "card-base-deimos-down",
    "name": "Deimos Down",
    "expansion": "base",
    "source": "src/server/cards/base/DeimosDown.ts",
    "type": "event",
    "cost": 31,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 3 steps and gain 4 steel. Remove up to 8 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 4
        },
        "global": {
          "temperature": 3
        },
        "removeAnyPlants": 8
      }
    }
  },
  {
    "id": "card-base-designed-microorganisms",
    "name": "Designed Microorganisms",
    "expansion": "base",
    "source": "src/server/cards/base/DesignedMicroOrganisms.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "Science",
      "Microbe"
    ],
    "requirements": [
      {
        "temperature": -14,
        "max": true,
        "count": -14
      }
    ],
    "reqText": "[{\"temperature\":-14,\"max\":true,\"count\":-14}]",
    "effectText": "It must be -14 C or colder. Increase your plant production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-development-center",
    "name": "Development Center",
    "expansion": "base",
    "source": "src/server/cards/base/DevelopmentCenter.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 energy to draw a card.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 1
        },
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-base-domed-crater",
    "name": "Domed Crater",
    "expansion": "base",
    "source": "src/server/cards/base/DomedCrater.ts",
    "type": "automated",
    "cost": 24,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 7,
        "max": true,
        "count": 7
      }
    ],
    "reqText": "[{\"oxygen\":7,\"max\":true,\"count\":7}]",
    "effectText": "Oxygen must be 7% or less. Gain 3 plants. Place a city tile. Decrease your energy production 1 step and increase your M€ production 3 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 3
        },
        "stock": {
          "plants": 3
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-dust-seals",
    "name": "Dust Seals",
    "expansion": "base",
    "source": "src/server/cards/base/DustSeals.ts",
    "type": "automated",
    "cost": 2,
    "tags": [],
    "requirements": [
      {
        "oceans": 3,
        "max": true,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"max\":true,\"count\":3}]",
    "effectText": "Requires 3 or less ocean tiles.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-earth-catapult",
    "name": "Earth Catapult",
    "expansion": "base",
    "source": "src/server/cards/base/EarthCatapult.ts",
    "type": "active",
    "cost": 23,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a card, you pay 2 M€ less for it.",
    "victoryPoints": 2,
    "effectSpec": {
      "cardDiscount": {
        "amount": 2
      }
    }
  },
  {
    "id": "card-base-earth-office",
    "name": "Earth Office",
    "expansion": "base",
    "source": "src/server/cards/base/EarthOffice.ts",
    "type": "active",
    "cost": 1,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play an Earth tag, you pay 3 M€ less for it.",
    "victoryPoints": 0,
    "effectSpec": {
      "cardDiscount": {
        "tag": "earth",
        "amount": 3
      }
    }
  },
  {
    "id": "card-base-ecological-zone",
    "name": "Ecological Zone",
    "expansion": "base",
    "source": "src/server/cards/base/EcologicalZone.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Animal",
      "Plant"
    ],
    "requirements": [
      {
        "greeneries": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"greeneries\":1,\"count\":1}]",
    "effectText": "Effect: When you play an animal or plant tag INCLUDING THESE, add an animal to this card. Requires that YOU have a greenery tile. Place this tile adjacent to ANY greenery.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {}
  },
  {
    "id": "card-base-electro-catapult",
    "name": "Electro Catapult",
    "expansion": "base",
    "source": "src/server/cards/base/ElectroCatapult.ts",
    "type": "active",
    "cost": 17,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 8,
        "max": true,
        "count": 8
      }
    ],
    "reqText": "[{\"oxygen\":8,\"max\":true,\"count\":8}]",
    "effectText": "Action: Spend 1 plant or 1 steel to gain 7 M€.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        }
      },
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "title": "Spend 1 plant to gain 7 M€.",
              "spend": {
                "plants": 1
              },
              "stock": {
                "megacredits": 7
              }
            },
            {
              "title": "Spend 1 steel to gain 7 M€.",
              "spend": {
                "steel": 1
              },
              "stock": {
                "megacredits": 7
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-base-energy-saving",
    "name": "Energy Saving",
    "expansion": "base",
    "source": "src/server/cards/base/EnergySaving.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step for each city tile in play.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": {
            "cities": {}
          }
        }
      }
    }
  },
  {
    "id": "card-base-energy-tapping",
    "name": "Energy Tapping",
    "expansion": "base",
    "source": "src/server/cards/base/EnergyTapping.ts",
    "type": "automated",
    "cost": 3,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease any energy production 1 step and increase your own 1 step.",
    "victoryPoints": -1,
    "effectSpec": {}
  },
  {
    "id": "card-base-eos-chasma-national-park",
    "name": "Eos Chasma National Park",
    "expansion": "base",
    "source": "src/server/cards/base/EOSChasmaNationalPark.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "Plant",
      "Building"
    ],
    "requirements": [
      {
        "temperature": -12,
        "count": -12
      }
    ],
    "reqText": "[{\"temperature\":-12,\"count\":-12}]",
    "effectText": "Requires -12 C or warmer. Add 1 animal TO ANY ANIMAL CARD. Gain 3 plants. Increase your M€ production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "stock": {
          "plants": 3
        },
        "addResourcesToAnyCard": {
          "count": 1,
          "type": "Animal"
        }
      }
    }
  },
  {
    "id": "card-base-equatorial-magnetizer",
    "name": "Equatorial Magnetizer",
    "expansion": "base",
    "source": "src/server/cards/base/EquatorialMagnetizer.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Decrease your energy production 1 step to increase your terraform rating 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "production": {
          "energy": -1
        },
        "tr": 1
      }
    }
  },
  {
    "id": "card-base-extreme-cold-fungus",
    "name": "Extreme-Cold Fungus",
    "expansion": "base",
    "source": "src/server/cards/base/ExtremeColdFungus.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "temperature": -10,
        "max": true,
        "count": -10
      }
    ],
    "reqText": "[{\"temperature\":-10,\"max\":true,\"count\":-10}]",
    "effectText": "It must be -10 C or colder.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-farming",
    "name": "Farming",
    "expansion": "base",
    "source": "src/server/cards/base/Farming.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"temperature\":4,\"count\":4}]",
    "effectText": "Requires +4° C or warmer. Increase your M€ production 2 steps and your plant production 2 steps. Gain 2 plants.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2,
          "plants": 2
        },
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-fish",
    "name": "Fish",
    "expansion": "base",
    "source": "src/server/cards/base/Fish.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "temperature": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"temperature\":2,\"count\":2}]",
    "effectText": "Requires +2 C° or warmer. Decrease any plant production 1 step.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 1
        }
      },
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-flooding",
    "name": "Flooding",
    "expansion": "base",
    "source": "src/server/cards/base/Flooding.ts",
    "type": "event",
    "cost": 7,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place an ocean tile. IF THERE ARE TILES ADJACENT TO THIS OCEAN TILE, YOU MAY REMOVE 4 M€ FROM THE OWNER OF ONE OF THOSE TILES.",
    "victoryPoints": -1,
    "effectSpec": {
      "tr": {
        "oceans": 1
      }
    }
  },
  {
    "id": "card-base-food-factory",
    "name": "Food Factory",
    "expansion": "base",
    "source": "src/server/cards/base/FoodFactory.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your plant production 1 step and increase your M€ production 4 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 4,
          "plants": -1
        }
      }
    }
  },
  {
    "id": "card-base-fuel-factory",
    "name": "Fuel Factory",
    "expansion": "base",
    "source": "src/server/cards/base/FuelFactory.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your titanium and your M€ production 1 step each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 1,
          "titanium": 1
        }
      }
    }
  },
  {
    "id": "card-base-fueled-generators",
    "name": "Fueled Generators",
    "expansion": "base",
    "source": "src/server/cards/base/FueledGenerators.ts",
    "type": "automated",
    "cost": 1,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 1 step and increase your energy production 1 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "megacredits": -1
        }
      }
    }
  },
  {
    "id": "card-base-fusion-power",
    "name": "Fusion Power",
    "expansion": "base",
    "source": "src/server/cards/base/FusionPower.ts",
    "type": "automated",
    "cost": 14,
    "tags": [
      "Science",
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "tag": "power",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"power\",\"count\":2}]",
    "effectText": "Requires 2 power tags. Increase your energy production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-base-ganymede-colony",
    "name": "Ganymede Colony",
    "expansion": "base",
    "source": "src/server/cards/base/GanymedeColony.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Jovian",
      "Space",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a city tile ON THE RESERVED AREA.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "tag": "jovian"
    },
    "effectSpec": {
      "behavior": {
        "city": {
          "space": "01"
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-gene-repair",
    "name": "Gene Repair",
    "expansion": "base",
    "source": "src/server/cards/base/GeneRepair.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags. Increase your M€ production 2 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-base-geothermal-power",
    "name": "Geothermal Power",
    "expansion": "base",
    "source": "src/server/cards/base/GeothermalPower.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-base-ghg-factories",
    "name": "GHG Factories",
    "expansion": "base",
    "source": "src/server/cards/base/GHGFactories.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your heat production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "heat": 4
        }
      }
    }
  },
  {
    "id": "card-base-ghg-producing-bacteria",
    "name": "GHG Producing Bacteria",
    "expansion": "base",
    "source": "src/server/cards/base/GHGProducingBacteria.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Science",
      "Microbe"
    ],
    "requirements": [
      {
        "oxygen": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"count\":4}]",
    "effectText": "Requires 4% oxygen.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "spend": {
                "resourcesHere": 2
              },
              "global": {
                "temperature": 1
              },
              "title": "Remove 2 microbes to raise temperature 1 step"
            },
            {
              "addResources": 1,
              "title": "Add 1 microbe to this card"
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-base-giant-ice-asteroid",
    "name": "Giant Ice Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/GiantIceAsteroid.ts",
    "type": "event",
    "cost": 36,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 2 steps and place 2 ocean tiles. Remove up to 6 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 2
        },
        "removeAnyPlants": 6,
        "ocean": {
          "count": 2
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 2
  },
  {
    "id": "card-base-giant-space-mirror",
    "name": "Giant Space Mirror",
    "expansion": "base",
    "source": "src/server/cards/base/GiantSpaceMirror.ts",
    "type": "automated",
    "cost": 17,
    "tags": [
      "Power",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-base-grass",
    "name": "Grass",
    "expansion": "base",
    "source": "src/server/cards/base/Grass.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -16,
        "count": -16
      }
    ],
    "reqText": "[{\"temperature\":-16,\"count\":-16}]",
    "effectText": "Requires -16° C or warmer. Increase your plant production 1 step. Gain 3 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "stock": {
          "plants": 3
        }
      }
    }
  },
  {
    "id": "card-base-great-dam",
    "name": "Great Dam",
    "expansion": "base",
    "source": "src/server/cards/base/GreatDam.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "oceans": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oceans\":4,\"count\":4}]",
    "effectText": "Requires 4 ocean tiles. Increase your energy production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-base-great-escarpment-consortium",
    "name": "Great Escarpment Consortium",
    "expansion": "base",
    "source": "src/server/cards/base/GreatEscarpmentConsortium.ts",
    "type": "automated",
    "cost": 6,
    "tags": [],
    "requirements": [
      {
        "production": "steel",
        "count": 1
      }
    ],
    "reqText": "[{\"production\":\"steel\",\"count\":1}]",
    "effectText": "Requires that you have steel production. Decrease any steel production 1 step and increase your own 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-greenhouses",
    "name": "Greenhouses",
    "expansion": "base",
    "source": "src/server/cards/base/Greenhouses.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Plant",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 1 plant for each city tile in play.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": {
            "cities": {}
          }
        }
      }
    }
  },
  {
    "id": "card-base-hackers",
    "name": "Hackers",
    "expansion": "base",
    "source": "src/server/cards/base/Hackers.ts",
    "type": "automated",
    "cost": 3,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and any M€ production 2 steps. Increase your M€ production 2 steps.",
    "victoryPoints": -1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-base-heat-trappers",
    "name": "Heat Trappers",
    "expansion": "base",
    "source": "src/server/cards/base/HeatTrappers.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease any heat production 2 steps and increase your energy production 1 step.",
    "victoryPoints": -1,
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "heat",
          "count": 2
        },
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-heather",
    "name": "Heather",
    "expansion": "base",
    "source": "src/server/cards/base/Heather.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -14,
        "count": -14
      }
    ],
    "reqText": "[{\"temperature\":-14,\"count\":-14}]",
    "effectText": "Requires -14 C° or warmer. Increase your plant production 1 step. Gain 1 plant.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-herbivores",
    "name": "Herbivores",
    "expansion": "base",
    "source": "src/server/cards/base/Herbivores.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oxygen": 8,
        "count": 8
      }
    ],
    "reqText": "[{\"oxygen\":8,\"count\":8}]",
    "effectText": "Requires 8% oxygen. +1 animal to this card. -1 any plant production",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 1
        },
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-hired-raiders",
    "name": "Hired Raiders",
    "expansion": "base",
    "source": "src/server/cards/base/HiredRaiders.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Steal up to 2 steel, or 3 M€ from any player.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-ice-asteroid",
    "name": "Ice Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/IceAsteroid.ts",
    "type": "event",
    "cost": 23,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 2 ocean tiles.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {
          "count": 2
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 2
  },
  {
    "id": "card-base-ice-cap-melting",
    "name": "Ice Cap Melting",
    "expansion": "base",
    "source": "src/server/cards/base/IceCapMelting.ts",
    "type": "event",
    "cost": 5,
    "tags": [],
    "requirements": [
      {
        "temperature": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"temperature\":2,\"count\":2}]",
    "effectText": "Requires +2 C or warmer. Place 1 ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-immigrant-city",
    "name": "Immigrant City",
    "expansion": "base",
    "source": "src/server/cards/base/ImmigrantCity.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and decrease your M€ production 2 steps. Place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-immigration-shuttles",
    "name": "Immigration Shuttles",
    "expansion": "base",
    "source": "src/server/cards/base/ImmigrationShuttles.ts",
    "type": "automated",
    "cost": 31,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 5 steps.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "cities": {},
      "all": true,
      "per": 3
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 5
        }
      }
    }
  },
  {
    "id": "card-base-import-of-advanced-ghg",
    "name": "Import of Advanced GHG",
    "expansion": "base",
    "source": "src/server/cards/base/ImportOfAdvancedGHG.ts",
    "type": "event",
    "cost": 9,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        }
      }
    }
  },
  {
    "id": "card-base-imported-ghg",
    "name": "Imported GHG",
    "expansion": "base",
    "source": "src/server/cards/base/ImportedGHG.ts",
    "type": "event",
    "cost": 7,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 1 step and gain 3 heat.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 1
        },
        "stock": {
          "heat": 3
        }
      }
    }
  },
  {
    "id": "card-base-imported-hydrogen",
    "name": "Imported Hydrogen",
    "expansion": "base",
    "source": "src/server/cards/base/ImportedHydrogen.ts",
    "type": "event",
    "cost": 16,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 plants, or add 3 microbes or 2 animals to ANOTHER card. Place an ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-imported-nitrogen",
    "name": "Imported Nitrogen",
    "expansion": "base",
    "source": "src/server/cards/base/ImportedNitrogen.ts",
    "type": "event",
    "cost": 23,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 1 step and gain 4 plants. Add 3 microbes to ANOTHER card and 2 animals to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 4
        },
        "tr": 1,
        "addResourcesToAnyCard": [
          {
            "type": "Microbe",
            "count": 3
          },
          {
            "type": "Animal",
            "count": 2
          }
        ]
      }
    }
  },
  {
    "id": "card-base-indentured-workers",
    "name": "Indentured Workers",
    "expansion": "base",
    "source": "src/server/cards/base/IndenturedWorkers.ts",
    "type": "event",
    "cost": 0,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "The next card you play this generation costs 8 M€ less.",
    "victoryPoints": -1,
    "effectSpec": {}
  },
  {
    "id": "card-base-industrial-center",
    "name": "Industrial Center",
    "expansion": "base",
    "source": "src/server/cards/base/IndustrialCenter.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile adjacent to a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "megacredits": 7
        },
        "production": {
          "steel": 1
        }
      }
    }
  },
  {
    "id": "card-base-industrial-microbes",
    "name": "Industrial Microbes",
    "expansion": "base",
    "source": "src/server/cards/base/IndustrialMicrobes.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Microbe",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production and your steel production 1 step each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "steel": 1
        }
      }
    }
  },
  {
    "id": "card-base-insects",
    "name": "Insects",
    "expansion": "base",
    "source": "src/server/cards/base/Insects.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "oxygen": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"oxygen\":6,\"count\":6}]",
    "effectText": "Requires 6% oxygen. Increase your plant production 1 step for each plant tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": {
            "tag": "plant"
          }
        }
      }
    }
  },
  {
    "id": "card-base-insulation",
    "name": "Insulation",
    "expansion": "base",
    "source": "src/server/cards/base/Insulation.ts",
    "type": "automated",
    "cost": 2,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your heat production any number of steps and increase your M€ production the same number of steps.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-interstellar-colony-ship",
    "name": "Interstellar Colony Ship",
    "expansion": "base",
    "source": "src/server/cards/base/InterstellarColonyShip.ts",
    "type": "event",
    "cost": 24,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 5
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":5}]",
    "effectText": "Requires that you have 5 science tags.",
    "victoryPoints": 4,
    "effectSpec": {}
  },
  {
    "id": "card-base-invention-contest",
    "name": "Invention Contest",
    "expansion": "base",
    "source": "src/server/cards/base/InventionContest.ts",
    "type": "event",
    "cost": 2,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Look at the top 3 cards from the deck. Take 1 of them into hand and discard the other two",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 3,
          "keep": 1
        }
      }
    }
  },
  {
    "id": "card-base-inventors-guild",
    "name": "Inventors' Guild",
    "expansion": "base",
    "source": "src/server/cards/base/InventorsGuild.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Look at the top card and either buy it or discard it",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "drawCard": {
          "count": 1,
          "pay": true
        }
      }
    }
  },
  {
    "id": "card-base-investment-loan",
    "name": "Investment Loan",
    "expansion": "base",
    "source": "src/server/cards/base/InvestmentLoan.ts",
    "type": "event",
    "cost": 3,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 1 step. Gain 10 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -1
        },
        "stock": {
          "megacredits": 10
        }
      }
    }
  },
  {
    "id": "card-base-io-mining-industries",
    "name": "Io Mining Industries",
    "expansion": "base",
    "source": "src/server/cards/base/IoMiningIndustries.ts",
    "type": "automated",
    "cost": 41,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 2 steps and your M€ production 2 steps.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "tag": "jovian"
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 2,
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-base-ironworks",
    "name": "Ironworks",
    "expansion": "base",
    "source": "src/server/cards/base/Ironworks.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 4 energy to gain 1 steel and raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 4
        },
        "stock": {
          "steel": 1
        },
        "global": {
          "oxygen": 1
        }
      }
    }
  },
  {
    "id": "card-base-kelp-farming",
    "name": "Kelp Farming",
    "expansion": "base",
    "source": "src/server/cards/base/KelpFarming.ts",
    "type": "automated",
    "cost": 17,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oceans": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"oceans\":6,\"count\":6}]",
    "effectText": "Requires 6 ocean tiles. Increase your M€ production 2 steps and your plant production 3 steps. Gain 2 plants.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2,
          "plants": 3
        },
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-lagrange-observatory",
    "name": "Lagrange Observatory",
    "expansion": "base",
    "source": "src/server/cards/base/LagrangeObservatory.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Science",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-base-lake-marineris",
    "name": "Lake Marineris",
    "expansion": "base",
    "source": "src/server/cards/base/LakeMarineris.ts",
    "type": "automated",
    "cost": 18,
    "tags": [],
    "requirements": [
      {
        "temperature": 0,
        "count": 0
      }
    ],
    "reqText": "[{\"temperature\":0,\"count\":0}]",
    "effectText": "Requires 0° C or warmer. Place 2 ocean tiles.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "ocean": {
          "count": 2
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 2
  },
  {
    "id": "card-base-land-claim",
    "name": "Land Claim",
    "expansion": "base",
    "source": "src/server/cards/base/LandClaim.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place your marker on a non-reserved area. Only you may place a tile there.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-large-convoy",
    "name": "Large Convoy",
    "expansion": "base",
    "source": "src/server/cards/base/LargeConvoy.ts",
    "type": "event",
    "cost": 36,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place an ocean tile and draw 2 cards. Gain 5 plants or add 4 animals to ANOTHER card.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "drawCard": 2,
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-lava-flows",
    "name": "Lava Flows",
    "expansion": "base",
    "source": "src/server/cards/base/LavaFlows.ts",
    "type": "event",
    "cost": 18,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 2 steps and place this tile ON EITHER THARSIS THOLUS, ASCRAEUS MONS, PAVONIS MONS OR ARSIA MONS.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 2
        },
        "tile": {
          "type": 7,
          "on": "volcanic",
          "title": "Select either Tharsis Tholus, Ascraeus Mons, Pavonis Mons or Arsia Mons"
        }
      }
    }
  },
  {
    "id": "card-base-lichen",
    "name": "Lichen",
    "expansion": "base",
    "source": "src/server/cards/base/Lichen.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -24,
        "count": -24
      }
    ],
    "reqText": "[{\"temperature\":-24,\"count\":-24}]",
    "effectText": "Requires -24 C or warmer. Increase your plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-lightning-harvest",
    "name": "Lightning Harvest",
    "expansion": "base",
    "source": "src/server/cards/base/LightningHarvest.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Power"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags. Increase your energy production and your M€ production one step each.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "megacredits": 1
        }
      }
    }
  },
  {
    "id": "card-base-livestock",
    "name": "Livestock",
    "expansion": "base",
    "source": "src/server/cards/base/Livestock.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oxygen": 9,
        "count": 9
      }
    ],
    "reqText": "[{\"oxygen\":9,\"count\":9}]",
    "effectText": "Requires 9% oxygen. Decrease your plant production 1 step and increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": -1,
          "megacredits": 2
        }
      },
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-local-heat-trapping",
    "name": "Local Heat Trapping",
    "expansion": "base",
    "source": "src/server/cards/base/LocalHeatTrapping.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 5 heat to gain either 4 plants, or to add 2 animals to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-lunar-beam",
    "name": "Lunar Beam",
    "expansion": "base",
    "source": "src/server/cards/base/LunarBeam.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Earth",
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 2 steps and increase your heat production and energy production 2 steps each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -2,
          "heat": 2,
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-base-magnetic-field-dome",
    "name": "Magnetic Field Dome",
    "expansion": "base",
    "source": "src/server/cards/base/MagneticFieldDome.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 2 steps and increase your plant production 1 step. Raise your TR 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -2,
          "plants": 1
        },
        "tr": 1
      }
    }
  },
  {
    "id": "card-base-magnetic-field-generators",
    "name": "Magnetic Field Generators",
    "expansion": "base",
    "source": "src/server/cards/base/MagneticFieldGenerators.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 4 steps and increase your plant production 2 steps. Raise your TR 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -4,
          "plants": 2
        },
        "tr": 3
      }
    }
  },
  {
    "id": "card-base-mangrove",
    "name": "Mangrove",
    "expansion": "base",
    "source": "src/server/cards/base/Mangrove.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"temperature\":4,\"count\":4}]",
    "effectText": "Requires +4 C or warmer. Place a greenery tile ON AN AREA RESERVED FOR OCEAN and raise oxygen 1 step. Disregard normal placement restrictions for this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "greenery": {
          "on": "ocean"
        }
      }
    },
    "placementType": "forest",
    "placementCount": 1
  },
  {
    "id": "card-base-mars-university",
    "name": "Mars University",
    "expansion": "base",
    "source": "src/server/cards/base/MarsUniversity.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a science tag, including this, you may discard a card from hand to draw a card.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-martian-rails",
    "name": "Martian Rails",
    "expansion": "base",
    "source": "src/server/cards/base/MartianRails.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 energy to gain 1 M€ for each city tile ON MARS.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 1
        },
        "stock": {
          "megacredits": {
            "cities": {
              "where": "onmars"
            }
          }
        }
      }
    }
  },
  {
    "id": "card-base-mass-converter",
    "name": "Mass Converter",
    "expansion": "base",
    "source": "src/server/cards/base/MassConverter.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Science",
      "Power"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 5
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":5}]",
    "effectText": "Requires 5 science tags. Increase your energy production 6 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 6
        }
      },
      "cardDiscount": {
        "tag": "space",
        "amount": 2,
        "per": "card"
      }
    }
  },
  {
    "id": "card-base-media-archives",
    "name": "Media Archives",
    "expansion": "base",
    "source": "src/server/cards/base/MediaArchives.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 1 M€ for each event EVER PLAYED by all players.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-media-group",
    "name": "Media Group",
    "expansion": "base",
    "source": "src/server/cards/base/MediaGroup.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: After you play an event card, you gain 3 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-medical-lab",
    "name": "Medical Lab",
    "expansion": "base",
    "source": "src/server/cards/base/MedicalLab.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for every 2 building tags you have, including this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "building",
            "per": 2
          }
        }
      }
    }
  },
  {
    "id": "card-base-methane-from-titan",
    "name": "Methane From Titan",
    "expansion": "base",
    "source": "src/server/cards/base/MethaneFromTitan.ts",
    "type": "automated",
    "cost": 28,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [
      {
        "oxygen": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"oxygen\":2,\"count\":2}]",
    "effectText": "Requires 2% oxygen. Increase your heat production 2 steps and your plant production 2 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2,
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-micro-mills",
    "name": "Micro-Mills",
    "expansion": "base",
    "source": "src/server/cards/base/MicroMills.ts",
    "type": "automated",
    "cost": 3,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 1
        }
      }
    }
  },
  {
    "id": "card-base-mine",
    "name": "Mine",
    "expansion": "base",
    "source": "src/server/cards/base/Mine.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your steel production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      }
    }
  },
  {
    "id": "card-base-mineral-deposit",
    "name": "Mineral Deposit",
    "expansion": "base",
    "source": "src/server/cards/base/MineralDeposit.ts",
    "type": "event",
    "cost": 5,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 5 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 5
        }
      }
    }
  },
  {
    "id": "card-base-mining-area",
    "name": "Mining Area",
    "expansion": "base",
    "source": "src/server/cards/base/MiningArea.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile on an area with a steel or titanium placement bonus, adjacent to another of your tiles. Increase your production of that resource 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-mining-expedition",
    "name": "Mining Expedition",
    "expansion": "base",
    "source": "src/server/cards/base/MiningExpedition.ts",
    "type": "event",
    "cost": 12,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise oxygen 1 step. Remove 2 plants from any player. Gain 2 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 2
        },
        "global": {
          "oxygen": 1
        },
        "removeAnyPlants": 2
      }
    }
  },
  {
    "id": "card-base-mining-rights",
    "name": "Mining Rights",
    "expansion": "base",
    "source": "src/server/cards/base/MiningRights.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile on an area with a steel or titanium placement bonus. Increase that production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-miranda-resort",
    "name": "Miranda Resort",
    "expansion": "base",
    "source": "src/server/cards/base/MirandaResort.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each Earth tag you have.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "earth"
          }
        }
      }
    }
  },
  {
    "id": "card-base-mohole-area",
    "name": "Mohole Area",
    "expansion": "base",
    "source": "src/server/cards/base/MoholeArea.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 4 steps. Place this tile ON AN AREA RESERVED FOR OCEAN.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 4
        },
        "tile": {
          "type": 10,
          "on": "ocean"
        }
      }
    }
  },
  {
    "id": "card-base-moss",
    "name": "Moss",
    "expansion": "base",
    "source": "src/server/cards/base/Moss.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oceans": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"count\":3}]",
    "effectText": "Requires 3 ocean tiles and that you lose 1 plant. Increase your plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-natural-preserve",
    "name": "Natural Preserve",
    "expansion": "base",
    "source": "src/server/cards/base/NaturalPreserve.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 4,
        "max": true,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"max\":true,\"count\":4}]",
    "effectText": "Oxygen must be 4% or less. Place this tile NEXT TO NO OTHER TILE. Increase your M€ production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        },
        "tile": {
          "type": 11,
          "on": "isolated"
        }
      }
    }
  },
  {
    "id": "card-base-nitrite-reducing-bacteria",
    "name": "Nitrite Reducing Bacteria",
    "expansion": "base",
    "source": "src/server/cards/base/NitriteReducingBacteria.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 3 microbes to this card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 3
      },
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "spend": {
                "resourcesHere": 3
              },
              "tr": 1,
              "title": "Remove 3 microbes to increase your terraform rating 1 step"
            },
            {
              "addResources": 1,
              "title": "Add 1 microbe to this card"
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-base-nitrogen-rich-asteroid",
    "name": "Nitrogen-Rich Asteroid",
    "expansion": "base",
    "source": "src/server/cards/base/NitrogenRichAsteroid.ts",
    "type": "event",
    "cost": 31,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your terraforming rating 2 steps and temperature 1 step. Increase your plant production 1 step, or 4 steps if you have 3 plant tags.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 1
        },
        "tr": 2
      }
    }
  },
  {
    "id": "card-base-nitrophilic-moss",
    "name": "Nitrophilic Moss",
    "expansion": "base",
    "source": "src/server/cards/base/NitrophilicMoss.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oceans": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"count\":3}]",
    "effectText": "Requires 3 ocean tiles and that you lose 2 plants. Increase your plant production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-noctis-city",
    "name": "Noctis City",
    "expansion": "base",
    "source": "src/server/cards/base/NoctisCity.ts",
    "type": "automated",
    "cost": 18,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your M€ production 3 steps. Place a city tile ON THE RESERVED AREA, disregarding normal placement restrictions.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        }
      }
    }
  },
  {
    "id": "card-base-noctis-farming",
    "name": "Noctis Farming",
    "expansion": "base",
    "source": "src/server/cards/base/NoctisFarming.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Plant",
      "Building"
    ],
    "requirements": [
      {
        "temperature": -20,
        "count": -20
      }
    ],
    "reqText": "[{\"temperature\":-20,\"count\":-20}]",
    "effectText": "Requires -20 C or warmer. Increase your M€ production 1 step and gain 2 plants.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        },
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-base-nuclear-power",
    "name": "Nuclear Power",
    "expansion": "base",
    "source": "src/server/cards/base/NuclearPower.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 2 steps and increase your energy production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 3,
          "megacredits": -2
        }
      }
    }
  },
  {
    "id": "card-base-nuclear-zone",
    "name": "Nuclear Zone",
    "expansion": "base",
    "source": "src/server/cards/base/NuclearZone.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile and raise temperature 2 steps.",
    "victoryPoints": -2,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 2
        },
        "tile": {
          "type": 12,
          "on": "land"
        }
      }
    }
  },
  {
    "id": "card-base-olympus-conference",
    "name": "Olympus Conference",
    "expansion": "base",
    "source": "src/server/cards/base/OlympusConference.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Science",
      "Earth",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "When you play a science tag, including this, either add a science resource to this card, or remove a science resource from this card to draw a card.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-open-city",
    "name": "Open City",
    "expansion": "base",
    "source": "src/server/cards/base/OpenCity.ts",
    "type": "automated",
    "cost": 23,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 12,
        "count": 12
      }
    ],
    "reqText": "[{\"oxygen\":12,\"count\":12}]",
    "effectText": "Requires 12% oxygen. Gain 2 plants. Place a city tile. Decrease your energy production 1 step and increase your M€ production 4 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 4
        },
        "stock": {
          "plants": 2
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-optimal-aerobraking",
    "name": "Optimal Aerobraking",
    "expansion": "base",
    "source": "src/server/cards/base/OptimalAerobraking.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a space event, you gain 3 M€ and 3 heat.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-ore-processor",
    "name": "Ore Processor",
    "expansion": "base",
    "source": "src/server/cards/base/OreProcessor.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 4 energy to gain 1 titanium and increase oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 4
        },
        "stock": {
          "titanium": 1
        },
        "global": {
          "oxygen": 1
        }
      }
    }
  },
  {
    "id": "card-base-permafrost-extraction",
    "name": "Permafrost Extraction",
    "expansion": "base",
    "source": "src/server/cards/base/PermafrostExtraction.ts",
    "type": "event",
    "cost": 8,
    "tags": [],
    "requirements": [
      {
        "temperature": -8,
        "count": -8
      }
    ],
    "reqText": "[{\"temperature\":-8,\"count\":-8}]",
    "effectText": "Requires -8 C or warmer. Place 1 ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-peroxide-power",
    "name": "Peroxide Power",
    "expansion": "base",
    "source": "src/server/cards/base/PeroxidePower.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 1 step and increase your energy production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2,
          "megacredits": -1
        }
      }
    }
  },
  {
    "id": "card-base-pets",
    "name": "Pets",
    "expansion": "base",
    "source": "src/server/cards/base/Pets.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Earth",
      "Animal"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 1 animal to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-phobos-space-haven",
    "name": "Phobos Space Haven",
    "expansion": "base",
    "source": "src/server/cards/base/PhobosSpaceHaven.ts",
    "type": "automated",
    "cost": 25,
    "tags": [
      "Space",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step and place a city tile ON THE RESERVED AREA.",
    "victoryPoints": 3,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        },
        "city": {
          "space": "02"
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-physics-complex",
    "name": "Physics Complex",
    "expansion": "base",
    "source": "src/server/cards/base/PhysicsComplex.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 6 energy to add a science resource to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "each": 2
    },
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 6
        },
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-plantation",
    "name": "Plantation",
    "expansion": "base",
    "source": "src/server/cards/base/Plantation.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags. Place a greenery tile and raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "greenery": {}
      }
    },
    "placementType": "forest",
    "placementCount": 1
  },
  {
    "id": "card-base-power-grid",
    "name": "Power Grid",
    "expansion": "base",
    "source": "src/server/cards/base/PowerGrid.ts",
    "type": "automated",
    "cost": 18,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production step for each power tag you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": {
            "tag": "power"
          }
        }
      }
    }
  },
  {
    "id": "card-base-power-infrastructure",
    "name": "Power Infrastructure",
    "expansion": "base",
    "source": "src/server/cards/base/PowerInfrastructure.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend any amount of energy and gain that amount of M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-power-plant",
    "name": "Power Plant",
    "expansion": "base",
    "source": "src/server/cards/base/PowerPlant.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-power-supply-consortium",
    "name": "Power Supply Consortium",
    "expansion": "base",
    "source": "src/server/cards/base/PowerSupplyConsortium.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Power"
    ],
    "requirements": [
      {
        "tag": "power",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"power\",\"count\":2}]",
    "effectText": "Requires 2 power tags. Decrease any energy production 1 step and increase your own 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-predators",
    "name": "Predators",
    "expansion": "base",
    "source": "src/server/cards/base/Predators.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oxygen": 11,
        "count": 11
      }
    ],
    "reqText": "[{\"oxygen\":11,\"count\":11}]",
    "effectText": "Requires 11% oxygen.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {}
  },
  {
    "id": "card-base-protected-habitats",
    "name": "Protected Habitats",
    "expansion": "base",
    "source": "src/server/cards/base/ProtectedHabitats.ts",
    "type": "active",
    "cost": 5,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Opponents may not remove your",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-protected-valley",
    "name": "Protected Valley",
    "expansion": "base",
    "source": "src/server/cards/base/ProtectedValley.ts",
    "type": "automated",
    "cost": 23,
    "tags": [
      "Plant",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps. Place a greenery tile ON AN AREA RESERVED FOR OCEAN, disregarding normal placement restrictions, and increase oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "greenery": {
          "on": "ocean"
        }
      }
    },
    "placementType": "forest",
    "placementCount": 1
  },
  {
    "id": "card-base-quantum-extractor",
    "name": "Quantum Extractor",
    "expansion": "base",
    "source": "src/server/cards/base/QuantumExtractor.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Science",
      "Power"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 4
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":4}]",
    "effectText": "Requires 4 science tags. Increase your energy production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 4
        }
      },
      "cardDiscount": {
        "tag": "space",
        "amount": 2
      }
    }
  },
  {
    "id": "card-base-rad-chem-factory",
    "name": "Rad-Chem Factory",
    "expansion": "base",
    "source": "src/server/cards/base/RadChemFactory.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step. Raise your TR 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        },
        "tr": 2
      }
    }
  },
  {
    "id": "card-base-rad-suits",
    "name": "Rad-Suits",
    "expansion": "base",
    "source": "src/server/cards/base/RadSuits.ts",
    "type": "automated",
    "cost": 6,
    "tags": [],
    "requirements": [
      {
        "cities": 2,
        "all": true,
        "count": 2
      }
    ],
    "reqText": "[{\"cities\":2,\"all\":true,\"count\":2}]",
    "effectText": "Requires two cities in play. Increase your M€ production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        }
      }
    }
  },
  {
    "id": "card-base-regolith-eaters",
    "name": "Regolith Eaters",
    "expansion": "base",
    "source": "src/server/cards/base/RegolithEaters.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Science",
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 microbe to this card, or remove 2 microbes from this card to raise oxygen level 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "title": "Remove 2 microbes to raise oxygen level 1 step",
              "spend": {
                "resourcesHere": 2
              },
              "global": {
                "oxygen": 1
              }
            },
            {
              "title": "Add 1 microbe to this card",
              "addResources": 1
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-base-release-of-inert-gases",
    "name": "Release of Inert Gases",
    "expansion": "base",
    "source": "src/server/cards/base/ReleaseOfInertGases.ts",
    "type": "event",
    "cost": 14,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your terraforming rating 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 2
      }
    }
  },
  {
    "id": "card-base-research",
    "name": "Research",
    "expansion": "base",
    "source": "src/server/cards/base/Research.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Science",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Counts as playing 2 science cards. Draw 2 cards.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-base-research-outpost",
    "name": "Research Outpost",
    "expansion": "base",
    "source": "src/server/cards/base/ResearchOutpost.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Science",
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a city tile NEXT TO NO OTHER TILE.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "city": {
          "on": "isolated"
        }
      },
      "cardDiscount": {
        "amount": 1
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-restricted-area",
    "name": "Restricted Area",
    "expansion": "base",
    "source": "src/server/cards/base/RestrictedArea.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place this tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tile": {
          "type": 13,
          "on": "land"
        }
      },
      "action": {
        "spend": {
          "megacredits": 2
        },
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-base-robotic-workforce",
    "name": "Robotic Workforce",
    "expansion": "base",
    "source": "src/server/cards/base/RoboticWorkforce.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Duplicate only the production box of one of your building cards.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-rover-construction",
    "name": "Rover Construction",
    "expansion": "base",
    "source": "src/server/cards/base/RoverConstruction.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When any city tile is placed, gain 2 M€.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-sabotage",
    "name": "Sabotage",
    "expansion": "base",
    "source": "src/server/cards/base/Sabotage.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Remove up to 3 titanium from any player, or 4 steel, or 7 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-satellites",
    "name": "Satellites",
    "expansion": "base",
    "source": "src/server/cards/base/Satellites.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each space tag you have, including this one.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "space"
          }
        }
      }
    }
  },
  {
    "id": "card-base-search-for-life",
    "name": "Search For Life",
    "expansion": "base",
    "source": "src/server/cards/base/SearchForLife.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "oxygen": 6,
        "max": true,
        "count": 6
      }
    ],
    "reqText": "[{\"oxygen\":6,\"max\":true,\"count\":6}]",
    "effectText": "Oxygen must be 6% or less.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-security-fleet",
    "name": "Security Fleet",
    "expansion": "base",
    "source": "src/server/cards/base/SecurityFleet.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 titanium to add 1 fighter resource to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "action": {
        "spend": {
          "titanium": 1
        },
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-shuttles",
    "name": "Shuttles",
    "expansion": "base",
    "source": "src/server/cards/base/Shuttles.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "oxygen": 5,
        "count": 5
      }
    ],
    "reqText": "[{\"oxygen\":5,\"count\":5}]",
    "effectText": "Requires 5% oxygen. Decrease your energy production 1 step and increase your M€ production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 2
        }
      },
      "cardDiscount": {
        "tag": "space",
        "amount": 2
      }
    }
  },
  {
    "id": "card-base-small-animals",
    "name": "Small Animals",
    "expansion": "base",
    "source": "src/server/cards/base/SmallAnimals.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oxygen": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"oxygen\":6,\"count\":6}]",
    "effectText": "Requires 6% oxygen. Decrease any plant production 1 step.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 1
        }
      },
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-soil-factory",
    "name": "Soil Factory",
    "expansion": "base",
    "source": "src/server/cards/base/SoilFactory.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your plant production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-solar-power",
    "name": "Solar Power",
    "expansion": "base",
    "source": "src/server/cards/base/SolarPower.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-solar-wind-power",
    "name": "Solar Wind Power",
    "expansion": "base",
    "source": "src/server/cards/base/SolarWindPower.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Science",
      "Space",
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step and gain 2 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        },
        "stock": {
          "titanium": 2
        }
      }
    }
  },
  {
    "id": "card-base-soletta",
    "name": "Soletta",
    "expansion": "base",
    "source": "src/server/cards/base/Soletta.ts",
    "type": "automated",
    "cost": 35,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 7 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 7
        }
      }
    }
  },
  {
    "id": "card-base-space-elevator",
    "name": "Space Elevator",
    "expansion": "base",
    "source": "src/server/cards/base/SpaceElevator.ts",
    "type": "active",
    "cost": 27,
    "tags": [
      "Space",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      },
      "action": {
        "spend": {
          "steel": 1
        },
        "stock": {
          "megacredits": 5
        }
      }
    }
  },
  {
    "id": "card-base-space-mirrors",
    "name": "Space Mirrors",
    "expansion": "base",
    "source": "src/server/cards/base/SpaceMirrors.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Power",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 7 M€ to increase your energy production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "megacredits": 7
        },
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-space-station",
    "name": "Space Station",
    "expansion": "base",
    "source": "src/server/cards/base/SpaceStation.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a space card, you pay 2 M€ less for it.",
    "victoryPoints": 1,
    "effectSpec": {
      "cardDiscount": {
        "tag": "space",
        "amount": 2
      }
    }
  },
  {
    "id": "card-base-special-design",
    "name": "Special Design",
    "expansion": "base",
    "source": "src/server/cards/base/SpecialDesign.ts",
    "type": "event",
    "cost": 4,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "The next card you play this generation is +2 or -2 steps in global requirements, your choice.",
    "victoryPoints": 0,
    "effectSpec": {
      "globalParameterRequirementBonus": {
        "steps": 2,
        "nextCardOnly": true
      }
    }
  },
  {
    "id": "card-base-sponsors",
    "name": "Sponsors",
    "expansion": "base",
    "source": "src/server/cards/base/Sponsors.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-base-standard-technology",
    "name": "Standard Technology",
    "expansion": "base",
    "source": "src/server/cards/base/StandardTechnology.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: After you pay for a standard project, except selling patents, you gain 3 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-steelworks",
    "name": "Steelworks",
    "expansion": "base",
    "source": "src/server/cards/base/Steelworks.ts",
    "type": "active",
    "cost": 15,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 4 energy to gain 2 steel and increase oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 4
        },
        "stock": {
          "steel": 2
        },
        "global": {
          "oxygen": 1
        }
      }
    }
  },
  {
    "id": "card-base-strip-mine",
    "name": "Strip Mine",
    "expansion": "base",
    "source": "src/server/cards/base/StripMine.ts",
    "type": "automated",
    "cost": 25,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 2 steps. Increase your steel production 2 steps and your titanium production 1 step. Raise oxygen 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -2,
          "steel": 2,
          "titanium": 1
        },
        "global": {
          "oxygen": 2
        }
      }
    }
  },
  {
    "id": "card-base-subterranean-reservoir",
    "name": "Subterranean Reservoir",
    "expansion": "base",
    "source": "src/server/cards/base/SubterraneanReservoir.ts",
    "type": "event",
    "cost": 11,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 1 ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-symbiotic-fungus",
    "name": "Symbiotic Fungus",
    "expansion": "base",
    "source": "src/server/cards/base/SymbioticFungus.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "temperature": -14,
        "count": -14
      }
    ],
    "reqText": "[{\"temperature\":-14,\"count\":-14}]",
    "effectText": "Requires -14 C° or warmer.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Microbe",
          "count": 1,
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-base-tardigrades",
    "name": "Tardigrades",
    "expansion": "base",
    "source": "src/server/cards/base/Tardigrades.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 microbe to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 4
    },
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-base-technology-demonstration",
    "name": "Technology Demonstration",
    "expansion": "base",
    "source": "src/server/cards/base/TechnologyDemonstration.ts",
    "type": "event",
    "cost": 5,
    "tags": [
      "Science",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw two cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-base-tectonic-stress-power",
    "name": "Tectonic Stress Power",
    "expansion": "base",
    "source": "src/server/cards/base/TectonicStressPower.ts",
    "type": "automated",
    "cost": 18,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags. Increase your energy production 3 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-base-terraforming-ganymede",
    "name": "Terraforming Ganymede",
    "expansion": "base",
    "source": "src/server/cards/base/TerraformingGanymede.ts",
    "type": "automated",
    "cost": 33,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 1 step for each Jovian tag you have, including this.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-base-titanium-mine",
    "name": "Titanium Mine",
    "expansion": "base",
    "source": "src/server/cards/base/TitaniumMine.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      }
    }
  },
  {
    "id": "card-base-toll-station",
    "name": "Toll Station",
    "expansion": "base",
    "source": "src/server/cards/base/TollStation.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each space tag your OPPONENTS have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "space",
            "others": true
          }
        }
      }
    }
  },
  {
    "id": "card-base-towing-a-comet",
    "name": "Towing A Comet",
    "expansion": "base",
    "source": "src/server/cards/base/TowingAComet.ts",
    "type": "event",
    "cost": 23,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 2 plants. Raise oxygen level 1 step and place an ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 2
        },
        "global": {
          "oxygen": 1
        },
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-base-trans-neptune-probe",
    "name": "Trans-Neptune Probe",
    "expansion": "base",
    "source": "src/server/cards/base/TransNeptuneProbe.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Science",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "1 VP.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-base-trees",
    "name": "Trees",
    "expansion": "base",
    "source": "src/server/cards/base/Trees.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -4,
        "count": -4
      }
    ],
    "reqText": "[{\"temperature\":-4,\"count\":-4}]",
    "effectText": "Requires -4 C or warmer. Increase your plant production 3 steps. Gain 1 plant.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 3
        },
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-tropical-resort",
    "name": "Tropical Resort",
    "expansion": "base",
    "source": "src/server/cards/base/TropicalResort.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Reduce your heat production 2 steps and increase your M€ production 3 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3,
          "heat": -2
        }
      }
    }
  },
  {
    "id": "card-base-tundra-farming",
    "name": "Tundra Farming",
    "expansion": "base",
    "source": "src/server/cards/base/TundraFarming.ts",
    "type": "automated",
    "cost": 16,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -6,
        "count": -6
      }
    ],
    "reqText": "[{\"temperature\":-6,\"count\":-6}]",
    "effectText": "Requires -6° C or warmer. Increase your plant production 1 step and your M€ production 2 steps. Gain 1 plant.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1,
          "megacredits": 2
        },
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-base-underground-city",
    "name": "Underground City",
    "expansion": "base",
    "source": "src/server/cards/base/UndergroundCity.ts",
    "type": "automated",
    "cost": 18,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a city tile. Decrease your energy production 2 steps and increase your steel production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -2,
          "steel": 2
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-base-underground-detonations",
    "name": "Underground Detonations",
    "expansion": "base",
    "source": "src/server/cards/base/UndergroundDetonations.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 10M€ to increase your heat production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "megacredits": 10
        },
        "production": {
          "heat": 2
        }
      }
    }
  },
  {
    "id": "card-base-urbanized-area",
    "name": "Urbanized Area",
    "expansion": "base",
    "source": "src/server/cards/base/UrbanizedArea.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your M€ production 2 steps. Place a city tile ADJACENT TO AT LEAST 2 OTHER CITY TILES.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-base-vesta-shipyard",
    "name": "Vesta Shipyard",
    "expansion": "base",
    "source": "src/server/cards/base/VestaShipyard.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      }
    }
  },
  {
    "id": "card-base-viral-enhancers",
    "name": "Viral Enhancers",
    "expansion": "base",
    "source": "src/server/cards/base/ViralEnhancers.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Science",
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a plant, microbe, or an animal tag, including this, gain 1 plant or add 1 resource to THAT CARD.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-virus",
    "name": "Virus",
    "expansion": "base",
    "source": "src/server/cards/base/Virus.ts",
    "type": "event",
    "cost": 1,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Remove up to 2 animals or 5 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-water-import-from-europa",
    "name": "Water Import From Europa",
    "expansion": "base",
    "source": "src/server/cards/base/WaterImportFromEuropa.ts",
    "type": "active",
    "cost": 25,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Pay 12 M€ to place an ocean tile. TITANIUM MAY BE USED as if playing a space card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "tag": "jovian"
    },
    "effectSpec": {}
  },
  {
    "id": "card-base-water-splitting-plant",
    "name": "Water Splitting Plant",
    "expansion": "base",
    "source": "src/server/cards/base/WaterSplittingPlant.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "oceans": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"oceans\":2,\"count\":2}]",
    "effectText": "Requires 2 ocean tiles.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "energy": 3
        },
        "global": {
          "oxygen": 1
        }
      }
    }
  },
  {
    "id": "card-base-wave-power",
    "name": "Wave Power",
    "expansion": "base",
    "source": "src/server/cards/base/WavePower.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Power"
    ],
    "requirements": [
      {
        "oceans": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"count\":3}]",
    "effectText": "Requires 3 ocean tiles. Increase your energy production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-windmills",
    "name": "Windmills",
    "expansion": "base",
    "source": "src/server/cards/base/Windmills.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "oxygen": 7,
        "count": 7
      }
    ],
    "reqText": "[{\"oxygen\":7,\"count\":7}]",
    "effectText": "Requires 7% oxygen. Increase your energy production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      }
    }
  },
  {
    "id": "card-base-worms",
    "name": "Worms",
    "expansion": "base",
    "source": "src/server/cards/base/Worms.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "oxygen": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"count\":4}]",
    "effectText": "Requires 4% oxygen. Increase your plant production 1 step for every 2 microbe tags you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": {
            "tag": "microbe",
            "per": 2
          }
        }
      }
    }
  },
  {
    "id": "card-base-zeppelins",
    "name": "Zeppelins",
    "expansion": "base",
    "source": "src/server/cards/base/Zeppelins.ts",
    "type": "automated",
    "cost": 13,
    "tags": [],
    "requirements": [
      {
        "oxygen": 5,
        "count": 5
      }
    ],
    "reqText": "[{\"oxygen\":5,\"count\":5}]",
    "effectText": "Requires 5% oxygen. Increase your M€ production 1 step for each city tile ON MARS.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "cities": {
              "where": "onmars"
            }
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-air-raid",
    "name": "Air Raid",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/AirRaid.ts",
    "type": "event",
    "cost": 0,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Requires that you lose 1 floater. Steal 5 M€ from any player.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-airliners",
    "name": "Airliners",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Airliners.ts",
    "type": "automated",
    "cost": 11,
    "tags": [],
    "requirements": [
      {
        "floaters": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"floaters\":3,\"count\":3}]",
    "effectText": "Requires that you have 3 floaters. Increase your M€ production 2 steps. Add 2 floaters to ANY card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Floater"
        }
      }
    }
  },
  {
    "id": "card-colonies-atmo-collectors",
    "name": "Atmo Collectors",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/AtmoCollectors.ts",
    "type": "active",
    "cost": 15,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 2 floaters to ANY card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 2
        }
      },
      "action": {
        "or": {
          "behaviors": [
            {
              "title": "Remove 1 floater to gain 2 titanium",
              "spend": {
                "resourcesHere": 1
              },
              "stock": {
                "titanium": 2
              }
            },
            {
              "title": "Remove 1 floater to gain 3 energy",
              "spend": {
                "resourcesHere": 1
              },
              "stock": {
                "energy": 3
              }
            },
            {
              "title": "Remove 1 floater to gain 4 heat",
              "spend": {
                "resourcesHere": 1
              },
              "stock": {
                "heat": 4
              }
            },
            {
              "title": "Add 1 floater to this card",
              "addResources": 1
            }
          ],
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-colonies-community-services",
    "name": "Community Services",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/CommunityServices.ts",
    "type": "automated",
    "cost": 13,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step per CARD WITH NO TAGS, including this.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-conscription",
    "name": "Conscription",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Conscription.ts",
    "type": "event",
    "cost": 5,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":2}]",
    "effectText": "Requires 2 Earth tags. The next card you play this generation costs 16 M€ less.",
    "victoryPoints": -1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-corona-extractor",
    "name": "Corona Extractor",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/CoronaExtractor.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Space",
      "Power"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 4
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":4}]",
    "effectText": "Requires 4 science tags. Increase your energy production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 4
        }
      }
    }
  },
  {
    "id": "card-colonies-cryo-sleep",
    "name": "Cryo-Sleep",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/CryoSleep.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you trade, you pay 1 less resource for it.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "tradeDiscount": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-earth-elevator",
    "name": "Earth Elevator",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/EarthElevator.ts",
    "type": "automated",
    "cost": 43,
    "tags": [
      "Space",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 3 steps.",
    "victoryPoints": 4,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 3
        }
      }
    }
  },
  {
    "id": "card-colonies-ecology-research",
    "name": "Ecology Research",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/EcologyResearch.ts",
    "type": "automated",
    "cost": 21,
    "tags": [
      "Science",
      "Plant",
      "Animal",
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step for each colony you own. Add 1 animal to ANOTHER card and 2 microbes to ANOTHER card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": {
            "colonies": {
              "colonies": {}
            }
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-floater-leasing",
    "name": "Floater Leasing",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/FloaterLeasing.ts",
    "type": "automated",
    "cost": 3,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step PER 3 floaters you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "floaters": {},
            "per": 3
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-floater-prototypes",
    "name": "Floater Prototypes",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/FloaterPrototypes.ts",
    "type": "event",
    "cost": 2,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add two floaters to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 2
        }
      }
    }
  },
  {
    "id": "card-colonies-floater-technology",
    "name": "Floater Technology",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/FloaterTechnology.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 floater to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-galilean-waystation",
    "name": "Galilean Waystation",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/GalileanWaystation.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for every Jovian tag in play.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "jovian",
            "all": true
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-heavy-taxation",
    "name": "Heavy Taxation",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/HeavyTaxation.ts",
    "type": "automated",
    "cost": 3,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":2}]",
    "effectText": "Requires 2 Earth tags. Increase your M€ production 2 steps, and gain 4 M€.",
    "victoryPoints": -1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "stock": {
          "megacredits": 4
        }
      }
    }
  },
  {
    "id": "card-colonies-ice-moon-colony",
    "name": "Ice Moon Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/IceMoonColony.ts",
    "type": "automated",
    "cost": 23,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 1 colony and 1 ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {}
        },
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-colonies-impactor-swarm",
    "name": "Impactor Swarm",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/ImpactorSwarm.ts",
    "type": "event",
    "cost": 11,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "tag": "jovian",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"jovian\",\"count\":2}]",
    "effectText": "Requires 2 Jovian tags. Gain 12 heat. Remove up to 2 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "heat": 12
        },
        "removeAnyPlants": 2
      }
    }
  },
  {
    "id": "card-colonies-interplanetary-colony-ship",
    "name": "Interplanetary Colony Ship",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/InterplanetaryColonyShip.ts",
    "type": "event",
    "cost": 12,
    "tags": [
      "Space",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a colony.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {}
        }
      }
    }
  },
  {
    "id": "card-colonies-jovian-lanterns",
    "name": "Jovian Lanterns",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/JovianLanterns.ts",
    "type": "active",
    "cost": 20,
    "tags": [
      "Jovian"
    ],
    "requirements": [
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"jovian\"}]",
    "effectText": "Requires 1 Jovian tag. Increase your TR 1 step. Add 2 floaters to ANY card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "tr": 1,
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 2
        }
      }
    }
  },
  {
    "id": "card-colonies-jupiter-floating-station",
    "name": "Jupiter Floating Station",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/JupiterFloatingStation.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Jovian"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-luna-governor",
    "name": "Luna Governor",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/LunaGovernor.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Earth",
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":3}]",
    "effectText": "Requires 3 Earth tags. Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-colonies-lunar-exports",
    "name": "Lunar Exports",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/LunarExports.ts",
    "type": "automated",
    "cost": 19,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 2 steps, or your M€ production 5 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "or": {
          "behaviors": [
            {
              "title": "Increase your M€ production 5 steps",
              "production": {
                "megacredits": 5
              }
            },
            {
              "title": "Increase your plant production 2 steps",
              "production": {
                "plants": 2
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-colonies-lunar-mining",
    "name": "Lunar Mining",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/LunarMining.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step for every 2 Earth tags you have in play, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": {
            "tag": "earth",
            "per": 2
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-market-manipulation",
    "name": "Market Manipulation",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/MarketManipulation.ts",
    "type": "event",
    "cost": 1,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase one colony tile track 1 step. Decrease another colony tile track 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-martian-zoo",
    "name": "Martian Zoo",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/MartianZoo.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Animal",
      "Building"
    ],
    "requirements": [
      {
        "cities": 2,
        "all": true,
        "count": 2
      }
    ],
    "reqText": "[{\"cities\":2,\"all\":true,\"count\":2}]",
    "effectText": "Requires 2 city tiles in play.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-mining-colony",
    "name": "Mining Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/MiningColony.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step. Place a colony.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        },
        "colonies": {
          "buildColony": {}
        }
      }
    }
  },
  {
    "id": "card-colonies-minority-refuge",
    "name": "Minority Refuge",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/MinorityRefuge.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 2 steps. Place a colony.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-molecular-printing",
    "name": "Molecular Printing",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/MolecularPrinting.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 1 M€ for each city tile in play. Gain 1 M€ for each colony in play.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": {
            "cities": {},
            "colonies": {
              "colonies": {}
            },
            "all": true
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-nitrogen-from-titan",
    "name": "Nitrogen from Titan",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/NitrogenFromTitan.ts",
    "type": "automated",
    "cost": 25,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 2 steps. Add 2 floaters to a JOVIAN CARD.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "tr": 2,
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 2,
          "tag": "jovian"
        }
      }
    }
  },
  {
    "id": "card-colonies-pioneer-settlement",
    "name": "Pioneer Settlement",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/PioneerSettlement.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "colonies": 1,
        "max": true,
        "count": 1
      }
    ],
    "reqText": "[{\"colonies\":1,\"max\":true,\"count\":1}]",
    "effectText": "Requires that you have no more than 1 colony. Decrease your M€ production 2 steps. Place a colony.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-productive-outpost",
    "name": "Productive Outpost",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/ProductiveOutpost.ts",
    "type": "automated",
    "cost": 0,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain all your colony bonuses.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-quantum-communications",
    "name": "Quantum Communications",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/QuantumCommunications.ts",
    "type": "automated",
    "cost": 8,
    "tags": [],
    "requirements": [
      {
        "tag": "science",
        "count": 4
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":4}]",
    "effectText": "Requires 4 science tags. Increase your M€ production 1 step for each colony in play.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-red-spot-observatory",
    "name": "Red Spot Observatory",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/RedSpotObservatory.ts",
    "type": "active",
    "cost": 17,
    "tags": [
      "Jovian",
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags. Draw 2 cards.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-colonies-refugee-camps",
    "name": "Refugee Camps",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/RefugeeCamps.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Decrease your M€ production 1 step to add a camp resource to this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "action": {
        "production": {
          "megacredits": -1
        },
        "addResources": 1
      }
    }
  },
  {
    "id": "card-colonies-research-colony",
    "name": "Research Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/ResearchColony.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Space",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a colony. MAY BE PLACED WHERE YOU ALREADY HAVE A COLONY. Draw 2 cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 2,
        "colonies": {
          "buildColony": {
            "allowDuplicates": true
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-rim-freighters",
    "name": "Rim Freighters",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/RimFreighters.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you trade, you pay 1 less resource for it.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "tradeDiscount": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-sky-docks",
    "name": "Sky Docks",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SkyDocks.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Space",
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":2}]",
    "effectText": "Requires 2 Earth tags. Gain 1 Trade Fleet.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "addTradeFleet": 1
        }
      },
      "cardDiscount": {
        "amount": 1
      }
    }
  },
  {
    "id": "card-colonies-solar-probe",
    "name": "Solar Probe",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SolarProbe.ts",
    "type": "event",
    "cost": 9,
    "tags": [
      "Space",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card for every 3 science tags you have, including this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": {
            "tag": "science",
            "per": 3
          }
        }
      }
    }
  },
  {
    "id": "card-colonies-solar-reflectors",
    "name": "Solar Reflectors",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SolarReflectors.ts",
    "type": "automated",
    "cost": 23,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 5 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 5
        }
      }
    }
  },
  {
    "id": "card-colonies-space-port",
    "name": "Space Port",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SpacePort.ts",
    "type": "automated",
    "cost": 22,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "colonies": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"colonies\":1,\"count\":1}]",
    "effectText": "Requires 1 colony. Decrease your energy production 1 step and increase your M€ production 4 steps. Place a city tile. Gain 1 Trade Fleet.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 4
        },
        "colonies": {
          "addTradeFleet": 1
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-colonies-space-port-colony",
    "name": "Space Port Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SpacePortColony.ts",
    "type": "automated",
    "cost": 27,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "colonies": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"colonies\":1,\"count\":1}]",
    "effectText": "Requires a colony. Place a colony. MAY BE PLACED ON A COLONY TILE WHERE YOU ALREADY HAVE A COLONY. Gain 1 Trade Fleet.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "colonies": {
        "colonies": {}
      },
      "all": true,
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {
            "allowDuplicates": true
          },
          "addTradeFleet": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-spin-off-department",
    "name": "Spin-off Department",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SpinoffDepartment.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-colonies-sub-zero-salt-fish",
    "name": "Sub-zero Salt Fish",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/SubZeroSaltFish.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "temperature": -6,
        "count": -6
      }
    ],
    "reqText": "[{\"temperature\":-6,\"count\":-6}]",
    "effectText": "Requires -6 C. Decrease any plant production 1 step.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "decreaseAnyProduction": {
          "type": "plants",
          "count": 1
        }
      },
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-colonies-titan-air-scrapping",
    "name": "Titan Air-scrapping",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/TitanAirScrapping.ts",
    "type": "active",
    "cost": 21,
    "tags": [
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 titanium to add 2 floaters here, or spend 2 floaters here to increase your TR 1 step.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-titan-floating-launch-pad",
    "name": "Titan Floating Launch-pad",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/TitanFloatingLaunchPad.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add two floaters to ANY JOVIAN CARD.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 2,
          "tag": "jovian"
        }
      }
    }
  },
  {
    "id": "card-colonies-titan-shuttles",
    "name": "Titan Shuttles",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/TitanShuttles.ts",
    "type": "active",
    "cost": 23,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 2 floaters to ANY JOVIAN CARD, or spend any number of floaters here to gain the same number of titanium.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-trade-envoys",
    "name": "Trade Envoys",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/TradeEnvoys.ts",
    "type": "active",
    "cost": 6,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you trade, you may first increase that Colony Tile track 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "tradeOffset": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-trading-colony",
    "name": "Trading Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/TradingColony.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a colony.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {},
          "tradeOffset": 1
        }
      }
    }
  },
  {
    "id": "card-colonies-urban-decomposers",
    "name": "Urban Decomposers",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/UrbanDecomposers.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "colonies": 1,
        "count": 1
      },
      {
        "cities": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"colonies\":1,\"count\":1},{\"cities\":1,\"count\":1}]",
    "effectText": "Requires that you have 1 city tile and 1 colony in play. Increase your plant production 1 step, and add 2 microbes to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Microbe"
        }
      }
    }
  },
  {
    "id": "card-colonies-warp-drive",
    "name": "Warp Drive",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/WarpDrive.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 5
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":5}]",
    "effectText": "Requires 5 science tags.",
    "victoryPoints": 2,
    "effectSpec": {
      "cardDiscount": {
        "tag": "space",
        "amount": 4
      }
    }
  },
  {
    "id": "card-prelude-house-printing",
    "name": "House Printing",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/HousePrinting.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your steel production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      }
    }
  },
  {
    "id": "card-prelude-lava-tube-settlement",
    "name": "Lava Tube Settlement",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/LavaTubeSettlement.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Building",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step and increase your M€ production 2 steps. Place a city tile on a VOLCANIC AREA regardless of adjacent cities.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-prelude-martian-survey",
    "name": "Martian Survey",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MartianSurvey.ts",
    "type": "event",
    "cost": 9,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "oxygen": 4,
        "max": true,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"max\":true,\"count\":4}]",
    "effectText": "Oxygen must be 4% or lower. Draw two cards.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-prelude-psychrophiles",
    "name": "Psychrophiles",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Psychrophiles.ts",
    "type": "active",
    "cost": 2,
    "tags": [
      "Microbe"
    ],
    "requirements": [
      {
        "temperature": -20,
        "max": true,
        "count": -20
      }
    ],
    "reqText": "[{\"temperature\":-20,\"max\":true,\"count\":-20}]",
    "effectText": "Temperature must be -20 C or lower.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-prelude-research-coordination",
    "name": "Research Coordination",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/ResearchCoordination.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Wild"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "After being played, when you perform an action, the wild tag counts as any tag of your choice.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude-sf-memorial",
    "name": "SF Memorial",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SFMemorial.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-prelude-space-hotels",
    "name": "Space Hotels",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SpaceHotels.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Space",
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":2}]",
    "effectText": "Requires 2 Earth tags. Increase M€ production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 4
        }
      }
    }
  },
  {
    "id": "card-prelude2-ceres-tech-market",
    "name": "Ceres Tech Market",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/CeresTechMarket.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Science",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Discard any number of cards from your hand to gain 2 M€ for each discarded card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": {
            "colonies": {
              "colonies": {}
            },
            "each": 2
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-cloud-tourism",
    "name": "Cloud Tourism",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/CloudTourism.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Jovian",
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each pair of Earth and Venus tags you own. 1 VP for every 3rd floater on this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": 1,
      "per": 3
    },
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-prelude2-colonial-envoys",
    "name": "Colonial Envoys",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/ColonialEnvoys.ts",
    "type": "event",
    "cost": 4,
    "tags": [],
    "requirements": [
      {
        "party": "Unity"
      }
    ],
    "reqText": "[{\"party\":\"Unity\"}]",
    "effectText": "Requires that Unity is ruling or that you have 2 delegates there. Place 1 delegate for each colony you have. YOU MAY PLACE THEM IN SEPARATE PARTIES.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "turmoil": {
          "sendDelegates": {
            "count": {
              "colonies": {}
            },
            "manyParties": true
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-colonial-representation",
    "name": "Colonial Representation",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/ColonialRepresentation.ts",
    "type": "active",
    "cost": 10,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 M€ per colony you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "turmoil": {
          "influenceBonus": 1
        },
        "stock": {
          "megacredits": {
            "colonies": {
              "colonies": {}
            },
            "each": 3
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-envoys-from-venus",
    "name": "Envoys From Venus",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/EnvoysFromVenus.ts",
    "type": "event",
    "cost": 1,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "tag": "venus",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"venus\",\"count\":3}]",
    "effectText": "Requires 3 Venus tags. Place 2 delegates in 1 party.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "turmoil": {
          "sendDelegates": {
            "count": 2
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-floating-refinery",
    "name": "Floating Refinery",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/FloatingRefinery.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 1 floater here for each Venus tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": {
          "tag": "venus"
        }
      }
    }
  },
  {
    "id": "card-prelude2-frontier-town",
    "name": "Frontier Town",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/FrontierTown.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "party": "Mars First"
      }
    ],
    "reqText": "[{\"party\":\"Mars First\"}]",
    "effectText": "Requires that Mars First is ruling or that you have 2 delegates there. Decrease your energy production one step. Place a city tile. GAIN THE PRINTED PLACEMENT BONUS 2 ADDITIONAL TIMES.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-ghg-shipment",
    "name": "GHG Shipment",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/GhgShipment.ts",
    "type": "event",
    "cost": 3,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "party": "Kelvinists"
      }
    ],
    "reqText": "[{\"party\":\"Kelvinists\"}]",
    "effectText": "Requires that Kelvinists are in power or that you have 2 delegates there. Increase your heat production 1 step. Gain 1 heat for each floater you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 1
        },
        "stock": {
          "heat": {
            "floaters": {}
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-ishtar-expedition",
    "name": "Ishtar Expedition",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/IshtarExpedition.ts",
    "type": "event",
    "cost": 6,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "venus": 10,
        "count": 10
      }
    ],
    "reqText": "[{\"venus\":10,\"count\":10}]",
    "effectText": "Requires Venus 10%. Gain 3 titanium and draw 2 Venus cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 3
        },
        "drawCard": {
          "count": 2,
          "tag": "venus"
        }
      }
    }
  },
  {
    "id": "card-prelude2-jovian-envoys",
    "name": "Jovian Envoys",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/JovianEnvoys.ts",
    "type": "event",
    "cost": 2,
    "tags": [],
    "requirements": [
      {
        "tag": "jovian",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"jovian\",\"count\":2}]",
    "effectText": "Requires 2 Jovian tags. Place 2 delegates in 1 party.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "turmoil": {
          "sendDelegates": {
            "count": 2
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-l1-trade-terminal",
    "name": "L1 Trade Terminal",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/L1TradeTerminal.ts",
    "type": "active",
    "cost": 25,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you trade, you may first increase that colony tile track 2 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "tradeOffset": 2
        }
      }
    }
  },
  {
    "id": "card-prelude2-microgravity-nutrition",
    "name": "Microgravity Nutrition",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/MicrogravityNutrition.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Microbe",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each colony you have.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-red-appeasement",
    "name": "Red Appeasement",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/RedAppeasement.ts",
    "type": "event",
    "cost": 0,
    "tags": [],
    "requirements": [
      {
        "party": "Reds"
      }
    ],
    "reqText": "[{\"party\":\"Reds\"}]",
    "effectText": "Requires that Reds are ruling or that you have 2 delegates there, AND THAT NO OTHER PLAYER HAS PASSED. Increase M€ production 2 steps. This counts as passing. You get no other turns this generation.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-prelude2-soil-studies",
    "name": "Soil Studies",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SoilStudies.ts",
    "type": "event",
    "cost": 13,
    "tags": [
      "Microbe",
      "Plant"
    ],
    "requirements": [
      {
        "temperature": -4,
        "max": true,
        "count": -4
      }
    ],
    "reqText": "[{\"temperature\":-4,\"max\":true,\"count\":-4}]",
    "effectText": "Requires that temperature is -4 C or lower. Gain 1 plant per Venus tag, plant tag, and colony you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": {
            "tag": [
              "venus",
              "plant"
            ],
            "colonies": {
              "colonies": {}
            }
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-special-permit",
    "name": "Special Permit",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SpecialPermit.ts",
    "type": "event",
    "cost": 5,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "party": "Greens"
      }
    ],
    "reqText": "[{\"party\":\"Greens\"}]",
    "effectText": "Requires that Greens are ruling or that you have 2 delegates there. Steal 4 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-sponsoring-nation",
    "name": "Sponsoring Nation",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SponsoringNation.ts",
    "type": "automated",
    "cost": 21,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "tag": "earth",
        "count": 4
      }
    ],
    "reqText": "[{\"tag\":\"earth\",\"count\":4}]",
    "effectText": "Requires 4 Earth tags. Gain 3 TR. Place 2 delegates.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 3,
        "turmoil": {
          "sendDelegates": {
            "count": 2
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-stratospheric-expedition",
    "name": "Stratospheric Expedition",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/StratosphericExpedition.ts",
    "type": "event",
    "cost": 12,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add two floaters to ANY CARD. Draw 2 Venus cards.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Floater"
        },
        "drawCard": {
          "count": 2,
          "tag": "venus"
        }
      }
    }
  },
  {
    "id": "card-prelude2-summit-logistics",
    "name": "Summit Logistics",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SummitLogistics.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Building",
      "Space"
    ],
    "requirements": [
      {
        "party": "Scientists"
      }
    ],
    "reqText": "[{\"party\":\"Scientists\"}]",
    "effectText": "Gain 1 M€ per planet tag and colony you have. Draw 2 cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": {
            "tag": [
              "jovian",
              "earth",
              "venus",
              "mars"
            ],
            "colonies": {
              "colonies": {}
            }
          }
        },
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-prelude2-unexpected-application",
    "name": "Unexpected Application",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/UnexpectedApplication.ts",
    "type": "event",
    "cost": 4,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Discard 1 card to terraform Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "spend": {
          "cards": 1
        },
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-prelude2-venus-allies",
    "name": "Venus Allies",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusAllies.ts",
    "type": "automated",
    "cost": 30,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 2 steps. Gain 4 M€ per colony you have.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 2
        },
        "stock": {
          "megacredits": {
            "colonies": {
              "colonies": {}
            },
            "each": 4
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-venus-orbital-survey",
    "name": "Venus Orbital Survey",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusOrbitalSurvey.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Reveal the top 2 cards, take any venus cards to hand for free. Any other card you either buy or discard",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-venus-shuttles",
    "name": "Venus Shuttles",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusShuttles.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 2 floaters to ANY VENUS CARD.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "count": 2,
          "tag": "venus",
          "type": "Floater",
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-prelude2-venus-trade-hub",
    "name": "Venus Trade Hub",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusTradeHub.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [
      {
        "tag": "venus",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"venus\",\"count\":2}]",
    "effectText": "Requires 2 Venus tags.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-wg-project",
    "name": "WG Project",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/WGProject.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "chairman": true
      }
    ],
    "reqText": "[{\"chairman\":true}]",
    "effectText": "Requires that you are Chairman. DRAW 3 PRELUDE CARDS AND PLAY 1 OF THEM, Discard the other 2.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-16-psyche",
    "name": "16 Psyche",
    "expansion": "promo",
    "source": "src/server/cards/promo/16Psyche.ts",
    "type": "automated",
    "cost": 31,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase titanium production 2 steps. Gain 3 titanium.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 2
        },
        "stock": {
          "titanium": 3
        }
      }
    }
  },
  {
    "id": "card-promo-advertising",
    "name": "Advertising",
    "expansion": "promo",
    "source": "src/server/cards/promo/Advertising.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a card with a basic cost of 20 M€ or more, increase your M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-aqueduct-systems",
    "name": "Aqueduct Systems",
    "expansion": "promo",
    "source": "src/server/cards/promo/AqueductSystems.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "cities": 1,
        "nextTo": true,
        "count": 1
      },
      {
        "oceans": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"cities\":1,\"nextTo\":true,\"count\":1},{\"oceans\":1,\"count\":1}]",
    "effectText": "Requires you have a city next to an ocean. Draw 3 cards with a building tag.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 3,
          "tag": "building"
        }
      }
    }
  },
  {
    "id": "card-promo-asteroid-deflection-system",
    "name": "Asteroid Deflection System",
    "expansion": "promo",
    "source": "src/server/cards/promo/AsteroidDeflectionSystem.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Space",
      "Earth",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step. 1 VP per asteroid on this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        }
      }
    }
  },
  {
    "id": "card-promo-asteroid-hollowing",
    "name": "Asteroid Hollowing",
    "expansion": "promo",
    "source": "src/server/cards/promo/AsteroidHollowing.ts",
    "type": "active",
    "cost": 16,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 titanium to add 1 asteroid resource here and increase M€ production 1 step.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "action": {
        "spend": {
          "titanium": 1
        },
        "production": {
          "megacredits": 1
        },
        "addResources": 1
      }
    }
  },
  {
    "id": "card-promo-asteroid-rights",
    "name": "Asteroid Rights",
    "expansion": "promo",
    "source": "src/server/cards/promo/AsteroidRights.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 M€ to add 1 asteroid to ANY card OR spend 1 asteroid here to increase M€ production 1 step OR gain 2 titanium. Add 2 asteroids to this card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 2
      }
    }
  },
  {
    "id": "card-promo-astra-mechanica",
    "name": "Astra Mechanica",
    "expansion": "promo",
    "source": "src/server/cards/promo/AstraMechanica.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "RETURN UP TO 2 OF YOUR PLAYED EVENT CARDS TO YOUR HAND. THEY MAY NOT BE CARDS THAT PLACE SPECIAL TILES.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-bactoviral-research",
    "name": "Bactoviral Research",
    "expansion": "promo",
    "source": "src/server/cards/promo/BactoviralResearch.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Microbe",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card. Choose 1 of your played cards and add 1 microbe to it for each science tag you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 1,
        "addResourcesToAnyCard": {
          "count": {
            "tag": "science"
          },
          "type": "Microbe"
        }
      }
    }
  },
  {
    "id": "card-promo-bio-printing-facility",
    "name": "Bio Printing Facility",
    "expansion": "promo",
    "source": "src/server/cards/promo/BioPrintingFacility.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 2 energy to gain 2 plants OR to add 1 animal to ANOTHER card.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-carbon-nanosystems",
    "name": "Carbon Nanosystems",
    "expansion": "promo",
    "source": "src/server/cards/promo/CarbonNanosystems.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a science tag, including this, add a graphene resource here. Effect: When playing a space or city tag, graphenes may be used as 4 M€ each.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-casinos",
    "name": "Casinos",
    "expansion": "promo",
    "source": "src/server/cards/promo/Casinos.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "cities": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"cities\":1,\"count\":1}]",
    "effectText": "Requires that you have a city. Decrease your energy production 1 step and increase your M€ production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 4
        }
      }
    }
  },
  {
    "id": "card-promo-city-parks",
    "name": "City Parks",
    "expansion": "promo",
    "source": "src/server/cards/promo/CityParks.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "cities": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"cities\":3,\"count\":3}]",
    "effectText": "Requires that you have 3 cities. Gain 2 plants.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-promo-comet-aiming",
    "name": "Comet Aiming",
    "expansion": "promo",
    "source": "src/server/cards/promo/CometAiming.ts",
    "type": "active",
    "cost": 17,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 titanium to add 1 asteroid resource to ANY CARD, or remove 1 asteroid here to place an ocean.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-crash-site-cleanup",
    "name": "Crash Site Cleanup",
    "expansion": "promo",
    "source": "src/server/cards/promo/CrashSiteCleanup.ts",
    "type": "event",
    "cost": 4,
    "tags": [],
    "requirements": [
      {
        "plantsRemoved": true
      }
    ],
    "reqText": "[{\"plantsRemoved\":true}]",
    "effectText": "Requires that a player removed ANOTHER PLAYER's plants this generation. Gain 1 titanium or 2 steel.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-cutting-edge-technology",
    "name": "Cutting Edge Technology",
    "expansion": "promo",
    "source": "src/server/cards/promo/CuttingEdgeTechnology.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When playing a card with a requirement, you pay 2 M€ less for it.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-cyberia-systems",
    "name": "Cyberia Systems",
    "expansion": "promo",
    "source": "src/server/cards/promo/CyberiaSystems.ts",
    "type": "automated",
    "cost": 16,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your steel production 1 step. Copy the PRODUCTION BOXES of 2 of your cards with building tags.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      }
    }
  },
  {
    "id": "card-promo-deimos-down-promo",
    "name": "Deimos Down:promo",
    "expansion": "promo",
    "source": "src/server/cards/promo/DeimosDownPromo.ts",
    "type": "event",
    "cost": 31,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 3 steps and gain 4 steel. Place this tile ADJACENT TO no city tile. Remove up to 6 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 4
        },
        "global": {
          "temperature": 3
        },
        "removeAnyPlants": 6,
        "tile": {
          "type": 14,
          "on": "away-from-cities"
        }
      }
    }
  },
  {
    "id": "card-promo-directed-heat-usage",
    "name": "Directed Heat Usage",
    "expansion": "promo",
    "source": "src/server/cards/promo/DirectedHeatUsage.ts",
    "type": "active",
    "cost": 1,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 3 heat to gain either 4 M€ or 2 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "behaviors": [
            {
              "title": "Spend 3 heat to gain 4 M€",
              "spend": {
                "heat": 3
              },
              "stock": {
                "megacredits": 4
              }
            },
            {
              "title": "Spend 3 heat to gain 2 plants",
              "spend": {
                "heat": 3
              },
              "stock": {
                "plants": 2
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-promo-directed-impactors",
    "name": "Directed Impactors",
    "expansion": "promo",
    "source": "src/server/cards/promo/DirectedImpactors.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 6 M€ to add 1 asteroid to ANY CARD (titanium may be used to pay for this), or remove 1 asteroid here to raise temperature 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-diversity-support",
    "name": "Diversity Support",
    "expansion": "promo",
    "source": "src/server/cards/promo/DiversitySupport.ts",
    "type": "event",
    "cost": 1,
    "tags": [],
    "requirements": [
      {
        "resourceTypes": 9,
        "count": 9
      }
    ],
    "reqText": "[{\"resourceTypes\":9,\"count\":9}]",
    "effectText": "Requires that you have 9 different types of resources. Gain 1 TR.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-promo-dusk-laser-mining",
    "name": "Dusk Laser Mining",
    "expansion": "promo",
    "source": "src/server/cards/promo/DuskLaserMining.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags. Decrease your energy production 1 step, and increase your titanium production 1 step. Gain 4 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "titanium": 1
        },
        "stock": {
          "titanium": 4
        }
      }
    }
  },
  {
    "id": "card-promo-energy-market",
    "name": "Energy Market",
    "expansion": "promo",
    "source": "src/server/cards/promo/EnergyMarket.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 2X M€ to gain X energy, or decrease energy production 1 step to gain 8 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-field-capped-city",
    "name": "Field-Capped City",
    "expansion": "promo",
    "source": "src/server/cards/promo/FieldCappedCity.ts",
    "type": "automated",
    "cost": 29,
    "tags": [
      "City",
      "Building",
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps, increase your energy production 1 step, gain 3 plants, and place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "megacredits": 2
        },
        "stock": {
          "plants": 3
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-promo-floyd-continuum",
    "name": "Floyd Continuum",
    "expansion": "promo",
    "source": "src/server/cards/promo/FloydContinuum.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Gain 3 M€ per completed terraforming parameter.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-great-dam-promo",
    "name": "Great Dam:promo",
    "expansion": "promo",
    "source": "src/server/cards/promo/GreatDamPromo.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [
      {
        "oceans": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oceans\":4,\"count\":4}]",
    "effectText": "Requires 4 ocean tiles. Increase your energy production 2 steps. Place this tile ADJACENT TO an ocean tile.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-promo-harvest",
    "name": "Harvest",
    "expansion": "promo",
    "source": "src/server/cards/promo/Harvest.ts",
    "type": "event",
    "cost": 4,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "greeneries": 3,
        "count": 3
      }
    ],
    "reqText": "[{\"greeneries\":3,\"count\":3}]",
    "effectText": "Requires that you have 3 greenery tiles in play. Gain 12 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 12
        }
      }
    }
  },
  {
    "id": "card-promo-hermetic-order-of-mars",
    "name": "Hermetic Order of Mars",
    "expansion": "promo",
    "source": "src/server/cards/promo/HermeticOrderofMars.ts",
    "type": "automated",
    "cost": 10,
    "tags": [],
    "requirements": [
      {
        "oxygen": 4,
        "max": true,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"max\":true,\"count\":4}]",
    "effectText": "Oxygen must be 4% or lower. Increase your M€ production 2 steps. Gain 1 M€ per empty area adjacent to your tiles.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-promo-hi-tech-lab",
    "name": "Hi-Tech Lab",
    "expansion": "promo",
    "source": "src/server/cards/promo/HiTechLab.ts",
    "type": "active",
    "cost": 17,
    "tags": [
      "Science",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend any amount of energy to draw the same number of cards. TAKE 1 INTO HAND AND DISCARD THE REST.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-homeostasis-bureau",
    "name": "Homeostasis Bureau",
    "expansion": "promo",
    "source": "src/server/cards/promo/HomeostasisBureau.ts",
    "type": "active",
    "cost": 16,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        }
      }
    }
  },
  {
    "id": "card-promo-hospitals",
    "name": "Hospitals",
    "expansion": "promo",
    "source": "src/server/cards/promo/Hospitals.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        }
      }
    }
  },
  {
    "id": "card-promo-icy-impactors",
    "name": "Icy Impactors",
    "expansion": "promo",
    "source": "src/server/cards/promo/IcyImpactors.ts",
    "type": "active",
    "cost": 15,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 10 M€ (titanium may be used) to add 2 asteroids here, or spend 1 asteroid here to place an ocean tile. FIRST PLAYER CHOOSES WHERE YOU MUST PLACE IT.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-imported-nutrients",
    "name": "Imported Nutrients",
    "expansion": "promo",
    "source": "src/server/cards/promo/ImportedNutrients.ts",
    "type": "event",
    "cost": 14,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 4 plants and add 4 microbes to ANOTHER CARD.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 4
        },
        "addResourcesToAnyCard": {
          "count": 4,
          "type": "Microbe"
        }
      }
    }
  },
  {
    "id": "card-promo-interplanetary-trade",
    "name": "Interplanetary Trade",
    "expansion": "promo",
    "source": "src/server/cards/promo/InterplanetaryTrade.ts",
    "type": "automated",
    "cost": 27,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step per different tag you have in play, including this.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-jovian-embassy",
    "name": "Jovian Embassy",
    "expansion": "promo",
    "source": "src/server/cards/promo/JovianEmbassy.ts",
    "type": "automated",
    "cost": 14,
    "tags": [
      "Jovian",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 1 step.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-promo-kaguya-tech",
    "name": "Kaguya Tech",
    "expansion": "promo",
    "source": "src/server/cards/promo/KaguyaTech.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "City",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase M€ production 2 steps. Draw 1 card. Remove 1 of your greenery tiles (does not affect oxygen.) Place a city tile there, regardless of placement rules. Gain placement bonuses as usual.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-promo-law-suit",
    "name": "Law Suit",
    "expansion": "promo",
    "source": "src/server/cards/promo/LawSuit.ts",
    "type": "event",
    "cost": 2,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Steal 3 M€ from a player that REMOVED YOUR RESOURCES OR DECREASED YOUR PRODUCTION this generation. Place this card face down in THAT PLAYER'S EVENT PILE.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-magnetic-field-generators-promo",
    "name": "Magnetic Field Generators:promo",
    "expansion": "promo",
    "source": "src/server/cards/promo/MagneticFieldGeneratorsPromo.ts",
    "type": "automated",
    "cost": 22,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 4 steps and increase your plant production 2 steps. Raise your TR 3 steps. Place this tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -4,
          "plants": 2
        },
        "tr": 3,
        "tile": {
          "type": 16,
          "on": "land"
        }
      }
    }
  },
  {
    "id": "card-promo-magnetic-shield",
    "name": "Magnetic Shield",
    "expansion": "promo",
    "source": "src/server/cards/promo/MagneticShield.ts",
    "type": "automated",
    "cost": 24,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "tag": "power",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"power\",\"count\":3}]",
    "effectText": "Requires 3 power tags. Raise your TR 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 4
      }
    }
  },
  {
    "id": "card-promo-mars-nomads",
    "name": "Mars Nomads",
    "expansion": "promo",
    "source": "src/server/cards/promo/MarsNomads.ts",
    "type": "active",
    "cost": 13,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: MOVE THE NOMADS to an adjacent, non-reserved empty area and collect THE PLACEMENT BONUS as if placing a special tile there. No tiles may be placed on the Nomad area. PLACE THE NOMADS on a non-reserved, empty area on the game board.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-martian-lumber-corp",
    "name": "Martian Lumber Corp",
    "expansion": "promo",
    "source": "src/server/cards/promo/MartianLumberCorp.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Building",
      "Plant"
    ],
    "requirements": [
      {
        "greeneries": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"greeneries\":2,\"count\":2}]",
    "effectText": "Effect: When playing a building tag, plants may be used as 3 M€ each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-promo-meat-industry",
    "name": "Meat Industry",
    "expansion": "promo",
    "source": "src/server/cards/promo/MeatIndustry.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you gain an animal to ANY CARD, gain 2 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-meltworks",
    "name": "Meltworks",
    "expansion": "promo",
    "source": "src/server/cards/promo/Meltworks.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 5 heat to gain 3 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "spend": {
          "heat": 5
        },
        "stock": {
          "steel": 3
        }
      }
    }
  },
  {
    "id": "card-promo-mercurian-alloys",
    "name": "Mercurian Alloys",
    "expansion": "promo",
    "source": "src/server/cards/promo/MercurianAlloys.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "titanumValue": 1
      }
    }
  },
  {
    "id": "card-promo-mohole-lake",
    "name": "Mohole Lake",
    "expansion": "promo",
    "source": "src/server/cards/promo/MoholeLake.ts",
    "type": "active",
    "cost": 31,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 plants. Raise temperature 1 step, and place 1 ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 3
        },
        "global": {
          "temperature": 1
        },
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-promo-neptunian-power-consultants",
    "name": "Neptunian Power Consultants",
    "expansion": "promo",
    "source": "src/server/cards/promo/NeptunianPowerConsultants.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "1 VP per hydroelectric resource on this card",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {}
  },
  {
    "id": "card-promo-new-holland",
    "name": "New Holland",
    "expansion": "promo",
    "source": "src/server/cards/promo/NewHolland.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "cities": 4,
        "all": true,
        "count": 4
      }
    ],
    "reqText": "[{\"cities\":4,\"all\":true,\"count\":4}]",
    "effectText": "Requires 4 city tiles ON MARS. Increase your M€ production 3 steps. Place a city tile on top of an already placed ocean tile, FOLLOWING NORMAL CITY PLACEMENT RESTRICTIONS. The tile counts as a city and an ocean.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        },
        "tile": {
          "type": 43,
          "on": "upgradeable-ocean-new-holland"
        }
      }
    }
  },
  {
    "id": "card-promo-orbital-cleanup",
    "name": "Orbital Cleanup",
    "expansion": "promo",
    "source": "src/server/cards/promo/OrbitalCleanup.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your M€ production 2 steps.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -2
        }
      },
      "action": {
        "stock": {
          "megacredits": {
            "tag": "science"
          }
        }
      }
    }
  },
  {
    "id": "card-promo-outdoor-sports",
    "name": "Outdoor Sports",
    "expansion": "promo",
    "source": "src/server/cards/promo/OutdoorSports.ts",
    "type": "automated",
    "cost": 8,
    "tags": [],
    "requirements": [
      {
        "cities": 1,
        "all": true,
        "nextTo": true,
        "count": 1
      },
      {
        "oceans": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"cities\":1,\"all\":true,\"nextTo\":true,\"count\":1},{\"oceans\":1,\"count\":1}]",
    "effectText": "Requires any city adjacent to an ocean. Increase your M€ production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-promo-penguins",
    "name": "Penguins",
    "expansion": "promo",
    "source": "src/server/cards/promo/Penguins.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Animal"
    ],
    "requirements": [
      {
        "oceans": 8,
        "count": 8
      }
    ],
    "reqText": "[{\"oceans\":8,\"count\":8}]",
    "effectText": "Requires 8 oceans.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-promo-potatoes",
    "name": "Potatoes",
    "expansion": "promo",
    "source": "src/server/cards/promo/Potatoes.ts",
    "type": "automated",
    "cost": 2,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Lose 2 plants. Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-promo-project-inspection",
    "name": "Project Inspection",
    "expansion": "promo",
    "source": "src/server/cards/promo/ProjectInspection.ts",
    "type": "event",
    "cost": 0,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Use a card action that has been used this generation.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-protected-growth",
    "name": "Protected Growth",
    "expansion": "promo",
    "source": "src/server/cards/promo/ProtectedGrowth.ts",
    "type": "event",
    "cost": 2,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oxygen": 7,
        "max": true,
        "count": 7
      }
    ],
    "reqText": "[{\"oxygen\":7,\"max\":true,\"count\":7}]",
    "effectText": "Oxygen must be 7% or less. Gain 1 plant per power tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": {
            "tag": "power"
          }
        }
      }
    }
  },
  {
    "id": "card-promo-public-baths",
    "name": "Public Baths",
    "expansion": "promo",
    "source": "src/server/cards/promo/PublicBaths.ts",
    "type": "automated",
    "cost": 6,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "oceans": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"oceans\":6,\"count\":6}]",
    "effectText": "Requires 6 oceans. Gain 6 M€.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 6
        }
      }
    }
  },
  {
    "id": "card-promo-public-plans",
    "name": "Public Plans",
    "expansion": "promo",
    "source": "src/server/cards/promo/PublicPlans.ts",
    "type": "event",
    "cost": 7,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "REVEAL ANY NUMBER OF OTHER CARDS FROM YOUR HAND. (YOUR OPPONENTS MAY INSPECT THEM.) GAIN 1 M€ FOR EACH REVEALED CARD.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-promo-red-ships",
    "name": "Red Ships",
    "expansion": "promo",
    "source": "src/server/cards/promo/RedShips.ts",
    "type": "active",
    "cost": 2,
    "tags": [],
    "requirements": [
      {
        "oxygen": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"count\":4}]",
    "effectText": "Requires 4% oxygen.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-rego-plastics",
    "name": "Rego Plastics",
    "expansion": "promo",
    "source": "src/server/cards/promo/RegoPlastics.ts",
    "type": "active",
    "cost": 10,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: Your steel resources are worth 1 M€ extra.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "steelValue": 1
      }
    }
  },
  {
    "id": "card-promo-robot-pollinators",
    "name": "Robot Pollinators",
    "expansion": "promo",
    "source": "src/server/cards/promo/RobotPollinators.ts",
    "type": "automated",
    "cost": 9,
    "tags": [],
    "requirements": [
      {
        "oxygen": 4,
        "count": 4
      }
    ],
    "reqText": "[{\"oxygen\":4,\"count\":4}]",
    "effectText": "Requires 4% oxygen. Increase your plant production 1 step. Gain 1 plant for every plant tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "stock": {
          "plants": {
            "tag": "plant"
          }
        }
      }
    }
  },
  {
    "id": "card-promo-saturn-surfing",
    "name": "Saturn Surfing",
    "expansion": "promo",
    "source": "src/server/cards/promo/SaturnSurfing.ts",
    "type": "active",
    "cost": 13,
    "tags": [
      "Jovian",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 1 floater here for every Earth tag you have, including this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "addResources": {
          "tag": "earth"
        }
      }
    }
  },
  {
    "id": "card-promo-self-replicating-robots",
    "name": "Self-replicating Robots",
    "expansion": "promo",
    "source": "src/server/cards/promo/SelfReplicatingRobots.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags. Reveal and place a SPACE OR BUILDING card here from hand, and place 2 resources on it, OR double the resources on a card here.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-small-asteroid",
    "name": "Small Asteroid",
    "expansion": "promo",
    "source": "src/server/cards/promo/SmallAsteroid.ts",
    "type": "event",
    "cost": 10,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase temperature 1 step. Remove up to 2 plants from any player.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 1
        },
        "removeAnyPlants": 2
      }
    }
  },
  {
    "id": "card-promo-snow-algae",
    "name": "Snow Algae",
    "expansion": "promo",
    "source": "src/server/cards/promo/SnowAlgae.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Plant"
    ],
    "requirements": [
      {
        "oceans": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"oceans\":2,\"count\":2}]",
    "effectText": "Requires 2 oceans. Increase your plant production and your heat production 1 step each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1,
          "heat": 1
        }
      }
    }
  },
  {
    "id": "card-promo-soil-enrichment",
    "name": "Soil Enrichment",
    "expansion": "promo",
    "source": "src/server/cards/promo/SoilEnrichment.ts",
    "type": "event",
    "cost": 6,
    "tags": [
      "Microbe",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 1 microbe from ANY of your cards to gain 5 plants",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-solar-logistics",
    "name": "Solar Logistics",
    "expansion": "promo",
    "source": "src/server/cards/promo/SolarLogistics.ts",
    "type": "active",
    "cost": 20,
    "tags": [
      "Earth",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 2 titanium.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 2
        }
      },
      "cardDiscount": {
        "tag": "earth",
        "amount": 2
      }
    }
  },
  {
    "id": "card-promo-st-joseph-of-cupertino-mission",
    "name": "St. Joseph of Cupertino Mission",
    "expansion": "promo",
    "source": "src/server/cards/promo/StJosephOfCupertinoMission.ts",
    "type": "active",
    "cost": 7,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "1 VP per City with a Cathedral in it.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-stanford-torus",
    "name": "Stanford Torus",
    "expansion": "promo",
    "source": "src/server/cards/promo/StanfordTorus.ts",
    "type": "automated",
    "cost": 12,
    "tags": [
      "Space",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a city tile IN SPACE, outside and separate from the planet.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "city": {
          "space": "69"
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-promo-static-harvesting",
    "name": "Static Harvesting",
    "expansion": "promo",
    "source": "src/server/cards/promo/StaticHarvesting.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Power"
    ],
    "requirements": [
      {
        "oceans": 3,
        "max": true,
        "count": 3
      }
    ],
    "reqText": "[{\"oceans\":3,\"max\":true,\"count\":3}]",
    "effectText": "Requires 3 or fewer ocean tiles. Increase your energy production 1 step. Gain 1 M€ per building tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        },
        "stock": {
          "megacredits": {
            "tag": "building"
          }
        }
      }
    }
  },
  {
    "id": "card-promo-sterling-vents",
    "name": "Sterling Vents",
    "expansion": "promo",
    "source": "src/server/cards/promo/SterlingVents.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease heat production 2 steps. Increase energy production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": -2,
          "energy": 2
        }
      }
    }
  },
  {
    "id": "card-promo-sub-crust-measurements",
    "name": "Sub-Crust Measurements",
    "expansion": "promo",
    "source": "src/server/cards/promo/SubCrustMeasurements.ts",
    "type": "active",
    "cost": 20,
    "tags": [
      "Science",
      "Building",
      "Earth"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags.",
    "victoryPoints": 2,
    "effectSpec": {
      "action": {
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-promo-supercapacitors",
    "name": "Supercapacitors",
    "expansion": "promo",
    "source": "src/server/cards/promo/Supercapacitors.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        }
      }
    }
  },
  {
    "id": "card-promo-supermarkets",
    "name": "Supermarkets",
    "expansion": "promo",
    "source": "src/server/cards/promo/Supermarkets.ts",
    "type": "automated",
    "cost": 9,
    "tags": [],
    "requirements": [
      {
        "cities": 2,
        "all": true,
        "count": 2
      }
    ],
    "reqText": "[{\"cities\":2,\"all\":true,\"count\":2}]",
    "effectText": "Requires two cities in play. Increase your M€ production 2 steps.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-promo-teslaract",
    "name": "Teslaract",
    "expansion": "promo",
    "source": "src/server/cards/promo/Teslaract.ts",
    "type": "active",
    "cost": 14,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-promo-topsoil-contract",
    "name": "Topsoil Contract",
    "expansion": "promo",
    "source": "src/server/cards/promo/TopsoilContract.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Microbe",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 3
        }
      }
    }
  },
  {
    "id": "card-promo-vermin",
    "name": "Vermin",
    "expansion": "promo",
    "source": "src/server/cards/promo/Vermin.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Microbe",
      "Animal"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Each player, including you, gets -1 VP per city they have IF THERE ARE AT LEAST 10 ANIMALS HERE.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "behaviors": [
            {
              "title": "Add one animal here",
              "addResources": 1
            },
            {
              "title": "Add 1 microbe to ANY card",
              "addResourcesToAnyCard": {
                "count": 1,
                "type": "Microbe",
                "mustHaveCard": true
              }
            }
          ],
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-promo-weather-balloons",
    "name": "Weather Balloons",
    "expansion": "promo",
    "source": "src/server/cards/promo/WeatherBalloons.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 1
      },
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "title": "Spend 1 floater here to gain 1 M€ per city on Mars",
              "spend": {
                "resourcesHere": 1
              },
              "stock": {
                "megacredits": {
                  "cities": {
                    "where": "onmars"
                  }
                }
              }
            },
            {
              "title": "Add 1 floater here",
              "addResources": 1
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-turmoil-aerial-lenses",
    "name": "Aerial Lenses",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/AerialLenses.ts",
    "type": "automated",
    "cost": 2,
    "tags": [],
    "requirements": [
      {
        "party": "Kelvinists"
      }
    ],
    "reqText": "[{\"party\":\"Kelvinists\"}]",
    "effectText": "Requires that Kelvinists are ruling or that you have 2 delegates there. Remove up to 2 plants from any player. Increase your heat production 2 steps.",
    "victoryPoints": -1,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        },
        "removeAnyPlants": 2
      }
    }
  },
  {
    "id": "card-turmoil-banned-delegate",
    "name": "Banned Delegate",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/BannedDelegate.ts",
    "type": "event",
    "cost": 0,
    "tags": [],
    "requirements": [
      {
        "chairman": true
      }
    ],
    "reqText": "[{\"chairman\":true}]",
    "effectText": "Requires that you are Chairman. Remove any NON-LEADER delegate.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-turmoil-cultural-metropolis",
    "name": "Cultural Metropolis",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/CulturalMetropolis.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [
      {
        "party": "Unity"
      }
    ],
    "reqText": "[{\"party\":\"Unity\"}]",
    "effectText": "Requires that Unity is ruling or that you have 2 delegates there. Decrease your energy production 1 step and increase your M€ production 3 steps. Place a city tile. Place 2 delegates in 1 party.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 3
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-turmoil-diaspora-movement",
    "name": "Diaspora Movement",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/DiasporaMovement.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Jovian"
    ],
    "requirements": [
      {
        "party": "Reds"
      }
    ],
    "reqText": "[{\"party\":\"Reds\"}]",
    "effectText": "Requires that Reds are ruling or that you have 2 delegates there. Gain 1M€ for each Jovian tag in play, including this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": {
            "tag": "jovian",
            "all": true
          }
        }
      }
    }
  },
  {
    "id": "card-turmoil-event-analysts",
    "name": "Event Analysts",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/EventAnalysts.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "party": "Scientists"
      }
    ],
    "reqText": "[{\"party\":\"Scientists\"}]",
    "effectText": "Requires that Scientists are ruling or that you have 2 delegates there.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "turmoil": {
          "influenceBonus": 1
        }
      }
    }
  },
  {
    "id": "card-turmoil-gmo-contract",
    "name": "GMO Contract",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/GMOContract.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Microbe",
      "Science"
    ],
    "requirements": [
      {
        "party": "Greens"
      }
    ],
    "reqText": "[{\"party\":\"Greens\"}]",
    "effectText": "Requires that Greens are ruling or that you have 2 delegates there.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-turmoil-martian-media-center",
    "name": "Martian Media Center",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/MartianMediaCenter.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "party": "Mars First"
      }
    ],
    "reqText": "[{\"party\":\"Mars First\"}]",
    "effectText": "Requires that Mars First is ruling or that you have 2 delegates there. Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      },
      "action": {
        "spend": {
          "megacredits": 3
        },
        "turmoil": {
          "sendDelegates": {
            "count": 1
          }
        }
      }
    }
  },
  {
    "id": "card-turmoil-parliament-hall",
    "name": "Parliament Hall",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/ParliamentHall.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "party": "Mars First"
      }
    ],
    "reqText": "[{\"party\":\"Mars First\"}]",
    "effectText": "Requires that Mars First are ruling or that you have 2 delegates there. Increase your M€ production 1 step for every 3 building tags you have, including this.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "building",
            "per": 3
          }
        }
      }
    }
  },
  {
    "id": "card-turmoil-political-alliance",
    "name": "Political Alliance",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/PoliticalAlliance.ts",
    "type": "event",
    "cost": 4,
    "tags": [],
    "requirements": [
      {
        "partyLeader": 2,
        "count": 2
      }
    ],
    "reqText": "[{\"partyLeader\":2,\"count\":2}]",
    "effectText": "Requires that you have 2 party leaders. Gain 1 TR.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-turmoil-pr-office",
    "name": "PR Office",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/PROffice.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "party": "Unity"
      }
    ],
    "reqText": "[{\"party\":\"Unity\"}]",
    "effectText": "Requires that Unity are ruling or that you have 2 delegates there. Gain 1 TR. Gain 1 M€ for each Earth tag you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1,
        "stock": {
          "megacredits": {
            "tag": "earth"
          }
        }
      }
    }
  },
  {
    "id": "card-turmoil-public-celebrations",
    "name": "Public Celebrations",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/PublicCelebrations.ts",
    "type": "event",
    "cost": 8,
    "tags": [],
    "requirements": [
      {
        "chairman": true
      }
    ],
    "reqText": "[{\"chairman\":true}]",
    "effectText": "Requires that you are Chairman.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-turmoil-recruitment",
    "name": "Recruitment",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/Recruitment.ts",
    "type": "event",
    "cost": 2,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Exchange one NEUTRAL NON-LEADER delegate with one of your own from the reserve.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-turmoil-red-tourism-wave",
    "name": "Red Tourism Wave",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/RedTourismWave.ts",
    "type": "event",
    "cost": 3,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "party": "Reds"
      }
    ],
    "reqText": "[{\"party\":\"Reds\"}]",
    "effectText": "Requires that Reds are ruling or that you have 2 delegates there. Gain 1 M€ from each EMPTY AREA ADJACENT TO YOUR TILES",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-turmoil-sponsored-mohole",
    "name": "Sponsored Mohole",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/SponsoredMohole.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "party": "Kelvinists"
      }
    ],
    "reqText": "[{\"party\":\"Kelvinists\"}]",
    "effectText": "Requires that Kelvinists are ruling or that you have 2 delegates there. Increase your heat production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        }
      }
    }
  },
  {
    "id": "card-turmoil-supported-research",
    "name": "Supported Research",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/SupportedResearch.ts",
    "type": "automated",
    "cost": 3,
    "tags": [
      "Science"
    ],
    "requirements": [
      {
        "party": "Scientists"
      }
    ],
    "reqText": "[{\"party\":\"Scientists\"}]",
    "effectText": "Requires that Scientists are ruling or that you have 2 delegates there. Draw 2 cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-turmoil-vote-of-no-confidence",
    "name": "Vote Of No Confidence",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/VoteOfNoConfidence.ts",
    "type": "event",
    "cost": 5,
    "tags": [],
    "requirements": [
      {
        "partyLeader": 1,
        "count": 1
      }
    ],
    "reqText": "[{\"partyLeader\":1,\"count\":1}]",
    "effectText": "Requires that you have a Party Leader in any party and that the sitting Chairman is neutral. Remove the NEUTRAL Chairman and move your own delegate (from the reserve) there instead. Gain 1 TR.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-turmoil-wildlife-dome",
    "name": "Wildlife Dome",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/WildlifeDome.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "Animal",
      "Plant",
      "Building"
    ],
    "requirements": [
      {
        "party": "Greens"
      }
    ],
    "reqText": "[{\"party\":\"Greens\"}]",
    "effectText": "Requires that Greens are ruling or that you have 2 delegates there. Place a greenery tile and raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "greenery": {}
      }
    },
    "placementType": "forest",
    "placementCount": 1
  },
  {
    "id": "card-venus-aerial-mappers",
    "name": "Aerial Mappers",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AerialMappers.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add floater to ANY card, or spend one floater here to draw 1 card.",
    "victoryPoints": 1,
    "effectSpec": {
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "spend": {
                "resourcesHere": 1
              },
              "drawCard": 1,
              "title": "Remove 1 floater on this card and draw a card"
            },
            {
              "addResourcesToAnyCard": {
                "type": "Floater",
                "count": 1
              },
              "title": "Add 1 floater to ANY card"
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-venus-aerosport-tournament",
    "name": "Aerosport Tournament",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AerosportTournament.ts",
    "type": "event",
    "cost": 7,
    "tags": [],
    "requirements": [
      {
        "floaters": 5,
        "count": 5
      }
    ],
    "reqText": "[{\"floaters\":5,\"count\":5}]",
    "effectText": "Requires that you have 5 floaters. Gain 1 M€ per each city tile in play.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": {
            "cities": {}
          }
        }
      }
    }
  },
  {
    "id": "card-venus-air-scrapping-expedition",
    "name": "Air-Scrapping Expedition",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AirScrappingExpedition.ts",
    "type": "event",
    "cost": 13,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step. Add 3 floaters to ANY Venus CARD.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-atalanta-planitia-lab",
    "name": "Atalanta Planitia Lab",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AtalantaPlanitiaLab.ts",
    "type": "automated",
    "cost": 10,
    "tags": [
      "Venus",
      "Science"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags. Draw 2 cards.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-venus-atmoscoop",
    "name": "Atmoscoop",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Atmoscoop.ts",
    "type": "automated",
    "cost": 22,
    "tags": [
      "Jovian",
      "Space"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 3
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":3}]",
    "effectText": "Requires 3 science tags. Either raise the temperature 2 steps, or raise Venus 2 steps. Add 2 floaters to ANY card.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Floater"
        }
      }
    }
  },
  {
    "id": "card-venus-comet-for-venus",
    "name": "Comet for Venus",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/CometForVenus.ts",
    "type": "event",
    "cost": 11,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step. Remove up to 4M€ from any player WITH A VENUS TAG IN PLAY.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-corroder-suits",
    "name": "Corroder Suits",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/CorroderSuits.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps. Add 1 resource to ANY Venus CARD.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "addResourcesToAnyCard": {
          "count": 1,
          "tag": "venus"
        }
      }
    }
  },
  {
    "id": "card-venus-dawn-city",
    "name": "Dawn City",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/DawnCity.ts",
    "type": "automated",
    "cost": 15,
    "tags": [
      "City",
      "Space"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 4
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":4}]",
    "effectText": "Requires 4 science tags. Decrease your energy production 1 step. Increase your titanium production 1 step. Place a city tile on the RESERVED AREA.",
    "victoryPoints": 3,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "titanium": 1
        },
        "city": {
          "space": "71"
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-venus-deuterium-export",
    "name": "Deuterium Export",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/DeuteriumExport.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Space",
      "Venus",
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 floater to this card, or spend 1 floater here to increase your energy production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "title": "Remove 1 floater to raise energy production 1 step",
              "spend": {
                "resourcesHere": 1
              },
              "production": {
                "energy": 1
              }
            },
            {
              "title": "Add 1 floater to this card",
              "addResources": 1
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-venus-dirigibles",
    "name": "Dirigibles",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Dirigibles.ts",
    "type": "active",
    "cost": 11,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 floater to ANY card Effect: When playing a Venus tag, Floaters here may be used as payment, and are worth 3M€ each.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "count": 1,
          "type": "Floater",
          "mustHaveCard": true
        }
      }
    }
  },
  {
    "id": "card-venus-extractor-balloons",
    "name": "Extractor Balloons",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/ExtractorBalloons.ts",
    "type": "active",
    "cost": 21,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 floater to this card, or remove 2 floaters here to raise Venus 1 step. Add 3 floaters to this card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 3
      }
    }
  },
  {
    "id": "card-venus-extremophiles",
    "name": "Extremophiles",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Extremophiles.ts",
    "type": "active",
    "cost": 3,
    "tags": [
      "Venus",
      "Microbe"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 3
    },
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Microbe",
          "count": 1
        }
      }
    }
  },
  {
    "id": "card-venus-floating-habs",
    "name": "Floating Habs",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/FloatingHabs.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "action": {
        "spend": {
          "megacredits": 2
        },
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 1,
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-venus-forced-precipitation",
    "name": "Forced Precipitation",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/ForcedPrecipitation.ts",
    "type": "active",
    "cost": 8,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 2 M€ to add 1 floater to THIS card, or spend 2 floaters here to increase Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-venus-freyja-biodomes",
    "name": "Freyja Biodomes",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/FreyjaBiodomes.ts",
    "type": "automated",
    "cost": 14,
    "tags": [
      "Plant",
      "Venus"
    ],
    "requirements": [
      {
        "venus": 10,
        "count": 10
      }
    ],
    "reqText": "[{\"venus\":10,\"count\":10}]",
    "effectText": "Requires 10% on the Venus track. Add 2 microbes or 2 animals to another Venus card. Production: energy -1, M€ +2.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1,
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-venus-ghg-import-from-venus",
    "name": "GHG Import From Venus",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/GHGImportFromVenus.ts",
    "type": "event",
    "cost": 23,
    "tags": [
      "Space",
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step. Increase your heat production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 3
        },
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-giant-solar-shade",
    "name": "Giant Solar Shade",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/GiantSolarShade.ts",
    "type": "automated",
    "cost": 27,
    "tags": [
      "Space",
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 3
        }
      }
    }
  },
  {
    "id": "card-venus-gyropolis",
    "name": "Gyropolis",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Gyropolis.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "City",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Decrease your energy production 2 steps. Increase your M€ production 1 step for each Venus and Earth tag you have. Place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "city": {},
        "production": {
          "energy": -2,
          "megacredits": {
            "tag": [
              "venus",
              "earth"
            ]
          }
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-venus-hydrogen-to-venus",
    "name": "Hydrogen to Venus",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/HydrogenToVenus.ts",
    "type": "event",
    "cost": 11,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step. Add 1 floater to A VENUS CARD for each Jovian tag you have.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        },
        "addResourcesToAnyCard": {
          "count": {
            "tag": "jovian"
          },
          "type": "Floater",
          "tag": "venus"
        }
      }
    }
  },
  {
    "id": "card-venus-io-sulphur-research",
    "name": "Io Sulphur Research",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/IoSulphurResearch.ts",
    "type": "automated",
    "cost": 17,
    "tags": [
      "Science",
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 card, or draw 3 if you have at least 3 Venus tags.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "drawCardByTagCount": {
          "tag": "venus",
          "atLeast": 3,
          "lowCount": 1,
          "highCount": 3
        }
      }
    }
  },
  {
    "id": "card-venus-ishtar-mining",
    "name": "Ishtar Mining",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/IshtarMining.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "venus": 8,
        "count": 8
      }
    ],
    "reqText": "[{\"venus\":8,\"count\":8}]",
    "effectText": "Requires Venus 8%. Increase your titanium production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      }
    }
  },
  {
    "id": "card-venus-jet-stream-microscrappers",
    "name": "Jet Stream Microscrappers",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/JetStreamMicroscrappers.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Spend 1 titanium to add 2 floaters here, or spend 2 floaters here to raise Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-venus-local-shading",
    "name": "Local Shading",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/LocalShading.ts",
    "type": "active",
    "cost": 4,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 1 floater to this card, or spend 1 floater here to raise your M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "behaviors": [
            {
              "spend": {
                "resourcesHere": 1
              },
              "production": {
                "megacredits": 1
              },
              "title": "Remove 1 floater to increase M€ production 1 step"
            },
            {
              "addResources": 1,
              "title": "Add 1 floater to this card"
            }
          ],
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-venus-luna-metropolis",
    "name": "Luna Metropolis",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/LunaMetropolis.ts",
    "type": "automated",
    "cost": 21,
    "tags": [
      "City",
      "Space",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step for each Earth tag you have, including this. Place a city tile on the RESERVED AREA.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": {
            "tag": "earth"
          }
        },
        "city": {
          "space": "70"
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-venus-luxury-foods",
    "name": "Luxury Foods",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/LuxuryFoods.ts",
    "type": "automated",
    "cost": 8,
    "tags": [],
    "requirements": [
      {
        "tag": "venus"
      },
      {
        "tag": "earth"
      },
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"venus\"},{\"tag\":\"earth\"},{\"tag\":\"jovian\"}]",
    "effectText": "Requires that you have a Venus tag, an Earth tag and a Jovian tag.",
    "victoryPoints": 2,
    "effectSpec": {}
  },
  {
    "id": "card-venus-maxwell-base",
    "name": "Maxwell Base",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/MaxwellBase.ts",
    "type": "active",
    "cost": 18,
    "tags": [
      "City",
      "Venus"
    ],
    "requirements": [
      {
        "venus": 12,
        "count": 12
      }
    ],
    "reqText": "[{\"venus\":12,\"count\":12}]",
    "effectText": "Requires Venus 12%. Decrease your energy production 1 step. Place a city tile ON THE RESERVED AREA.",
    "victoryPoints": 3,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": -1
        },
        "city": {
          "space": "73"
        }
      },
      "action": {
        "addResourcesToAnyCard": {
          "tag": "venus",
          "count": 1,
          "autoSelect": true,
          "mustHaveCard": true
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-venus-mining-quota",
    "name": "Mining Quota",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/MiningQuota.ts",
    "type": "automated",
    "cost": 5,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "tag": "venus"
      },
      {
        "tag": "earth"
      },
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"venus\"},{\"tag\":\"earth\"},{\"tag\":\"jovian\"}]",
    "effectText": "Requires Venus, Earth and Jovian tags. Increase your steel production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 2
        }
      }
    }
  },
  {
    "id": "card-venus-neutralizer-factory",
    "name": "Neutralizer Factory",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/NeutralizerFactory.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "venus": 10,
        "count": 10
      }
    ],
    "reqText": "[{\"venus\":10,\"count\":10}]",
    "effectText": "Requires Venus 10%. Increase the Venus track 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-omnicourt",
    "name": "Omnicourt",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Omnicourt.ts",
    "type": "automated",
    "cost": 11,
    "tags": [
      "Building"
    ],
    "requirements": [
      {
        "tag": "venus"
      },
      {
        "tag": "earth"
      },
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"venus\"},{\"tag\":\"earth\"},{\"tag\":\"jovian\"}]",
    "effectText": "Requires Venus, Earth and Jovian tags. Increase your TR 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 2
      }
    }
  },
  {
    "id": "card-venus-orbital-reflectors",
    "name": "Orbital Reflectors",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/OrbitalReflectors.ts",
    "type": "automated",
    "cost": 26,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 2 steps. Increase your heat production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        },
        "global": {
          "venus": 2
        }
      }
    }
  },
  {
    "id": "card-venus-rotator-impacts",
    "name": "Rotator Impacts",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/RotatorImpacts.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "venus": 14,
        "max": true,
        "count": 14
      }
    ],
    "reqText": "[{\"venus\":14,\"max\":true,\"count\":14}]",
    "effectText": "Venus must be 14% or lower",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-venus-sister-planet-support",
    "name": "Sister Planet Support",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/SisterPlanetSupport.ts",
    "type": "automated",
    "cost": 7,
    "tags": [
      "Venus",
      "Earth"
    ],
    "requirements": [
      {
        "tag": "venus"
      },
      {
        "tag": "earth"
      }
    ],
    "reqText": "[{\"tag\":\"venus\"},{\"tag\":\"earth\"}]",
    "effectText": "Requires Venus and Earth tags. Increase your M€ production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        }
      }
    }
  },
  {
    "id": "card-venus-solarnet",
    "name": "Solarnet",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Solarnet.ts",
    "type": "automated",
    "cost": 7,
    "tags": [],
    "requirements": [
      {
        "tag": "venus"
      },
      {
        "tag": "earth"
      },
      {
        "tag": "jovian"
      }
    ],
    "reqText": "[{\"tag\":\"venus\"},{\"tag\":\"earth\"},{\"tag\":\"jovian\"}]",
    "effectText": "Requires Venus, Earth and Jovian tags. Draw 2 cards.",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "drawCard": 2
      }
    }
  },
  {
    "id": "card-venus-spin-inducing-asteroid",
    "name": "Spin-Inducing Asteroid",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/SpinInducingAsteroid.ts",
    "type": "event",
    "cost": 16,
    "tags": [
      "Space"
    ],
    "requirements": [
      {
        "venus": 10,
        "max": true,
        "count": 10
      }
    ],
    "reqText": "[{\"venus\":10,\"max\":true,\"count\":10}]",
    "effectText": "Venus must be 10% or lower. Raise Venus 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 2
        }
      }
    }
  },
  {
    "id": "card-venus-sponsored-academies",
    "name": "Sponsored Academies",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/SponsoredAcademies.ts",
    "type": "automated",
    "cost": 9,
    "tags": [
      "Earth",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Discard 1 card from your hand and THEN draw 3 cards. All OPPONENTS draw 1 card.",
    "victoryPoints": 1,
    "effectSpec": {}
  },
  {
    "id": "card-venus-stratopolis",
    "name": "Stratopolis",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Stratopolis.ts",
    "type": "active",
    "cost": 22,
    "tags": [
      "City",
      "Venus"
    ],
    "requirements": [
      {
        "tag": "science",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"science\",\"count\":2}]",
    "effectText": "Requires 2 science tags. Increase your M€ production 2 steps. Place a city tile ON THE RESERVED AREA",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 3
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "city": {
          "space": "72"
        }
      },
      "action": {
        "addResourcesToAnyCard": {
          "count": 2,
          "tag": "venus",
          "type": "Floater",
          "autoSelect": true
        }
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-venus-stratospheric-birds",
    "name": "Stratospheric Birds",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/StratosphericBirds.ts",
    "type": "active",
    "cost": 12,
    "tags": [
      "Venus",
      "Animal"
    ],
    "requirements": [
      {
        "venus": 12,
        "count": 12
      }
    ],
    "reqText": "[{\"venus\":12,\"count\":12}]",
    "effectText": "Requires Venus 12% and that you spend 1 floater from any card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-venus-sulphur-eating-bacteria",
    "name": "Sulphur-Eating Bacteria",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/SulphurEatingBacteria.ts",
    "type": "active",
    "cost": 6,
    "tags": [
      "Venus",
      "Microbe"
    ],
    "requirements": [
      {
        "venus": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"venus\":6,\"count\":6}]",
    "effectText": "Requires Venus 6%",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-venus-sulphur-exports",
    "name": "Sulphur Exports",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/SulphurExports.ts",
    "type": "automated",
    "cost": 21,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase Venus 1 step. Increase your M€ production 1 step for each Venus tag you have, including this.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        },
        "production": {
          "megacredits": {
            "tag": "venus"
          }
        }
      }
    }
  },
  {
    "id": "card-venus-terraforming-contract",
    "name": "Terraforming Contract",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/TerraformingContract.ts",
    "type": "automated",
    "cost": 8,
    "tags": [
      "Earth"
    ],
    "requirements": [
      {
        "tr": 25,
        "count": 25
      }
    ],
    "reqText": "[{\"tr\":25,\"count\":25}]",
    "effectText": "Requires that you have at least 25 TR. Increase your M€ production 4 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 4
        }
      }
    }
  },
  {
    "id": "card-venus-thermophiles",
    "name": "Thermophiles",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Thermophiles.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Venus",
      "Microbe"
    ],
    "requirements": [
      {
        "venus": 6,
        "count": 6
      }
    ],
    "reqText": "[{\"venus\":6,\"count\":6}]",
    "effectText": "Requires Venus 6%",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "or": {
          "autoSelect": true,
          "behaviors": [
            {
              "title": "Spend 2 microbes here to raise Venus 1 step.",
              "spend": {
                "resourcesHere": 2
              },
              "global": {
                "venus": 1
              }
            },
            {
              "title": "Select a Venus card to add 1 microbe",
              "addResourcesToAnyCard": {
                "count": 1,
                "tag": "venus",
                "type": "Microbe",
                "autoSelect": true
              }
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-venus-venus-governor",
    "name": "Venus Governor",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusGovernor.ts",
    "type": "automated",
    "cost": 4,
    "tags": [
      "Venus",
      "Venus"
    ],
    "requirements": [
      {
        "tag": "venus",
        "count": 2
      }
    ],
    "reqText": "[{\"tag\":\"venus\",\"count\":2}]",
    "effectText": "Requires 2 Venus tags. Increase your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      }
    }
  },
  {
    "id": "card-venus-venus-magnetizer",
    "name": "Venus Magnetizer",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusMagnetizer.ts",
    "type": "active",
    "cost": 7,
    "tags": [
      "Venus"
    ],
    "requirements": [
      {
        "venus": 10,
        "count": 10
      }
    ],
    "reqText": "[{\"venus\":10,\"count\":10}]",
    "effectText": "Requires Venus 10%.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "production": {
          "energy": -1
        },
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-venus-soils",
    "name": "Venus Soils",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusSoils.ts",
    "type": "automated",
    "cost": 20,
    "tags": [
      "Venus",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step. Increase your plant production 1 step. Add 2 microbes to ANOTHER card",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "global": {
          "venus": 1
        },
        "addResourcesToAnyCard": {
          "count": 2,
          "type": "Microbe"
        }
      }
    }
  },
  {
    "id": "card-venus-venus-waystation",
    "name": "Venus Waystation",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusWaystation.ts",
    "type": "active",
    "cost": 9,
    "tags": [
      "Venus",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When you play a Venus tag, you pay 2 M€ less for it.",
    "victoryPoints": 1,
    "effectSpec": {
      "cardDiscount": {
        "tag": "venus",
        "amount": 2
      }
    }
  },
  {
    "id": "card-venus-venusian-animals",
    "name": "Venusian Animals",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusianAnimals.ts",
    "type": "active",
    "cost": 15,
    "tags": [
      "Venus",
      "Animal",
      "Science"
    ],
    "requirements": [
      {
        "venus": 18,
        "count": 18
      }
    ],
    "reqText": "[{\"venus\":18,\"count\":18}]",
    "effectText": "Requires Venus 18%",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {}
  },
  {
    "id": "card-venus-venusian-insects",
    "name": "Venusian Insects",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusianInsects.ts",
    "type": "active",
    "cost": 5,
    "tags": [
      "Venus",
      "Microbe"
    ],
    "requirements": [
      {
        "venus": 12,
        "count": 12
      }
    ],
    "reqText": "[{\"venus\":12,\"count\":12}]",
    "effectText": "Requires Venus 12%.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "action": {
        "addResources": 1
      }
    }
  },
  {
    "id": "card-venus-venusian-plants",
    "name": "Venusian Plants",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/VenusianPlants.ts",
    "type": "automated",
    "cost": 13,
    "tags": [
      "Venus",
      "Plant"
    ],
    "requirements": [
      {
        "venus": 16,
        "count": 16
      }
    ],
    "reqText": "[{\"venus\":16,\"count\":16}]",
    "effectText": "Requires Venus 16%. Raise Venus 1 step. Add 1 microbe or 1 animal to ANOTHER VENUS CARD",
    "victoryPoints": 1,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-venus-water-to-venus",
    "name": "Water to Venus",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/WaterToVenus.ts",
    "type": "event",
    "cost": 9,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 1
        }
      }
    }
  }
];

export const FULL_STANDARD_PROJECTS = [
  {
    "id": "card-base-aquifer",
    "name": "Aquifer",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/AquiferStandardProject.ts",
    "type": "standard_project",
    "cost": 18,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 18 M€ to place an ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "oceans": 1
      }
    }
  },
  {
    "id": "card-base-asteroid-sp",
    "name": "Asteroid:SP",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/AsteroidStandardProject.ts",
    "type": "standard_project",
    "cost": 14,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 14 M€ to raise the temperature 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "temperature": 1
      }
    }
  },
  {
    "id": "card-base-city",
    "name": "City",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/CityStandardProject.ts",
    "type": "standard_project",
    "cost": 25,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 25 M€ to place a city tile and increase your M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-greenery",
    "name": "Greenery",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/GreeneryStandardProject.ts",
    "type": "standard_project",
    "cost": 23,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 23 M€ to place a greenery tile and raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "oxygen": 1
      }
    }
  },
  {
    "id": "card-base-power-plant-sp",
    "name": "Power Plant:SP",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/PowerPlantStandardProject.ts",
    "type": "standard_project",
    "cost": 11,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 11 M€ to increase your energy production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-sell-patents",
    "name": "Sell Patents",
    "expansion": "base",
    "source": "src/server/cards/base/standardProjects/SellPatentsStandardProject.ts",
    "type": "standard_project",
    "cost": 0,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Discard any number of cards to gain that amount of M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-colonies-build-colony",
    "name": "Build Colony",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/BuildColonyStandardProject.ts",
    "type": "standard_project",
    "cost": 17,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 17 M€ to place a colony.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude-buffer-gas",
    "name": "Buffer Gas",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/BufferGasStandardProject.ts",
    "type": "standard_project",
    "cost": 16,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 16 M€ to increase your TR 1 step. Solo games only.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "tr": 1
      }
    }
  },
  {
    "id": "card-venus-air-scrapping",
    "name": "Air Scrapping",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AirScrappingStandardProject.ts",
    "type": "standard_project",
    "cost": 15,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 15 M€ to raise Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "venus": 1
      }
    }
  },
  {
    "id": "card-venus-air-scrapping-var",
    "name": "Air Scrapping (Var)",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/AirScrappingStandardProjectVariant.ts",
    "type": "standard_project",
    "cost": 15,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 15M€, less 1M€ per Venus tag you have, to raise Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "venus": 1
      }
    }
  }
];

export const FULL_STANDARD_ACTIONS = [
  {
    "id": "card-base-convert-heat",
    "name": "Convert Heat",
    "expansion": "base",
    "source": "src/server/cards/base/standardActions/ConvertHeat.ts",
    "type": "standard_action",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 8 heat to raise temperature 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-base-convert-plants",
    "name": "Convert Plants",
    "expansion": "base",
    "source": "src/server/cards/base/standardActions/ConvertPlants.ts",
    "type": "standard_action",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Spend 8 plants to place a greenery tile and raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {}
  }
];

export const FULL_CORPORATIONS = [
  {
    "id": "card-base-beginner-corporation",
    "name": "Beginner Corporation",
    "expansion": "base",
    "source": "src/server/cards/corporation/BeginnerCorporation.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 42 M€. Instead of choosing from 10 cards during setup, you get 10 cards for free.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 10
      },
      "startingMegaCredits": 42
    },
    "starting": {
      "mc": 42,
      "production": {}
    }
  },
  {
    "id": "card-base-credicor",
    "name": "CrediCor",
    "expansion": "base",
    "source": "src/server/cards/corporation/CrediCor.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 57 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 57
    },
    "starting": {
      "mc": 57,
      "production": {}
    }
  },
  {
    "id": "card-base-ecoline",
    "name": "Ecoline",
    "expansion": "base",
    "source": "src/server/cards/corporation/EcoLine.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 2 plant production, 3 plants, and 36 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2
        },
        "stock": {
          "plants": 3
        },
        "greeneryDiscount": 1
      },
      "startingMegaCredits": 36
    },
    "starting": {
      "mc": 36,
      "plants": 3,
      "production": {
        "plants": 2
      }
    }
  },
  {
    "id": "card-base-helion",
    "name": "Helion",
    "expansion": "base",
    "source": "src/server/cards/corporation/Helion.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 3 heat production and 42 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 3
        }
      },
      "startingMegaCredits": 42
    },
    "starting": {
      "mc": 42,
      "production": {
        "heat": 3
      }
    }
  },
  {
    "id": "card-base-interplanetary-cinematics",
    "name": "Interplanetary Cinematics",
    "expansion": "base",
    "source": "src/server/cards/corporation/InterplanetaryCinematics.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 20 steel and 30 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 20
        }
      },
      "startingMegaCredits": 30
    },
    "starting": {
      "mc": 30,
      "steel": 20,
      "production": {}
    }
  },
  {
    "id": "card-base-inventrix",
    "name": "Inventrix",
    "expansion": "base",
    "source": "src/server/cards/corporation/Inventrix.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "As your first action in the game, draw 3 cards. Start with 45 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "globalParameterRequirementBonus": {
        "steps": 2
      },
      "startingMegaCredits": 45
    },
    "starting": {
      "mc": 45,
      "production": {}
    }
  },
  {
    "id": "card-base-mining-guild",
    "name": "Mining Guild",
    "expansion": "base",
    "source": "src/server/cards/corporation/MiningGuild.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 30 M€, 5 steel and 1 steel production.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        },
        "stock": {
          "steel": 5
        }
      },
      "startingMegaCredits": 30
    },
    "starting": {
      "mc": 30,
      "steel": 5,
      "production": {
        "steel": 1
      }
    }
  },
  {
    "id": "card-base-phobolog",
    "name": "PhoboLog",
    "expansion": "base",
    "source": "src/server/cards/corporation/PhoboLog.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 10 titanium and 23 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 10
        },
        "titanumValue": 1
      },
      "startingMegaCredits": 23
    },
    "starting": {
      "mc": 23,
      "titanium": 10,
      "production": {}
    }
  },
  {
    "id": "card-base-saturn-systems",
    "name": "Saturn Systems",
    "expansion": "base",
    "source": "src/server/cards/corporation/SaturnSystems.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 1 titanium production and 42 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      },
      "startingMegaCredits": 42
    },
    "starting": {
      "mc": 42,
      "production": {
        "titanium": 1
      }
    }
  },
  {
    "id": "card-base-teractor",
    "name": "Teractor",
    "expansion": "base",
    "source": "src/server/cards/corporation/Teractor.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 60 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "cardDiscount": {
        "tag": "earth",
        "amount": 3
      },
      "startingMegaCredits": 60
    },
    "starting": {
      "mc": 60,
      "production": {}
    }
  },
  {
    "id": "card-base-tharsis-republic",
    "name": "Tharsis Republic",
    "expansion": "base",
    "source": "src/server/cards/corporation/TharsisRepublic.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 40 M€. As your first action in the game, place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 40
    },
    "starting": {
      "mc": 40,
      "production": {}
    }
  },
  {
    "id": "card-base-thorgate",
    "name": "ThorGate",
    "expansion": "base",
    "source": "src/server/cards/corporation/Thorgate.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 1 energy production and 48 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      },
      "cardDiscount": {
        "tag": "power",
        "amount": 3
      },
      "startingMegaCredits": 48
    },
    "starting": {
      "mc": 48,
      "production": {
        "energy": 1
      }
    }
  },
  {
    "id": "card-base-united-nations-mars-initiative",
    "name": "United Nations Mars Initiative",
    "expansion": "base",
    "source": "src/server/cards/corporation/UnitedNationsMarsInitiative.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 40 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 40
    },
    "starting": {
      "mc": 40,
      "production": {}
    }
  },
  {
    "id": "card-colonies-aridor",
    "name": "Aridor",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Aridor.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 40 M€. As your first action, put an additional Colony Tile of your choice into play",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 40,
      "initialActionText": "Add a colony tile"
    },
    "starting": {
      "mc": 40,
      "production": {}
    }
  },
  {
    "id": "card-colonies-arklight",
    "name": "Arklight",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Arklight.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Animal"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 45 M€. Increase your M€ production 2 steps. 1 VP per 2 animals on this card.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        }
      },
      "startingMegaCredits": 45
    },
    "starting": {
      "mc": 45,
      "production": {
        "megacredits": 2
      }
    }
  },
  {
    "id": "card-colonies-polyphemos",
    "name": "Polyphemos",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Polyphemos.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 50 M€. Increase your M€ production 5 steps. Gain 5 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 5
        },
        "stock": {
          "titanium": 5
        }
      },
      "startingMegaCredits": 50
    },
    "starting": {
      "mc": 50,
      "titanium": 5,
      "production": {
        "megacredits": 5
      }
    }
  },
  {
    "id": "card-colonies-poseidon",
    "name": "Poseidon",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/Poseidon.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 45 M€. As your first action, place a colony.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 45
    },
    "starting": {
      "mc": 45,
      "production": {}
    }
  },
  {
    "id": "card-colonies-stormcraft-incorporated",
    "name": "Stormcraft Incorporated",
    "expansion": "colonies",
    "source": "src/server/cards/colonies/StormCraftIncorporated.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 48 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 1,
          "autoSelect": true
        }
      },
      "startingMegaCredits": 48
    },
    "starting": {
      "mc": 48,
      "production": {}
    }
  },
  {
    "id": "card-prelude-cheung-shing-mars",
    "name": "Cheung Shing MARS",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/CheungShingMARS.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 3 M€ production and 44 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        }
      },
      "cardDiscount": {
        "tag": "building",
        "amount": 2
      },
      "startingMegaCredits": 44
    },
    "starting": {
      "mc": 44,
      "production": {
        "megacredits": 3
      }
    }
  },
  {
    "id": "card-prelude-point-luna",
    "name": "Point Luna",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/PointLuna.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 1 titanium production and 38 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      },
      "startingMegaCredits": 38
    },
    "starting": {
      "mc": 38,
      "production": {
        "titanium": 1
      }
    }
  },
  {
    "id": "card-prelude-robinson-industries",
    "name": "Robinson Industries",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/RobinsonIndustries.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 47 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 47
    },
    "starting": {
      "mc": 47,
      "production": {}
    }
  },
  {
    "id": "card-prelude-valley-trust",
    "name": "Valley Trust",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/ValleyTrust.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 37 M€. As your first action, draw 3 Prelude cards, and play one of them. Discard the other two.",
    "victoryPoints": 0,
    "effectSpec": {
      "cardDiscount": {
        "tag": "science",
        "amount": 2
      },
      "startingMegaCredits": 37,
      "initialActionText": "Draw 3 Prelude cards, and play one of them"
    },
    "starting": {
      "mc": 37,
      "production": {}
    }
  },
  {
    "id": "card-prelude-vitor",
    "name": "Vitor",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Vitor.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 45 M€. As your first action, fund an award for free.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 48,
      "initialActionText": "Fund an award for free"
    },
    "starting": {
      "mc": 48,
      "production": {}
    }
  },
  {
    "id": "card-prelude2-ecotec",
    "name": "EcoTec",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/Ecotec.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Microbe",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 42 M€. Increase your plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      },
      "startingMegaCredits": 42
    },
    "starting": {
      "mc": 42,
      "production": {
        "plants": 1
      }
    }
  },
  {
    "id": "card-prelude2-nirgal-enterprises",
    "name": "Nirgal Enterprises",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/NirgalEnterprises.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Power",
      "Plant",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 30 M€. Increase your energy, plant, and steel production 1 step each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "plants": 1,
          "steel": 1
        }
      },
      "startingMegaCredits": 30
    },
    "starting": {
      "mc": 30,
      "production": {
        "energy": 1,
        "plants": 1,
        "steel": 1
      }
    }
  },
  {
    "id": "card-prelude2-palladin-shipping",
    "name": "Palladin Shipping",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/PalladinShipping.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 36 M€. Gain 5 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 5
        }
      },
      "startingMegaCredits": 36
    },
    "starting": {
      "mc": 36,
      "titanium": 5,
      "production": {}
    }
  },
  {
    "id": "card-prelude2-sagitta-frontier-services",
    "name": "Sagitta Frontier Services",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SagittaFrontierServices.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 31 M€. Increase energy production 1 step and M€ production 2 steps. Draw a card that has no tag.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "megacredits": 2
        }
      },
      "startingMegaCredits": 31
    },
    "starting": {
      "mc": 31,
      "production": {
        "energy": 1,
        "megacredits": 2
      }
    }
  },
  {
    "id": "card-prelude2-spire",
    "name": "Spire",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/Spire.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "City",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 50 M€. As your first action, draw 4 cards, then discard 3 cards from your hand. Effect: When you play a card with at least 2 tags. including this, add 1 science resource here. Effect: When you pay for a standard project, science resources here may be used as 2 M€ each.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 50,
      "initialActionText": "Draw 4 cards, then discard 3 cards."
    },
    "starting": {
      "mc": 50,
      "production": {}
    }
  },
  {
    "id": "card-promo-arcadian-communities",
    "name": "Arcadian Communities",
    "expansion": "promo",
    "source": "src/server/cards/promo/ArcadianCommunities.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 40 M€ and 10 steel. AS YOUR FIRST ACTION, PLACE A COMMUNITY [PLAYER MARKER] ON A NON-RESERVED AREA.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 10
        }
      },
      "startingMegaCredits": 40,
      "initialActionText": "Place a community (player marker) on a non-reserved area"
    },
    "starting": {
      "mc": 40,
      "steel": 10,
      "production": {}
    }
  },
  {
    "id": "card-promo-astrodrill",
    "name": "AstroDrill",
    "expansion": "promo",
    "source": "src/server/cards/promo/Astrodrill.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 35 M€ and 3 asteroid resources.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 3
      },
      "startingMegaCredits": 35
    },
    "starting": {
      "mc": 35,
      "production": {}
    }
  },
  {
    "id": "card-promo-factorum",
    "name": "Factorum",
    "expansion": "promo",
    "source": "src/server/cards/promo/Factorum.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Power",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 37 M€. Increase your steel production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      },
      "startingMegaCredits": 37
    },
    "starting": {
      "mc": 37,
      "production": {
        "steel": 1
      }
    }
  },
  {
    "id": "card-promo-kuiper-cooperative",
    "name": "Kuiper Cooperative",
    "expansion": "promo",
    "source": "src/server/cards/promo/KuiperCooperative.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Space",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 33 M€. Increase titanium production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        }
      },
      "startingMegaCredits": 33
    },
    "starting": {
      "mc": 33,
      "production": {
        "titanium": 1
      }
    }
  },
  {
    "id": "card-promo-mons-insurance",
    "name": "Mons Insurance",
    "expansion": "promo",
    "source": "src/server/cards/promo/MonsInsurance.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 48 M€. Increase your M€ production 4 steps. ALL OPPONENTS DECREASE THEIR M€ production 2 STEPS. THIS DOES NOT TRIGGER THE EFFECT BELOW.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 4
        }
      },
      "startingMegaCredits": 48
    },
    "starting": {
      "mc": 48,
      "production": {
        "megacredits": 4
      }
    }
  },
  {
    "id": "card-promo-pharmacy-union",
    "name": "Pharmacy Union",
    "expansion": "promo",
    "source": "src/server/cards/promo/PharmacyUnion.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: When ANY microbe tag is played, add a disease here and lose 4 M€ or as much as possible. When you play a science tag, remove a disease here and gain 1 TR OR if there are no diseases here, you MAY put this card face down in your EVENTS PILE to gain 3 TR.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 1,
          "tag": "science"
        }
      },
      "startingMegaCredits": 54
    },
    "starting": {
      "mc": 54,
      "production": {}
    }
  },
  {
    "id": "card-promo-philares",
    "name": "Philares",
    "expansion": "promo",
    "source": "src/server/cards/promo/Philares.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 47 M€. As your first action, place a greenery tile and raise the oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 47
    },
    "starting": {
      "mc": 47,
      "production": {}
    }
  },
  {
    "id": "card-promo-poldertech-dutch",
    "name": "PolderTECH Dutch",
    "expansion": "promo",
    "source": "src/server/cards/promo/PolderTechDutch.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 35 M€. As your first action, place an ocean tile and a greenery tile next to each other IGNORING GREENERY PLACEMENT RESTRICTIONS. Raise oxygen 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 35,
      "initialActionText": "Place an ocean tile and a greenery tile next to each other"
    },
    "starting": {
      "mc": 35,
      "production": {}
    }
  },
  {
    "id": "card-promo-recyclon",
    "name": "Recyclon",
    "expansion": "promo",
    "source": "src/server/cards/promo/Recyclon.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Microbe",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 38 M€ and 1 steel production.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      },
      "startingMegaCredits": 38
    },
    "starting": {
      "mc": 38,
      "production": {
        "steel": 1
      }
    }
  },
  {
    "id": "card-promo-splice",
    "name": "Splice",
    "expansion": "promo",
    "source": "src/server/cards/promo/Splice.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 44 M€. As your first action, reveal cards until you have revealed a microbe tag. Take it and discard the rest.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 44
    },
    "starting": {
      "mc": 44,
      "production": {}
    }
  },
  {
    "id": "card-promo-tycho-magnetics",
    "name": "Tycho Magnetics",
    "expansion": "promo",
    "source": "src/server/cards/promo/TychoMagnetics.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Power",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 42 M€. Increase your energy production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        }
      },
      "startingMegaCredits": 42
    },
    "starting": {
      "mc": 42,
      "production": {
        "energy": 1
      }
    }
  },
  {
    "id": "card-turmoil-lakefront-resorts",
    "name": "Lakefront Resorts",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/LakefrontResorts.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 54 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 54
    },
    "starting": {
      "mc": 54,
      "production": {}
    }
  },
  {
    "id": "card-turmoil-pristar",
    "name": "Pristar",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/Pristar.ts",
    "type": "corporation",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 53 M€. Decrease your TR 2 steps. 1 VP per preservation resource here.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {}
    },
    "effectSpec": {
      "behavior": {
        "tr": -2
      },
      "startingMegaCredits": 53
    },
    "starting": {
      "mc": 53,
      "production": {}
    }
  },
  {
    "id": "card-turmoil-septem-tribus",
    "name": "Septem Tribus",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/SeptumTribus.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Wild"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 36 M€. When you perform an action, the wild tag counts as any tag of your choice.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 36
    },
    "starting": {
      "mc": 36,
      "production": {}
    }
  },
  {
    "id": "card-turmoil-terralabs-research",
    "name": "TerraLabs Research",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/TerralabsResearch.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Science",
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 14 M€. Lower your TR 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": -1
      },
      "startingMegaCredits": 14
    },
    "starting": {
      "mc": 14,
      "production": {}
    }
  },
  {
    "id": "card-turmoil-utopia-invest",
    "name": "Utopia Invest",
    "expansion": "turmoil",
    "source": "src/server/cards/turmoil/UtopiaInvest.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 40 M€. Increase your steel and titanium production 1 step each.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1,
          "titanium": 1
        }
      },
      "startingMegaCredits": 40
    },
    "starting": {
      "mc": 40,
      "production": {
        "steel": 1,
        "titanium": 1
      }
    }
  },
  {
    "id": "card-venus-aphrodite",
    "name": "Aphrodite",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Aphrodite.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Plant",
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 1 plant production and 47 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      },
      "startingMegaCredits": 47
    },
    "starting": {
      "mc": 47,
      "production": {
        "plants": 1
      }
    }
  },
  {
    "id": "card-venus-celestic",
    "name": "Celestic",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Celestic.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 42 M€. As your first action, reveal cards from the deck until you have revealed 2 cards with a floater icon on it. Take them into hand and discard the rest.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 3
    },
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Floater",
          "count": 1,
          "autoSelect": true
        }
      },
      "startingMegaCredits": 42,
      "initialActionText": "Draw 2 cards with a floater icon on it"
    },
    "starting": {
      "mc": 42,
      "production": {}
    }
  },
  {
    "id": "card-venus-manutech",
    "name": "Manutech",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Manutech.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 1 steel production, and 35 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1
        }
      },
      "startingMegaCredits": 35
    },
    "starting": {
      "mc": 35,
      "production": {
        "steel": 1
      }
    }
  },
  {
    "id": "card-venus-morning-star-inc",
    "name": "Morning Star Inc.",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/MorningStarInc.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 50 M€. As your first action, reveal cards from the deck until you have revealed 3 Venus-tag cards. Take those into hand and discard the rest.",
    "victoryPoints": 0,
    "effectSpec": {
      "globalParameterRequirementBonus": {
        "steps": 2,
        "parameter": "venus"
      },
      "startingMegaCredits": 50
    },
    "starting": {
      "mc": 50,
      "production": {}
    }
  },
  {
    "id": "card-venus-viron",
    "name": "Viron",
    "expansion": "venus",
    "source": "src/server/cards/venusNext/Viron.ts",
    "type": "corporation",
    "cost": null,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "You start with 48 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": 48
    },
    "starting": {
      "mc": 48,
      "production": {}
    }
  }
];

export const FULL_PRELUDES = [
  {
    "id": "card-prelude-acquired-space-agency",
    "name": "Acquired Space Agency",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/AcquiredSpaceAgency.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 6 titanium. Reveal cards until you reveal two cards with Space Tags. Take them into your hand, discard the rest.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 6
        },
        "drawCard": {
          "count": 2,
          "tag": "space"
        }
      }
    }
  },
  {
    "id": "card-prelude-allied-bank",
    "name": "Allied Bank",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/AlliedBanks.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 4 steps. Gain 3 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 4
        },
        "stock": {
          "megacredits": 3
        }
      },
      "startingMegaCredits": 3
    }
  },
  {
    "id": "card-prelude-aquifer-turbines",
    "name": "Aquifer Turbines",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/AquiferTurbines.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place an ocean tile. Increase your energy production 2 steps. Pay 3 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        },
        "ocean": {}
      },
      "startingMegaCredits": -3
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-prelude-biofuels",
    "name": "Biofuels",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Biofuels.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy and plant production 1 step. Gain 2 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "plants": 1
        },
        "stock": {
          "plants": 2
        }
      }
    }
  },
  {
    "id": "card-prelude-biolab",
    "name": "Biolab",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Biolab.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step. Draw 3 cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "drawCard": 3
      }
    }
  },
  {
    "id": "card-prelude-biosphere-support",
    "name": "Biosphere Support",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/BiosphereSupport.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 2 steps. Decrease your M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 2,
          "megacredits": -1
        }
      }
    }
  },
  {
    "id": "card-prelude-business-empire",
    "name": "Business Empire",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/BusinessEmpire.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 6 steps. Pay 6 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 6
        }
      },
      "startingMegaCredits": -6
    }
  },
  {
    "id": "card-prelude-dome-farming",
    "name": "Dome Farming",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/DomeFarming.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Plant",
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps and plant production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2,
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-prelude-donation",
    "name": "Donation",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Donation.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 21 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 21
        }
      },
      "startingMegaCredits": 21
    }
  },
  {
    "id": "card-prelude-early-settlement",
    "name": "Early Settlement",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/EarlySettlement.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step. Place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-prelude-eccentric-sponsor",
    "name": "Eccentric Sponsor",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/EccentricSponsor.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Play a card from hand, reducing its cost by 25 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude-ecology-experts",
    "name": "Ecology Experts",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/EcologyExperts.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Plant",
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step. PLAY A CARD FROM HAND, IGNORING GLOBAL REQUIREMENTS.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-prelude-experimental-forest",
    "name": "Experimental Forest",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/ExperimentalForest.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 1 greenery tile and raise oxygen 1 step. Reveal cards until you reveal two cards with plant tags on them. Take them into your hand and discard the rest.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 2,
          "tag": "plant"
        },
        "greenery": {}
      }
    },
    "placementType": "forest",
    "placementCount": 1
  },
  {
    "id": "card-prelude-galilean-mining",
    "name": "Galilean Mining",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/GalileanMining.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Jovian"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 2 steps. Pay 5 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 2
        }
      },
      "startingMegaCredits": -5
    }
  },
  {
    "id": "card-prelude-great-aquifer",
    "name": "Great Aquifer",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/GreatAquifer.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 2 ocean tiles.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "ocean": {
          "count": 2
        }
      }
    },
    "placementType": "ocean",
    "placementCount": 2
  },
  {
    "id": "card-prelude-huge-asteroid",
    "name": "Huge Asteroid",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/HugeAsteroid.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase temperature 3 steps. Pay 5 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "temperature": 3
        }
      },
      "startingMegaCredits": -5
    }
  },
  {
    "id": "card-prelude-io-research-outpost",
    "name": "Io Research Outpost",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/IoResearchOutpost.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Jovian",
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step. Draw a card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        },
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-prelude-loan",
    "name": "Loan",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Loan.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 30 M€. Decrease your M€ production 2 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": -2
        },
        "stock": {
          "megacredits": 30
        }
      },
      "startingMegaCredits": 30
    }
  },
  {
    "id": "card-prelude-martian-industries",
    "name": "Martian Industries",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MartianIndustries.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy and steel production 1 step. Gain 6 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1,
          "steel": 1
        },
        "stock": {
          "megacredits": 6
        }
      },
      "startingMegaCredits": 6
    }
  },
  {
    "id": "card-prelude-metal-rich-asteroid",
    "name": "Metal-Rich Asteroid",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MetalRichAsteroid.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase temperature 1 step. Gain 4 titanium and 4 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 4,
          "steel": 4
        },
        "global": {
          "temperature": 1
        }
      }
    }
  },
  {
    "id": "card-prelude-metals-company",
    "name": "Metals Company",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MetalsCompany.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€, steel and titanium production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1,
          "steel": 1,
          "titanium": 1
        }
      }
    }
  },
  {
    "id": "card-prelude-mining-operations",
    "name": "Mining Operations",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MiningOperations.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your steel production 2 steps. Gain 4 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 2
        },
        "stock": {
          "steel": 4
        }
      }
    }
  },
  {
    "id": "card-prelude-mohole",
    "name": "Mohole",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Mohole.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 3 steps. Gain 3 heat.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 3
        },
        "stock": {
          "heat": 3
        }
      }
    }
  },
  {
    "id": "card-prelude-mohole-excavation",
    "name": "Mohole Excavation",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/MoholeExcavation.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your steel production 1 step and heat production 2 steps. Gain 2 heat.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "steel": 1,
          "heat": 2
        },
        "stock": {
          "heat": 2
        }
      }
    }
  },
  {
    "id": "card-prelude-nitrogen-shipment",
    "name": "Nitrogen Shipment",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/NitrogenShipment.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant production 1 step. Increase your TR 1 step. Gain 5 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "tr": 1,
        "stock": {
          "megacredits": 5
        }
      },
      "startingMegaCredits": 5
    }
  },
  {
    "id": "card-prelude-orbital-construction-yard",
    "name": "Orbital Construction Yard",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/OrbitalConstructionYard.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step. Gain 4 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        },
        "stock": {
          "titanium": 4
        }
      }
    }
  },
  {
    "id": "card-prelude-polar-industries",
    "name": "Polar Industries",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/PolarIndustries.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your heat production 2 steps. Place an ocean tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "heat": 2
        },
        "ocean": {}
      }
    },
    "placementType": "ocean",
    "placementCount": 1
  },
  {
    "id": "card-prelude-power-generation",
    "name": "Power Generation",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/PowerGeneration.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-prelude-research-network",
    "name": "Research Network",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/ResearchNetwork.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Wild"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 1 step. Draw 3 cards. After being played, when you perform an action, the wild tag counts as any tag of your choice.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        },
        "drawCard": 3
      }
    }
  },
  {
    "id": "card-prelude-self-sufficient-settlement",
    "name": "Self-Sufficient Settlement",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SelfSufficientSettlement.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building",
      "City"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 2 steps. Place a city tile.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 2
        },
        "city": {}
      }
    },
    "placementType": "city",
    "placementCount": 1
  },
  {
    "id": "card-prelude-smelting-plant",
    "name": "Smelting Plant",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SmeltingPlant.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise oxygen 2 steps. Gain 5 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 5
        },
        "global": {
          "oxygen": 2
        }
      }
    }
  },
  {
    "id": "card-prelude-society-support",
    "name": "Society Support",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SocietySupport.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your plant, energy and heat production 1 step. Decrease M€ production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1,
          "energy": 1,
          "heat": 1,
          "megacredits": -1
        }
      }
    }
  },
  {
    "id": "card-prelude-supplier",
    "name": "Supplier",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/Supplier.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Power"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 2 steps. Gain 4 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        },
        "stock": {
          "steel": 4
        }
      }
    }
  },
  {
    "id": "card-prelude-supply-drop",
    "name": "Supply Drop",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/SupplyDrop.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 titanium, 8 steel and 3 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 3,
          "steel": 8,
          "plants": 3
        }
      }
    }
  },
  {
    "id": "card-prelude-unmi-contractor",
    "name": "UNMI Contractor",
    "expansion": "prelude",
    "source": "src/server/cards/prelude/UNMIContractor.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your TR 3 steps. Draw a card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 1,
        "tr": 3
      }
    }
  },
  {
    "id": "card-prelude2-applied-science",
    "name": "Applied Science",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/AppliedScience.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Wild"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 6 science resources here.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 6
      },
      "action": {
        "or": {
          "behaviors": [
            {
              "spend": {
                "resourcesHere": 1
              },
              "standardResource": 1,
              "title": "Spend 1 science resource here to gain 1 standard resource"
            },
            {
              "spend": {
                "resourcesHere": 1
              },
              "addResourcesToAnyCard": {
                "count": 1,
                "min": 1,
                "mustHaveCard": true,
                "robotCards": true
              },
              "title": "Spend 1 science resource here to gain 1 resource on ANY CARD WITH A RESOURCE."
            }
          ],
          "autoSelect": true
        }
      }
    }
  },
  {
    "id": "card-prelude2-atmospheric-enhancers",
    "name": "Atmospheric Enhancers",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/AtmosphericEnhancers.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise temperature 2 steps, or raise oxygen 2 steps, or raise Venus 2 steps. Draw 2 cards with floater icons.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "or": {
          "behaviors": [
            {
              "global": {
                "temperature": 2
              },
              "title": "Raise the temperature 2 steps"
            },
            {
              "global": {
                "oxygen": 2
              },
              "title": "Raise the oxygen level 2 steps"
            },
            {
              "global": {
                "venus": 2
              },
              "title": "Raise the Venus scale level 2 steps"
            }
          ]
        }
      }
    }
  },
  {
    "id": "card-prelude2-board-of-directors",
    "name": "Board of Directors",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/BoardOfDirectors.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Add 4 director resources here.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "addResources": 4
      }
    }
  },
  {
    "id": "card-prelude2-colony-trade-hub",
    "name": "Colony Trade Hub",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/ColonyTradeHub.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 1 step. Gain 2 titanium",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 1
        },
        "stock": {
          "titanium": 2
        }
      }
    }
  },
  {
    "id": "card-prelude2-corridors-of-power",
    "name": "Corridors of Power",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/CorridorsOfPower.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: Each time you become party leader, draw 1 card. Raise your TR 1 step and gain 4 M€",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1,
        "stock": {
          "megacredits": 4
        }
      },
      "startingMegaCredits": 4
    }
  },
  {
    "id": "card-prelude2-early-colonization",
    "name": "Early Colonization",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/EarlyColonization.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place a colony. Gain 3 energy.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {}
        },
        "stock": {
          "energy": 3
        }
      }
    }
  },
  {
    "id": "card-prelude2-floating-trade-hub",
    "name": "Floating Trade Hub",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/FloatingTradeHub.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Add 2 floaters to ANY card, or remove any number of floaters here to gain that many of one standard resource.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-focused-organization",
    "name": "Focused Organization",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/FocusedOrganization.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Action: Discard 1 card and spend 1 standard resource to draw 1 card and gain 1 standard resource. Draw 1 card and gain 1 standard resource.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": 1,
        "standardResource": 1
      }
    }
  },
  {
    "id": "card-prelude2-high-circles",
    "name": "High Circles",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/HighCircles.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 1 step and draw 1 card with PARTY REQUIREMENT. Place 2 delegates in one party. Effect: You have +1 influence.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 1,
        "turmoil": {
          "influenceBonus": 1,
          "sendDelegates": {
            "count": 2
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-industrial-complex",
    "name": "Industrial Complex",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/IndustrialComplex.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Lose 18 M€. INCREASE ALL YOUR PRODUCTIONS THAT ARE LOWER THAN 1, TO 1.",
    "victoryPoints": 0,
    "effectSpec": {
      "startingMegaCredits": -18
    }
  },
  {
    "id": "card-prelude2-main-belt-asteroids",
    "name": "Main Belt Asteroids",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/MainBeltAsteroids.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Lose 5 M€. 1 VP per 2 asteroids here.",
    "victoryPoints": 0,
    "victoryPointSpec": {
      "resourcesHere": {},
      "per": 2
    },
    "effectSpec": {
      "action": {
        "addResourcesToAnyCard": {
          "type": "Asteroid",
          "count": 1
        }
      },
      "startingMegaCredits": -5
    }
  },
  {
    "id": "card-prelude2-nobel-prize",
    "name": "Nobel Prize",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/NobelPrize.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Wild"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 5 M€. Draw 2 cards with requirements.",
    "victoryPoints": 2,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 5
        }
      },
      "startingMegaCredits": 5
    }
  },
  {
    "id": "card-prelude2-old-mining-colony",
    "name": "Old Mining Colony",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/OldMiningColony.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your titanium production 1 step. Place 1 colony. Discard 1 card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "titanium": 1
        },
        "colonies": {
          "buildColony": {}
        }
      }
    }
  },
  {
    "id": "card-prelude2-planetary-alliance",
    "name": "Planetary Alliance",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/PlanetaryAlliance.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth",
      "Jovian",
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 2 steps. Draw 1 Jovian card and 1 Venus card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 2
      }
    }
  },
  {
    "id": "card-prelude2-preservation-program",
    "name": "Preservation Program",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/PreservationProgram.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 5 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "tr": 5
      }
    }
  },
  {
    "id": "card-prelude2-project-eden",
    "name": "Project Eden",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/ProjectEden.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "City",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Place 1 ocean tile, 1 city tile, and 1 greenery tile. Discard 3 cards.",
    "victoryPoints": 0,
    "effectSpec": {
      "tr": {
        "oceans": 1,
        "oxygen": 1
      }
    }
  },
  {
    "id": "card-prelude2-recession",
    "name": "Recession",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/Recession.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "EACH OPPONENT loses 5 M€ and decreases their M€ production 1 step. You gain 10 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 10
        }
      },
      "startingMegaCredits": 10
    }
  },
  {
    "id": "card-prelude2-rise-to-power",
    "name": "Rise To Power",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/RiseToPower.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your M€ production 3 steps and place 3 delegates. YOU MAY PLACE THEM IN SEPARATE PARTIES.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 3
        },
        "turmoil": {
          "sendDelegates": {
            "count": 3,
            "manyParties": true
          }
        }
      }
    }
  },
  {
    "id": "card-prelude2-soil-bacteria",
    "name": "Soil Bacteria",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SoilBacteria.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Microbe"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 2 microbe cards and gain 3 plants.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "plants": 3
        },
        "drawCard": {
          "count": 2,
          "tag": "microbe"
        }
      }
    }
  },
  {
    "id": "card-prelude2-space-lanes",
    "name": "Space Lanes",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SpaceLanes.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 titanium.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "titanium": 3
        }
      },
      "cardDiscount": [
        {
          "tag": "jovian",
          "amount": 2
        },
        {
          "tag": "earth",
          "amount": 2
        },
        {
          "tag": "venus",
          "amount": 2
        }
      ]
    }
  },
  {
    "id": "card-prelude2-suitable-infrastructure",
    "name": "Suitable Infrastructure",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/SuitableInfrastructure.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Building"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 5 steel.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 5
        }
      }
    }
  },
  {
    "id": "card-prelude2-terraforming-deal",
    "name": "Terraforming Deal",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/TerraformingDeal.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Effect: Each step your TR is raised, you gain 2 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-prelude2-venus-contract",
    "name": "Venus Contract",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusContract.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Venus"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 1 Venus card. Raise your TR 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 1,
          "tag": "venus"
        },
        "tr": 1
      }
    }
  },
  {
    "id": "card-prelude2-venus-l1-shade",
    "name": "Venus L1 Shade",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/VenusL1Shade.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise Venus 3 steps.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "global": {
          "venus": 3
        }
      }
    }
  },
  {
    "id": "card-prelude2-world-government-advisor",
    "name": "World Government Advisor",
    "expansion": "prelude2",
    "source": "src/server/cards/prelude2/WorldGovernmentAdvisor.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Earth"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your TR 2 steps. Draw 1 card.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "tr": 2,
        "drawCard": 1
      }
    }
  },
  {
    "id": "card-promo-albedo-plants",
    "name": "Albedo Plants",
    "expansion": "promo",
    "source": "src/server/cards/promo/AlbedoPlants.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase plant production 1 step. Gain 1 plant.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1
        },
        "stock": {
          "plants": 1
        }
      }
    }
  },
  {
    "id": "card-promo-anti-desertification-techniques",
    "name": "Anti-desertification Techniques",
    "expansion": "promo",
    "source": "src/server/cards/promo/AntidesertificationTechniques.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Microbe",
      "Plant"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 3 M€. Increase your plant production 1 step and your steel production 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "plants": 1,
          "steel": 1
        },
        "stock": {
          "megacredits": 3
        }
      },
      "startingMegaCredits": 3
    }
  },
  {
    "id": "card-promo-corporate-archives",
    "name": "Corporate Archives",
    "expansion": "promo",
    "source": "src/server/cards/promo/CorporateArchives.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Science"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 13 M€.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "drawCard": {
          "count": 7,
          "keep": 2
        },
        "stock": {
          "megacredits": 13
        }
      },
      "startingMegaCredits": 13
    }
  },
  {
    "id": "card-promo-double-down",
    "name": "Double Down",
    "expansion": "promo",
    "source": "src/server/cards/promo/DoubleDown.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Copy your other prelude's direct effect.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-established-methods",
    "name": "Established Methods",
    "expansion": "promo",
    "source": "src/server/cards/promo/EstablishedMethods.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Gain 30 M€. Then pay for and perform 2 standard projects.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "megacredits": 30
        }
      },
      "startingMegaCredits": 30
    }
  },
  {
    "id": "card-promo-giant-solar-collector",
    "name": "Giant Solar Collector",
    "expansion": "promo",
    "source": "src/server/cards/promo/GiantSolarCollector.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "Power",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Increase your energy production 2 steps. Raise Venus 1 step.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "energy": 2
        },
        "global": {
          "venus": 1
        }
      }
    }
  },
  {
    "id": "card-promo-head-start",
    "name": "Head Start",
    "expansion": "promo",
    "source": "src/server/cards/promo/HeadStart.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "GAIN 2 STEEL. GAIN 2 M€ PER PROJECT CARD YOU HAVE IN HAND.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "stock": {
          "steel": 2
        }
      }
    }
  },
  {
    "id": "card-promo-merger",
    "name": "Merger",
    "expansion": "promo",
    "source": "src/server/cards/promo/Merger.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Draw 4 corporation cards. Play one of them and discard the other 3. Then pay 42 M€.",
    "victoryPoints": 0,
    "effectSpec": {}
  },
  {
    "id": "card-promo-new-partner",
    "name": "New Partner",
    "expansion": "promo",
    "source": "src/server/cards/promo/NewPartner.ts",
    "type": "prelude",
    "cost": null,
    "tags": [],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Raise your M€ production 1 step. Immediately draw 2 prelude cards. Play 1 of them, and discard the other.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "production": {
          "megacredits": 1
        }
      }
    }
  },
  {
    "id": "card-promo-strategic-base-planning",
    "name": "Strategic Base Planning",
    "expansion": "promo",
    "source": "src/server/cards/promo/StrategicBasePlanning.ts",
    "type": "prelude",
    "cost": null,
    "tags": [
      "City",
      "Building",
      "Space"
    ],
    "requirements": [],
    "reqText": "なし",
    "effectText": "Pay 3M€. Place a city. Place a colony.",
    "victoryPoints": 0,
    "effectSpec": {
      "behavior": {
        "colonies": {
          "buildColony": {}
        },
        "city": {}
      },
      "startingMegaCredits": -3
    },
    "placementType": "city",
    "placementCount": 1
  }
];

export const FULL_GLOBAL_EVENTS = [
  {
    "id": "global-aquifer-released-by-public-council",
    "name": "Aquifer Released by Public Council",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/AquiferReleasedByPublicCouncil.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Greens",
    "effectText": "First player places an ocean tile. Gain 1 plant and 1 steel per influence."
  },
  {
    "id": "global-asteroid-mining",
    "name": "Asteroid Mining",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/AsteroidMining.ts",
    "revealedDelegate": "Reds",
    "currentDelegate": "Unity",
    "effectText": "Gain 1 titanium for each Jovian tag (max 5) and influence."
  },
  {
    "id": "global-celebrity-leaders",
    "name": "Celebrity Leaders",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/CelebrityLeaders.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Greens",
    "effectText": "Gain 2 M€ for each event played (max 5) and influence."
  },
  {
    "id": "global-cloud-societies",
    "name": "Cloud Societies",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/CloudSocieties.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Reds",
    "effectText": "Add a floater to each card that can collect floaters. Add 1 floater for each influence to a card."
  },
  {
    "id": "global-corrosive-rain",
    "name": "Corrosive Rain",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/CorrosiveRain.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Greens",
    "effectText": "Lose 2 floaters from a card or 10 M€. Draw 1 card for each influence."
  },
  {
    "id": "global-diversity",
    "name": "Diversity",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Diversity.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Scientists",
    "effectText": "Gain 10 M€ if you have 9 or more different tags. Influence counts as unique tags."
  },
  {
    "id": "global-dry-deserts",
    "name": "Dry Deserts",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/DryDeserts.ts",
    "revealedDelegate": "Reds",
    "currentDelegate": "Unity",
    "effectText": "First player removes 1 ocean tile from the gameboard. Gain 1 standard resource per influence."
  },
  {
    "id": "global-eco-sabotage",
    "name": "Eco Sabotage",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/EcoSabotage.ts",
    "revealedDelegate": "Greens",
    "currentDelegate": "Reds",
    "effectText": "Lose all plants except 3 + influence."
  },
  {
    "id": "global-election",
    "name": "Election",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Election.ts",
    "revealedDelegate": "Greens",
    "currentDelegate": "Mars First",
    "effectText": "Count your influence plus building tags and city tiles (no limits). The player with most (or 10 in solo) gains 2 TR, the 2nd (or 5 in solo) gains 1 TR (ties are friendly)."
  },
  {
    "id": "global-generous-funding",
    "name": "Generous Funding",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/GenerousFunding.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Unity",
    "effectText": "Gain 2 M€ for each influence and set of 5 TR over 15 (max 5 sets)."
  },
  {
    "id": "global-global-dust-storm",
    "name": "Global Dust Storm",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/GlobalDustStorm.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Greens",
    "effectText": "Lose all heat. Lose 2 M€ for each building tag (max 5, then reduced by influence)."
  },
  {
    "id": "global-homeworld-support",
    "name": "Homeworld Support",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/HomeworldSupport.ts",
    "revealedDelegate": "Reds",
    "currentDelegate": "Unity",
    "effectText": "Gain 2 M€ for each Earth tag (max 5) and influence."
  },
  {
    "id": "global-improved-energy-templates",
    "name": "Improved Energy Templates",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/ImprovedEnergyTemplates.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Kelvinists",
    "effectText": "Increase energy production 1 step per 2 power tags (no limit). Influence counts as power tags."
  },
  {
    "id": "global-interplanetary-trade",
    "name": "Interplanetary Trade",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/InterplanetaryTrade.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Unity",
    "effectText": "Gain 2 M€ for each space tag (max 5) and influence."
  },
  {
    "id": "global-jovian-tax-rights",
    "name": "Jovian Tax Rights",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/JovianTaxRights.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Unity",
    "effectText": "Increase M€ production 1 step for each colony. Gain 1 titanium for each influence."
  },
  {
    "id": "global-microgravity-health-problems",
    "name": "Microgravity Health Problems",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/MicrogravityHealthProblems.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Scientists",
    "effectText": "Lose 3 M€ for each colony (max 5, then reduced by influence)."
  },
  {
    "id": "global-miners-on-strike",
    "name": "Miners On Strike",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/MinersOnStrike.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Greens",
    "effectText": "Lose 1 titanium for each Jovian tag (max 5, then reduced by influence)."
  },
  {
    "id": "global-mud-slides",
    "name": "Mud Slides",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/MudSlides.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Greens",
    "effectText": "Lose 4 M€ for each tile adjacent to ocean (max 5, then reduced by influence)."
  },
  {
    "id": "global-pandemic",
    "name": "Pandemic",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Pandemic.ts",
    "revealedDelegate": "Greens",
    "currentDelegate": "Mars First",
    "effectText": "Lose 3 M€ for each building tag (max 5, then reduced by influence)."
  },
  {
    "id": "global-paradigm-breakdown",
    "name": "Paradigm Breakdown",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/ParadigmBreakdown.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Reds",
    "effectText": "Discard 2 cards from hand. Gain 2 M€ per influence."
  },
  {
    "id": "global-productivity",
    "name": "Productivity",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Productivity.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Mars First",
    "effectText": "Gain 1 steel for each steel production (max 5) and influence."
  },
  {
    "id": "global-red-influence",
    "name": "Red Influence",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/RedInfluence.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Reds",
    "effectText": "Lose 3 M€ for each set of 5 TR over 10 (max 5 sets). Increase M€ production 1 step per influence."
  },
  {
    "id": "global-revolution",
    "name": "Revolution",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Revolution.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Mars First",
    "effectText": "Count Earth tags and ADD(!) influence. The player(s) with most (at least 1) loses 2 TR, and 2nd most (at least 1) loses 1 TR. SOLO: Lose 2 TR if the sum is 4 or more."
  },
  {
    "id": "global-riots",
    "name": "Riots",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Riots.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Reds",
    "effectText": "Lose 4 M€ for each city tile (max 5, then reduced by influence)."
  },
  {
    "id": "global-sabotage",
    "name": "Sabotage",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/Sabotage.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Reds",
    "effectText": "Decrease steel and energy production 1 step each. Gain 1 steel per influence."
  },
  {
    "id": "global-scientific-community",
    "name": "Scientific Community",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/ScientificCommunity.ts",
    "revealedDelegate": "Reds",
    "currentDelegate": "Scientists",
    "effectText": "Gain 1 M€ for each card in hand (no limit) and influence."
  },
  {
    "id": "global-snow-cover",
    "name": "Snow Cover",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SnowCover.ts",
    "revealedDelegate": "Kelvinists",
    "currentDelegate": "Kelvinists",
    "effectText": "Decrease temperature 2 steps. Draw 1 card per influence."
  },
  {
    "id": "global-solar-flare",
    "name": "Solar Flare",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SolarFlare.ts",
    "revealedDelegate": "Unity",
    "currentDelegate": "Kelvinists",
    "effectText": "Lose 3 M€ for each space tag (max 5, then reduced by influence)."
  },
  {
    "id": "global-solarnet-shutdown",
    "name": "Solarnet Shutdown",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SolarnetShutdown.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Mars First",
    "effectText": "Lose 3 M€ for each blue card (max 5, then reduced by influence)."
  },
  {
    "id": "global-spin-off-products",
    "name": "Spin-Off Products",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SpinoffProducts.ts",
    "revealedDelegate": "Greens",
    "currentDelegate": "Scientists",
    "effectText": "Gain 2 M€ for each science tag (max 5) and influence."
  },
  {
    "id": "global-sponsored-projects",
    "name": "Sponsored Projects",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SponsoredProjects.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Greens",
    "effectText": "All cards with resources on them gain 1 resource. Draw 1 card for each influence."
  },
  {
    "id": "global-strong-society",
    "name": "Strong Society",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/StrongSociety.ts",
    "revealedDelegate": "Reds",
    "currentDelegate": "Mars First",
    "effectText": "Gain 2 M€ for each city tile (max 5) and influence."
  },
  {
    "id": "global-successful-organisms",
    "name": "Successful Organisms",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/SuccessfulOrganisms.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Scientists",
    "effectText": "Gain 1 plant per plant production (max 5) and influence."
  },
  {
    "id": "global-venus-infrastructure",
    "name": "Venus Infrastructure",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/VenusInfrastructure.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Unity",
    "effectText": "Gain 2 M€ per Venus tag (max 5) and influence."
  },
  {
    "id": "global-volcanic-eruptions",
    "name": "Volcanic Eruptions",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/VolcanicEruptions.ts",
    "revealedDelegate": "Scientists",
    "currentDelegate": "Kelvinists",
    "effectText": "Increase temperature 2 steps. Increase heat production 1 step per influence."
  },
  {
    "id": "global-war-on-earth",
    "name": "War on Earth",
    "expansion": "turmoil",
    "source": "src/server/turmoil/globalEvents/WarOnEarth.ts",
    "revealedDelegate": "Mars First",
    "currentDelegate": "Kelvinists",
    "effectText": "Reduce TR 4 steps. Each influence prevents 1 step."
  }
];

export const FULL_CATALOG_COUNTS = {
  "projects": 428,
  "standardProjects": 10,
  "standardActions": 2,
  "corporations": 49,
  "preludes": 70,
  "globalEvents": 36
};
