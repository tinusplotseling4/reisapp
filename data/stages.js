const STAGES = [
  {
    "day": "Dag 1 / Etappe 1",
    "title": "Amsterdam → Bovensmilde → Zuid-Zweden",
    "from": "Amsterdam",
    "to": "Malmö / Göteborg-regio",
    "km": "± 1.050–1.150 km",
    "time": "± 13–15 uur",
    "goal": "Saaie kilometers wegwerken. Eerste nacht mag lang zijn.",
    "route": [
      "Grevelingstraat 77, Lisse, Netherlands",
      "Bovensmilde, Netherlands",
      "Hamburg, Germany",
      "Kolding, Denmark",
      "Storebælt Bridge, Denmark",
      "Øresund Bridge",
      "Malmö, Sweden"
    ],
    "pois": [
      [
        "Storebæltbrug",
        3,
        "Grote Deense brug; mooi als je er toch overheen rijdt.",
        "https://www.google.com/maps/search/Storeb%C3%A6ltbrug+Norway"
      ],
      [
        "Øresundbrug",
        3,
        "Iconische brug/tunnel-combinatie naar Zweden.",
        "https://www.google.com/maps/search/%C3%98resundbrug+Norway"
      ],
      [
        "Zuid-Zweedse kustlijn",
        2,
        "Geen must, maar leuk als het licht is.",
        "https://www.google.com/maps/search/Zuid-Zweedse+kustlijn+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Grevelingstraat+77%2C+Lisse%2C+Netherlands/Bovensmilde%2C+Netherlands/Hamburg%2C+Germany/Kolding%2C+Denmark/Storeb%C3%A6lt+Bridge%2C+Denmark/%C3%98resund+Bridge/Malm%C3%B6%2C+Sweden"
  },
  {
    "day": "Dag 2 / Etappe 2",
    "title": "Zuid-Zweden → Geilo / Haugastøl",
    "from": "Malmö / Göteborg-regio",
    "to": "Geilo / Haugastøl",
    "km": "± 500–650 km",
    "time": "± 7–9 uur",
    "goal": "Noorwegen in en richting Hardangervidda.",
    "route": [
      "Malmö, Sweden",
      "Gothenburg, Sweden",
      "Oslo, Norway",
      "Drammen, Norway",
      "Geilo, Norway",
      "Haugastøl, Norway"
    ],
    "pois": [
      [
        "Oslofjord-regio",
        2,
        "Mooie overgang Zweden/Noorwegen.",
        "https://www.google.com/maps/search/Oslofjord-regio+Norway"
      ],
      [
        "Hallingdal",
        3,
        "Mooie dalroute richting bergen.",
        "https://www.google.com/maps/search/Hallingdal+Norway"
      ],
      [
        "Geilo",
        3,
        "Logisch punt voor boodschappen/tanken/rust.",
        "https://www.google.com/maps/search/Geilo+Norway"
      ],
      [
        "Haugastøl",
        3,
        "Startgevoel Hardangervidda.",
        "https://www.google.com/maps/search/Haugast%C3%B8l+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Malm%C3%B6%2C+Sweden/Gothenburg%2C+Sweden/Oslo%2C+Norway/Drammen%2C+Norway/Geilo%2C+Norway/Haugast%C3%B8l%2C+Norway"
  },
  {
    "day": "Dag 3 / Etappe 3",
    "title": "Geilo / Haugastøl → Eidfjord",
    "from": "Geilo / Haugastøl",
    "to": "Eidfjord",
    "km": "± 120–180 km",
    "time": "± 3–4 uur",
    "goal": "Eerste echte Noorwegen-dag.",
    "route": [
      "Geilo, Norway",
      "Haugastøl, Norway",
      "Hardangervidda National Tourist Route",
      "Vøringsfossen, Norway",
      "Eidfjord, Norway"
    ],
    "pois": [
      [
        "Hardangervidda",
        5,
        "Hoogvlakte; dit is waar Noorwegen echt begint.",
        "https://www.google.com/maps/search/Hardangervidda+Norway"
      ],
      [
        "Vøringsfossen",
        5,
        "Absolute stop: grote waterval en uitzichtpunten.",
        "https://www.google.com/maps/search/V%C3%B8ringsfossen+Norway"
      ],
      [
        "Måbødalen",
        4,
        "Mooie afdaling richting Eidfjord.",
        "https://www.google.com/maps/search/M%C3%A5b%C3%B8dalen+Norway"
      ],
      [
        "Eidfjord",
        3,
        "Fjorddorp; logisch punt om te landen.",
        "https://www.google.com/maps/search/Eidfjord+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Geilo%2C+Norway/Haugast%C3%B8l%2C+Norway/Hardangervidda+National+Tourist+Route/V%C3%B8ringsfossen%2C+Norway/Eidfjord%2C+Norway"
  },
  {
    "day": "Dag 4 / Etappe 4",
    "title": "Eidfjord → Hardangerbrug → Flåm / Aurland",
    "from": "Eidfjord",
    "to": "Flåm / Aurland",
    "km": "± 170–230 km",
    "time": "± 4–5 uur",
    "goal": "Bruggen, tunnels en fjorden.",
    "route": [
      "Eidfjord, Norway",
      "Hardanger Bridge, Norway",
      "Vallavik Tunnel, Norway",
      "Voss, Norway",
      "Flåm, Norway",
      "Stegastein Viewpoint, Norway",
      "Aurland, Norway"
    ],
    "pois": [
      [
        "Hardangerbrug",
        5,
        "Niet overslaan; één van de technische hoogtepunten.",
        "https://www.google.com/maps/search/Hardangerbrug+Norway"
      ],
      [
        "Tunnelrotondes bij Hardangerbrug",
        5,
        "Precies de ondergrondse rotondes waar je op doelde.",
        "https://www.google.com/maps/search/Tunnelrotondes+bij+Hardangerbrug+Norway"
      ],
      [
        "Voss",
        4,
        "Leuke tussenstop, ook praktisch voor boodschappen.",
        "https://www.google.com/maps/search/Voss+Norway"
      ],
      [
        "Flåm",
        4,
        "Mooi, maar toeristisch; zelf bepalen hoe lang je blijft.",
        "https://www.google.com/maps/search/Fl%C3%A5m+Norway"
      ],
      [
        "Stegastein uitzichtpunt",
        5,
        "Alleen bij helder weer echt doen.",
        "https://www.google.com/maps/search/Stegastein+uitzichtpunt+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Eidfjord%2C+Norway/Hardanger+Bridge%2C+Norway/Vallavik+Tunnel%2C+Norway/Voss%2C+Norway/Fl%C3%A5m%2C+Norway/Stegastein+Viewpoint%2C+Norway/Aurland%2C+Norway"
  },
  {
    "day": "Dag 5 / Etappe 5",
    "title": "Flåm / Aurland → Borgund → Loen / Olden",
    "from": "Flåm / Aurland",
    "to": "Loen / Olden",
    "km": "± 250–320 km",
    "time": "± 5–7 uur",
    "goal": "Staafkerk, Lærdaltunnel en richting fjorden.",
    "route": [
      "Aurland, Norway",
      "Lærdal Tunnel, Norway",
      "Borgund Stave Church, Norway",
      "Sogndal, Norway",
      "Olden, Norway",
      "Loen, Norway"
    ],
    "pois": [
      [
        "Lærdaltunnel",
        5,
        "Langste autotunnel; Lotte-checklist waard.",
        "https://www.google.com/maps/search/L%C3%A6rdaltunnel+Norway"
      ],
      [
        "Borgund Staafkerk",
        5,
        "Klassieke Noorse staafkerk; heel mooi.",
        "https://www.google.com/maps/search/Borgund+Staafkerk+Norway"
      ],
      [
        "Sognefjord",
        4,
        "Fjordlandschap onderweg.",
        "https://www.google.com/maps/search/Sognefjord+Norway"
      ],
      [
        "Olden",
        4,
        "Mooi fjorddorp.",
        "https://www.google.com/maps/search/Olden+Norway"
      ],
      [
        "Loen",
        4,
        "Mooie regio; goede plek om even te blijven.",
        "https://www.google.com/maps/search/Loen+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Aurland%2C+Norway/L%C3%A6rdal+Tunnel%2C+Norway/Borgund+Stave+Church%2C+Norway/Sogndal%2C+Norway/Olden%2C+Norway/Loen%2C+Norway"
  },
  {
    "day": "Dag 6 / Etappe 6",
    "title": "Loen / Olden → Geiranger",
    "from": "Loen / Olden",
    "to": "Geiranger",
    "km": "± 130–200 km",
    "time": "± 4–6 uur",
    "goal": "Rustig fjorden rijden.",
    "route": [
      "Loen, Norway",
      "Olden, Norway",
      "Stryn, Norway",
      "Dalsnibba, Norway",
      "Flydalsjuvet, Norway",
      "Geiranger, Norway",
      "Ørnesvingen, Norway"
    ],
    "pois": [
      [
        "Stryn",
        4,
        "Mooi tussenpunt.",
        "https://www.google.com/maps/search/Stryn+Norway"
      ],
      [
        "Geirangerfjord",
        5,
        "Hoogtepunt van de reis.",
        "https://www.google.com/maps/search/Geirangerfjord+Norway"
      ],
      [
        "Flydalsjuvet",
        5,
        "Klassiek uitzicht op Geiranger.",
        "https://www.google.com/maps/search/Flydalsjuvet+Norway"
      ],
      [
        "Ørnesvingen",
        5,
        "Uitzicht vanaf de andere kant.",
        "https://www.google.com/maps/search/%C3%98rnesvingen+Norway"
      ],
      [
        "Dalsnibba",
        4,
        "Alleen doen bij helder weer.",
        "https://www.google.com/maps/search/Dalsnibba+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Loen%2C+Norway/Olden%2C+Norway/Stryn%2C+Norway/Dalsnibba%2C+Norway/Flydalsjuvet%2C+Norway/Geiranger%2C+Norway/%C3%98rnesvingen%2C+Norway"
  },
  {
    "day": "Dag 7 / Etappe 7",
    "title": "Geiranger → Trollstigen → Åndalsnes",
    "from": "Geiranger",
    "to": "Åndalsnes",
    "km": "± 140–180 km",
    "time": "± 4–5 uur",
    "goal": "Spectaculaire bergwegen.",
    "route": [
      "Geiranger, Norway",
      "Valldal, Norway",
      "Gudbrandsjuvet, Norway",
      "Trollstigen, Norway",
      "Trollveggen, Norway",
      "Åndalsnes, Norway"
    ],
    "pois": [
      [
        "Gudbrandsjuvet",
        4,
        "Kleine maar gave stop bij water/kloof.",
        "https://www.google.com/maps/search/Gudbrandsjuvet+Norway"
      ],
      [
        "Trollstigen",
        5,
        "Must-do als hij open is.",
        "https://www.google.com/maps/search/Trollstigen+Norway"
      ],
      [
        "Trollstigen uitzichtplatform",
        5,
        "Niet overslaan bij goed weer.",
        "https://www.google.com/maps/search/Trollstigen+uitzichtplatform+Norway"
      ],
      [
        "Trollveggen",
        4,
        "Indrukwekkende rotswand.",
        "https://www.google.com/maps/search/Trollveggen+Norway"
      ],
      [
        "Åndalsnes",
        3,
        "Praktisch punt voor pauze/voorraad.",
        "https://www.google.com/maps/search/%C3%85ndalsnes+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Geiranger%2C+Norway/Valldal%2C+Norway/Gudbrandsjuvet%2C+Norway/Trollstigen%2C+Norway/Trollveggen%2C+Norway/%C3%85ndalsnes%2C+Norway"
  },
  {
    "day": "Dag 8 / Etappe 8",
    "title": "Åndalsnes → Atlantic Road → Kristiansund / Molde",
    "from": "Åndalsnes",
    "to": "Atlantic Road / Kristiansund / Molde",
    "km": "± 180–240 km",
    "time": "± 4–5 uur",
    "goal": "Noordgrens van de reis.",
    "route": [
      "Åndalsnes, Norway",
      "Molde, Norway",
      "Bud, Norway",
      "Atlantic Ocean Road, Norway",
      "Storseisundet Bridge, Norway",
      "Kristiansund, Norway"
    ],
    "pois": [
      [
        "Molde",
        3,
        "Leuk als je er toch langs komt.",
        "https://www.google.com/maps/search/Molde+Norway"
      ],
      [
        "Bud",
        4,
        "Kleiner, leuk kustplaatsje; minder massaal.",
        "https://www.google.com/maps/search/Bud+Norway"
      ],
      [
        "Atlantic Road / Atlanterhavsvegen",
        5,
        "Noordelijkste doel van de reis.",
        "https://www.google.com/maps/search/Atlantic+Road+%2F+Atlanterhavsvegen+Norway"
      ],
      [
        "Storseisundetbrug",
        5,
        "De bekende ‘springplankbrug’.",
        "https://www.google.com/maps/search/Storseisundetbrug+Norway"
      ],
      [
        "Kustroute Bud–Kristiansund",
        4,
        "Mooie route, niet alleen de brug zelf.",
        "https://www.google.com/maps/search/Kustroute+Bud%E2%80%93Kristiansund+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/%C3%85ndalsnes%2C+Norway/Molde%2C+Norway/Bud%2C+Norway/Atlantic+Ocean+Road%2C+Norway/Storseisundet+Bridge%2C+Norway/Kristiansund%2C+Norway"
  },
  {
    "day": "Dag 9 / Etappe 9",
    "title": "Atlantic Road → Romsdalen / Lom / Jotunheimen",
    "from": "Atlantic Road",
    "to": "Jotunheimen / Sognefjord-richting",
    "km": "± 300–450 km",
    "time": "± 6–8 uur",
    "goal": "Terug via andere route, niet alles dubbel.",
    "route": [
      "Kristiansund, Norway",
      "Åndalsnes, Norway",
      "Romsdalen, Norway",
      "Dombås, Norway",
      "Lom, Norway",
      "Jotunheimen National Park, Norway"
    ],
    "pois": [
      [
        "Romsdalen",
        4,
        "Mooie terugroute door dalen en bergen.",
        "https://www.google.com/maps/search/Romsdalen+Norway"
      ],
      [
        "Dombås",
        3,
        "Praktisch tussenpunt.",
        "https://www.google.com/maps/search/Domb%C3%A5s+Norway"
      ],
      [
        "Lom Staafkerk",
        4,
        "Mooi als jullie via Lom rijden.",
        "https://www.google.com/maps/search/Lom+Staafkerk+Norway"
      ],
      [
        "Jotunheimen-rand",
        4,
        "Veel kleine mooie stops mogelijk.",
        "https://www.google.com/maps/search/Jotunheimen-rand+Norway"
      ],
      [
        "Bergmeren onderweg",
        3,
        "Niet één specifieke plek; gewoon stoppen als het mooi is.",
        "https://www.google.com/maps/search/Bergmeren+onderweg+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Kristiansund%2C+Norway/%C3%85ndalsnes%2C+Norway/Romsdalen%2C+Norway/Domb%C3%A5s%2C+Norway/Lom%2C+Norway/Jotunheimen+National+Park%2C+Norway"
  },
  {
    "day": "Dag 10 / Etappe 10",
    "title": "Midden-Noorwegen → Zweden",
    "from": "Midden/Zuid-Noorwegen",
    "to": "Zweden",
    "km": "± 450–650 km",
    "time": "± 7–9 uur",
    "goal": "Noorwegen rustig verlaten.",
    "route": [
      "Jotunheimen National Park, Norway",
      "Fagernes, Norway",
      "Lillehammer, Norway",
      "Kongsvinger, Norway",
      "Karlstad, Sweden"
    ],
    "pois": [
      [
        "Fagernes",
        3,
        "Praktisch en mooi gelegen.",
        "https://www.google.com/maps/search/Fagernes+Norway"
      ],
      [
        "Lillehammer",
        2,
        "Alleen als je er toevallig langs komt.",
        "https://www.google.com/maps/search/Lillehammer+Norway"
      ],
      [
        "Bos- en meerroute Zweden",
        3,
        "Rustige overgang terug.",
        "https://www.google.com/maps/search/Bos-+en+meerroute+Zweden+Norway"
      ],
      [
        "Laatste Noorse bergstop",
        3,
        "Kies zelf een mooie plek onderweg.",
        "https://www.google.com/maps/search/Laatste+Noorse+bergstop+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Jotunheimen+National+Park%2C+Norway/Fagernes%2C+Norway/Lillehammer%2C+Norway/Kongsvinger%2C+Norway/Karlstad%2C+Sweden"
  },
  {
    "day": "Dag 11 / Etappe 11",
    "title": "Zweden / Denemarken → Nederland",
    "from": "Zweden",
    "to": "Nederland / Amsterdam",
    "km": "± 900–1.100 km",
    "time": "± 11–14 uur",
    "goal": "Laatste dag en nacht kilometers maken.",
    "route": [
      "Karlstad, Sweden",
      "Gothenburg, Sweden",
      "Malmö, Sweden",
      "Øresund Bridge",
      "Storebælt Bridge, Denmark",
      "Hamburg, Germany",
      "Amsterdam, Netherlands"
    ],
    "pois": [
      [
        "Øresundbrug",
        3,
        "Nog één keer.",
        "https://www.google.com/maps/search/%C3%98resundbrug+Norway"
      ],
      [
        "Storebæltbrug",
        3,
        "Laatste grote brug.",
        "https://www.google.com/maps/search/Storeb%C3%A6ltbrug+Norway"
      ],
      [
        "Duitsland/Nederland",
        1,
        "Kilometers maken; geen sightseeing nodig.",
        "https://www.google.com/maps/search/Duitsland%2FNederland+Norway"
      ]
    ],
    "maps": "https://www.google.com/maps/dir/Karlstad%2C+Sweden/Gothenburg%2C+Sweden/Malm%C3%B6%2C+Sweden/%C3%98resund+Bridge/Storeb%C3%A6lt+Bridge%2C+Denmark/Hamburg%2C+Germany/Amsterdam%2C+Netherlands"
  }
];