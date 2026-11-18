// Nira Ora – contenu pédagogique (français). Sans marque commerciale.
// Sources : Manuel MSD (points simples, matelassier), StatPearls (aiguilles), WikEM / RACGP (prises, délais),
// HAS (antiseptiques peau lésée / saine, pansements 2010), CESU 21 / MSF / Univ. Nantes (brûlures),
// Guide des protocoles DSP Polynésie française 2025 (plaies, morsures, tétanos, poisson-pierre).
// Les seuils de score sont des réglages de jeu, à faire valider par un formateur.

export const LEVELS = {
  deb:  { name: 'Débutant',      tol: 1.6, guides: 2, bleed: 0, move: 0, timer: 0, tear: false, shuffle: false, hints: true },
  int:  { name: 'Intermédiaire', tol: 1.0, guides: 1, bleed: 1, move: 1, timer: 1, tear: false, shuffle: true,  hints: true, compress: 3 },
  avc:  { name: 'Avancé',        tol: 0.6, guides: 0, bleed: 2, move: 2, timer: 1, tear: true,  shuffle: true,  hints: false, compress: 6 },
  exam: { name: 'Examen',        tol: 0.6, guides: 0, bleed: -1, move: 2, timer: 2, tear: true, shuffle: true,  hints: false, compress: 6, silent: true },
};

export const NEEDLES = {
  A: { name: '3/8 tranchante inversée 16 mm', short: '3/8 TI 16', use: 'Peau des membres et du tronc : le choix de base.' },
  B: { name: '3/8 tranchante inversée 11 mm', short: '3/8 TI 11', use: 'Petite aiguille de précision : visage, main.' },
  C: { name: '1/2 cercle ronde 26 mm', short: '1/2 ronde', use: 'Pointe conique : tissus mous profonds (muscle, périnée). Pénètre mal la peau.' },
  D: { name: '3/8 tranchante conventionnelle 19 mm', short: '3/8 TC 19', use: 'Tranchant vers la plaie : risque de couper la berge (« cut-through »).' },
  E: { name: 'Droite tranchante 30 mm', short: 'Droite', use: 'Tenue à la main, peu précise, réservée aux zones planes et accessibles.' },
};
export const FILS = { '3-0': 0.024, '4-0': 0.019, '5-0': 0.015, '6-0': 0.012 };
export const POINTS = { simple: 'Point simple', donati: 'Point de Donati', horiz: 'Matelassier horizontal', x: 'Point en X', surjet: 'Surjet simple', intra: 'Surjet intradermique', buried: 'Point profond enfoui', hemo: 'Point hémostatique en X' };
export const POINT_INFO = {
  simple: '1 passage. Le point de base : chaque point est indépendant.',
  donati: '2 passages sur la même ligne : loin-loin (4–8 mm), puis retour près-près (1–2 mm). Éverse et tient une tension modérée.',
  horiz: '2 passages parallèles : aller, puis retour 4–8 mm plus loin. Répartit la tension, utile si la peau est fine.',
  x: '2 passages partant du même côté, décalés : le fil fait un X dessus. Hémostatique (cuir chevelu, plaie qui saigne).',
  surjet: 'Passages en série, tous du même côté, fil en diagonale ; un nœud au début et à la fin. Rapide, étanche.',
  intra: 'Passages dans le derme, alternés de chaque côté, parallèles à la plaie : fil invisible, très esthétique (visage).',
  hemo: 'Dans la plaie, sur un petit vaisseau qui saigne : 2 passages profonds de part et d\'autre du vaisseau, en croix, fil résorbable. En serrant, le X écrase le vaisseau et le saignement s\'arrête. Gros vaisseau ou saignement en jet : comprimer et chirurgien.',
  buried: 'Plan profond, fil résorbable : on pique DANS la plaie, dans la paroi sous le derme, on passe en profondeur et on ressort dans la paroi d\'en face à la même hauteur. Le nœud est serré au fond et coupé ras. Ferme l\'espace mort et enlève la tension à la peau.',
};
export const CLOSE = {
  nonres: { name: 'Fil non résorbable', kind: 'fil', note: 'Nylon ou polypropylène monofilament : peau. À retirer.' },
  res:    { name: 'Fil résorbable rapide', kind: 'fil', note: 'Se résorbe seul : visage, enfant, muqueuse. Les fils résorbables lents servent aux plans profonds.' },
  agrafe: { name: 'Agrafes', kind: 'staple', note: 'Rapides : cuir chevelu, tronc, membres. Jamais au visage. Retrait à la pince ôte-agrafes.' },
  colle:  { name: 'Colle cutanée', kind: 'glue', note: 'Plaie courte, nette, peu de tension, berges bien rapprochées. Pas sur une articulation ni une muqueuse.' },
  strip:  { name: 'Strips adhésifs', kind: 'strip', note: 'Plaie superficielle sans tension, ou en complément. Peau sèche indispensable.' },
};

export const SUTURE = {
  lin: {
    name: 'Coupure nette', zone: 'Avant-bras', icon: '🔪',
    desc: 'Coupure par couteau de cuisine il y a 2 h. Bords nets, pas de perte de substance, mobilité et sensibilité des doigts normales.',
    bite: [0.3, 0.5], spacing: [0.5, 1.0], fil: { '4-0': 100, '5-0': 80, '3-0': 60, '6-0': 35 },
    needle: { A: 100, B: 75, D: 60, E: 40, C: 20 }, point: { simple: 100, surjet: 90, intra: 90, x: 70, donati: 70, horiz: 60 }, tension: false,
    close: { nonres: 100, agrafe: 75, res: 65, strip: 55, colle: 50 },
    abl: ['10 jours', ['3 à 5 jours', '10 jours', '21 jours']],
  },
  curve: {
    name: 'Plaie courbe', zone: 'Genou', icon: '🦵',
    desc: 'Chute sur un rebord de trottoir. Plaie en arc, propre après lavage. Sur une articulation : la peau bouge beaucoup.',
    bite: [0.3, 0.5], spacing: [0.5, 1.0], fil: { '4-0': 100, '3-0': 80, '5-0': 70, '6-0': 30 },
    needle: { A: 100, B: 70, D: 60, E: 35, C: 20 }, point: { simple: 100, x: 85, donati: 80, horiz: 75, surjet: 70, intra: 45 }, tension: false,
    close: { nonres: 100, agrafe: 65, res: 55, strip: 20, colle: 15 },
    abl: ['14 jours (articulation)', ['5 jours', '14 jours (articulation)', '1 mois']],
  },
  face: {
    name: 'Petite plaie du front', zone: 'Visage', icon: '🙂',
    desc: "Choc contre une porte. Plaie fine de 2,5 cm sur le front. Zone esthétique : petites prises, fil très fin.",
    bite: [0.1, 0.22], spacing: [0.3, 0.5], fil: { '6-0': 100, '5-0': 85, '4-0': 40, '3-0': 10 },
    needle: { B: 100, A: 55, D: 45, E: 15, C: 10 }, point: { intra: 100, simple: 95, surjet: 70, donati: 50, x: 40, horiz: 40 }, tension: false,
    close: { colle: 100, nonres: 95, res: 85, strip: 80, agrafe: 0 },
    abl: ['5 jours', ['5 jours', '10 jours', '14 jours']],
  },
  gap: {
    name: 'Plaie béante sous tension', zone: 'Cuisse', icon: '⚠️',
    desc: 'Plaie par tôle il y a 3 h. Les berges s\'écartent de 6 mm : tension modérée. Il faut un point qui répartit la tension (au-delà, des points profonds par un chirurgien).',
    bite: [0.5, 0.8], spacing: [0.8, 1.2], fil: { '3-0': 100, '4-0': 80, '5-0': 30, '6-0': 10 },
    needle: { A: 100, D: 65, B: 40, E: 35, C: 20 }, point: { donati: 100, horiz: 95, x: 60, surjet: 40, simple: 35, intra: 10 }, tension: true,
    close: { nonres: 100, agrafe: 55, res: 35, strip: 5, colle: 0 },
    abl: ['10 à 14 jours', ['5 jours', '10 à 14 jours', '30 jours']],
  },
  scalp: {
    name: 'Plaie du cuir chevelu', zone: 'Tête', icon: '💇', pad: 'lin',
    desc: 'Chute dans l\'escalier. Plaie linéaire du cuir chevelu de 4,5 cm, saigne beaucoup (zone très vascularisée). Ne pas raser : écarter les cheveux.',
    bite: [0.3, 0.5], spacing: [0.5, 1.0], fil: { '3-0': 100, '4-0': 90, '5-0': 40, '6-0': 10 },
    needle: { A: 100, D: 70, B: 55, E: 40, C: 20 }, point: { simple: 100, surjet: 95, x: 85, donati: 70, horiz: 70, intra: 20 }, tension: false,
    close: { agrafe: 100, nonres: 90, res: 55, colle: 25, strip: 0 },
    abl: ['7 à 10 jours', ['2 jours', '7 à 10 jours', '1 mois']],
  },
  deep: {
    name: 'Plaie profonde', zone: 'Mollet', icon: '🕳️', deep: true,
    desc: 'Coupure par une tôle il y a 2 h. Plaie de 5 cm, profonde : la graisse est ouverte jusqu\'à l\'aponévrose (nappe blanche), qui est intacte. Pas de tendon ni de nerf atteint. On ferme plan par plan : d\'abord le plan profond, puis la peau.',
    bite: [0.4, 0.7], spacing: [0.6, 1.0], fil: { '4-0': 100, '3-0': 90, '5-0': 50, '6-0': 10 },
    needle: { A: 100, D: 70, C: 60, B: 40, E: 20 }, point: { simple: 100, horiz: 80, donati: 80, surjet: 60, x: 50, intra: 40 }, tension: false,
    close: { nonres: 100, agrafe: 70, res: 50, strip: 0, colle: 0 },
    abl: ['10 jours', ['3 jours', '10 jours', '1 mois']],
  },
  vaisseau: {
    name: 'Plaie profonde qui saigne', zone: 'Avant-bras', icon: '🩸', pad: 'deep', deep: true, vessel: 0.42,
    desc: 'Geste médical, à découvrir en démonstration. Coupure par une vitre il y a 30 min. Plaie profonde de 5 cm. Malgré la compression, du sang continue de sourdre du fond : un petit vaisseau saigne. Pas de jet, pas de pâleur, mobilité et sensibilité normales.',
    bite: [0.4, 0.7], spacing: [0.6, 1.0], fil: { '4-0': 100, '3-0': 90, '5-0': 50, '6-0': 10 },
    needle: { A: 100, D: 70, C: 60, B: 40, E: 20 }, point: { simple: 100, horiz: 80, donati: 80, surjet: 60, x: 50, intra: 40 }, tension: false,
    close: { nonres: 100, agrafe: 70, res: 50, strip: 0, colle: 0 },
    abl: ['10 jours', ['3 jours', '10 jours', '1 mois']],
  },
};
export const SUTURE_ORDER = ['lin', 'curve', 'scalp', 'face', 'gap', 'deep', 'vaisseau'];

