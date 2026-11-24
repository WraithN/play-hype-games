/**
 * Answer sets for the non-geography Rarity Tower themes.
 *
 * Each answer is { name, wiki?, aliases? }. `wiki` pins the English Wikipedia
 * article used for the pageview signal; without it the builder searches
 * `${name} ${prompt.context}` and takes the top hit.
 */

export default [
  {
    slug: 'movies',
    name: 'Movies',
    kind: 'film',
    unit: 'films',
    one: 'film',
    placeholder: 'Type a film…',
    tagline: 'Animation, Oscars, and the films everyone quotes',
    blurb:
      'Film is the category young audiences still show up for — and animation most of all. This tower mixes the obvious studio canon with the corners only film people reach for.',
    prompts: [
      {
        id: 'mv-pixar',
        prompt: 'Name a Pixar film',
        context: 'Pixar film',
        answers: [
          { name: 'Toy Story', wiki: 'Toy Story' },
          { name: "A Bug's Life", wiki: "A Bug's Life" },
          { name: 'Toy Story 2', wiki: 'Toy Story 2' },
          { name: 'Monsters, Inc.', wiki: 'Monsters, Inc.' },
          { name: 'Finding Nemo', wiki: 'Finding Nemo' },
          { name: 'The Incredibles', wiki: 'The Incredibles' },
          { name: 'Cars', wiki: 'Cars (film)' },
          { name: 'Ratatouille', wiki: 'Ratatouille (film)' },
          { name: 'WALL-E', wiki: 'WALL-E' },
          { name: 'Up', wiki: 'Up (2009 film)' },
          { name: 'Toy Story 3', wiki: 'Toy Story 3' },
          { name: 'Cars 2', wiki: 'Cars 2' },
          { name: 'Brave', wiki: 'Brave (2012 film)' },
          { name: 'Monsters University', wiki: 'Monsters University' },
          { name: 'Inside Out', wiki: 'Inside Out (2015 film)' },
          { name: 'The Good Dinosaur', wiki: 'The Good Dinosaur' },
          { name: 'Finding Dory', wiki: 'Finding Dory' },
          { name: 'Cars 3', wiki: 'Cars 3' },
          { name: 'Coco', wiki: 'Coco (2017 film)' },
          { name: 'Incredibles 2', wiki: 'Incredibles 2' },
          { name: 'Toy Story 4', wiki: 'Toy Story 4' },
          { name: 'Onward', wiki: 'Onward (film)' },
          { name: 'Soul', wiki: 'Soul (2020 film)' },
          { name: 'Luca', wiki: 'Luca (2021 film)' },
          { name: 'Turning Red', wiki: 'Turning Red' },
          { name: 'Lightyear', wiki: 'Lightyear (film)' },
          { name: 'Elemental', wiki: 'Elemental (2023 film)' },
          { name: 'Inside Out 2', wiki: 'Inside Out 2' },
          { name: 'Elio', wiki: 'Elio (film)' },
          { name: 'Hoppers', wiki: 'Hoppers (film)' }
        ]
      },
      {
        id: 'mv-bestpicture',
        prompt: 'Name a Best Picture winner from the 2010s',
        context: 'film',
        answers: [
          { name: "The King's Speech", wiki: "The King's Speech" },
          { name: 'The Artist', wiki: 'The Artist (film)' },
          { name: 'Argo', wiki: 'Argo (2012 film)' },
          { name: '12 Years a Slave', wiki: '12 Years a Slave (film)' },
          { name: 'Birdman', wiki: 'Birdman (film)' },
          { name: 'Spotlight', wiki: 'Spotlight (film)' },
          { name: 'Moonlight', wiki: 'Moonlight (2016 film)' },
          { name: 'The Shape of Water', wiki: 'The Shape of Water' },
          { name: 'Green Book', wiki: 'Green Book (film)' },
          { name: 'Parasite', wiki: 'Parasite (2019 film)' }
        ]
      },
      {
        id: 'mv-disney90s',
        prompt: 'Name a Disney animated film from the 1990s',
        context: 'Disney animated film',
        answers: [
          { name: 'The Rescuers Down Under', wiki: 'The Rescuers Down Under' },
          { name: 'Beauty and the Beast', wiki: 'Beauty and the Beast (1991 film)' },
          { name: 'Aladdin', wiki: 'Aladdin (1992 Disney film)' },
          { name: 'The Lion King', wiki: 'The Lion King' },
          { name: 'Pocahontas', wiki: 'Pocahontas (1995 film)' },
          { name: 'The Hunchback of Notre Dame', wiki: 'The Hunchback of Notre Dame (1996 film)' },
          { name: 'Hercules', wiki: 'Hercules (1997 film)' },
          { name: 'Mulan', wiki: 'Mulan (1998 film)' },
          { name: 'Tarzan', wiki: 'Tarzan (1999 film)' }
        ]
      },
      {
        id: 'mv-ghibli',
        prompt: 'Name a Studio Ghibli film',
        context: 'Studio Ghibli film',
        answers: [
          { name: 'Nausicaä of the Valley of the Wind', wiki: 'Nausicaä of the Valley of the Wind (film)' },
          { name: 'Castle in the Sky', wiki: 'Castle in the Sky' },
          { name: 'My Neighbor Totoro', wiki: 'My Neighbor Totoro' },
          { name: 'Grave of the Fireflies', wiki: 'Grave of the Fireflies' },
          { name: "Kiki's Delivery Service", wiki: "Kiki's Delivery Service" },
          { name: 'Only Yesterday', wiki: 'Only Yesterday (1991 film)' },
          { name: 'Porco Rosso', wiki: 'Porco Rosso' },
          { name: 'Ocean Waves', wiki: 'Ocean Waves (film)' },
          { name: 'Pom Poko', wiki: 'Pom Poko' },
          { name: 'Whisper of the Heart', wiki: 'Whisper of the Heart' },
          { name: 'Princess Mononoke', wiki: 'Princess Mononoke' },
          { name: 'My Neighbors the Yamadas', wiki: 'My Neighbors the Yamadas' },
          { name: 'Spirited Away', wiki: 'Spirited Away' },
          { name: 'The Cat Returns', wiki: 'The Cat Returns' },
          { name: "Howl's Moving Castle", wiki: "Howl's Moving Castle (film)" },
          { name: 'Tales from Earthsea', wiki: 'Tales from Earthsea (film)' },
          { name: 'Ponyo', wiki: 'Ponyo' },
          { name: 'Arrietty', wiki: 'Arrietty' },
          { name: 'From Up on Poppy Hill', wiki: 'From Up on Poppy Hill' },
          { name: 'The Wind Rises', wiki: 'The Wind Rises' },
          { name: 'The Tale of the Princess Kaguya', wiki: 'The Tale of the Princess Kaguya' },
          { name: 'When Marnie Was There', wiki: 'When Marnie Was There' },
          { name: 'The Red Turtle', wiki: 'The Red Turtle' },
          { name: 'Earwig and the Witch', wiki: 'Earwig and the Witch' },
          { name: 'The Boy and the Heron', wiki: 'The Boy and the Heron' }
        ]
      },
      {
        id: 'mv-animated',
        prompt: 'Name a film that won the Best Animated Feature Oscar',
        context: 'animated film',
        answers: [
          { name: 'Shrek', wiki: 'Shrek' },
          { name: 'Spirited Away', wiki: 'Spirited Away' },
          { name: 'Finding Nemo', wiki: 'Finding Nemo' },
          { name: 'The Incredibles', wiki: 'The Incredibles' },
          { name: 'Wallace & Gromit: The Curse of the Were-Rabbit', wiki: 'Wallace & Gromit: The Curse of the Were-Rabbit' },
          { name: 'Happy Feet', wiki: 'Happy Feet' },
          { name: 'Ratatouille', wiki: 'Ratatouille (film)' },
          { name: 'WALL-E', wiki: 'WALL-E' },
          { name: 'Up', wiki: 'Up (2009 film)' },
          { name: 'Toy Story 3', wiki: 'Toy Story 3' },
          { name: 'Rango', wiki: 'Rango (2011 film)' },
          { name: 'Brave', wiki: 'Brave (2012 film)' },
          { name: 'Frozen', wiki: 'Frozen (2013 film)' },
          { name: 'Big Hero 6', wiki: 'Big Hero 6 (film)' },
          { name: 'Inside Out', wiki: 'Inside Out (2015 film)' },
          { name: 'Zootopia', wiki: 'Zootopia' },
          { name: 'Coco', wiki: 'Coco (2017 film)' },
          { name: 'Spider-Man: Into the Spider-Verse', wiki: 'Spider-Man: Into the Spider-Verse' },
          { name: 'Toy Story 4', wiki: 'Toy Story 4' },
          { name: 'Soul', wiki: 'Soul (2020 film)' },
          { name: 'Encanto', wiki: 'Encanto' },
          { name: "Guillermo del Toro's Pinocchio", wiki: "Guillermo del Toro's Pinocchio" },
          { name: 'The Boy and the Heron', wiki: 'The Boy and the Heron' },
          { name: 'Flow', wiki: 'Flow (2024 film)' }
        ]
      }
    ]
  },

  {
    slug: 'music',
    name: 'Music',
    kind: 'song',
    unit: 'songs',
    one: 'song or album',
    placeholder: 'Type a song or album…',
    tagline: 'Albums, No. 1s, and the songs everyone knows',
    blurb:
      'Pop, rock and Eurovision in one ladder. The trap is the same: the first song that comes to mind is usually the most obvious one on the board.',
    prompts: [
      {
        id: 'mu-taylor',
        prompt: 'Name a Taylor Swift album',
        context: 'Taylor Swift album',
        answers: [
          { name: 'Taylor Swift', wiki: 'Taylor Swift (album)' },
          { name: 'Fearless', wiki: 'Fearless (Taylor Swift album)' },
          { name: 'Speak Now', wiki: 'Speak Now' },
          { name: 'Red', wiki: 'Red (Taylor Swift album)' },
          { name: '1989', wiki: '1989 (Taylor Swift album)' },
          { name: 'Reputation', wiki: 'Reputation (Taylor Swift album)' },
          { name: 'Lover', wiki: 'Lover (album)' },
          { name: 'Folklore', wiki: 'Folklore (Taylor Swift album)' },
          { name: 'Evermore', wiki: 'Evermore (Taylor Swift album)' },
          { name: 'Midnights', wiki: 'Midnights' },
          { name: 'The Tortured Poets Department', wiki: 'The Tortured Poets Department' }
        ]
      },
      {
        id: 'mu-beatles-albums',
        prompt: 'Name a Beatles studio album',
        context: 'Beatles album',
        answers: [
          { name: 'Please Please Me', wiki: 'Please Please Me' },
          { name: 'With the Beatles', wiki: 'With the Beatles' },
          { name: "A Hard Day's Night", wiki: "A Hard Day's Night (album)" },
          { name: 'Beatles for Sale', wiki: 'Beatles for Sale' },
          { name: 'Help!', wiki: 'Help! (album)' },
          { name: 'Rubber Soul', wiki: 'Rubber Soul' },
          { name: 'Revolver', wiki: 'Revolver (Beatles album)' },
          { name: "Sgt. Pepper's Lonely Hearts Club Band", wiki: "Sgt. Pepper's Lonely Hearts Club Band" },
          { name: 'The Beatles', wiki: 'The Beatles (album)', aliases: ['The White Album', 'White Album'] },
          { name: 'Yellow Submarine', wiki: 'Yellow Submarine (album)' },
          { name: 'Abbey Road', wiki: 'Abbey Road' },
          { name: 'Let It Be', wiki: 'Let It Be (album)' }
        ]
      },
      {
        id: 'mu-beatles-no1',
        prompt: 'Name a Beatles single that hit No. 1 in the US',
        context: 'Beatles song',
        answers: [
          { name: 'I Want to Hold Your Hand', wiki: 'I Want to Hold Your Hand' },
          { name: 'She Loves You', wiki: 'She Loves You' },
          { name: "Can't Buy Me Love", wiki: "Can't Buy Me Love" },
          { name: 'Love Me Do', wiki: 'Love Me Do' },
          { name: "A Hard Day's Night", wiki: "A Hard Day's Night (song)" },
          { name: 'I Feel Fine', wiki: 'I Feel Fine' },
          { name: 'Eight Days a Week', wiki: 'Eight Days a Week' },
          { name: 'Ticket to Ride', wiki: 'Ticket to Ride' },
          { name: 'Help!', wiki: 'Help! (song)' },
          { name: 'Yesterday', wiki: 'Yesterday (Beatles song)' },
          { name: 'We Can Work It Out', wiki: 'We Can Work It Out' },
          { name: 'Paperback Writer', wiki: 'Paperback Writer' },
          { name: 'Penny Lane', wiki: 'Penny Lane' },
          { name: 'All You Need Is Love', wiki: 'All You Need Is Love' },
          { name: 'Hello, Goodbye', wiki: 'Hello, Goodbye' },
          { name: 'Hey Jude', wiki: 'Hey Jude' },
          { name: 'Get Back', wiki: 'Get Back' },
          { name: 'Come Together', wiki: 'Come Together' },
          { name: 'Let It Be', wiki: 'Let It Be (song)' },
          { name: 'The Long and Winding Road', wiki: 'The Long and Winding Road' }
        ]
      },
      {
        id: 'mu-abbey-road',
        prompt: 'Name a song on Abbey Road',
        context: 'Beatles song',
        answers: [
          { name: 'Come Together', wiki: 'Come Together' },
          { name: 'Something', wiki: 'Something (Beatles song)' },
          { name: "Maxwell's Silver Hammer", wiki: "Maxwell's Silver Hammer" },
          { name: 'Oh! Darling', wiki: 'Oh! Darling' },
          { name: "Octopus's Garden", wiki: "Octopus's Garden" },
          { name: "I Want You (She's So Heavy)", wiki: "I Want You (She's So Heavy)" },
          { name: 'Here Comes the Sun', wiki: 'Here Comes the Sun' },
          { name: 'Because', wiki: 'Because (Beatles song)' },
          { name: 'You Never Give Me Your Money', wiki: 'You Never Give Me Your Money' },
          { name: 'Sun King', wiki: 'Sun King (song)' },
          { name: 'Mean Mr. Mustard', wiki: 'Mean Mr. Mustard' },
          { name: 'Polythene Pam', wiki: 'Polythene Pam' },
          { name: 'She Came in Through the Bathroom Window', wiki: 'She Came in Through the Bathroom Window' },
          { name: 'Golden Slumbers', wiki: 'Golden Slumbers' },
          { name: 'Carry That Weight', wiki: 'Carry That Weight' },
          { name: 'The End', wiki: 'The End (Beatles song)' },
          { name: 'Her Majesty', wiki: 'Her Majesty (song)' }
        ]
      },
      {
        id: 'mu-eurovision',
        prompt: 'Name a country that has won Eurovision since 2010',
        context: 'country',
        answers: [
          { name: 'Germany', wiki: 'Germany' },
          { name: 'Azerbaijan', wiki: 'Azerbaijan' },
          { name: 'Sweden', wiki: 'Sweden' },
          { name: 'Denmark', wiki: 'Denmark' },
          { name: 'Austria', wiki: 'Austria' },
          { name: 'Ukraine', wiki: 'Ukraine' },
          { name: 'Portugal', wiki: 'Portugal' },
          { name: 'Israel', wiki: 'Israel' },
          { name: 'Netherlands', wiki: 'Netherlands', aliases: ['Holland'] },
          { name: 'Italy', wiki: 'Italy' },
          { name: 'Switzerland', wiki: 'Switzerland' }
        ]
      }
    ]
  },

  {
    slug: 'nfl',
    name: 'NFL',
    kind: 'team',
    unit: 'teams',
    one: 'NFL team',
    placeholder: 'Type an NFL team…',
    tagline: 'Thirty-two teams, one obvious answer',
    blurb:
      'American football is still the biggest league in the US, and the Cowboys and Chiefs are the first names out of most mouths. That is exactly the problem.',
    prompts: [
      {
        id: 'nfl-all',
        prompt: 'Name an NFL team',
        context: 'NFL team',
        answers: [
          { name: 'Arizona Cardinals' }, { name: 'Atlanta Falcons' }, { name: 'Baltimore Ravens' }, { name: 'Buffalo Bills' },
          { name: 'Carolina Panthers' }, { name: 'Chicago Bears' }, { name: 'Cincinnati Bengals' }, { name: 'Cleveland Browns' },
          { name: 'Dallas Cowboys' }, { name: 'Denver Broncos' }, { name: 'Detroit Lions' }, { name: 'Green Bay Packers' },
          { name: 'Houston Texans' }, { name: 'Indianapolis Colts' }, { name: 'Jacksonville Jaguars' }, { name: 'Kansas City Chiefs' },
          { name: 'Las Vegas Raiders' }, { name: 'Los Angeles Chargers' }, { name: 'Los Angeles Rams' }, { name: 'Miami Dolphins' },
          { name: 'Minnesota Vikings' }, { name: 'New England Patriots' }, { name: 'New Orleans Saints' }, { name: 'New York Giants' },
          { name: 'New York Jets' }, { name: 'Philadelphia Eagles' }, { name: 'Pittsburgh Steelers' }, { name: 'San Francisco 49ers' },
          { name: 'Seattle Seahawks' }, { name: 'Tampa Bay Buccaneers' }, { name: 'Tennessee Titans' }, { name: 'Washington Commanders' }
        ]
      },
      {
        id: 'nfl-sb-winners',
        prompt: 'Name a team that has won the Super Bowl',
        context: 'NFL team',
        answers: [
          { name: 'Green Bay Packers' }, { name: 'New York Jets' }, { name: 'Kansas City Chiefs' }, { name: 'Indianapolis Colts' },
          { name: 'Dallas Cowboys' }, { name: 'Miami Dolphins' }, { name: 'Pittsburgh Steelers' }, { name: 'San Francisco 49ers' },
          { name: 'Washington Commanders' }, { name: 'Las Vegas Raiders' }, { name: 'Chicago Bears' }, { name: 'New York Giants' },
          { name: 'Baltimore Ravens' }, { name: 'Denver Broncos' }, { name: 'Los Angeles Rams' }, { name: 'Tampa Bay Buccaneers' },
          { name: 'New England Patriots' }, { name: 'New Orleans Saints' }, { name: 'Seattle Seahawks' }, { name: 'Philadelphia Eagles' }
        ]
      },
      {
        id: 'nfl-no-sb',
        prompt: 'Name an NFL team that has never won a Super Bowl',
        context: 'NFL team',
        answers: [
          { name: 'Arizona Cardinals' }, { name: 'Atlanta Falcons' }, { name: 'Carolina Panthers' }, { name: 'Cincinnati Bengals' },
          { name: 'Cleveland Browns' }, { name: 'Detroit Lions' }, { name: 'Houston Texans' }, { name: 'Jacksonville Jaguars' },
          { name: 'Los Angeles Chargers' }, { name: 'Minnesota Vikings' }, { name: 'Tennessee Titans' }, { name: 'Buffalo Bills' }
        ]
      },
      {
        id: 'nfl-nfc',
        prompt: 'Name an NFC team',
        context: 'NFL team',
        answers: [
          { name: 'Arizona Cardinals' }, { name: 'Atlanta Falcons' }, { name: 'Carolina Panthers' }, { name: 'Chicago Bears' },
          { name: 'Dallas Cowboys' }, { name: 'Detroit Lions' }, { name: 'Green Bay Packers' }, { name: 'Los Angeles Rams' },
          { name: 'Minnesota Vikings' }, { name: 'New Orleans Saints' }, { name: 'New York Giants' }, { name: 'Philadelphia Eagles' },
          { name: 'San Francisco 49ers' }, { name: 'Seattle Seahawks' }, { name: 'Tampa Bay Buccaneers' }, { name: 'Washington Commanders' }
        ]
      },
      {
        id: 'nfl-afc',
        prompt: 'Name an AFC team',
        context: 'NFL team',
        answers: [
          { name: 'Baltimore Ravens' }, { name: 'Buffalo Bills' }, { name: 'Cincinnati Bengals' }, { name: 'Cleveland Browns' },
          { name: 'Denver Broncos' }, { name: 'Houston Texans' }, { name: 'Indianapolis Colts' }, { name: 'Jacksonville Jaguars' },
          { name: 'Kansas City Chiefs' }, { name: 'Las Vegas Raiders' }, { name: 'Los Angeles Chargers' }, { name: 'Miami Dolphins' },
          { name: 'New England Patriots' }, { name: 'New York Jets' }, { name: 'Pittsburgh Steelers' }, { name: 'Tennessee Titans' }
        ]
      }
    ]
  },

  {
    slug: 'soccer',
    name: 'Football',
    kind: 'club',
    unit: 'clubs and countries',
    one: 'club or country',
    placeholder: 'Type a club or country…',
    tagline: 'The European game, minus the obvious picks',
    blurb:
      'Soccer is the sport young fans in the US and Europe are converging on. Real Madrid and Brazil are the reflex answers — the tower wants the rest.',
    prompts: [
      {
        id: 'sc-pl',
        prompt: 'Name a club that has won the Premier League',
        context: 'football club',
        answers: [
          { name: 'Manchester United' }, { name: 'Blackburn Rovers' }, { name: 'Arsenal' }, { name: 'Chelsea' },
          { name: 'Manchester City' }, { name: 'Leicester City' }, { name: 'Liverpool' }
        ]
      },
      {
        id: 'sc-worldcup',
        prompt: 'Name a country that has won the World Cup',
        context: 'national football team',
        answers: [
          { name: 'Brazil' }, { name: 'Germany' }, { name: 'Italy' }, { name: 'Argentina' },
          { name: 'France' }, { name: 'Uruguay' }, { name: 'England' }, { name: 'Spain' }
        ]
      },
      {
        id: 'sc-ucl',
        prompt: 'Name a club that has won the Champions League',
        context: 'football club',
        answers: [
          { name: 'Real Madrid' }, { name: 'AC Milan' }, { name: 'Bayern Munich' }, { name: 'Liverpool' },
          { name: 'Barcelona' }, { name: 'Ajax' }, { name: 'Manchester United' }, { name: 'Inter Milan' },
          { name: 'Juventus' }, { name: 'Benfica' }, { name: 'Nottingham Forest' }, { name: 'Porto' },
          { name: 'Celtic' }, { name: 'Hamburger SV' }, { name: 'Steaua București' }, { name: 'Marseille' },
          { name: 'Borussia Dortmund' }, { name: 'Chelsea' }, { name: 'Feyenoord' }, { name: 'Aston Villa' },
          { name: 'PSV Eindhoven' }, { name: 'Red Star Belgrade' }, { name: 'Manchester City' }
        ]
      },
      {
        id: 'sc-ballon',
        prompt: "Name a Ballon d'Or winner since 2000",
        context: 'footballer',
        answers: [
          { name: 'Luís Figo' }, { name: 'Michael Owen' }, { name: 'Ronaldo' }, { name: 'Pavel Nedvěd' },
          { name: 'Andriy Shevchenko' }, { name: 'Ronaldinho' }, { name: 'Fabio Cannavaro' }, { name: 'Kaká' },
          { name: 'Cristiano Ronaldo' }, { name: 'Lionel Messi' }, { name: 'Luka Modrić' }, { name: 'Karim Benzema' },
          { name: 'Rodri' }, { name: 'Ousmane Dembélé' }
        ]
      },
      {
        id: 'sc-euro',
        prompt: 'Name a country that has won the European Championship',
        context: 'national football team',
        answers: [
          { name: 'Germany' }, { name: 'Spain' }, { name: 'Italy' }, { name: 'France' },
          { name: 'Russia', aliases: ['Soviet Union', 'USSR'] }, { name: 'Czech Republic', aliases: ['Czechoslovakia'] },
          { name: 'Portugal' }, { name: 'Netherlands', aliases: ['Holland'] }, { name: 'Denmark' }, { name: 'Greece' }
        ]
      }
    ]
  },

  {
    slug: 'space',
    name: 'Space',
    kind: 'space',
    unit: 'answers',
    one: 'answer',
    placeholder: 'Type an answer…',
    tagline: 'Planets, moonshots, and the names in the sky',
    blurb:
      'Space is having another moment — Artemis, Mars rovers, private launches. The easy answers are the eight planets and the first Moon landing; the rest is where the climb starts.',
    prompts: [
      {
        id: 'sp-planets',
        prompt: 'Name a planet in the Solar System',
        context: 'planet',
        answers: [
          { name: 'Mercury' }, { name: 'Venus' }, { name: 'Earth' }, { name: 'Mars' },
          { name: 'Jupiter' }, { name: 'Saturn' }, { name: 'Uranus' }, { name: 'Neptune' }
        ]
      },
      {
        id: 'sp-moonwalkers',
        prompt: 'Name a person who has walked on the Moon',
        context: 'astronaut',
        answers: [
          { name: 'Neil Armstrong' }, { name: 'Buzz Aldrin' }, { name: 'Pete Conrad' }, { name: 'Alan Bean' },
          { name: 'Alan Shepard' }, { name: 'Edgar Mitchell' }, { name: 'David Scott' }, { name: 'James Irwin' },
          { name: 'John Young' }, { name: 'Charles Duke' }, { name: 'Eugene Cernan' }, { name: 'Harrison Schmitt' }
        ]
      },
      {
        id: 'sp-programs',
        prompt: 'Name a NASA crewed spaceflight program',
        context: 'NASA program',
        answers: [
          { name: 'Mercury', wiki: 'Project Mercury' },
          { name: 'Gemini', wiki: 'Project Gemini' },
          { name: 'Apollo', wiki: 'Apollo program' },
          { name: 'Skylab', wiki: 'Skylab' },
          { name: 'Space Shuttle', wiki: 'Space Shuttle program' },
          { name: 'Artemis', wiki: 'Artemis program' }
        ]
      },
      {
        id: 'sp-zodiac',
        prompt: 'Name a zodiac constellation',
        context: 'constellation',
        answers: [
          { name: 'Aries' }, { name: 'Taurus' }, { name: 'Gemini' }, { name: 'Cancer' },
          { name: 'Leo' }, { name: 'Virgo' }, { name: 'Libra' }, { name: 'Scorpius', aliases: ['Scorpio'] },
          { name: 'Sagittarius' }, { name: 'Capricornus', aliases: ['Capricorn'] }, { name: 'Aquarius' }, { name: 'Pisces' }
        ]
      },
      {
        id: 'sp-apollo',
        prompt: 'Name an Apollo mission that landed on the Moon',
        context: 'Apollo mission',
        answers: [
          { name: 'Apollo 11' }, { name: 'Apollo 12' }, { name: 'Apollo 14' },
          { name: 'Apollo 15' }, { name: 'Apollo 16' }, { name: 'Apollo 17' }
        ]
      },
      {
        id: 'sp-mars',
        prompt: 'Name a mission sent to Mars',
        context: 'Mars mission',
        answers: [
          { name: 'Viking 1' }, { name: 'Viking 2' }, { name: 'Mars Pathfinder' }, { name: 'Spirit' },
          { name: 'Opportunity' }, { name: 'Curiosity' }, { name: 'Perseverance' }, { name: 'InSight' },
          { name: 'Phoenix' }, { name: 'MAVEN' }, { name: '2001 Mars Odyssey' }, { name: 'Mars Reconnaissance Orbiter' },
          { name: 'Ingenuity' }
        ]
      }
    ]
  },

  {
    slug: 'history',
    name: 'History',
    kind: 'history',
    unit: 'answers',
    one: 'answer',
    placeholder: 'Type an answer…',
    tagline: 'Empires, presidents, and the seven wonders',
    blurb:
      'History is the category the Roman Empire meme never let die. The big names are obvious; the tower is decided by the second and third names you can dig out.',
    prompts: [
      {
        id: 'hi-presidents',
        prompt: 'Name a US president who served in the 20th century',
        context: 'President of the United States',
        answers: [
          { name: 'William McKinley' }, { name: 'Theodore Roosevelt' }, { name: 'William Howard Taft' }, { name: 'Woodrow Wilson' },
          { name: 'Warren G. Harding' }, { name: 'Calvin Coolidge' }, { name: 'Herbert Hoover' }, { name: 'Franklin D. Roosevelt' },
          { name: 'Harry S. Truman' }, { name: 'Dwight D. Eisenhower' }, { name: 'John F. Kennedy' }, { name: 'Lyndon B. Johnson' },
          { name: 'Richard Nixon' }, { name: 'Gerald Ford' }, { name: 'Jimmy Carter' }, { name: 'Ronald Reagan' },
          { name: 'George H. W. Bush' }, { name: 'Bill Clinton' }
        ]
      },
      {
        id: 'hi-wonders',
        prompt: 'Name a Wonder of the Ancient World',
        context: 'ancient wonder',
        answers: [
          { name: 'Great Pyramid of Giza' }, { name: 'Hanging Gardens of Babylon' }, { name: 'Statue of Zeus at Olympia' },
          { name: 'Temple of Artemis' }, { name: 'Mausoleum at Halicarnassus' }, { name: 'Colossus of Rhodes' },
          { name: 'Lighthouse of Alexandria' }
        ]
      },
      {
        id: 'hi-ussr',
        prompt: 'Name a republic of the Soviet Union',
        context: 'Soviet republic',
        answers: [
          { name: 'Russia', wiki: 'Russian Soviet Federative Socialist Republic', aliases: ['Russian SFSR'] },
          { name: 'Ukraine', wiki: 'Ukrainian Soviet Socialist Republic', aliases: ['Ukrainian SSR'] },
          { name: 'Belarus', wiki: 'Byelorussian Soviet Socialist Republic', aliases: ['Byelorussian SSR'] },
          { name: 'Uzbekistan', wiki: 'Uzbek Soviet Socialist Republic', aliases: ['Uzbek SSR'] },
          { name: 'Kazakhstan', wiki: 'Kazakh Soviet Socialist Republic', aliases: ['Kazakh SSR'] },
          { name: 'Georgia', wiki: 'Georgian Soviet Socialist Republic', aliases: ['Georgian SSR'] },
          { name: 'Azerbaijan', wiki: 'Azerbaijan Soviet Socialist Republic', aliases: ['Azerbaijan SSR'] },
          { name: 'Lithuania', wiki: 'Lithuanian Soviet Socialist Republic', aliases: ['Lithuanian SSR'] },
          { name: 'Moldova', wiki: 'Moldavian Soviet Socialist Republic', aliases: ['Moldavian SSR'] },
          { name: 'Latvia', wiki: 'Latvian Soviet Socialist Republic', aliases: ['Latvian SSR'] },
          { name: 'Kyrgyzstan', wiki: 'Kirghiz Soviet Socialist Republic', aliases: ['Kirghiz SSR'] },
          { name: 'Tajikistan', wiki: 'Tajik Soviet Socialist Republic', aliases: ['Tajik SSR'] },
          { name: 'Armenia', wiki: 'Armenian Soviet Socialist Republic', aliases: ['Armenian SSR'] },
          { name: 'Turkmenistan', wiki: 'Turkmen Soviet Socialist Republic', aliases: ['Turkmen SSR'] },
          { name: 'Estonia', wiki: 'Estonian Soviet Socialist Republic', aliases: ['Estonian SSR'] }
        ]
      },
      {
        id: 'hi-emperors',
        prompt: 'Name one of the first twelve Roman emperors',
        context: 'Roman emperor',
        answers: [
          { name: 'Augustus' }, { name: 'Tiberius' }, { name: 'Caligula' }, { name: 'Claudius' },
          { name: 'Nero' }, { name: 'Galba' }, { name: 'Otho' }, { name: 'Vitellius' },
          { name: 'Vespasian' }, { name: 'Titus' }, { name: 'Domitian' }, { name: 'Nerva' }
        ]
      },
      {
        id: 'hi-states',
        prompt: 'Name a US state that joined the Union before 1800',
        context: 'US state',
        answers: [
          { name: 'Delaware' }, { name: 'Pennsylvania' }, { name: 'New Jersey' }, { name: 'Georgia' },
          { name: 'Connecticut' }, { name: 'Massachusetts' }, { name: 'Maryland' }, { name: 'South Carolina' },
          { name: 'New Hampshire' }, { name: 'Virginia' }, { name: 'New York' }, { name: 'North Carolina' },
          { name: 'Rhode Island' }, { name: 'Vermont' }, { name: 'Kentucky' }, { name: 'Tennessee' }
        ]
      }
    ]
  }
];
