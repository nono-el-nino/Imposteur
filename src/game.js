export const themes = [
  {
    id: "internet",
    icon: "↗",
    name: "Internet français",
    tag: "LES RÉFÉRENCES QU’ON PARTAGE",
    description: "Réseaux, vidéos et galères connectées.",
    pairs: [
      ["Vu", "Message supprimé"],
      ["Story Instagram", "Snapchat"],
      ["Like", "Commentaire"],
      ["Filtre beauté", "Mode portrait"],
      ["Vocal interminable", "Pavé de texto"],
      ["Squeezie", "Inoxtag"],
      ["Twitch", "YouTube"],
      ["TikTok", "Snapchat"],
      ["Groupe familial", "Groupe de potes"],
      ["Mot de passe", "Code Wi-Fi"],
      ["Vidéo de chat", "Vidéo de bébé"],
      ["Tuto maquillage", "Tuto cuisine"],
      ["Colis surprise", "Cadeau surprise"],
      ["Influenceur", "YouTubeur"],
      ["Selfie", "Photo de groupe"],
      ["Abonné", "Fan"],
      ["Mème", "GIF"],
      ["Pub YouTube", "Placement de produit"],
      ["Compte privé", "Compte anonyme"],
      ["Danse TikTok", "Karaoké"],
      ["Photo de profil", "Photo d’identité"],
      ["Batterie à 1 %", "Wi-Fi sans Internet"],
      ["Autocorrecteur", "Traduction automatique"],
      ["Capture d’écran", "Enregistrement d’écran"],
    ],
  },
  {
    id: "pop",
    icon: "✦",
    name: "Pop culture",
    tag: "ÇA, T’AS LA RÉF",
    description: "Écrans, sons & personnages cultes.",
    pairs: [
      ["Jul", "SCH"],
      ["Aya Nakamura", "Shay"],
      ["Nekfeu", "Orelsan"],
      ["PNL", "Djadja & Dinaz"],
      ["Star Academy", "The Voice"],
      ["Koh-Lanta", "Les Traîtres"],
      ["Kaamelott", "Astérix"],
      ["Shrek", "Monstres & Cie"],
      ["Harry Potter", "Percy Jackson"],
      ["One Piece", "Naruto"],
      ["Pokémon", "Digimon"],
      ["Mario Kart", "Crash Team Racing"],
      ["Fortnite", "Apex Legends"],
      ["Minecraft", "Terraria"],
      ["Les Sims", "Animal Crossing"],
      ["GTA", "Saints Row"],
      ["Dune", "Star Wars"],
      ["Barbie", "Legally Blonde"],
      ["Netflix", "Prime Video"],
      ["Spotify", "Deezer"],
      ["Boiler Room", "Festival"],
      ["Autotune", "Playback"],
      ["Remix", "Reprise"],
      ["Marvel", "DC"],
    ],
  },
  {
    id: "france",
    icon: "♡",
    name: "La vie en France",
    tag: "LE QUOTIDIEN, MAIS SUSPECT",
    description: "Les vrais débats de fin de soirée.",
    pairs: [
      ["Tacos", "Kebab"],
      ["Pain au chocolat", "Croissant"],
      ["Raclette", "Fondue"],
      ["FlixBus", "BlaBlaCar"],
      ["RER", "Métro"],
      ["TER", "TGV"],
      ["Lidl", "Aldi"],
      ["Vinted", "Leboncoin"],
      ["Lydia", "PayPal"],
      ["Apéro", "After"],
      ["Terrasse", "Rooftop"],
      ["BDE", "Coloc"],
      ["Partiels", "Bac"],
      ["Alternance", "Stage"],
      ["Ticket resto", "Chèque cadeau"],
      ["Air fryer", "Four"],
      ["Matcha", "Chai latte"],
      ["Bubble tea", "Milkshake"],
      ["Uber Eats", "Deliveroo"],
      ["Pétanque", "Mölkky"],
      ["Camping", "Festival"],
      ["Boulangerie", "Pâtisserie"],
      ["Gueule de bois", "Nuit blanche"],
      ["Vu à 2 h", "Appel à 3 h"],
    ],
  },
  {
    id: "classiques",
    icon: "◎",
    name: "Les valeurs sûres",
    tag: "TOUT LE MONDE A LA RÉF",
    description: "Facile à jouer. Difficile à bluffer.",
    pairs: [
      ["Plage", "Piscine"],
      ["Café", "Thé"],
      ["Pizza", "Quiche"],
      ["Chat", "Chien"],
      ["Train", "Avion"],
      ["Neige", "Glace"],
      ["Hôtel", "Airbnb"],
      ["Cinéma", "Théâtre"],
      ["Soleil", "Lune"],
      ["Savon", "Shampoing"],
      ["Crêpe", "Gaufre"],
      ["Miel", "Confiture"],
      ["Vélo", "Trottinette"],
      ["Montagne", "Forêt"],
      ["Sushi", "Poke bowl"],
      ["Tennis", "Padel"],
      ["Chocolat", "Caramel"],
      ["Lunettes", "Lentilles"],
      ["Fantôme", "Vampire"],
      ["Parfum", "Déodorant"],
      ["Oreiller", "Coussin"],
      ["Bateau", "Sous-marin"],
      ["Sac à dos", "Valise"],
      ["Bibliothèque", "Librairie"],
    ],
  },
];
export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    const j = b[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function validate(s) {
  if (s.names.length < 3 || s.names.length > 20)
    return "Il faut entre 3 et 20 joueurs.";
  if (s.names.some((n) => !n.trim()))
    return "Chaque joueur doit avoir un prénom.";
  if (
    new Set(s.names.map((n) => n.trim().toLocaleLowerCase("fr"))).size !==
    s.names.length
  )
    return "Choisissez des prénoms différents.";
  if (s.impostors + s.whites < 1)
    return "Ajoutez au moins un imposteur ou un Mr White.";
  if (s.impostors + s.whites >= s.names.length / 2)
    return "Les civils doivent être majoritaires au départ.";
  if (!s.themeIds.length) return "Choisissez au moins un thème.";
  return "";
}
export function createGame(s, used = []) {
  const error = validate(s);
  if (error) throw Error(error);
  let pool = themes
    .filter((t) => s.themeIds.includes(t.id))
    .flatMap((t) =>
      t.pairs.map((pair, i) => ({ pair, id: `${t.id}-${i}`, theme: t.name })),
    );
  let fresh = pool.filter((p) => !used.includes(p.id));
  if (!fresh.length) fresh = pool;
  const chosen = shuffle(fresh)[0];
  const words = shuffle(chosen.pair);
  const roles = shuffle([
    ...Array(s.impostors).fill("impostor"),
    ...Array(s.whites).fill("white"),
    ...Array(s.names.length - s.impostors - s.whites).fill("civil"),
  ]);
  const players = s.names.map((name, i) => ({
    id: i,
    name: name.trim(),
    role: roles[i],
    alive: true,
    word: roles[i] === "white" ? null : words[roles[i] === "civil" ? 0 : 1],
  }));
  return {
    players,
    words,
    pairId: chosen.id,
    theme: chosen.theme,
    round: 1,
    order: shuffle(players.filter((p) => p.role !== "white").map((p) => p.id)),
    winner: null,
  };
}
export function winner(players) {
  const alive = players.filter((p) => p.alive),
    bad = alive.filter((p) => p.role !== "civil").length;
  if (!bad) return "civil";
  if (bad >= alive.length - bad) return "impostor";
  return null;
}
export function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]/g, "");
}
export function guessCorrect(guess, word) {
  return normalize(guess).length > 0 && normalize(guess) === normalize(word);
}