export const PRODUCTS = {
  eau:          { name: 'Eau et savon doux', tint: null, wet: 1, note: 'Lavage : rincer et sécher ensuite.' },
  serum:        { name: 'Sérum physiologique 0,9 %', tint: null, wet: 1, note: 'Nettoyage de référence, non cytotoxique.' },
  chlorhex_aq:  { name: 'Chlorhexidine aqueuse', tint: [0.75, 0.55, 0.55], wet: 1, note: 'Antiseptique pour peau lésée et brûlures.' },
  povidone_aq:  { name: 'Povidone iodée dermique (aqueuse)', tint: [0.55, 0.25, 0.08], wet: 1, note: 'Peau lésée. Attention allergie à l\'iode, femme enceinte, nourrisson, usage prolongé.' },
  chlore:       { name: 'Soluté d\'hypochlorite de sodium (dérivé chloré)', tint: null, wet: 1, note: 'Peau lésée, brûlures, plaies souillées.' },
  chlorhex_alc: { name: 'Chlorhexidine alcoolique', tint: [0.8, 0.5, 0.55], wet: 0.5, note: 'Peau SAINE seulement (pas dans une plaie).' },
  povidone_alc: { name: 'Povidone iodée alcoolique', tint: [0.55, 0.25, 0.08], wet: 0.5, note: 'Peau SAINE (champ opératoire), pas dans une plaie.' },
  alcool:       { name: 'Alcool à 70°', tint: null, wet: 0.3, note: 'Peau saine seulement : douloureux et toxique pour la plaie.' },
  h2o2:         { name: 'Eau oxygénée', tint: null, wet: 1, note: 'N\'est pas recommandée pour désinfecter une plaie (abîme les tissus).' },
};
const ALC = ['chlorhex_alc', 'povidone_alc', 'alcool'];

export const DRESSINGS = {
  compresse: { name: 'Compresses stériles + sparadrap', model: 'dr_compresse', note: 'Simple, mais adhère si la plaie suinte.' },
  ilot:      { name: 'Pansement adhésif stérile à compresse (îlot)', model: 'dr_ilot', note: 'Plaie suturée sèche : le pansement de référence.' },
  film:      { name: 'Film transparent', model: 'dr_film', note: 'Protège et laisse voir la plaie ; n\'absorbe pas.' },
  hydro:     { name: 'Hydrocolloïde', model: 'dr_hydro', note: 'Occlusif, plaies peu exsudatives. Jamais sur une plaie infectée.' },
  alginate:  { name: 'Alginate (algues)', model: 'dr_alginate', note: 'Très absorbant, hémostatique : plaies exsudatives, détersion.' },
  mousse:    { name: 'Hydrocellulaire (mousse)', model: 'dr_mousse', note: 'Absorbant : plaies exsudatives en bourgeonnement.' },
  interface: { name: 'Interface siliconée', model: 'dr_interface', note: 'Non adhérente : bourgeonnement, brûlures superficielles. Recouvrir de compresses.' },
  tulle: { name: 'Tulle gras (paraffine)', model: 'dr_interface', tint: 0xe8d58a, note: 'Très gras, peu adhérent : brûlures, plaies superficielles, bourgeonnement. Se découpe ; toujours recouvert de compresses.' },
  sulfadiazine: { name: 'Crème à la sulfadiazine argentique', model: 'cream', tint: 0xf4f2ec, note: 'Antiseptique à l\'argent : prévention et traitement de l\'infection des brûlures, sur prescription. Couche régulière sur toute la brûlure, puis tulle et compresses, chaque jour.' },
  creme_cic: { name: 'Crème cicatrisante', model: 'cream', tint: 0xf3e6c8, note: 'Petite plaie superficielle propre (écorchure, cicatrice fermée) : couche fine. Pas sur une plaie infectée, profonde ou qui suinte.' },
  creme_as: { name: 'Crème cicatrisante antiseptique', model: 'cream', tint: 0xf0dfe6, note: 'Petite plaie superficielle à risque de souillure : couche fine après le lavage, qu\'elle ne remplace pas. Pas sur une plaie profonde ou très suintante.' },
  hydrogel:  { name: 'Hydrogel (+ film)', model: 'dr_hydrogel', note: 'Hydrate : nécrose sèche, fibrine sèche.' },
  argent:    { name: 'Hydrofibre à l\'argent', model: 'dr_argent', note: 'Absorbant + antibactérien : plaie infectée ou très suintante.' },
  champ:     { name: 'Champ stérile propre', model: 'champ', note: 'Couvrir une brûlure grave en attendant l\'évacuation.' },
  tpn:       { name: 'Pansement aspiratif (pression négative)', model: 'tpn', note: 'Mousse + film + tubulure + pompe : plaie profonde qui suinte, sur prescription.' },
};
export const SUTURE_DRESS = { best: ['ilot'], ok: ['compresse', 'film'], fair: ['hydro'], why: 'Une plaie suturée propre et sèche se couvre d\'un pansement sec stérile (îlot), changé et surveillé à J2. Alginate et mousse servent aux plaies qui suintent.' };

// Protocole de préparation avant suture
export function suturePrep(bleeding, level) {
  const it = [{ id: 'consent', label: 'Expliquer le soin, recueillir l\'accord de la personne', kind: 'plain', msg: 'La personne sait ce qu\'on va faire et elle est d\'accord : c\'est obligatoire avant le geste.' },
    { id: 'tetanos', label: 'Demander la vaccination antitétanique', kind: 'plain', msg: 'Rappel à jour ? Si non à jour ou inconnu : vaccin ± immunoglobulines selon la plaie, sur avis médical.' },
    { id: 'inst', label: 'Installer : personne allongée, plaie bien éclairée, à hauteur des coudes', kind: 'plain', msg: 'La personne allongée, vous assis, la plaie éclairée, le matériel à portée de main : on est précis et on ne se fatigue pas.' },
    { id: 'hands', label: 'Hygiène des mains, masque, gants stériles (asepsie)', kind: 'plain', msg: 'Masque, friction hydro-alcoolique puis gants stériles : on ne touche plus rien de non stérile.' }];
  if (bleeding) it.push({ id: 'compress', label: 'Comprimer pour arrêter le saignement', kind: 'hold' });
  it.push({ id: 'explore', label: 'Examiner : sensibilité, mobilité, tendons, corps étranger', kind: 'look', msg: 'Pas de tendon ni de nerf atteint, pas de corps étranger. Suture possible.' });
  it.push({ id: 'skin', label: 'Antiseptique sur la peau autour de la plaie, avant de piquer', kind: 'plain', msg: 'On ne pique jamais à travers une peau non désinfectée.' });
  it.push({ id: 'anesth', label: 'Anesthésie locale', kind: 'anesth' });
  it.push({ id: 'wash', label: 'Laver et irriguer au sérum physiologique', kind: 'wash' });
  it.push({ id: 'antis', label: 'Antiseptique adapté à la peau lésée', kind: 'product', ok: ['povidone_aq', 'chlorhex_aq', 'chlore'], fair: ['serum', 'eau'] });
  it.push({ id: 'dry', label: 'Laisser sécher l\'antiseptique (temps de contact)', kind: 'hold', dur: 3, msg: 'Antiseptique sec : il a eu le temps d\'agir.' });
  it.push({ id: 'champ', label: 'Poser un champ stérile troué', kind: 'plain', msg: 'Champ stérile en place : zone propre de travail.' });
  const bad = level !== 'deb' ? [
    { id: 'x_alc', label: 'Verser de l\'alcool à 70° dans la plaie', bad: 'L\'alcool est réservé à la peau saine : douloureux et toxique pour les tissus.', critical: true },
    { id: 'x_noexp', label: 'Suturer tout de suite, sans examiner', bad: 'Jamais de suture sans bilan : un tendon ou un corps étranger peut être caché.', critical: true },
    { id: 'x_mix', label: 'Mélanger deux antiseptiques pour plus d\'efficacité', bad: 'On ne mélange pas les antiseptiques : ils s\'inactivent. Une seule gamme.' },
  ] : [];
  return { items: it, bad };
}

// ---------------------------------------------------------------- SOINS DE PLAIES
export const CARE = {
  corail: {
    name: 'Plaie de corail', zone: 'Pied', icon: '🐚', model: 'care_corail',
    desc: 'Éraflures en marchant sur le récif il y a 3 h. Plaies superficielles souillées, petits débris de corail incrustés, rougeur autour.',
    assess: ['Comment décrire cette plaie ?', ['Plaie souillée avec corps étrangers : risque d\'infection élevé', 'Plaie propre, rien à faire', 'Brûlure du 2e degré'], 0],
    steps: [
      { id: 'lav', label: 'Laver abondamment à l\'eau et au savon', kind: 'wash' },
      { id: 'deb', label: 'Retirer tous les débris (pince, brossage doux)', kind: 'action', action: 'debris' },
      { id: 'rin', label: 'Rincer au sérum physiologique', kind: 'wash' },
      { id: 'ant', label: 'Antiseptique pour peau lésée', kind: 'product', ok: ['chlore', 'povidone_aq', 'chlorhex_aq'], fair: ['serum', 'eau'] },
      { id: 'pan', label: 'Pansement non occlusif, revoir chaque jour', kind: 'plain' },
      { id: 'tet', label: 'Vérifier le vaccin antitétanique (plaie souillée = risque important)', kind: 'plain', msg: 'Rappel non à jour selon le calendrier vaccinal (25, 45, 65 ans puis tous les 10 ans) : plaie souillée → vaccin + immunoglobulines humaines 250 UI, sur prescription.' },
    ],
    bad: [
      { id: 'x_sut', label: 'Suturer pour fermer vite', bad: 'Plaie souillée : pas de suture immédiate (suture différée sur avis médical).', critical: true },
      { id: 'x_nage', label: 'Retourner nager tout de suite', bad: 'L\'eau de mer et le lagon contaminent la plaie : attendre la cicatrisation.' },
    ],
    dress: { best: ['compresse', 'interface', 'tulle'], ok: ['ilot', 'creme_as'], fair: ['argent', 'creme_cic'], why: 'Plaie souillée : pansement simple non occlusif, refait chaque jour pour surveiller l\'infection. Pas d\'occlusif (hydrocolloïde, film).' },
    orient: ['Le lendemain, la rougeur s\'étend et il a de la fièvre. Que faire ?', ['Consulter : infection possible, antibiotique sur prescription', 'Mettre du citron dessus', 'Attendre une semaine'], 0],
  },
  morsure: {
    name: 'Morsure de chien', zone: 'Avant-bras', icon: '🐕', model: 'care_morsure',
    desc: 'Mordu par un chien du quartier il y a 1 h. Deux arcs de trous (les crocs), une petite déchirure, un bleu autour. Doigts mobiles, sensibilité normale.',
    assess: ['Comment décrire cette plaie ?', ['Plaie par morsure : contaminée, à haut risque d\'infection (pasteurellose)', 'Simple égratignure propre', 'Brûlure du 2e degré'], 0],
    steps: [
      { id: 'lav', label: 'Laver longuement à l\'eau et au savon (jusqu\'à 15 min)', kind: 'wash' },
      { id: 'rin', label: 'Irriguer chaque trou au sérum physiologique', kind: 'wash' },
      { id: 'ant', label: 'Antiseptique pour peau lésée', kind: 'product', ok: ['chlore', 'povidone_aq', 'chlorhex_aq'], fair: ['serum', 'eau'] },
      { id: 'med', label: 'Faire examiner par un médecin : profondeur, tendons, articulation', kind: 'plain', msg: 'Toute morsure de chien doit être vue par un médecin.' },
      { id: 'atb', label: 'Antibiotique sur prescription (amoxicilline-acide clavulanique)', kind: 'plain', msg: 'Plaie profonde par crocs : antibiotique de référence contre la pasteurelle, sur prescription.' },
      { id: 'tet', label: 'Vérifier le vaccin antitétanique', kind: 'plain', msg: 'Rappel à jour : rien à faire. Sinon vaccin ± immunoglobulines, sur avis médical.' },
      { id: 'pan', label: 'Pansement simple non occlusif, revoir le lendemain', kind: 'plain' },
    ],
    bad: [
      { id: 'x_sut', label: 'Suturer serré tout de suite pour fermer les trous', bad: 'Morsure = plaie contaminée : on ne ferme pas les trous des crocs. La suture se discute au cas par cas (surtout au visage), par le médecin.', critical: true },
      { id: 'x_rage', label: 'Lancer d\'office la vaccination contre la rage', bad: 'La Polynésie française est indemne de rage : pas de vaccin systématique. Avis médical seulement si morsure à l\'étranger ou animal importé.' },
      { id: 'x_occ', label: 'Mettre un pansement occlusif (hydrocolloïde)', bad: 'Jamais d\'occlusif sur une plaie contaminée : il enferme les germes.' },
    ],
    dress: { best: ['compresse', 'interface', 'tulle'], ok: ['ilot'], fair: ['argent', 'creme_as'], why: 'Morsure : pansement simple non occlusif, refait chaque jour pour surveiller l\'infection. Pas de film ni d\'hydrocolloïde.' },
    orient: ['Le lendemain, l\'avant-bras est gonflé, rouge, très douloureux. Que faire ?', ['Consulter vite : infection (pasteurellose) possible', 'Mettre de la glace et attendre', 'Fermer la plaie avec des strips'], 0],
  },
  route: {
    name: 'Dermabrasion de chute en scooter', zone: 'Genou', icon: '🛵', model: 'care_route',
    desc: 'Chute en scooter il y a 2 h, glissade sur le bitume. Peau arrachée sur une large zone, gravillons et grains noirs incrustés. Pas d\'autre blessure, casque porté.',
    assess: ['Comment décrire cette plaie ?', ['Dermabrasion souillée avec corps étrangers incrustés', 'Brûlure thermique du 3e degré', 'Plaie propre, rien à faire'], 0],
    steps: [
      { id: 'lav', label: 'Laver abondamment à l\'eau et au savon', kind: 'wash' },
      { id: 'deb', label: 'Retirer tous les gravillons (pince, brossage doux, anesthésie si besoin)', kind: 'action', action: 'debris' },
      { id: 'rin', label: 'Rincer au sérum physiologique', kind: 'wash' },
      { id: 'ant', label: 'Antiseptique pour peau lésée', kind: 'product', ok: ['chlore', 'povidone_aq', 'chlorhex_aq'], fair: ['serum', 'eau'] },
      { id: 'tet', label: 'Vérifier le vaccin antitétanique (plaie souillée de terre)', kind: 'plain', msg: 'Plaie souillée : rappel à jour exigé, sinon vaccin ± immunoglobulines sur avis médical.' },
      { id: 'pan', label: 'Interface grasse + compresses, refaire tous les 1 à 2 jours', kind: 'plain' },
    ],
    bad: [
      { id: 'x_lais', label: 'Laisser les petits grains noirs, ils sortiront seuls', bad: 'Les grains laissés sous la peau font un tatouage définitif (tatouage traumatique) et s\'infectent : on les retire tous, le plus tôt possible.', critical: true },
      { id: 'x_air', label: 'Laisser à l\'air pour qu\'une croûte se forme', bad: 'Une plaie cicatrise mieux en milieu humide, protégée : moins de douleur et moins de cicatrice.' },
      { id: 'x_alc', label: 'Frotter à l\'alcool à 70°', bad: 'L\'alcool est pour la peau saine : douloureux et toxique pour la plaie.' },
    ],
    dress: { best: ['interface', 'tulle'], ok: ['mousse', 'hydro'], fair: ['compresse', 'creme_cic'], why: 'Dermabrasion propre après nettoyage : interface grasse non adhérente + compresses (ou mousse, hydrocolloïde si peu de suintement). Une compresse sèche colle à la plaie.' },
    orient: ['Après le soin, il reste des points noirs sous la peau. Que faire ?', ['Revoir un médecin vite pour les retirer : sinon tatouage définitif', 'Rien, ça partira', 'Mettre une crème éclaircissante'], 0],
  },
  brul2s: {
    name: 'Brûlure 2e degré superficiel', zone: 'Avant-bras', icon: '♨️', model: 'care_brul2s',
    desc: 'Eau bouillante il y a 20 min. Rougeur, phlyctènes (cloques) dont 2 rompues, fond rouge, très douloureuse. Surface : environ une paume.',
    assess: ['Quelle est la profondeur ?', ['2e degré superficiel : phlyctènes, fond rouge, douleur', '1er degré : simple rougeur', '3e degré : cartonné, insensible'], 0],
    steps: [
      { id: 'cool', label: 'Refroidir : eau à 15 °C, 15 min, à 15 cm (si moins d\'1 h)', kind: 'hold', dur: 4, msg: 'Refroidissement fait : la douleur diminue.' },
      { id: 'bij', label: 'Retirer bagues, montre et vêtements non collés, pendant le refroidissement (avant que ça gonfle)', kind: 'plain' },
      { id: 'dol', label: 'Antalgique', kind: 'plain' },
      { id: 'phl', label: 'Exciser le toit des phlyctènes rompues', kind: 'action', action: 'blisters' },
      { id: 'ant', label: 'Antiseptique adapté aux brûlures', kind: 'product', ok: ['chlore', 'chlorhex_aq'], fair: ['serum', 'eau'] },
      { id: 'pan', label: 'Pansement gras non adhérent + compresses', kind: 'plain' },
      { id: 'tet', label: 'Vérifier le vaccin antitétanique', kind: 'plain' },
    ],
    bad: [
      { id: 'x_glace', label: 'Mettre de la glace directement', bad: 'La glace aggrave la brûlure : eau tempérée à 15 °C.', critical: true },
      { id: 'x_beur', label: 'Dentifrice, huile ou beurre', bad: 'Remèdes à proscrire : ils salissent et retiennent la chaleur.' },
      { id: 'x_epin', label: 'Percer toutes les cloques avec une épingle', bad: 'Sans matériel stérile, on ne perce pas une phlyctène : elle protège de l\'infection.' },
    ],
    dress: { best: ['interface', 'tulle'], ok: ['hydro', 'sulfadiazine'], fair: ['compresse', 'creme_cic'], why: 'Brûlure superficielle : interface non adhérente (tulle) + compresses, ou hydrocolloïde si petite surface. Une compresse sèche colle au fond.' },
    orient: ['Une paume en 2e degré sur l\'avant-bras : faut-il un avis médical ?', ['Oui : au-delà d\'une demi-paume en 2e degré, ou visage, mains, plis, enfant, personne âgée', 'Non, jamais pour une cloque', 'Seulement si ça saigne'], 0],
  },
  exsud: {
    name: 'Plaie très suintante', zone: 'Cheville', icon: '💧', model: 'care_exsud',
    desc: 'Ulcère de jambe veineux depuis 2 mois. Lit rouge bourgeonnant, exsudat abondant qui coule, peau autour blanche et fripée.',
    assess: ['Quel est le problème principal ?', ['Exsudat abondant et macération des bords', 'Nécrose sèche', 'Brûlure'], 0],
    steps: [
      { id: 'net', label: 'Nettoyer au sérum physiologique ou à l\'eau', kind: 'product', ok: ['serum', 'eau'], fair: [] },
      { id: 'sec', label: 'Sécher et protéger la peau autour (produit barrière)', kind: 'plain', msg: 'Peau périlésionnelle protégée : la macération va diminuer.' },
      { id: 'pan', label: 'Pansement très absorbant', kind: 'plain' },
      { id: 'cmp', label: 'Compression veineuse si prescrite, après mesure de l\'IPS (dangereuse si les artères sont bouchées)', kind: 'plain' },
    ],
    bad: [
      { id: 'x_ant', label: 'Antiseptique à chaque soin', bad: 'Plaie chronique : pas d\'antiseptique systématique, il retarde la cicatrisation.' },
      { id: 'x_air', label: 'Laisser à l\'air pour que ça sèche', bad: 'Une plaie cicatrise mieux en milieu humide contrôlé.' },
    ],
    dress: { best: ['alginate', 'mousse'], ok: ['argent'], fair: ['interface'], why: 'Exsudat abondant : alginate, hydrofibre ou mousse absorbante. Film et hydrocolloïde retiennent le liquide et aggravent la macération.' },
    orient: ['Pourquoi la peau autour est-elle blanche et fripée ?', ['Macération : l\'exsudat abîme la peau saine', 'C\'est une brûlure', 'C\'est normal, ça protège'], 0],
  },
  fibrine: {
    name: 'Plaie fibrineuse', zone: 'Mollet', icon: '🟡', model: 'care_fibrine',
    desc: 'Plaie chronique recouverte d\'un enduit jaune adhérent (fibrine) sur plus de la moitié, quelques bourgeons rouges, exsudat modéré.',
    assess: ['Couleur dominante du lit de la plaie ?', ['Jaune : fibrine, détersion à faire', 'Rouge : bourgeonnement', 'Noir : nécrose', 'Rose : épidermisation'], 0],
    steps: [
      { id: 'net', label: 'Nettoyer au sérum physiologique', kind: 'product', ok: ['serum', 'eau'], fair: [] },
      { id: 'det', label: 'Détersion mécanique douce (curette), sans faire saigner', kind: 'action', action: 'deterge' },
      { id: 'rin', label: 'Rincer', kind: 'wash' },
      { id: 'pan', label: 'Pansement de détersion', kind: 'plain' },
      { id: 'rev', label: 'Réévaluer le % de jaune à chaque soin', kind: 'plain' },
    ],
    bad: [
      { id: 'x_arr', label: 'Gratter jusqu\'au saignement', bad: 'On respecte les bourgeons rouges : la détersion ne doit pas faire saigner.' },
      { id: 'x_ant', label: 'Antiseptique systématique', bad: 'Plaie chronique non infectée : pas d\'antiseptique systématique.' },
    ],
    dress: { best: ['alginate', 'hydrogel'], ok: ['argent', 'mousse'], fair: [], why: 'Fibrine avec exsudat : alginate ou hydrofibre ; fibrine sèche : hydrogel. Quand le lit devient rouge, on passe au pansement de bourgeonnement.' },
    orient: ['Quand changer de type de pansement ?', ['Quand le lit devient rouge : pansement de bourgeonnement (interface, mousse)', 'Jamais', 'Toutes les heures'], 0],
  },
  infect: {
    name: 'Plaie infectée', zone: 'Jambe', icon: '🦠', model: 'care_infect',
    desc: 'Égratignure en jardinant il y a 8 jours. Douleur qui augmente, rougeur chaude qui s\'étend, œdème, pus jaunâtre, odeur. Fièvre à 38,4 °C.',
    assess: ['Quels signes voyez-vous ?', ['Rougeur étendue, chaleur, œdème, pus : infection', 'Bourgeons rouges : tout va bien', 'Plaque noire sèche'], 0],
    steps: [
      { id: 'lim', label: 'Délimiter la rougeur au feutre et noter la date', kind: 'look', msg: 'Rougeur délimitée : on verra si elle s\'étend.' },
      { id: 'lav', label: 'Laver à l\'eau et au savon ou au sérum physiologique', kind: 'wash' },
      { id: 'pus', label: 'Nettoyer le pus avec des compresses', kind: 'action', action: 'deterge' },
      { id: 'ant', label: 'Antiseptique aqueux', kind: 'product', ok: ['povidone_aq', 'chlore', 'chlorhex_aq'], fair: ['serum'] },
      { id: 'avis', label: 'Avis médical : antibiotique si dermo-hypodermite', kind: 'plain', msg: 'Fièvre + rougeur qui s\'étend : appel au médecin (Centre 15 en poste isolé).' },
      { id: 'tet', label: 'Vérifier le vaccin antitétanique', kind: 'plain' },
    ],
    bad: [
      { id: 'x_pom', label: 'Pommade antibiotique locale', bad: 'Déconseillée : allergies et résistances. L\'antibiotique se donne par voie générale si besoin.' },
      { id: 'x_hyd', label: 'Pansement hydrocolloïde occlusif', bad: 'Jamais d\'occlusif sur une plaie infectée.', critical: true },
      { id: 'x_sut', label: 'Fermer la plaie par une suture', bad: 'On ne ferme jamais une plaie infectée.', critical: true },
    ],
    dress: { best: ['argent', 'alginate'], ok: ['compresse'], fair: ['mousse', 'sulfadiazine'], why: 'Plaie infectée : pansement absorbant non occlusif (hydrofibre à l\'argent, alginate), refait chaque jour. Jamais d\'hydrocolloïde ni de film.' },
    orient: ['Signes de gravité (douleur intense, bulles, zones froides ou insensibles, fièvre élevée) :', ['Urgence : appel au 15 (risque de dermo-hypodermite nécrosante)', 'Surveiller à la maison', 'Changer de pansement'], 0],
  },
  necrose: {
    name: 'Nécrose noire sèche', zone: 'Sacrum (escarre)', icon: '⬛', model: 'care_necrose',
    desc: 'Personne alitée. Plaque noire, sèche et dure au sacrum, bord jaune de fibrine, peau rouge autour. Pas de signe d\'infection.',
    assess: ['Que signifie la plaque noire ?', ['Nécrose : tissu mort à ramollir puis retirer', 'Croûte de cicatrisation à laisser', 'Saleté à frotter'], 0],
    steps: [
      { id: 'app', label: 'Supprimer l\'appui : changements de position, matelas adapté', kind: 'plain', msg: 'Sans décharge, aucune escarre ne cicatrise.' },
      { id: 'net', label: 'Nettoyer au sérum physiologique', kind: 'product', ok: ['serum', 'eau'], fair: [] },
      { id: 'sca', label: 'Scarifier la plaque en quadrillage (soignant formé)', kind: 'action', action: 'scarify' },
      { id: 'pan', label: 'Hydrogel puis film ou hydrocolloïde mince', kind: 'plain' },
      { id: 'nut', label: 'Évaluer nutrition et douleur', kind: 'plain' },
    ],
    bad: [
      { id: 'x_arr', label: 'Arracher la nécrose à la pince', bad: 'On ramollit d\'abord (hydrogel) ; la détersion se fait progressivement.' },
      { id: 'x_mas', label: 'Masser la rougeur autour', bad: 'Le massage aggrave les lésions de pression.' },
    ],
    dress: { best: ['hydrogel'], ok: ['hydro'], fair: ['interface'], why: 'Nécrose sèche : hydrogel recouvert d\'un film ou d\'un hydrocolloïde mince pour la ramollir. Au talon, pas de détersion sans avis (artères).' },
    orient: ['Au talon, une nécrose noire sèche se traite comment ?', ['Avis médical d\'abord (vérifier les artères) avant toute détersion', 'Arracher tout de suite', 'Hydrocolloïde épais et oublier'], 0],
  },
  pierre: {
    name: 'Piqûre de poisson-pierre', zone: 'Plante du pied', icon: '🐟', model: 'care_pierre',
    desc: 'Piqûre en marchant dans le lagon il y a 15 min. Douleur très intense, pied gonflé, point de piqûre violacé.',
    assess: ['Pourquoi utiliser l\'eau chaude ?', ['Le venin est détruit par la chaleur (thermolabile)', 'Pour laver la plaie', 'Pour endormir le pied'], 0],
    steps: [
      { id: 'sor', label: 'Sortir la personne de l\'eau (risque de noyade)', kind: 'plain' },
      { id: 'chd', label: 'Pied dans l\'eau chaude à 45 °C au moins 1 h, sans brûler', kind: 'hold', dur: 5, msg: 'Après la chaleur, la douleur diminue nettement.' },
      { id: 'ane', label: 'Anesthésie locale (lidocaïne 1 % sans adrénaline) après la chaleur', kind: 'plain' },
      { id: 'exp', label: 'Explorer : épine ou corps étranger', kind: 'look', msg: 'Pas d\'épine restée dans la plaie.' },
      { id: 'des', label: 'Désinfecter', kind: 'product', ok: ['chlore'], fair: ['povidone_aq', 'chlorhex_aq'] },
      { id: 'tet', label: 'Tétanos : vaccin + immunoglobulines si non à jour', kind: 'plain' },
      { id: 'sur', label: 'Surveiller les signes généraux, appeler le 15 si besoin', kind: 'plain' },
    ],
    bad: [
      { id: 'x_suc', label: 'Inciser et sucer la plaie', bad: 'Ne jamais inciser ni sucer.', critical: true },
      { id: 'x_gla', label: 'Mettre de la glace', bad: 'Le froid n\'agit pas sur ce venin : c\'est la chaleur qui le détruit.', critical: true },
      { id: 'x_gar', label: 'Poser un garrot serré', bad: 'Pas de garrot : risque de lésions graves.' },
    ],
    dress: { best: ['compresse'], ok: ['ilot'], fair: ['interface'], why: 'Pansement non serré imbibé de soluté chloré, surveillance quotidienne (risque de nécrose et d\'infection).' },
    orient: ['Quels signes doivent faire appeler le 15 ?', ['Malaise, troubles de la sensibilité, paralysie, gêne respiratoire ou cardiaque', 'Rougeur légère', 'Démangeaisons'], 0],
  },
  brul3: {
    name: 'Brûlure profonde (3e degré)', zone: 'Jambe', icon: '🔥', model: 'care_brul3',
    desc: 'Brûlure par flamme (feu de déchets verts). Zone brune et blanche, cartonnée, sèche, insensible ; bord blanc piqueté de rouge. Environ 4 paumes.',
    assess: ['Quelle est la profondeur ?', ['3e degré : cartonné, insensible, blanc à brun', '2e degré superficiel', '1er degré'], 0],
    steps: [
      { id: 'c15', label: 'Appeler le 15 (médecin régulateur)', kind: 'plain', msg: 'Le régulateur organise la prise en charge et une éventuelle évacuation sanitaire.' },
      { id: 'cool', label: 'Refroidir si moins d\'1 h (sans refroidir le patient)', kind: 'hold', dur: 3 },
      { id: 'bij', label: 'Retirer bijoux et vêtements non collés', kind: 'plain' },
      { id: 'chp', label: 'Couvrir d\'un champ stérile propre', kind: 'plain' },
      { id: 'dol', label: 'Antalgique, surveiller la température', kind: 'plain' },
      { id: 'eva', label: 'Préparer l\'évacuation sanitaire', kind: 'plain' },
    ],
    bad: [
      { id: 'x_dec', label: 'Décoller les vêtements collés', bad: 'On ne décolle jamais ce qui adhère à la brûlure.', critical: true },
      { id: 'x_pom', label: 'Appliquer une pommade maison', bad: 'Aucun produit improvisé sur une brûlure grave.' },
    ],
    dress: { best: ['champ'], ok: ['interface', 'tulle'], fair: ['sulfadiazine'], why: 'Brûlure grave : on couvre d\'un champ stérile propre et on évacue. Les pansements spécialisés se décident en service des brûlés.' },
    orient: ['Quelle orientation ?', ['Évacuation vers un service spécialisé, décidée par le régulateur', 'Pansement à la maison, revoir dans 1 semaine', 'Attendre que la douleur revienne'], 0],
  },
  necrohum: {
    name: 'Nécrose humide', zone: 'Jambe', icon: '🟤', model: 'care_necrohum',
    desc: 'Plaie chronique de jambe. Îlots mous gris-brun et jaunâtres, collés au fond, entre des bourgeons rouges. Exsudat modéré, pas de fièvre, pas de rougeur qui s\'étend.',
    assess: ['Que faire des îlots gris-brun mous ?', ['Les retirer : ce sont des tissus morts qui gênent la cicatrisation', 'Les laisser, ils protègent', 'Les badigeonner d\'antiseptique chaque jour'], 0],
    steps: [
      { id: 'dol', label: 'Prévenir et soulager la douleur avant le geste', kind: 'plain', msg: 'Antalgique donné 30 à 60 min avant.' },
      { id: 'net', label: 'Laver à l\'eau et au savon ou au sérum, rincer', kind: 'wash' },
      { id: 'exc', label: 'Retirer les tissus morts à la pince et aux ciseaux, sans toucher les bourgeons', kind: 'action', action: 'excise' },
      { id: 'rin', label: 'Rincer, sécher la peau autour', kind: 'wash' },
      { id: 'pan', label: 'Pansement absorbant de détersion', kind: 'plain' },
      { id: 'rev', label: 'Réévaluer à chaque soin (% de noir, jaune, rouge)', kind: 'plain' },
    ],
    bad: [
      { id: 'x_tout', label: 'Tout retirer d\'un coup jusqu\'au saignement', bad: 'Détersion progressive : on s\'arrête au tissu vivant, qui saigne et fait mal.' },
      { id: 'x_ant', label: 'Antiseptique systématique à chaque soin', bad: 'Plaie chronique non infectée : pas d\'antiseptique systématique.' },
    ],
    dress: { best: ['alginate', 'argent'], ok: ['mousse', 'hydrogel'], fair: ['compresse'], why: 'Nécrose humide qui suinte : pansement absorbant (alginate, hydrofibre). Le gel (hydrogel) sert surtout à ramollir une nécrose sèche.' },
    orient: ['Quand faut-il un avis médical avant de déterger ?', ['Plaie du talon, artères douteuses, ou signes d\'infection', 'Jamais', 'Seulement si le patient le demande'], 0],
  },
  talon: {
    name: 'Escarre du talon', zone: 'Talon', icon: '🦶', model: 'care_talon',
    desc: 'Personne âgée, diabétique, alitée. Plaque noire, sèche, dure sur le talon. Pied froid et pâle, pouls du pied difficile à sentir.',
    assess: ['Avant tout soin local sur ce talon, que faut-il vérifier ?', ['La circulation artérielle (pouls, avis médical, mesure de l\'IPS)', 'Rien, on déterge tout de suite', 'La glycémie seulement'], 0],
    steps: [
      { id: 'pouls', label: 'Chercher les pouls du pied, prévenir le médecin (artères ?)', kind: 'look', msg: 'Pouls absents, pied froid : avis médical, bilan des artères avant tout geste.' },
      { id: 'dech', label: 'Supprimer l\'appui du talon (talon « dans le vide », coussin)', kind: 'plain', msg: 'Sans décharge, l\'escarre s\'aggrave.' },
      { id: 'net', label: 'Nettoyer doucement au sérum physiologique', kind: 'product', ok: ['serum', 'eau'], fair: [] },
      { id: 'sec', label: 'Garder la plaque sèche, la protéger', kind: 'plain', msg: 'Si les artères sont bouchées, la nécrose sèche du talon se garde sèche : elle protège.' },
      { id: 'surv', label: 'Surveiller : rougeur, écoulement, odeur, douleur', kind: 'plain' },
    ],
    bad: [
      { id: 'x_det', label: 'Scarifier et retirer la nécrose tout de suite', bad: 'Au talon, pas de détersion sans bilan des artères : risque d\'aggraver jusqu\'à l\'amputation.', critical: true },
      { id: 'x_hyd', label: 'Hydrogel sous film pour ramollir la plaque', bad: 'Ramollir une nécrose de talon mal irrigué la rend humide et l\'expose à l\'infection : avis médical d\'abord.' },
      { id: 'x_mas', label: 'Masser le talon pour relancer la circulation', bad: 'Le massage aggrave les lésions de pression.' },
    ],
    dress: { best: ['compresse'], ok: ['interface'], fair: [], why: 'Talon mal irrigué : pansement sec et protecteur, décharge, et avis médical. On ne ramollit pas (pas d\'hydrogel) sans bilan artériel.' },
    orient: ['La plaque devient molle, rouge autour, avec du pus. Que faire ?', ['Avis médical urgent : infection sous la nécrose', 'Continuer pareil', 'Mettre un hydrocolloïde'], 0],
  },
  tpn: {
    name: 'Plaie creuse : pansement aspiratif', zone: 'Cuisse', icon: '🧽', model: 'care_tpn',
    desc: 'Plaie opérée laissée ouverte, profonde de 2 cm, propre, bourgeons rouges, exsudat abondant. Le chirurgien a prescrit un pansement par pression négative à −125 mmHg.',
    assess: ['Qu\'apporte le pansement aspiratif ?', ['Il aspire l\'exsudat et aide la plaie à bourgeonner et se refermer', 'Il désinfecte la plaie', 'Il remplace la suture'], 0],
    steps: [
      { id: 'net', label: 'Nettoyer au sérum physiologique, sécher la peau autour', kind: 'product', ok: ['serum', 'eau'], fair: [] },
      { id: 'prot', label: 'Protéger la peau autour (film ou produit barrière)', kind: 'plain', msg: 'La peau saine ne doit pas toucher la mousse.' },
      { id: 'mousse', label: 'Découper la mousse à la forme de la plaie et la poser dedans', kind: 'action', action: 'foam' },
      { id: 'film', label: 'Couvrir d\'un film transparent bien étanche, déborder de 3 à 5 cm', kind: 'plain', msg: 'Film posé sans pli : pas de fuite.' },
      { id: 'tub', label: 'Percer le film, poser la pastille et la tubulure', kind: 'plain' },
      { id: 'press', label: 'Régler la pression de la pompe', kind: 'choice', q: 'Quelle pression ?', opts: ['−125 mmHg (prescrite)', '−300 mmHg', '+125 mmHg'], ok: 0, msg: 'La mousse se rétracte et durcit : le système est étanche.' },
      { id: 'surv', label: 'Surveiller : fuite (alarme), sang dans le bocal, douleur', kind: 'plain' },
    ],
    bad: [
      { id: 'x_vais', label: 'Poser la mousse directement sur un vaisseau ou un nerf à nu', bad: 'Contre-indiqué : risque d\'hémorragie. Les structures nobles doivent être protégées.', critical: true },
      { id: 'x_peau', label: 'Laisser la mousse déborder sur la peau saine', bad: 'La mousse abîme la peau saine (macération) : on la découpe à la taille de la plaie.' },
      { id: 'x_stop', label: 'Arrêter la pompe la nuit pour le confort', bad: 'Le pansement ne doit pas rester sans aspiration : il devient un pansement occlusif fermé.' },
    ],
    dress: { best: ['tpn'], ok: [], fair: ['mousse', 'alginate'], why: 'Prescription : pression négative. Mousse dans la plaie, film étanche, tubulure, pompe à −125 mmHg ; changement 2 à 3 fois par semaine.' },
    orient: ['Le bocal se remplit de sang rouge vif. Que faire ?', ['Arrêter la pompe, comprimer, appeler le médecin', 'Augmenter la pression', 'Attendre le prochain change'], 0],
  },
};
Object.assign(CARE, {
  ablation: {
    name: 'Ablation des fils', zone: 'Avant-bras', icon: '✂️', pad: 'lin', removal: { type: 'fil', n: 5, day: 10 },
    desc: 'J10 après une suture de l\'avant-bras (5 points simples, fil non résorbable 4-0). Cicatrice fermée, sèche, pas de rougeur, pas d\'écoulement.',
    assess: ['La plaie est fermée, propre, à J10. Que faire ?', ['Retirer tous les points', 'Les laisser encore 1 mois', 'Retirer 1 point sur 2 et revoir dans 1 an'], 0],
    steps: [
      { id: 'look', label: 'Regarder la cicatrice : fermée, sèche, pas de signe d\'infection', kind: 'look', msg: 'Cicatrice fermée, berges collées : on peut retirer les fils.' },
      { id: 'ant', label: 'Antiseptique, de la cicatrice vers l\'extérieur, laisser sécher', kind: 'product', ok: ['chlorhex_aq', 'povidone_aq', 'chlore'], fair: ['serum', 'eau'] },
      { id: 'rem', label: 'Retirer chaque point : saisir le nœud, couper sous le nœud au ras de la peau, tirer vers la cicatrice', kind: 'action', action: 'remove' },
      { id: 'cpt', label: 'Compter les fils retirés, vérifier qu\'ils sont complets', kind: 'plain', msg: '5 fils complets : aucun oubli.' },
      { id: 'str', label: 'Strips si la cicatrice paraît fragile', kind: 'plain' },
    ],
    bad: [
      { id: 'x_far', label: 'Couper le fil au milieu, au-dessus de la cicatrice', bad: 'On coupe au ras de la peau, sous le nœud : la partie du fil qui était dehors ne doit pas repasser sous la peau.' },
      { id: 'x_tire', label: 'Tirer le nœud fort sans couper', bad: 'On coupe d\'abord : tirer un point fermé arrache et fait mal.' },
    ],
    dress: { best: ['ilot', 'compresse'], ok: ['film'], fair: ['creme_cic'], why: 'Après l\'ablation : pansement sec simple 24 à 48 h, ou rien si la cicatrice est bien sèche.' },
    orient: ['La cicatrice s\'ouvre un peu à un bout après l\'ablation. Que faire ?', ['Rapprocher avec des strips, protéger, revoir', 'Rien', 'Recoudre à domicile'], 0],
  },
  ablation_inf: {
    name: 'Point infecté', zone: 'Jambe', icon: '🔴', pad: 'lin', removal: { type: 'fil', n: 5, day: 5, infect: 2 },
    desc: 'J5 après une suture de jambe. Douleur, rougeur chaude autour du point du milieu, une goutte de pus sort à côté du fil. Pas de fièvre.',
    assess: ['Que faire du point infecté ?', ['Retirer le point infecté pour laisser s\'écouler, avis médical', 'Rajouter un pansement occlusif', 'Laisser les points 10 jours'], 0],
    steps: [
      { id: 'look', label: 'Délimiter la rougeur, prendre la température', kind: 'look', msg: 'Rougeur limitée autour du point du milieu, pas de fièvre.' },
      { id: 'ant', label: 'Antiseptique sur la cicatrice', kind: 'product', ok: ['chlorhex_aq', 'povidone_aq', 'chlore'], fair: ['serum'] },
      { id: 'rem', label: 'Retirer le point infecté (et seulement lui) pour laisser s\'écouler', kind: 'action', action: 'remove' },
      { id: 'prel', label: 'Prélèvement du pus si prescrit, nettoyer', kind: 'plain' },
      { id: 'avis', label: 'Avis médical (antibiotique si l\'infection s\'étend)', kind: 'plain', msg: 'Le médecin passe voir la plaie aujourd\'hui.' },
    ],
    bad: [
      { id: 'x_tous', label: 'Retirer tous les points à J5', bad: 'Trop tôt sur une jambe : la cicatrice risque de s\'ouvrir. On retire seulement le point infecté.' },
      { id: 'x_occ', label: 'Couvrir d\'un hydrocolloïde', bad: 'Jamais d\'occlusif sur une plaie infectée.', critical: true },
    ],
    dress: { best: ['compresse', 'argent'], ok: ['alginate'], fair: [], why: 'Plaie qui coule : pansement absorbant non occlusif, refait chaque jour.' },
    orient: ['La rougeur s\'étend et la fièvre apparaît. Que faire ?', ['Avis médical rapide : antibiotique, ouvrir davantage', 'Attendre J10', 'Mettre de la glace'], 0],
  },
  ablation_agr: {
    name: 'Ablation des agrafes', zone: 'Cuir chevelu', icon: '📎', pad: 'lin', removal: { type: 'agrafe', n: 6, day: 8 },
    desc: 'J8 après la fermeture d\'une plaie du cuir chevelu par 6 agrafes. Cicatrice fermée, sèche.',
    assess: ['Avec quoi retire-t-on des agrafes ?', ['Une pince ôte-agrafes, glissée sous l\'agrafe', 'Des ciseaux', 'Une pince à épiler, en tirant'], 0],
    steps: [
      { id: 'ant', label: 'Antiseptique, laisser sécher', kind: 'product', ok: ['chlorhex_aq', 'povidone_aq', 'chlore'], fair: ['serum', 'eau'] },
      { id: 'rem', label: 'Glisser les 2 mors de l\'ôte-agrafes sous l\'agrafe, serrer à fond, puis soulever', kind: 'action', action: 'remove' },
      { id: 'cpt', label: 'Compter les agrafes retirées', kind: 'plain', msg: '6 agrafes : aucune oubliée.' },
    ],
    bad: [{ id: 'x_tire', label: 'Tirer l\'agrafe vers le haut sans l\'ouvrir', bad: 'L\'agrafe s\'ouvre avec l\'ôte-agrafes ; tirée fermée, elle arrache la peau.' }],
    dress: { best: ['compresse'], ok: ['ilot'], fair: [], why: 'Cuir chevelu : rien ou une compresse sèche ; shampoing doux possible après l\'ablation.' },
    orient: ['Quand peut-on se laver les cheveux après l\'ablation ?', ['Dès le lendemain, doucement', 'Jamais', 'Dans 3 mois'], 0],
  },
});
export const CARE_ORDER = ['ablation', 'ablation_inf', 'ablation_agr', 'corail', 'morsure', 'route', 'brul2s', 'exsud', 'fibrine', 'infect', 'necrose', 'necrohum', 'talon', 'pierre', 'brul3', 'tpn'];

export function productVerdict(item, pid) {
  if (item.ok && item.ok.includes(pid)) return [100, '✓ ' + PRODUCTS[pid].name + ' : bon choix.'];
  if (item.fair && item.fair.includes(pid)) return [60, '≈ ' + PRODUCTS[pid].name + ' : nettoie, mais un antiseptique adapté était attendu.'];
  if (ALC.includes(pid)) return [0, '✗ ' + PRODUCTS[pid].note];
  return [20, '✗ ' + PRODUCTS[pid].name + ' : pas adapté ici. ' + PRODUCTS[pid].note];
}

// ---------------------------------------------------------------- URGENCE HÉMORRAGIE
export const URGENCE = {
  hemo: {
    name: 'Hémorragie de l\'avant-bras', zone: 'Avant-bras', icon: '🚨', pad: 'lin',
    desc: 'Bris de vitre il y a 1 min. Le sang sort en jet, par saccades. La victime est pâle et inquiète. Chaque seconde compte.',
    steps: [
      { id: 'secu', label: 'Se protéger : gants (ou sac plastique)', kind: 'plain' },
      { id: 'comp', label: 'Compression directe forte avec des compresses', kind: 'hold', dur: 4, flow: 0.3, msg: 'La compression ralentit le saignement.' },
      { id: 'alert', label: 'Faire appeler le 15', kind: 'plain', msg: 'Le 15 est prévenu : les secours arrivent.' },
      { id: 'allon', label: 'Allonger la victime', kind: 'plain', msg: 'Allongée : moins de risque de malaise.' },
      { id: 'pans', label: 'Pansement compressif pour libérer les mains', kind: 'plain', flow: 0.4 },
      { id: 'garrot', label: 'Si ça saigne encore : garrot au-dessus de la plaie, noter l\'heure', kind: 'hold', dur: 3, flow: 0, tourniquet: true, msg: 'Garrot posé à 10 h 42 : heure notée sur le front et la fiche.' },
      { id: 'surv', label: 'Surveiller conscience et respiration, couvrir la victime', kind: 'plain' },
    ],
    bad: [
      { id: 'x_reg', label: 'Retirer les compresses pour regarder', bad: 'On ne retire jamais : on rajoute des compresses par-dessus.', critical: true },
      { id: 'x_boire', label: 'Donner à boire', bad: 'Rien à boire : risque de vomissement si chirurgie.' },
      { id: 'x_ser', label: 'Desserrer le garrot de temps en temps', bad: 'Un garrot posé ne se desserre jamais avant l\'hôpital.', critical: true },
    ],
    orient: ['Le garrot est posé. Que faut-il faire ?', ['Noter l\'heure de pose et ne jamais le desserrer', 'Le desserrer toutes les 5 minutes', 'L\'enlever quand la victime va mieux'], 0],
  },
  requin: {
    name: 'Morsure de requin', zone: 'Mollet', icon: '🦈', pad: 'requin',
    desc: 'Surfeur mordu au mollet près de la passe. Ses amis l\'ont ramené sur sa planche. Plaie large, le sang coule à flots. Il est pâle et a froid.',
    steps: [
      { id: 'sort', label: 'Le sortir complètement de l\'eau, sur la plage ou le bateau', kind: 'plain', msg: 'Hors de l\'eau : on peut agir en sécurité.' },
      { id: 'secu', label: 'Se protéger : gants (ou sac plastique)', kind: 'plain' },
      { id: 'comp', label: 'Compression directe très forte sur la plaie', kind: 'hold', dur: 4, flow: 0.5, msg: 'Ça ralentit, mais ça saigne encore : plaie trop large.' },
      { id: 'alert', label: 'Faire appeler le 15', kind: 'plain', msg: 'Le 15 est prévenu : morsure de requin, hémorragie, lieu précis.' },
      { id: 'garrot', label: 'Garrot au-dessus de la plaie (cuisse), noter l\'heure', kind: 'hold', dur: 3, flow: 0, tourniquet: true, msg: 'Garrot serré jusqu\'à l\'arrêt du saignement. Heure notée.' },
      { id: 'allon', label: 'L\'allonger, le sécher et le couvrir (couverture de survie)', kind: 'plain', msg: 'Allongé, au chaud : moins de choc.' },
      { id: 'surv', label: 'Surveiller conscience et respiration, lui parler', kind: 'plain' },
    ],
    bad: [
      { id: 'x_rinc', label: 'Rincer longuement la plaie avant tout', bad: 'L\'urgence est d\'arrêter le saignement : le nettoyage se fera à l\'hôpital.', critical: true },
      { id: 'x_boire', label: 'Lui donner à boire', bad: 'Rien à boire : il ira au bloc opératoire.' },
      { id: 'x_ser', label: 'Desserrer le garrot pour soulager', bad: 'Un garrot posé ne se desserre jamais avant l\'hôpital.', critical: true },
    ],
    orient: ['Pourquoi poser le garrot ici, et pas seulement comprimer ?', ['La plaie est trop large : la compression ne suffit pas à arrêter le sang', 'Le garrot remplace l\'appel au 15', 'Pour désinfecter la plaie'], 0],
  },
  route: {
    name: 'Accident de scooter', zone: 'Avant-bras', icon: '🛵', pad: 'lin',
    desc: 'Un scooter a glissé dans un virage. Le pilote est au sol, casque sur la tête, il parle. Son avant-bras saigne beaucoup. Les voitures passent à côté.',
    steps: [
      { id: 'prot', label: 'Protéger : feux de détresse, gilet, baliser la zone', kind: 'plain', msg: 'Zone balisée : pas de sur-accident.' },
      { id: 'secu', label: 'Se protéger : gants (ou sac plastique)', kind: 'plain' },
      { id: 'comp', label: 'Comprimer fort la plaie qui saigne', kind: 'hold', dur: 4, flow: 0.15, msg: 'La compression arrête presque le saignement.' },
      { id: 'alert', label: 'Faire appeler le 15 (ou le 18)', kind: 'plain', msg: 'Secours prévenus : accident de deux-roues, 1 blessé conscient, hémorragie du bras.' },
      { id: 'casq', label: 'Laisser le casque, ouvrir la visière', kind: 'plain', msg: 'Le casque reste : il protège un cou peut-être blessé.' },
      { id: 'pans', label: 'Pansement compressif pour libérer les mains', kind: 'plain', flow: 0 },
      { id: 'surv', label: 'Ne pas le bouger, le couvrir, lui parler, surveiller', kind: 'plain' },
    ],
    bad: [
      { id: 'x_casq', label: 'Lui enlever le casque pour qu\'il respire mieux', bad: 'On ne retire jamais le casque d\'un motard (risque de lésion du cou), sauf s\'il ne respire plus : secouristes formés.', critical: true },
      { id: 'x_lev', label: 'L\'aider à se relever pour voir s\'il peut marcher', bad: 'On ne bouge pas un blessé de la route, sauf danger immédiat (feu, circulation).', critical: true },
      { id: 'x_boire', label: 'Lui donner à boire', bad: 'Rien à boire ni à manger.' },
    ],
    orient: ['Le blessé veut enlever son casque lui-même. Que faire ?', ['L\'en dissuader : risque de blesser le cou', 'L\'aider à le retirer doucement', 'Le laisser faire, c\'est son choix'], 0],
  },
};
export const TIPS = {
  prep: 'L\'ordre : accord → mains, masque, gants → examen → antiseptique sur la peau → anesthésie → lavage → antiseptique → séchage → champ stérile.',
  choose: 'Peau des membres : fil non résorbable 4-0 et aiguille 3/8 tranchante inversée. Visage : 6-0 ou colle. Cuir chevelu : agrafes. Forte tension : point de Donati.',
  suture: 'Même distance des deux côtés, perpendiculaire à la plaie. Un point tous les 5 à 10 mm (1 à 2 fois la prise). Commencez au milieu, puis coupez chaque espace en deux. Nœud : 4 à 5 jetés pour un fil monofilament (nylon), sur le côté, jamais sur la plaie. Saisir l\'aiguille aux 2/3 de sa longueur depuis la pointe, piquer à 90° et suivre sa courbe d\'un mouvement du poignet ; la pince à griffes soulève la berge sans l\'écraser.',
  staple: 'Agrafes : la pince à griffes éverse les berges ; agrafeuse perpendiculaire, centrée sur la plaie, posée sans appuyer fort ; une agrafe tous les 5 à 10 mm. Retrait : mors entièrement sous l\'agrafe, serrer à fond avant de soulever.',
  strip: 'Strips : peau bien sèche, de part et d\'autre, perpendiculaires, espacés de 3 à 5 mm.',
  glue: 'Colle : petite plaie superficielle, sans tension, bien sèche. Rapprocher les berges et les tenir jusqu\'à ce que la colle sèche ; 2-3 couches fines en surface, jamais dans la plaie ; pas de pommade dessus, elle tombe seule en 5 à 10 jours.',
  dress: 'Plaie suturée sèche → pansement sec stérile. Plaie qui suinte → absorbant. Plaie infectée → jamais d\'occlusif.',
  care: 'Regardez la couleur dominante : noir = nécrose, jaune = fibrine, rouge = bourgeon, rose = épiderme.',
  urg: 'Hémorragie : se protéger → comprimer fort → alerter → allonger. Garrot seulement si la compression échoue.',
};

// ---------------------------------------------------------------- APPRENDRE (leçons pas à pas)
// Sources : Manuel MSD (matelassier vertical / horizontal, infiltration), Am Fam Physician 2002 (mattress sutures),
// MSF (anesthésie dans les berges, attendre 2 min), CFPC (injecter dans les bords), WikEM (dose max lidocaïne),
// CMAJ 2022 / NYSORA (signes de toxicité : engourdissement de la bouche, goût métallique, acouphènes).
export const FICHES = {
  simple: {
    quand: ['La plupart des plaies : bords nets, peu de tension', 'Plaie irrégulière : chaque point s\'ajuste', 'Plaie à risque d\'infection : on peut retirer un seul point'],
    non: ['Forte tension (préférer un matelassier)', 'Zone très esthétique si un fil fin intradermique est possible'],
    plus: ['Polyvalent, le « point de base »', 'Si un point lâche, les autres tiennent'],
    geste: ['Aiguille tenue aux 2/3 depuis la pointe', 'Piquer à 90° de la peau, suivre la courbe de l\'aiguille', 'Pince à griffes : soulever la berge, ne pas l\'écraser', 'Nœud au porte-aiguille, posé sur le côté'],
    moins: ['Plus long qu\'un surjet', 'Marques en échelle si les fils restent trop longtemps'],
  },
  donati: {
    quand: ['Tension modérée', 'Berges qui ont tendance à rentrer (s\'invaginer) : il les éverse', 'Peau lâche ou plis (dos, coude)'],
    non: ['Visage, paume de la main, plante du pied', 'Tension forte : il faut d\'abord des points profonds (fermeture en plusieurs plans, par un chirurgien)'],
    plus: ['Éversion très efficace', 'Tient la tension grâce à la prise large'],
    geste: ['Loin-loin : passage large et profond, à 4–8 mm des berges', 'Retour près-près sur la même ligne, superficiel (1–2 mm), dans le derme', 'Nœud posé sur le côté, berges bien éversées', 'Variante Blair-Donati (semi-enfoui) : d\'un côté le retour reste dans le derme, pas de trace de fil de ce côté'],
    moins: ['Plus long à faire', 'Marques plus visibles ; risque d\'étrangler la peau si trop serré'],
  },
  horiz: {
    quand: ['Peau fine ou fragile (personne âgée)', 'Peu de derme : éversion difficile', 'Cuir chevelu, bords macérés ou irréguliers', 'Tension modérée'],
    non: ['Visage (cicatrice plus marquée)', 'Si les prises ne sont pas égales : berges décalées'],
    plus: ['Répartit la tension sur une large zone', 'Éverse les berges, aide à l\'hémostase'],
    moins: ['Risque de nécrose des berges si trop serré', 'Affrontement moins précis : souvent complété par des points simples'],
  },
  x: {
    quand: ['Plaie qui saigne (cuir chevelu) : effet hémostatique', 'Fermer un plan profond ou une petite zone'],
    non: ['Peau du visage', 'Peau fine : le X serre beaucoup'],
    plus: ['Hémostatique', 'Un seul nœud pour deux passages'],
    moins: ['Serre fort : risque d\'ischémie', 'Moins esthétique que le point simple'],
  },
  surjet: {
    quand: ['Plaie longue et droite, peu de tension', 'Cuir chevelu (hémostatique)', 'Quand il faut aller vite'],
    non: ['Plaie souillée ou à risque d\'infection', 'Plaie très irrégulière ou sous tension'],
    plus: ['Rapide, étanche', 'Répartit la tension le long de la plaie'],
    geste: ['Commencer par un point simple noué à un bout, sans couper le brin long', 'Chaque passage perpendiculaire à la plaie : le fil croise en diagonale dessus', 'Espacement régulier (≈ 5 mm), fil gardé tendu entre les passages', 'Finir : laisser la dernière boucle lâche et la nouer avec le brin libre'],
    moins: ['Si le fil casse, tout lâche', 'Réglage point par point impossible'],
  },
  intra: {
    quand: ['Zone esthétique (visage), plaie nette', 'Peu de tension', 'Fil résorbable possible : pas d\'ablation'],
    non: ['Plaie souillée, contuse ou infectée', 'Tension, plaie profonde non fermée en dessous'],
    plus: ['Pas de marques de fils sur la peau', 'Très belle cicatrice'],
    geste: ['Ancrer le départ (nœud enfoui ou bout laissé dehors et fixé)', 'Petites prises horizontales dans le derme, alternées d\'un côté puis de l\'autre', 'Chaque entrée juste en face, ou un peu en arrière, de la sortie précédente', 'Tirer doucement : la plaie se ferme comme une fermeture éclair, puis ancrer la fin'],
    moins: ['Technique difficile, plus longue', 'Peu solide seul si la peau tire'],
  },
};
FICHES.buried = {
  quand: ['Plaie profonde : graisse ouverte, espace mort à fermer', 'Plaie sous tension : il enlève la tension à la peau', 'Avant un intradermique ou des points de peau'],
  non: ['Plaie souillée ou infectée (le fil enfoui garde les germes)', 'Plaie superficielle (inutile)', 'Plaie de la paume ou de la plante (souvent déconseillé)'],
  plus: ['Ferme l\'espace mort (moins d\'hématome)', 'Cicatrice moins large', 'Fil résorbable : rien à retirer'],
  moins: ['Un corps étranger de plus dans la plaie', 'Plus long ; nœud à bien enfouir, sinon il ressort'],
};
FICHES.hemo = {
  quand: ['Petit vaisseau qui continue de saigner au fond de la plaie, malgré la compression', 'Avant de fermer : une plaie fermée sur un saignement fait un hématome'],
  non: ['Saignement en jet d\'une grosse artère, pâleur, malaise : compression et chirurgien', 'Plaie de la main ou du poignet près d\'un nerf : on ne pique pas à l\'aveugle'],
  plus: ['Arrête le saignement là où il naît', 'Évite l\'hématome sous la suture'],
  moins: ['Il faut bien voir le vaisseau (aide, écarteurs, lumière)', 'Mal placé, il peut prendre un nerf'],
};
export const LESSON_QUIZ = {
  simple: ['Une plaie de l\'avant-bras, nette, peu de tension, un peu souillée. Quel point ?', ['Point simple', 'Surjet', 'Intradermique'], 0],
  donati: ['Où ne faut-il PAS faire de Donati ?', ['Visage, paume, plante du pied', 'Dos', 'Coude'], 0],
  horiz: ['Peau fine d\'une personne âgée qui se déchire facilement. Quel point ?', ['Matelassier horizontal', 'Point en X serré', 'Intradermique'], 0],
  x: ['Le point en X est surtout utile pour…', ['Arrêter un saignement (cuir chevelu)', 'Le visage', 'Une peau fine'], 0],
  surjet: ['Quand éviter le surjet ?', ['Plaie souillée, à risque d\'infection', 'Plaie longue et droite', 'Cuir chevelu'], 0],
  intra: ['Une petite plaie nette du front, sans tension. Le meilleur choix ?', ['Surjet intradermique', 'Point de Donati', 'Point en X'], 0],
  hemo: ['Un petit vaisseau saigne au fond de la plaie malgré la compression. Que faire avant de fermer ?', ['Un point hémostatique en X (fil résorbable) sur le vaisseau', 'Fermer la peau, la pression arrêtera le saignement', 'Mettre de l\'eau oxygénée'], 0],
  buried: ['Plaie profonde du mollet, propre. Dans quel ordre fermer ?', ['Points profonds enfouis, puis la peau', 'La peau seulement', 'La peau, puis le plan profond'], 0],
};
export const ANESTH_LESSON = [
  { t: 'Avant de piquer', x: 'Demandez : <b>allergie</b> aux anesthésiques locaux ? <b>Poids</b> du patient ? Grossesse, maladie du cœur, du foie ? Examinez aussi la <b>sensibilité</b> et la <b>mobilité</b> AVANT d\'endormir.' },
  { t: 'Calculer la dose maximale', x: 'Lidocaïne 1 % = <b>10 mg par mL</b>. Sans adrénaline : <b>5 mg/kg</b>, et <b>jamais plus de 200 mg</b> chez l\'adulte en infiltration (notice française), soit 20 mL à 1 %. Réduire chez la personne âgée, en cas de maladie du cœur ou du foie.', quiz: ['Patient de 60 kg : volume maximal de lidocaïne 1 % sans adrénaline ?', ['20 mL (5 mg/kg = 300 mg, mais plafond de 200 mg)', '30 mL', '60 mL'], 0] },

  { t: 'Le matériel', x: 'Seringue de 5 à 10 mL, <b>aiguille fine</b> (25 à 27 G), <b>lidocaïne 1 % sans adrénaline</b>. Une aiguille fine et un liquide à température ambiante font moins mal.', show: 'syringe' },
  { t: 'Asepsie et prévenir', x: 'Mains, gants, antiseptique sur la peau. Prévenez : « ça pique un peu, puis ça brûle quelques secondes ». Gardez le <b>contact verbal</b> pendant l\'injection.' },
  { t: 'Regardez la première injection', x: 'On pique <b>dans la berge de la plaie</b> (pas à travers la peau saine), sous le derme. On <b>aspire</b> (pas de sang), puis on injecte <b>lentement</b>.', demo: 'inject' },
  { t: 'À vous', x: 'Touchez <b>4 points</b> le long des berges. Repiquez dans la zone déjà endormie, de proche en proche : moins de piqûres = moins de douleur. Plaie longue : par segments, sans oublier <b>les deux bouts</b> de la plaie.', act: 'inject' },
  { t: 'Attendre', x: 'Attendez <b>au moins 2 minutes</b> que le produit agisse.', act: 'wait' },
  { t: 'Tester', x: 'Touchez la peau près de la plaie pour vérifier qu\'elle est bien endormie avant de suturer.', act: 'test' },
  { t: 'Surveiller', x: 'Signes de surdosage (souvent dans les 1–5 min) : <b>engourdissement autour de la bouche, goût métallique, acouphènes</b>, vertiges, somnolence. → On arrête, on reste avec le patient, on appelle le médecin.', quiz: ['Le patient dit avoir un goût de métal dans la bouche. Que faire ?', ['Arrêter l\'injection et appeler le médecin', 'Continuer plus vite', 'Lui donner à boire'], 0] },
];

// Couches de la peau (leçon). Épaisseurs moyennes : épiderme 0,05–1,5 mm ; derme 1–4 mm ; hypoderme variable.
export const LAYERS = [
  { k: 'epi', n: 'Épiderme', c: '#a8705a', x: 'Couche de surface, sans vaisseaux : elle ne saigne pas. Elle se renouvelle seule. Une plaie limitée à l\'épiderme (éraflure) ne se suture pas.' },
  { k: 'der', n: 'Derme', c: '#e9c9bf', x: 'Couche solide (fibres de collagène), avec vaisseaux et nerfs : c\'est elle qui « tient » le fil. Les points de peau et l\'intradermique passent ici.' },
  { k: 'hyp', n: 'Hypoderme (graisse)', c: '#e8c56a', x: 'Graisse en petits lobules jaunes, fragile : elle ne tient pas le fil. Si elle est largement ouverte, on ferme « l\'espace mort » avec des points profonds enfouis.' },
  { k: 'apo', n: 'Aponévrose', c: '#ecebe4', x: 'Nappe blanc nacré qui enveloppe le muscle. Si elle est ouverte, c\'est une plaie profonde : avis chirurgical.' },
  { k: 'mus', n: 'Muscle', c: '#8c1c18', x: 'Rouge sombre, en fibres parallèles. Une plaie du muscle se ferme au bloc, plan par plan, par un chirurgien.' },
];
export const LAYERS_QUIZ = [
  ['Quelle couche « tient » le fil des points de peau ?', ['Le derme', 'L\'épiderme', 'La graisse'], 0],
  ['On voit une nappe blanche au fond de la plaie. Qu\'est-ce que c\'est ?', ['L\'aponévrose : plaie profonde, avis chirurgical', 'De la fibrine', 'Le derme'], 0],
  ['Pourquoi fermer la graisse ouverte avec des points enfouis ?', ['Pour fermer l\'espace mort (hématome, infection)', 'Pour que ça saigne moins à la surface', 'Ce n\'est jamais utile'], 0],
];

// ---------------------------------------------------------------- PERSONNE ET ÉVOLUTION (hypothèse pédagogique)
// Facteurs de retard de cicatrisation et d'infection : Manuel MSD (tableau des facteurs), Quotidien du Médecin,
// Quotidien du Pharmacien. Les coefficients sont des réglages de jeu, pas des valeurs cliniques.
export const RISKS = {
  diabete: { n: 'Diabète', inf: 2.0, heal: 1.4 },
  tabac: { n: 'Tabac', inf: 1.4, heal: 1.3 },
  age: { n: 'Plus de 70 ans', inf: 1.3, heal: 1.4 },
  cortico: { n: 'Corticoïdes au long cours', inf: 1.5, heal: 1.4 },
  denut: { n: 'Dénutrition', inf: 1.5, heal: 1.5 },
  anticoag: { n: 'Anticoagulant (AVK, AOD)', hema: 2.5, adv: 1, med: 1, bleed: 1, why: 'Anticoagulant : saignement plus long, compression prolongée et hémostase locale ; on ne l\'arrête pas seul (avis médical)' },
  antiag: { n: 'Antiagrégant (aspirine, clopidogrel)', hema: 1.8, adv: 1, med: 1, bleed: 1, why: 'Antiagrégant : suintement plus long, surtout aspirine + clopidogrel ; ne pas l\'arrêter seul' },
  ains: { n: 'Anti-inflammatoires (AINS)', heal: 1.2, hema: 1.4, adv: 1, med: 1, why: 'Anti-inflammatoires : cicatrisation un peu ralentie, saignement un peu plus long' },
  betabloq: { n: 'Antihypertenseur bêtabloquant', adv: 1, med: 1, why: 'Bêtabloquant : le cœur ne s\'accélère pas ; un pouls normal peut cacher une hémorragie grave, surveiller la tension et la pâleur' },
  immuno: { n: 'Immunosuppresseur, chimiothérapie', inf: 1.8, heal: 1.4, adv: 1, med: 1, why: 'Immunosuppresseur / chimiothérapie : infection plus fréquente et parfois peu visible, cicatrisation lente' },
  alite: { n: 'Alitement, se mobilise mal', inf: 1.3, heal: 1.4, adv: 1, why: 'Alitement : appuis prolongés (talon, sacrum), risque d\'escarre, circulation ralentie' },
};
// les facteurs « adv » n'apparaissent qu'en Avancé et en Examen (et y sont tirés au hasard pour les cas classiques)
RISKS.cortico.adv = 1; RISKS.cortico.med = 1; RISKS.cortico.why = 'Corticoïdes au long cours : peau fine, cicatrisation lente, infection moins visible';
// ---------------------------------------------------------------- BAC À SABLE
export const SB = {
  zones: { tete: ['💇 Cuir chevelu', 'scalp'], visage: ['🙂 Visage', 'face'], bras: ['💪 Bras / avant-bras', 'lin'], main: ['✋ Main', 'lin'], tronc: ['👕 Tronc / dos', 'lin'], genou: ['🦵 Genou', 'curve'], jambe: ['🦵 Jambe / cuisse', 'lin'], pied: ['🦶 Pied', 'lin'], perinee: ['🌸 Périnée (peau)', 'lin'] },
  types: { nette: 'Coupure nette', courbe: 'Plaie courbe', beante: 'Béante, sous tension', profonde: 'Profonde (graisse, aponévrose)', vaisseau: 'Profonde, un vaisseau saigne' },
  bleeds: ['Aucun', 'Suintement', 'Veineux', 'Artériel (jet)'],
};

// ---------------------------------------------------------------- VERSION DE DÉMONSTRATION (GitHub)
// DEMO = true dans la copie publiée sur GitHub (script blender/../make_demo.py) : contenu limité.
export const DEMO = false;
export const ATELIER = false; // true dans la copie « Atelier nœud » (make_atelier.py)
export const DEMO_KEEP = { suture: ['lin', 'deep'], care: ['ablation', 'corail', 'morsure'], urg: ['hemo', 'requin'], learn: ['couches', 'atelier', 'noeud', 'anesth', 'simple', 'donati'], levels: ['deb', 'int'] };

// ---------------------------------------------------------------- TAILLE ET DÉCOUPE DES PANSEMENTS (v7.14)
// Sources : Quotidien du Pharmacien (dépasser les berges de 1,5 à 3 cm, coller sur peau saine) ; IFPVPS (hydrocolloïde
// découpé à 3 cm des berges) ; CHUV (alginate sans dépasser les bords : macération ; certains non découpables) ;
// CHUM (fibres gélifiantes à bord adhésif : ne pas couper, dépasser de 2–3 cm) ; HAS (sulfadiazine argentique, brûlures).
// role : cover = couvre et colle sur peau saine (marge 1,5–3 cm) ; fill = dans la plaie, à sa taille exacte, + pansement
// secondaire ; contact = sur la plaie un peu plus grand, + compresses ; topical = crème + compresses ; none = sans taille.
export const DRESS_FIT = {
  compresse: { role: 'cover', cut: false, sizes: [[5, 5], [7.5, 7.5], [10, 10], [10, 20]] },
  ilot: { role: 'cover', cut: false, sizes: [[5, 7], [9, 10], [9, 15], [10, 25]] },
  film: { role: 'cover', cut: true, sizes: [[6, 7], [10, 12], [15, 20]] },
  hydro: { role: 'cover', cut: true, sizes: [[5, 5], [10, 10], [15, 15], [20, 20]] },
  mousse: { role: 'cover', cut: true, sizes: [[7.5, 7.5], [10, 10], [15, 15], [20, 20]] },
  alginate: { role: 'fill', cut: true, sizes: [[5, 5], [10, 10], [10, 20]] },
  argent: { role: 'fill', cut: true, sizes: [[5, 5], [10, 10], [15, 15]] },
  hydrogel: { role: 'fill', cut: true, sizes: [] },
  tpn: { role: 'fill', cut: true, sizes: [] },
  interface: { role: 'contact', cut: true, sizes: [[5, 7], [10, 12], [15, 20]] },
  tulle: { role: 'contact', cut: true, sizes: [[10, 10], [10, 40]] },
  sulfadiazine: { role: 'topical' }, creme_cic: { role: 'topical' }, creme_as: { role: 'topical' },
  champ: { role: 'none' },
};
// taille de la plaie à couvrir (cm) pour les soins
export const CARE_CM = { morsure: [5, 4], route: [7, 5], corail: [4, 3], pierre: [2, 2], brul2s: [8, 6], brul3: [12, 9], exsud: [6, 4], fibrine: [5, 4], infect: [5, 3], necrose: [6, 5], necrohum: [6, 5], talon: [5, 4], tpn: [9, 5], ablation: [5, 1], ablation_inf: [5, 1.5], ablation_agr: [6, 1] };
