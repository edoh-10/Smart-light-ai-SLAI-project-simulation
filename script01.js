window.onload = function () {
  const canvas = document.getElementById("simulationCanvas");
  if (!canvas) {
    console.error("Erreur : Canvas introuvable !");
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Erreur : Contexte 2D non supporté.");
    alert("Canvas non supporté.");
    return;
  }

  // --- Références DOM pour les contrôles ---
  const increaseDensityBtn = document.getElementById("increaseDensityBtn");
  const decreaseDensityBtn = document.getElementById("decreaseDensityBtn");
  const densityInfoSpan = document.getElementById("densityInfo");
  const slowDownBtn = document.getElementById("slowDownBtn");
  const speedUpBtn = document.getElementById("speedUpBtn");
  const speedInfoSpan = document.getElementById("speedInfo");

  // --- Configuration et Constantes ---

  

  const canvasWidth = 800;
  const canvasHeight = 600;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const largeurRoute = 200;
  const largeurVoie = largeurRoute / 4;
  const centreX = canvasWidth / 2;
  const centreY = canvasHeight / 2;
  const voieEstExterieureY = centreY - largeurVoie * 1.5;
  const voieEstInterieureY = centreY - largeurVoie * 0.5;
  const voieOuestInterieureY = centreY + largeurVoie * 0.5;
  const voieOuestExterieureY = centreY + largeurVoie * 1.5;
  const voieSudExterieureX = centreX - largeurVoie * 1.5;
  const voieSudInterieureX = centreX - largeurVoie * 0.5;
  const voieNordInterieureX = centreX + largeurVoie * 0.5;
  const voieNordExterieureX = centreX + largeurVoie * 1.5;
  // Dimensions Véhicules
  const LARGEUR_VOITURE = 30;
  const HAUTEUR_VOITURE = 15;
  const LARGEUR_CAMION = 45;
  const HAUTEUR_CAMION = 18; // Plus grand
  const PROBA_CAMION = 0.2; // 20% de chance qu'un véhicule généré soit un camion
  const COULEUR_CAMION = "#808080"; // Gris pour les camions
  // Timings feux
  const DUREE_ORANGE = 2000;
  const DUREE_VERT_MIN = 4000;
  const DUREE_VERT_MAX = 15000;
  const TEMPS_PAR_VOITURE = 500;
  const ZONE_DETECTION_ATTENTE = 150;
  // Lignes d'arrêt
  const stopLineOuest = centreX - largeurRoute / 2 - 10;
  const stopLineEst = centreX + largeurRoute / 2 + 10;
  const stopLineNord = centreY - largeurRoute / 2 - 10;
  const stopLineSud = centreY + largeurRoute / 2 + 10;
  // Physique (commune pour l'instant)
  const ACCELERATION = 0.03;
  const DECELERATION_FREINAGE = 0.1;
  const DECELERATION_SUIVI = 0.05;
  const DISTANCE_DETECTION_FEU = 70;
  const DISTANCE_SECURITE_MIN = 15;
  const DISTANCE_DETECTION_VOITURE = 60;
  // Infractions
  const PROBA_INFRACTION = 0.2;
  const FACTEUR_VITESSE_INFRACTION = 1.5;
  const SEUIL_DEPASSEMENT_VITESSE = 1.1;
  const DUREE_INDICATEUR_INFRACTION = 1000;
  // Urgences
  const PROBA_EMERGENCY = 0.04;
  const EMERGENCY_DETECTION_DISTANCE = 200;
  const COULEUR_URGENCE_1 = "#FF0000";
  const COULEUR_URGENCE_2 = "#0000FF";
  const COULEUR_URGENCE_FLASH_1 = "#FF0000";
  const COULEUR_URGENCE_FLASH_2 = "#0000FF";
  const VITESSE_MAX_URGENCE = 3.5;
  // Visuel
  const COULEUR_PAREBRISE = "#ADD8E6";
  // Constantes Piétons
  const PIETON_SIZE = 10;
  const PIETON_SPEED = 1.5;
  const PIETON_GENERATION_INTERVAL = 1500;
  const CROSSWALK_WIDTH = largeurRoute;
  const CROSSWALK_HEIGHT = PIETON_SIZE * 1.5;
  const CROSSWALK_MARGIN = 5;
  const VEHICLE_DETECT_PIETON_DISTANCE = 45;
  const PIETON_WAIT_AREA_DEPTH = 20;
  const crosswalkN = {
    x: centreX - largeurRoute / 2,
    y: stopLineNord - CROSSWALK_MARGIN - CROSSWALK_HEIGHT,
    width: CROSSWALK_WIDTH,
    height: CROSSWALK_HEIGHT,
  };
  const crosswalkS = {
    x: centreX - largeurRoute / 2,
    y: stopLineSud + CROSSWALK_MARGIN,
    width: CROSSWALK_WIDTH,
    height: CROSSWALK_HEIGHT,
  };
  const crosswalkW = {
    x: stopLineOuest - CROSSWALK_MARGIN - CROSSWALK_HEIGHT,
    y: centreY - largeurRoute / 2,
    width: CROSSWALK_HEIGHT,
    height: CROSSWALK_WIDTH,
  };
  const crosswalkE = {
    x: stopLineEst + CROSSWALK_MARGIN,
    y: centreY - largeurRoute / 2,
    width: CROSSWALK_HEIGHT,
    height: CROSSWALK_WIDTH,
  };

  // --- Variables Globales ---
  let generationInterval = 700;
  const minInterval = 100;
  const maxInterval = 3000;
  const intervalStep = 100;
  let generationTimerId = null;
  let simulationSpeed = 1.0;
  const minSpeed = 0.1;
  const maxSpeed = 5.0;
  const speedStep = 0.2;
  let stats_infractionsDetectees = 0;
  function incrementInfractionCounter() {
    stats_infractionsDetectees++;
  }
  const couleurs = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#FF33A1",
    "#F1C40F",
    "#9B59B6",
    "#1ABC9C",
    "#E74C3C",
    "#2ECC71",
    "#3498DB",
  ];
  function teintePlusSombre(hexColor) {
    if (!hexColor || hexColor.length !== 7) return "#888888";
    let r = parseInt(hexColor.slice(1, 3), 16);
    let g = parseInt(hexColor.slice(3, 5), 16);
    let b = parseInt(hexColor.slice(5, 7), 16);
    r = Math.max(0, Math.floor(r * 0.6));
    g = Math.max(0, Math.floor(g * 0.6));
    b = Math.max(0, Math.floor(b * 0.6));
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  let emergencyOverrideActive = false;
  let emergencyOverrideDirection = null;
  let pietons = [];
  let pietonGenerationTimerId = null;
  let pietonIdCounter = 0;

  // --- Classe Pieton --- (Inchangée)
  class Pieton {
    constructor(startX, startY, targetX, targetY) {
      this.id = pietonIdCounter++;
      this.x = startX;
      this.y = startY;
      this.size = PIETON_SIZE;
      this.speed = PIETON_SPEED;
      this.etat = "attente";
      this.markedForRemoval = false;
      this.crosswalk = null;
      this.progress = 0;
      if (Math.abs(targetX - startX) > Math.abs(targetY - startY)) {
        if (targetX > startX) {
          this.directionTraversee = "est";
          this.crosswalk = crosswalkE;
          this.startX =
            crosswalkW.x + crosswalkW.width + PIETON_WAIT_AREA_DEPTH;
          this.startY = startY;
          this.endX = crosswalkE.x - PIETON_WAIT_AREA_DEPTH;
          this.endY = startY;
        } else {
          this.directionTraversee = "ouest";
          this.crosswalk = crosswalkW;
          this.startX = crosswalkE.x - PIETON_WAIT_AREA_DEPTH;
          this.startY = startY;
          this.endX = crosswalkW.x + crosswalkW.width + PIETON_WAIT_AREA_DEPTH;
          this.endY = startY;
        }
      } else {
        if (targetY > startY) {
          this.directionTraversee = "sud";
          this.crosswalk = crosswalkS;
          this.startX = startX;
          this.startY = crosswalkN.y - PIETON_WAIT_AREA_DEPTH;
          this.endX = startX;
          this.endY = crosswalkS.y + crosswalkS.height + PIETON_WAIT_AREA_DEPTH;
        } else {
          this.directionTraversee = "nord";
          this.crosswalk = crosswalkN;
          this.startX = startX;
          this.startY =
            crosswalkS.y + crosswalkS.height + PIETON_WAIT_AREA_DEPTH;
          this.endX = startX;
          this.endY = crosswalkN.y - PIETON_WAIT_AREA_DEPTH;
        }
      }
      this.x = this.startX;
      this.y = this.startY;
    }
    dessiner(context) {
      const headRadius = this.size * 0.2;
      const bodyLength = this.size * 0.4;
      const legLength = this.size * 0.4;
      const neckY = this.y - headRadius * 1.5;
      const waistY = neckY + bodyLength;
      context.strokeStyle = "#333333";
      context.fillStyle = "#A020F0";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(this.x, this.y - bodyLength, headRadius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(this.x, this.y - bodyLength + headRadius);
      context.lineTo(this.x, waistY);
      context.stroke();
      const legPhase = Math.sin(
        this.x * 0.1 + this.y * 0.1 + Date.now() * 0.005 * simulationSpeed
      );
      const legAngle1 = (Math.PI / 6) * legPhase;
      const legAngle2 = -(Math.PI / 6) * legPhase;
      context.beginPath();
      context.moveTo(this.x, waistY);
      context.lineTo(
        this.x + Math.sin(legAngle1) * legLength,
        waistY + Math.cos(legAngle1) * legLength
      );
      context.stroke();
      context.beginPath();
      context.moveTo(this.x, waistY);
      context.lineTo(
        this.x + Math.sin(legAngle2) * legLength,
        waistY + Math.cos(legAngle2) * legLength
      );
      context.stroke();
    }
    peutTraverser(feux) {
      let feuParallele1 = null;
      let feuParallele2 = null;
      if (
        this.directionTraversee === "nord" ||
        this.directionTraversee === "sud"
      ) {
        feuParallele1 = feux.find((f) => f.directionControlee === "nord");
        feuParallele2 = feux.find((f) => f.directionControlee === "sud");
      } else {
        feuParallele1 = feux.find((f) => f.directionControlee === "est");
        feuParallele2 = feux.find((f) => f.directionControlee === "ouest");
      }
      return (
        (feuParallele1 && feuParallele1.etat === "vert") ||
        (feuParallele2 && feuParallele2.etat === "vert")
      );
    }
    deplacer(feux, effectiveDeltaTime) {
        
      if (this.markedForRemoval) return;
      if (this.etat === "attente") {
        if (this.peutTraverser(feux)) {
          this.etat = "traverse";
          if (this.directionTraversee === "est") this.x = this.crosswalk.x;
          else if (this.directionTraversee === "ouest")
            this.x = this.crosswalk.x + this.crosswalk.width;
          else if (this.directionTraversee === "sud") this.y = this.crosswalk.y;
          else if (this.directionTraversee === "nord")
            this.y = this.crosswalk.y + this.crosswalk.height;
        } else {
          return;
        }
      }
      if (this.etat === "traverse" && this.crosswalk) {
        const moveDistance = this.speed * simulationSpeed;
        let arrived = false;
        if (this.directionTraversee === "est") {
          this.x += moveDistance;
          if (this.x >= this.crosswalk.x + this.crosswalk.width) arrived = true;
        } else if (this.directionTraversee === "ouest") {
          this.x -= moveDistance;
          if (this.x <= this.crosswalk.x) arrived = true;
        } else if (this.directionTraversee === "sud") {
          this.y += moveDistance;
          if (this.y >= this.crosswalk.y + this.crosswalk.height)
            arrived = true;
        } else if (this.directionTraversee === "nord") {
          this.y -= moveDistance;
          if (this.y <= this.crosswalk.y) arrived = true;
        }
        if (arrived) {
          this.markedForRemoval = true;
        }
      }
    }
  }

  // --- Classe Vehicule (MODIFIÉE pour type, dimensions, couleur, dessin) ---
  class Vehicule {
    constructor(
      x,
      y,
      type = "voiture",
      couleur = "blue",
      vitesseMax = 1.5,
      direction = "est",
      lane = "interieure",
      ignoreRules = false,
      isEmergency = false
    ) {
      // ... (début du constructeur inchangé: x, y, type, isEmergency, dimensions...)
      this.x = x;
      this.y = y;
      this.type = type;
      this.isEmergency = isEmergency;

      if (this.type === "camion" && !this.isEmergency) {
        this.largeurLogique = LARGEUR_CAMION;
        this.hauteurLogique = HAUTEUR_CAMION;
      } else {
        this.largeurLogique = LARGEUR_VOITURE;
        this.hauteurLogique = HAUTEUR_VOITURE;
      }

      this.longueur =
        direction === "nord" || direction === "sud"
          ? this.hauteurLogique
          : this.largeurLogique;
      this.largeurVisuelle =
        direction === "nord" || direction === "sud"
          ? this.largeurLogique
          : this.hauteurLogique;

      this.direction = direction;
      this.lane = lane;
      this.ignoreRules = ignoreRules || this.isEmergency;
      this.vitesseMaxOriginale = vitesseMax;
      this.vitesseMax = this.isEmergency
        ? VITESSE_MAX_URGENCE
        : this.ignoreRules
        ? vitesseMax * FACTEUR_VITESSE_INFRACTION
        : vitesseMax;

      // ... (logique couleur inchangée) ...
      this.couleurBase = couleur;
      if (this.isEmergency) {
        this.couleurAffichage =
          Math.random() < 0.5 ? COULEUR_URGENCE_1 : COULEUR_URGENCE_2;
      } else if (this.type === "camion") {
        this.couleurAffichage = COULEUR_CAMION;
        if (this.ignoreRules) {
          this.couleurAffichage = teintePlusSombre(COULEUR_CAMION);
        }
      } else if (this.ignoreRules) {
        this.couleurAffichage = teintePlusSombre(this.couleurBase);
      } else {
        this.couleurAffichage = this.couleurBase;
      }

      this.vitesseActuelle = 0;
      this.etat = "acceleration";
      this.vientDeFranchirLigneRouge = false;
      this.speedingInfractionDetected = false;
      this.showInfractionMarker = false;
      this.infractionMarkerTimer = 0;
      this.markedForRemoval = false;
      this.doitFreinerPourPieton = false;

      // *** MODIFIÉ: Ajout destination 'gauche' ***
    //   if (this.isEmergency) {
    //     this.destination = "tout_droit"; // Urgences vont tout droit (simplification)
    //   } else {
    //     const rand = Math.random();
    //     if (rand < 0.6) {
    //       // 60% tout droit
    //       this.destination = "tout_droit";
    //     } else if (rand < 0.8) {
    //       // 20% à droite
    //       this.destination = "droite";
    //     } else {
    //       // 20% à gauche
    //       this.destination = "gauche";
    //     }
    //   }
    //   this.afficheClignotant = false;


    const distCligno = DISTANCE_DETECTION_FEU * 1.8;
        this.afficheClignotant = false; // Reset
        if (!this.isEmergency && this.etat !== 'arrete' && !this.etat.startsWith('freinage')) {
             if (this.destination === 'droite' && distFeu > 5 && distFeu < distCligno) {
                 this.afficheClignotant = 'droite'; // Indique quel clignotant
             } else if (this.destination === 'gauche' && distFeu > 5 && distFeu < distCligno + 20) { // Activation un peu plus tôt pour gauche?
                 this.afficheClignotant = 'gauche'; // Indique quel clignotant
             }
        }

      // *** NOUVEAU: Propriétés pour gérer le virage à gauche ***
      this.isTurningLeft = false; // Indique si le véhicule est activement en train de tourner
      this.yieldRequired = false; // Indique s'il faut céder le passage
      this.turnPhase = 0; // 0: approche, 1: entrée intersection, 2: sortie intersection
      this.targetTurnX = null; // Point cible dans l'intersection
      this.targetTurnY = null;
      this.finalDirection = null; // Direction après le virage
    } // Fin constructeur

    // *** MÉTHODE DESSINER MODIFIÉE pour type ***
    dessiner(context) {
      // Utilise les dimensions logiques spécifiques à ce véhicule
      let bodyWidth, bodyHeight;
      if (this.direction === "est" || this.direction === "ouest") {
        bodyWidth = this.largeurLogique;
        bodyHeight = this.hauteurLogique;
      } else {
        // Nord ou Sud
        bodyWidth = this.hauteurLogique; // Inversion pour dessin vertical
        bodyHeight = this.largeurLogique; // Inversion pour dessin vertical
      }

      context.save();
      context.translate(this.x, this.y); // Centre sur la position logique

      // --- Dessin spécifique au type ---
      if (this.type === "camion" && !this.isEmergency) {
        // Dessin simple pour camion: un grand rectangle
        context.fillStyle = this.couleurAffichage;
        context.fillRect(
          -bodyWidth / 2,
          -bodyHeight / 2,
          bodyWidth,
          bodyHeight
        );
        // Optionnel: ajouter une petite cabine?
        let cabineWidth = bodyWidth * 0.25;
        let cabineHeight = bodyHeight * 0.9;
        let cabineOffsetX =
          this.direction === "est" || this.direction === "sud"
            ? bodyWidth / 2 - cabineWidth
            : -bodyWidth / 2;
        context.fillStyle = teintePlusSombre(this.couleurAffichage); // Cabine plus sombre
        context.fillRect(
          cabineOffsetX,
          -cabineHeight / 2,
          cabineWidth,
          cabineHeight
        );
      } else {
        // Voiture ou Urgence (dessin précédent)
        const windshieldRatio = 0.3;
        let windshieldWidth,
          windshieldHeight,
          windshieldOffsetX,
          windshieldOffsetY;

        if (this.direction === "est" || this.direction === "ouest") {
          windshieldWidth = bodyWidth * windshieldRatio;
          windshieldHeight = bodyHeight * 0.8;
          windshieldOffsetY = 0;
          windshieldOffsetX =
            this.direction === "est"
              ? bodyWidth / 2 - windshieldWidth
              : -bodyWidth / 2;
        } else {
          windshieldWidth = bodyWidth * 0.8;
          windshieldHeight = bodyHeight * windshieldRatio;
          windshieldOffsetX = 0;
          windshieldOffsetY =
            this.direction === "sud"
              ? bodyHeight / 2 - windshieldHeight
              : -bodyHeight / 2;
        }
        // Corps voiture
        context.fillStyle = this.couleurAffichage;
        context.fillRect(
          -bodyWidth / 2,
          -bodyHeight / 2,
          bodyWidth,
          bodyHeight
        );
        // Pare-brise voiture
        context.fillStyle = COULEUR_PAREBRISE;
        context.fillRect(
          windshieldOffsetX,
          windshieldOffsetY - windshieldHeight / 2,
          windshieldWidth,
          windshieldHeight
        );
      }
      // --- Fin Dessin spécifique ---

      // --- Éléments communs (gyrophares, marqueur, clignotant) ---
      if (this.isEmergency) {
        // Gyrophares (positionnement relatif au centre)
        const flashSize = 4;
        const flashOffset = 2;
        const isFlashOn = Math.floor(Date.now() / 150) % 2 === 0;
        let flashX1 = -flashSize - flashOffset;
        let flashX2 = flashOffset;
        let flashY = -bodyHeight / 2 - flashSize - 1; // Au dessus
        context.fillStyle = isFlashOn
          ? COULEUR_URGENCE_FLASH_1
          : COULEUR_URGENCE_FLASH_2;
        context.fillRect(flashX1, flashY, flashSize, flashSize);
        context.fillStyle = isFlashOn
          ? COULEUR_URGENCE_FLASH_2
          : COULEUR_URGENCE_FLASH_1;
        context.fillRect(flashX2, flashY, flashSize, flashSize);
      } else if (this.showInfractionMarker) {
        // Marqueur infraction (au dessus)
        context.fillStyle = "red";
        context.fillRect(-2, -bodyHeight / 2 - 5, 4, 4);
      }
    //   if (
    //     !this.isEmergency &&
    //     this.afficheClignotant &&
    //     Math.floor(Date.now() / 250) % 2 === 0
    //   ) {
    //     // Clignotant (position relative au coin)
    //     context.fillStyle = "#FFA500";
    //     let signalSize = 5;
    //     let signalX, signalY;
    //     if (this.direction === "est") {
    //       signalX = bodyWidth / 2 - signalSize;
    //       signalY = bodyHeight / 2 - signalSize;
    //     } else if (this.direction === "ouest") {
    //       signalX = -bodyWidth / 2;
    //       signalY = -bodyHeight / 2;
    //     } else if (this.direction === "sud") {
    //       signalX = -bodyWidth / 2;
    //       signalY = bodyHeight / 2 - signalSize;
    //     } else {
    //       signalX = bodyWidth / 2 - signalSize;
    //       signalY = -bodyHeight / 2;
    //     }
    //     context.fillRect(signalX, signalY, signalSize, signalSize);
    //   }
    //   context.restore();


    if (this.isEmergency) { /* ... gyrophares ... */ }
         else if (this.showInfractionMarker) { /* ... marqueur rouge ... */ }

        // Clignotant (gauche ou droite)
        if (!this.isEmergency && this.afficheClignotant && Math.floor(Date.now() / 250) % 2 === 0) {
            context.fillStyle = '#FFA500'; // Orange
            let signalSize = 5;
            let signalX, signalY;

            // Positionnement relatif au coin approprié selon la direction ET la destination
            if (this.direction === 'est') {
                signalX = bodyWidth / 2 - signalSize; // Arrière
                signalY = (this.afficheClignotant === 'droite') ? (bodyHeight / 2 - signalSize) : (-bodyHeight / 2); // Droite ou Gauche
            } else if (this.direction === 'ouest') {
                signalX = -bodyWidth / 2; // Avant
                signalY = (this.afficheClignotant === 'droite') ? (-bodyHeight / 2) : (bodyHeight / 2 - signalSize); // Droite ou Gauche
            } else if (this.direction === 'sud') {
                signalX = (this.afficheClignotant === 'droite') ? (-bodyWidth / 2) : (bodyWidth / 2 - signalSize); // Gauche ou Droite (vu du dessus)
                signalY = bodyHeight / 2 - signalSize; // Arrière
            } else { // nord
                signalX = (this.afficheClignotant === 'droite') ? (bodyWidth / 2 - signalSize) : (-bodyWidth / 2); // Droite ou Gauche (vu du dessus)
                signalY = -bodyHeight / 2; // Avant
            }
            context.fillRect(signalX, signalY, signalSize, signalSize);
        }
        context.restore();

    }
    // --- Fin méthode dessiner ---

    calculerDistanceAuFeu() {
      let dStop = Infinity;
      let pAvant;
      switch (this.direction) {
        case "est":
          pAvant = this.x + this.largeurLogique / 2;
          dStop = stopLineOuest - pAvant;
          break;
        case "ouest":
          pAvant = this.x - this.largeurLogique / 2;
          dStop = pAvant - stopLineEst;
          break;
        case "sud":
          pAvant = this.y + this.hauteurLogique / 2;
          dStop = stopLineNord - pAvant;
          break;
        case "nord":
          pAvant = this.y - this.hauteurLogique / 2;
          dStop = pAvant - stopLineSud;
          break;
      }
      return dStop;
    }
    verifierPietons(listePietons) {
      this.doitFreinerPourPieton = false;
      if (this.isEmergency) return false;
      let passageRelevant = null;
      let positionAvantVehicule = 0;
      let bordEntreePassage = 0;
      switch (this.direction) {
        case "est":
          passageRelevant = crosswalkW;
          positionAvantVehicule = this.x + this.longueur / 2;
          bordEntreePassage = passageRelevant.x;
          break;
        case "ouest":
          passageRelevant = crosswalkE;
          positionAvantVehicule = this.x - this.longueur / 2;
          bordEntreePassage = passageRelevant.x + passageRelevant.width;
          break;
        case "sud":
          passageRelevant = crosswalkN;
          positionAvantVehicule = this.y + this.longueur / 2;
          bordEntreePassage = passageRelevant.y;
          break;
        case "nord":
          passageRelevant = crosswalkS;
          positionAvantVehicule = this.y - this.longueur / 2;
          bordEntreePassage = passageRelevant.y + passageRelevant.height;
          break;
      }
      if (!passageRelevant) return false;
      let distanceAuBordPassage = Infinity;
      if (this.direction === "est")
        distanceAuBordPassage = bordEntreePassage - positionAvantVehicule;
      else if (this.direction === "ouest")
        distanceAuBordPassage = positionAvantVehicule - bordEntreePassage;
      else if (this.direction === "sud")
        distanceAuBordPassage = bordEntreePassage - positionAvantVehicule;
      else if (this.direction === "nord")
        distanceAuBordPassage = positionAvantVehicule - bordEntreePassage;
      if (
        distanceAuBordPassage < VEHICLE_DETECT_PIETON_DISTANCE &&
        distanceAuBordPassage > -this.longueur / 2
      ) {
        for (const pieton of listePietons) {
          if (
            pieton.etat === "traverse" &&
            pieton.x >= passageRelevant.x &&
            pieton.x <= passageRelevant.x + passageRelevant.width &&
            pieton.y >= passageRelevant.y &&
            pieton.y <= passageRelevant.y + passageRelevant.height
          ) {
            let traverseParallele = false;
            if (
              (this.direction === "est" || this.direction === "ouest") &&
              (pieton.directionTraversee === "est" ||
                pieton.directionTraversee === "ouest")
            ) {
              traverseParallele = true;
            } else if (
              (this.direction === "nord" || this.direction === "sud") &&
              (pieton.directionTraversee === "nord" ||
                pieton.directionTraversee === "sud")
            ) {
              traverseParallele = true;
            }
            if (traverseParallele) {
              this.doitFreinerPourPieton = true;
              return true;
            }
          }
        }
      }
      return false;
    }
    deplacer(feux, autresVehicules, listePietons, effectiveDeltaTime) {
      if (this.markedForRemoval) return;
      let contrainteVoiture = false;
      let vDevant = this.trouverVehiculeDevant(autresVehicules);
      if (vDevant) {
        let d = this.calculerDistanceVehiculeDevant(vDevant);
        if (d < DISTANCE_DETECTION_VOITURE) {
          if (
            d < DISTANCE_SECURITE_MIN ||
            vDevant.vitesseActuelle < this.vitesseActuelle - 0.1 ||
            (vDevant.etat === "arrete" && d < DISTANCE_SECURITE_MIN * 1.5)
          ) {
            contrainteVoiture = true;
          }
        }
      }
      let contrainteFeu = false;
      let feuP = feux.find((f) => f.directionControlee === this.direction);
      let distFeu = this.calculerDistanceAuFeu();
      if (feuP && !this.isEmergency && !this.ignoreRules) {
        let dDetectDyn = DISTANCE_DETECTION_FEU + this.vitesseActuelle * 6;
        if (distFeu < dDetectDyn && distFeu > -this.longueur) {
          if (feuP.etat === "rouge" || feuP.etat === "orange") {
            contrainteFeu = true;
          }
        }
      }
      let contraintePieton = false;
      if (!contrainteFeu || this.ignoreRules || this.isEmergency) {
        contraintePieton = this.verifierPietons(listePietons);
      }
      if (
        feuP &&
        (feuP.etat === "rouge" || feuP.etat === "orange") &&
        this.ignoreRules &&
        !this.isEmergency
      ) {
        const prevX = this.x;
        const prevY = this.y;
        let nextX = this.x,
          nextY = this.y;
        switch (this.direction) {
          case "nord":
            nextY -= this.vitesseActuelle;
            break;
          case "sud":
            nextY += this.vitesseActuelle;
            break;
          case "est":
            nextX += this.vitesseActuelle;
            break;
          case "ouest":
            nextX -= this.vitesseActuelle;
            break;
        }
        let franchissement = false;
        switch (this.direction) {
          case "est":
            franchissement =
              prevX + this.largeurLogique / 2 < stopLineOuest &&
              nextX + this.largeurLogique / 2 >= stopLineOuest;
            break;
          case "ouest":
            franchissement =
              prevX - this.largeurLogique / 2 > stopLineEst &&
              nextX - this.largeurLogique / 2 <= stopLineEst;
            break;
          case "sud":
            franchissement =
              prevY + this.hauteurLogique / 2 < stopLineNord &&
              nextY + this.hauteurLogique / 2 >= stopLineNord;
            break;
          case "nord":
            franchissement =
              prevY - this.hauteurLogique / 2 > stopLineSud &&
              nextY - this.hauteurLogique / 2 <= stopLineSud;
            break;
        }
        if (franchissement && !this.vientDeFranchirLigneRouge) {
          feuP.detecterInfraction();
          this.vientDeFranchirLigneRouge = true;
          this.markedForRemoval = true;
          console.log("NON-URGENCE suppression (FEU)!", this.direction);
          return;
        }
      } else if (feuP && feuP.etat === "vert") {
        this.vientDeFranchirLigneRouge = false;
      }
      if (
        !this.isEmergency &&
        this.ignoreRules &&
        !this.speedingInfractionDetected &&
        this.vitesseActuelle > 0
      ) {
        if (
          this.vitesseActuelle >
          this.vitesseMaxOriginale * SEUIL_DEPASSEMENT_VITESSE
        ) {
          incrementInfractionCounter();
          this.speedingInfractionDetected = true;
          this.showInfractionMarker = true;
          this.infractionMarkerTimer = DUREE_INDICATEUR_INFRACTION * 2;
          console.log(
            "INFRACTION VITESSE!",
            this.direction,
            "V:",
            this.vitesseActuelle.toFixed(1),
            "L:",
            this.vitesseMaxOriginale.toFixed(1)
          );
        }
      }
      if (this.infractionMarkerTimer > 0) {
        this.infractionMarkerTimer -= effectiveDeltaTime;
        if (this.infractionMarkerTimer <= 0) this.showInfractionMarker = false;
      }
      let nouvelEtat = this.etat;
      let nouvelleVitesse = this.vitesseActuelle;
      if (contraintePieton) {
        nouvelEtat = "freinage_pieton";
        nouvelleVitesse -= DECELERATION_FREINAGE;
      } else if (contrainteFeu) {
        nouvelEtat = "freinage_feu";
        nouvelleVitesse -= DECELERATION_FREINAGE;
      } else if (contrainteVoiture) {
        nouvelEtat = "freinage_voiture";
        nouvelleVitesse -= DECELERATION_SUIVI;
        let d = this.calculerDistanceVehiculeDevant(vDevant);
        if (d > DISTANCE_SECURITE_MIN * 1.5) {
          nouvelleVitesse = Math.max(
            nouvelleVitesse,
            Math.min(this.vitesseActuelle, vDevant.vitesseActuelle)
          );
        }
      } else {
        if (this.etat === "arrete" || this.etat.startsWith("freinage")) {
          nouvelEtat = "acceleration";
        }
        if (nouvelEtat === "acceleration") {
          nouvelleVitesse += ACCELERATION;
          let vCible = this.vitesseMax;
          if (
            vDevant &&
            this.calculerDistanceVehiculeDevant(vDevant) <
              DISTANCE_DETECTION_VOITURE * 1.5
          ) {
            vCible = Math.min(vCible, vDevant.vitesseActuelle);
          }
          if (nouvelleVitesse >= vCible) {
            nouvelleVitesse = vCible;
            nouvelEtat = "en_mouvement";
          }
        } else {
          nouvelEtat = "en_mouvement";
          let vCibleFinale = this.vitesseMax;
          if (
            vDevant &&
            this.calculerDistanceVehiculeDevant(vDevant) <
              DISTANCE_DETECTION_VOITURE * 1.5
          ) {
            vCibleFinale = Math.min(vCibleFinale, vDevant.vitesseActuelle);
          }
          if (nouvelleVitesse < vCibleFinale) {
            nouvelleVitesse += ACCELERATION;
            nouvelleVitesse = Math.min(nouvelleVitesse, vCibleFinale);
          } else if (nouvelleVitesse > vCibleFinale) {
            nouvelleVitesse -= DECELERATION_SUIVI;
          }
        }
      }
      this.etat = nouvelEtat;
      this.vitesseActuelle = Math.max(0, nouvelleVitesse);
      if (this.etat.startsWith("freinage") && this.vitesseActuelle === 0) {
        this.etat = "arrete";
      }
      if (this.vitesseActuelle > 0) {
        switch (this.direction) {
          case "nord":
            this.y -= this.vitesseActuelle;
            break;
          case "sud":
            this.y += this.vitesseActuelle;
            break;
          case "est":
            this.x += this.vitesseActuelle;
            break;
          case "ouest":
            this.x -= this.vitesseActuelle;
            break;
        }
      }
      const distCligno = DISTANCE_DETECTION_FEU * 1.8;
      if (
        !this.isEmergency &&
        this.destination === "droite" &&
        distFeu > 5 &&
        distFeu < distCligno &&
        this.etat !== "arrete" &&
        !this.etat.startsWith("freinage")
      ) {
        this.afficheClignotant = true;
      } else {
        this.afficheClignotant = false;
      }
      let checkWidth =
        this.direction === "nord" || this.direction === "sud"
          ? this.hauteurLogique
          : this.largeurLogique;
      let checkHeight =
        this.direction === "nord" || this.direction === "sud"
          ? this.largeurLogique
          : this.hauteurLogique;
      if (this.direction === "est" && this.x - checkWidth / 2 > canvasWidth) {
        this.markedForRemoval = true;
      } else if (this.direction === "ouest" && this.x + checkWidth / 2 < 0) {
        this.markedForRemoval = true;
      } else if (
        this.direction === "sud" &&
        this.y - checkHeight / 2 > canvasHeight
      ) {
        this.markedForRemoval = true;
      } else if (this.direction === "nord" && this.y + checkHeight / 2 < 0) {
        this.markedForRemoval = true;
      }
    }
    trouverVehiculeDevant(autresV) {
      let vP = null;
      let dM = Infinity;
      for (const autre of autresV) {
        if (
          autre === this ||
          autre.direction !== this.direction ||
          autre.lane !== this.lane
        )
          continue;
        let d = -1;
        let eD = false;
        switch (this.direction) {
          case "est":
            if (autre.x > this.x) {
              d = autre.x - autre.longueur / 2 - (this.x + this.longueur / 2);
              eD = true;
            }
            break;
          case "ouest":
            if (autre.x < this.x) {
              d = this.x - this.longueur / 2 - (autre.x + autre.longueur / 2);
              eD = true;
            }
            break;
          case "sud":
            if (autre.y > this.y) {
              d = autre.y - autre.longueur / 2 - (this.y + this.longueur / 2);
              eD = true;
            }
            break;
          case "nord":
            if (autre.y < this.y) {
              d = this.y - this.longueur / 2 - (autre.y + autre.longueur / 2);
              eD = true;
            }
            break;
        }
        if (eD && d < dM && d >= -this.longueur) {
          dM = d;
          vP = autre;
        }
      }
      return vP;
    }
    calculerDistanceVehiculeDevant(vD) {
      if (!vD) return Infinity;
      switch (this.direction) {
        case "est":
          return vD.x - vD.longueur / 2 - (this.x + this.longueur / 2);
        case "ouest":
          return this.x - this.longueur / 2 - (vD.x + vD.longueur / 2);
        case "sud":
          return vD.y - vD.longueur / 2 - (this.y + this.longueur / 2);
        case "nord":
          return this.y - this.longueur / 2 - (vD.y + vD.longueur / 2);
        default:
          return Infinity;
      }
    }
  }

  // --- Classe FeuTricolore --- (Inchangée)
  class FeuTricolore {
    constructor(x, y, taille = 15, directionControlee, etatInitial = "rouge") {
      this.x = x;
      this.y = y;
      this.taille = taille;
      this.directionControlee = directionControlee;
      this.etat = etatInitial;
      this.couleurRougeOn = "#FF0000";
      this.couleurOrangeOn = "#FFA500";
      this.couleurVertOn = "#00FF00";
      this.couleurOff = "#444444";
      this.infractionDetectee = false;
      this.tempsRestantInfraction = 0;
    }
    dessiner(context) {
      let bW = this.taille * 2 + 10;
      let bH = this.taille * 6 + 20;
      let cR = this.taille;
      let cXB = this.x + bW / 2;
      context.fillStyle = "#222222";
      context.fillRect(this.x, this.y, bW, bH);
      if (this.infractionDetectee && this.tempsRestantInfraction > 0) {
        if (
          Math.floor(
            this.tempsRestantInfraction / (DUREE_INDICATEUR_INFRACTION / 4)
          ) %
            2 ===
          0
        ) {
          context.strokeStyle = "red";
          context.lineWidth = 3;
          context.strokeRect(this.x - 2, this.y - 2, bW + 4, bH + 4);
        }
      }
      let yR = this.y + this.taille + 5;
      let yO = yR + this.taille * 2 + 5;
      let yV = yO + this.taille * 2 + 5;
      context.beginPath();
      context.arc(cXB, yR, cR, 0, Math.PI * 2);
      context.fillStyle =
        this.etat === "rouge" ? this.couleurRougeOn : this.couleurOff;
      context.fill();
      context.strokeStyle = "#111";
      context.lineWidth = 1;
      context.stroke();
      context.beginPath();
      context.arc(cXB, yO, cR, 0, Math.PI * 2);
      context.fillStyle =
        this.etat === "orange" ? this.couleurOrangeOn : this.couleurOff;
      context.fill();
      context.stroke();
      context.beginPath();
      context.arc(cXB, yV, cR, 0, Math.PI * 2);
      context.fillStyle =
        this.etat === "vert" ? this.couleurVertOn : this.couleurOff;
      context.fill();
      context.stroke();
    }
    changerEtat(nE) {
      if (["rouge", "orange", "vert"].includes(nE)) this.etat = nE;
      else console.warn("Etat feu invalide:", nE);
    }
    detecterInfraction() {
      if (!this.infractionDetectee) {
        this.infractionDetectee = true;
        this.tempsRestantInfraction = DUREE_INDICATEUR_INFRACTION;
        incrementInfractionCounter();
      }
    }
    update(effectiveDeltaTime) {
      if (this.tempsRestantInfraction > 0) {
        this.tempsRestantInfraction -= effectiveDeltaTime;
        if (this.tempsRestantInfraction <= 0) {
          this.tempsRestantInfraction = 0;
          this.infractionDetectee = false;
        }
      }
    }
  }

  // --- Gestion des Véhicules ---
  let vehicules = [];
  // *** MODIFIÉ: genererVehicule choisit le type ***
  function genererVehicule() {
    if (vehicules.length > 45) return;

    let x,
      y,
      direction,
      lane,
      couleurBase,
      vitesse,
      isEmergency = false,
      ignoreRules = false;
    let typeVehicule = "voiture"; // Type par défaut

    // Déterminer si urgence
    if (Math.random() < PROBA_EMERGENCY) {
      isEmergency = true;
      ignoreRules = true;
      vitesse = VITESSE_MAX_URGENCE;
      couleurBase = couleurs[Math.floor(Math.random() * couleurs.length)]; // Couleur de base aléatoire même pour urgence
      typeVehicule = "voiture"; // Les urgences sont des voitures pour l'instant
    } else {
      // Si pas urgence, déterminer si voiture ou camion
      if (Math.random() < PROBA_CAMION) {
        typeVehicule = "camion";
        vitesse = 1.2 + Math.random() * 1.0; // Vitesse camion un peu plus basse et moins variable
        couleurBase = COULEUR_CAMION; // Sera utilisé si pas infractionniste
      } else {
        // Voiture normale
        typeVehicule = "voiture";
        vitesse = 1.5 + Math.random() * 1.5;
        couleurBase = couleurs[Math.floor(Math.random() * couleurs.length)];
      }
      // Déterminer si infractionniste (s'applique aux voitures et camions non-urgence)
      ignoreRules = Math.random() < PROBA_INFRACTION;
    }

    // Choisir point d'entrée et voie (inchangé)
    const pE = Math.floor(Math.random() * 4);
    lane = Math.random() < 0.5 ? "interieure" : "exterieure";
    switch (pE) {
      case 0:
        dir = "est";
        y = lane === "interieure" ? voieEstInterieureY : voieEstExterieureY;
        x = -(typeVehicule === "camion" ? LARGEUR_CAMION : LARGEUR_VOITURE) / 2;
        break;
      case 1:
        dir = "ouest";
        y = lane === "interieure" ? voieOuestInterieureY : voieOuestExterieureY;
        x =
          canvasWidth +
          (typeVehicule === "camion" ? LARGEUR_CAMION : LARGEUR_VOITURE) / 2;
        break;
      case 2:
        dir = "sud";
        x = lane === "interieure" ? voieSudInterieureX : voieSudExterieureX;
        y = -(typeVehicule === "camion" ? HAUTEUR_CAMION : HAUTEUR_VOITURE) / 2;
        break; // Utilise hauteur ici car vertical
      case 3:
        dir = "nord";
        x = lane === "interieure" ? voieNordInterieureX : voieNordExterieureX;
        y =
          canvasHeight +
          (typeVehicule === "camion" ? HAUTEUR_CAMION : HAUTEUR_VOITURE) / 2;
        break; // Utilise hauteur ici
    }

    // Crée le véhicule avec son type
    let nV = new Vehicule(
      x,
      y,
      typeVehicule,
      couleurBase,
      vitesse,
      dir,
      lane,
      ignoreRules,
      isEmergency
    );
    vehicules.push(nV);
  }
  // *** FIN genererVehicule MODIFIÉ ***

  // --- Gestion des Piétons --- (Inchangée)
  function genererPieton() {
    if (pietons.length > 15) return;
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    switch (side) {
      case 0:
        startX = centreX - largeurRoute / 2 + Math.random() * largeurRoute;
        startY = crosswalkN.y - PIETON_WAIT_AREA_DEPTH * Math.random();
        targetX = startX;
        targetY =
          crosswalkS.y +
          crosswalkS.height +
          PIETON_WAIT_AREA_DEPTH * Math.random();
        break;
      case 1:
        startX = centreX - largeurRoute / 2 + Math.random() * largeurRoute;
        startY =
          crosswalkS.y +
          crosswalkS.height +
          PIETON_WAIT_AREA_DEPTH * Math.random();
        targetX = startX;
        targetY = crosswalkN.y - PIETON_WAIT_AREA_DEPTH * Math.random();
        break;
      case 2:
        startX = crosswalkW.x - PIETON_WAIT_AREA_DEPTH * Math.random();
        startY = centreY - largeurRoute / 2 + Math.random() * largeurRoute;
        targetX =
          crosswalkE.x +
          crosswalkE.width +
          PIETON_WAIT_AREA_DEPTH * Math.random();
        targetY = startY;
        break;
      case 3:
        startX =
          crosswalkE.x +
          crosswalkE.width +
          PIETON_WAIT_AREA_DEPTH * Math.random();
        startY = centreY - largeurRoute / 2 + Math.random() * largeurRoute;
        targetX = crosswalkW.x - PIETON_WAIT_AREA_DEPTH * Math.random();
        targetY = startY;
        break;
    }
    if (startX && startY && targetX && targetY) {
      let nouveauPieton = new Pieton(startX, startY, targetX, targetY);
      pietons.push(nouveauPieton);
    }
  }

  // --- Gestion des Feux --- (Inchangée)
  let feuxTricolores = [];
  feuxTricolores.push(
    new FeuTricolore(
      stopLineOuest - 15 * 2 - 15,
      voieEstExterieureY - 15,
      15,
      "est"
    )
  );
  feuxTricolores.push(
    new FeuTricolore(stopLineEst + 15, voieOuestInterieureY + 5, 15, "ouest")
  );
  feuxTricolores.push(
    new FeuTricolore(
      voieSudExterieureX - 15 * 2 - 15,
      stopLineNord - 15 * 6 - 30,
      15,
      "sud"
    )
  );
  feuxTricolores.push(
    new FeuTricolore(voieNordExterieureX + 15, stopLineSud + 15, 15, "nord")
  );
  let etatCycleGlobal = "EO_VERT";
  let tempsRestantEtat = DUREE_VERT_MIN;
  let dernierTemps = 0;
  mettreAJourEtatFeux();
  function mettreAJourEtatFeux(oDir = null) {
    for (const f of feuxTricolores) {
      let eC = "rouge";
      if (oDir) {
        if (oDir === "est" || oDir === "ouest") {
          if (
            f.directionControlee === "est" ||
            f.directionControlee === "ouest"
          )
            eC = "vert";
        } else {
          if (f.directionControlee === "nord" || f.directionControlee === "sud")
            eC = "vert";
        }
      } else {
        switch (etatCycleGlobal) {
          case "EO_VERT":
            if (
              f.directionControlee === "est" ||
              f.directionControlee === "ouest"
            )
              eC = "vert";
            break;
          case "EO_ORANGE":
            if (
              f.directionControlee === "est" ||
              f.directionControlee === "ouest"
            )
              eC = "orange";
            break;
          case "NS_VERT":
            if (
              f.directionControlee === "nord" ||
              f.directionControlee === "sud"
            )
              eC = "vert";
            break;
          case "NS_ORANGE":
            if (
              f.directionControlee === "nord" ||
              f.directionControlee === "sud"
            )
              eC = "orange";
            break;
        }
      }
      f.changerEtat(eC);
    }
  }
  function compterVoituresEnAttente(dir, vL) {
    let c = 0;
    for (const v of vL) {
      if (v.direction === dir && v.etat === "arrete") {
        let att = false;
        switch (dir) {
          case "est":
            att =
              v.x < stopLineOuest &&
              v.x > stopLineOuest - ZONE_DETECTION_ATTENTE;
            break;
          case "ouest":
            att =
              v.x > stopLineEst && v.x < stopLineEst + ZONE_DETECTION_ATTENTE;
            break;
          case "sud":
            att =
              v.y < stopLineNord && v.y > stopLineNord - ZONE_DETECTION_ATTENTE;
            break;
          case "nord":
            att =
              v.y > stopLineSud && v.y < stopLineSud + ZONE_DETECTION_ATTENTE;
            break;
        }
        if (att) c++;
      }
    }
    return c;
  }
  function calculerDureeVert(cPV, cSR) {
    let d = DUREE_VERT_MIN + cPV * TEMPS_PAR_VOITURE;
    return Math.max(DUREE_VERT_MIN, Math.min(d, DUREE_VERT_MAX));
  }
  function cycleSuivant(tempsActuel, effectiveDeltaTime, vList) {
    if (emergencyOverrideActive) {
      mettreAJourEtatFeux(emergencyOverrideDirection);
      return;
    }
    tempsRestantEtat -= effectiveDeltaTime;
    if (tempsRestantEtat <= 0) {
      let pD = DUREE_VERT_MIN;
      switch (etatCycleGlobal) {
        case "EO_VERT":
          etatCycleGlobal = "EO_ORANGE";
          tempsRestantEtat = DUREE_ORANGE;
          break;
        case "EO_ORANGE":
          let cN = compterVoituresEnAttente("nord", vList),
            cS = compterVoituresEnAttente("sud", vList),
            cEO = compterVoituresEnAttente("est", vList),
            cOO = compterVoituresEnAttente("ouest", vList);
          pD = calculerDureeVert(cN + cS, cEO + cOO);
          etatCycleGlobal = "NS_VERT";
          tempsRestantEtat = pD;
          break;
        case "NS_VERT":
          etatCycleGlobal = "NS_ORANGE";
          tempsRestantEtat = DUREE_ORANGE;
          break;
        case "NS_ORANGE":
          let cE = compterVoituresEnAttente("est", vList),
            cO = compterVoituresEnAttente("ouest", vList),
            cNO = compterVoituresEnAttente("nord", vList),
            cSO = compterVoituresEnAttente("sud", vList);
          pD = calculerDureeVert(cE + cO, cNO + cSO);
          etatCycleGlobal = "EO_VERT";
          tempsRestantEtat = pD;
          break;
      }
      mettreAJourEtatFeux();
    }
  }
  function checkForEmergencyOverride(vL) {
    let nO = false;
    let oD = null;
    for (const v of vL) {
      if (v.isEmergency) {
        const d = v.calculerDistanceAuFeu();
        if (d > 0 && d < EMERGENCY_DETECTION_DISTANCE) {
          nO = true;
          oD = v.direction;
          break;
        }
      }
    }
    if (nO) {
      if (!emergencyOverrideActive)
        console.log(
          `%cURGENCE: VERT pour ${oD}`,
          "color: red; font-weight: bold;"
        );
      emergencyOverrideActive = true;
      emergencyOverrideDirection = oD;
    } else {
      if (emergencyOverrideActive) {
        console.log("%cFin override urgence.", "color: green;");
        mettreAJourEtatFeux();
      }
      emergencyOverrideActive = false;
      emergencyOverrideDirection = null;
    }
  }

  // --- Fonctions de Dessin --- (Inchangées)
  function dessinerCarrefour() {
    ctx.fillStyle = "#666";
    ctx.fillRect(centreX - largeurRoute / 2, 0, largeurRoute, canvasHeight);
    ctx.fillRect(0, centreY - largeurRoute / 2, canvasWidth, largeurRoute);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(centreX, 0);
    ctx.lineTo(centreX, centreY - largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX, canvasHeight);
    ctx.lineTo(centreX, centreY + largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centreY);
    ctx.lineTo(centreX - largeurRoute / 2, centreY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvasWidth, centreY);
    ctx.lineTo(centreX + largeurRoute / 2, centreY);
    ctx.stroke();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centreY - largeurRoute / 4);
    ctx.lineTo(centreX - largeurRoute / 2, centreY - largeurRoute / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvasWidth, centreY - largeurRoute / 4);
    ctx.lineTo(centreX + largeurRoute / 2, centreY - largeurRoute / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centreY + largeurRoute / 4);
    ctx.lineTo(centreX - largeurRoute / 2, centreY + largeurRoute / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvasWidth, centreY + largeurRoute / 4);
    ctx.lineTo(centreX + largeurRoute / 2, centreY + largeurRoute / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX - largeurRoute / 4, 0);
    ctx.lineTo(centreX - largeurRoute / 4, centreY - largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX - largeurRoute / 4, canvasHeight);
    ctx.lineTo(centreX - largeurRoute / 4, centreY + largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX + largeurRoute / 4, 0);
    ctx.lineTo(centreX + largeurRoute / 4, centreY - largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX + largeurRoute / 4, canvasHeight);
    ctx.lineTo(centreX + largeurRoute / 4, centreY + largeurRoute / 2);
    ctx.stroke();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(stopLineOuest, centreY - largeurRoute / 2);
    ctx.lineTo(stopLineOuest, centreY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(stopLineEst, centreY);
    ctx.lineTo(stopLineEst, centreY + largeurRoute / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX - largeurRoute / 2, stopLineNord);
    ctx.lineTo(centreX, stopLineNord);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centreX, stopLineSud);
    ctx.lineTo(centreX + largeurRoute / 2, stopLineSud);
    ctx.stroke();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    const stripeLength = 15;
    const stripeGap = 10;
    for (
      let x = crosswalkN.x;
      x < crosswalkN.x + crosswalkN.width;
      x += stripeLength + stripeGap
    ) {
      ctx.beginPath();
      ctx.moveTo(x, crosswalkN.y + ctx.lineWidth);
      ctx.lineTo(x + stripeLength, crosswalkN.y + ctx.lineWidth);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, crosswalkN.y + crosswalkN.height - ctx.lineWidth);
      ctx.lineTo(
        x + stripeLength,
        crosswalkN.y + crosswalkN.height - ctx.lineWidth
      );
      ctx.stroke();
    }
    for (
      let x = crosswalkS.x;
      x < crosswalkS.x + crosswalkS.width;
      x += stripeLength + stripeGap
    ) {
      ctx.beginPath();
      ctx.moveTo(x, crosswalkS.y + ctx.lineWidth);
      ctx.lineTo(x + stripeLength, crosswalkS.y + ctx.lineWidth);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, crosswalkS.y + crosswalkS.height - ctx.lineWidth);
      ctx.lineTo(
        x + stripeLength,
        crosswalkS.y + crosswalkS.height - ctx.lineWidth
      );
      ctx.stroke();
    }
    for (
      let y = crosswalkW.y;
      y < crosswalkW.y + crosswalkW.height;
      y += stripeLength + stripeGap
    ) {
      ctx.beginPath();
      ctx.moveTo(crosswalkW.x + ctx.lineWidth, y);
      ctx.lineTo(crosswalkW.x + ctx.lineWidth, y + stripeLength);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(crosswalkW.x + crosswalkW.width - ctx.lineWidth, y);
      ctx.lineTo(
        crosswalkW.x + crosswalkW.width - ctx.lineWidth,
        y + stripeLength
      );
      ctx.stroke();
    }
    for (
      let y = crosswalkE.y;
      y < crosswalkE.y + crosswalkE.height;
      y += stripeLength + stripeGap
    ) {
      ctx.beginPath();
      ctx.moveTo(crosswalkE.x + ctx.lineWidth, y);
      ctx.lineTo(crosswalkE.x + ctx.lineWidth, y + stripeLength);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(crosswalkE.x + crosswalkE.width - ctx.lineWidth, y);
      ctx.lineTo(
        crosswalkE.x + crosswalkE.width - ctx.lineWidth,
        y + stripeLength
      );
      ctx.stroke();
    }
  }
  function dessinerStatistiques(context) {
    const nombreVehicules = vehicules.length;
    const xPos = 10;
    const yPos = 20;
    const lineHeight = 18;
    const padding = 5;
    const statsWidth = 180;
    let countNord = 0;
    let countSud = 0;
    let countEst = 0;
    let countOuest = 0;
    for (const v of vehicules) {
      switch (v.direction) {
        case "nord":
          countNord++;
          break;
        case "sud":
          countSud++;
          break;
        case "est":
          countEst++;
          break;
        case "ouest":
          countOuest++;
          break;
      }
    }
    let numLines = 4;
    if (emergencyOverrideActive) numLines++;
    const statsHeight = lineHeight * numLines + padding * numLines;
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(
      xPos - padding,
      yPos - lineHeight,
      statsWidth,
      statsHeight
    );
    context.fillStyle = "white";
    context.font = "14px Arial";
    context.textAlign = "left";
    let currentY = yPos;
    context.fillText(`Véhicules : ${nombreVehicules}`, xPos, currentY);
    currentY += lineHeight;
    context.fillText(
      `Infractions: ${stats_infractionsDetectees}`,
      xPos,
      currentY
    );
    currentY += lineHeight;
    context.fillText(
      `Dir Est: ${countEst} | Ouest: ${countOuest}`,
      xPos,
      currentY
    );
    currentY += lineHeight;
    context.fillText(
      `Dir Sud: ${countSud} | Nord: ${countNord}`,
      xPos,
      currentY
    );
    currentY += lineHeight;
    if (emergencyOverrideActive) {
      context.fillStyle = "yellow";
      context.fillText(
        `URGENCE (${emergencyOverrideDirection})`,
        xPos,
        currentY
      );
    }
  }
  function dessinerScene() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    dessinerCarrefour();
    for (const feu of feuxTricolores) feu.dessiner(ctx);
    const visiblePietons = pietons.filter((p) => !p.markedForRemoval);
    for (const p of visiblePietons) p.dessiner(ctx);
    const visibleVehicles = vehicules.filter((v) => !v.markedForRemoval);
    for (const v of visibleVehicles) v.dessiner(ctx);
    dessinerStatistiques(ctx);
  }

  // --- Boucle d'Animation --- (Inchangée)
  let tempsAnimationPrecedent = 0;
  function animate(tempsActuel) {
    try {
      if (tempsAnimationPrecedent === 0) tempsAnimationPrecedent = tempsActuel;
      let deltaTime = tempsActuel - tempsAnimationPrecedent;
      tempsAnimationPrecedent = tempsActuel;
      if (deltaTime <= 0) deltaTime = 1;
      if (deltaTime > 100) deltaTime = 16.6;
      let effectiveDeltaTime = deltaTime * simulationSpeed;

      const vehiculesActuels = [...vehicules];
      const pietonsActuels = [...pietons];

      checkForEmergencyOverride(vehiculesActuels);
      cycleSuivant(tempsActuel, effectiveDeltaTime, vehiculesActuels);
      for (const feu of feuxTricolores) {
        feu.update(effectiveDeltaTime);
      }
      for (const p of pietons) {
        if (!p.markedForRemoval) {
          p.deplacer(feuxTricolores, effectiveDeltaTime);
        }
      }
      for (const v of vehicules) {
        if (!v.markedForRemoval) {
          v.deplacer(
            feuxTricolores,
            vehiculesActuels,
            pietonsActuels,
            effectiveDeltaTime
          );
        }
      }

      vehicules = vehicules.filter((v) => !v.markedForRemoval);
      pietons = pietons.filter((p) => !p.markedForRemoval);

      dessinerScene();
      requestAnimationFrame(animate);
    } catch (error) {
      console.error("ERREUR dans la boucle d'animation:", error);
      // alert("Une erreur s'est produite dans la simulation. Vérifiez la console (F12).");
    }
  }

  // --- Fonctions pour les Contrôles --- (Inchangées)
  function updateDensityInfo() {
    if (densityInfoSpan) {
      densityInfoSpan.textContent = `Intervalle: ${generationInterval} ms`;
    }
  }
  function startGeneration() {
    if (generationTimerId !== null) clearInterval(generationTimerId);
    generationTimerId = setInterval(genererVehicule, generationInterval);
    console.log(`Nouvel intervalle gén véhicule: ${generationInterval} ms`);
  }
  function updateSpeedInfo() {
    if (speedInfoSpan) {
      speedInfoSpan.textContent = `Vitesse: x${simulationSpeed.toFixed(1)}`;
    }
    console.log(`Nouvelle vitesse: x${simulationSpeed.toFixed(1)}`);
  }

  // --- Écouteurs d'Événements pour les Boutons --- (Inchangés)
  if (increaseDensityBtn) {
    increaseDensityBtn.addEventListener("click", () => {
      generationInterval = Math.max(
        minInterval,
        generationInterval - intervalStep
      );
      updateDensityInfo();
      startGeneration();
    });
  }
  if (decreaseDensityBtn) {
    decreaseDensityBtn.addEventListener("click", () => {
      generationInterval = Math.min(
        maxInterval,
        generationInterval + intervalStep
      );
      updateDensityInfo();
      startGeneration();
    });
  }
  if (slowDownBtn) {
    slowDownBtn.addEventListener("click", () => {
      simulationSpeed = Math.max(minSpeed, simulationSpeed - speedStep);
      updateSpeedInfo();
    });
  }
  if (speedUpBtn) {
    speedUpBtn.addEventListener("click", () => {
      simulationSpeed = Math.min(maxSpeed, simulationSpeed + speedStep);
      updateSpeedInfo();
    });
  }

  // --- Démarrage --- (Inchangé)
  try {
    console.log("Démarrage simulation : Ajout types véhicules (camions).");
    for (let i = 0; i < 15; i++) {
      genererVehicule();
    }
    updateDensityInfo();
    updateSpeedInfo();
    startGeneration();
    if (pietonGenerationTimerId !== null)
      clearInterval(pietonGenerationTimerId);
    pietonGenerationTimerId = setInterval(
      genererPieton,
      PIETON_GENERATION_INTERVAL
    );
    console.log(`Intervalle gén piéton: ${PIETON_GENERATION_INTERVAL} ms`);
    animate(0);
  } catch (error) {
    console.error("ERREUR lors de l'initialisation:", error);
    alert(
      "Une erreur s'est produite lors de l'initialisation de la simulation. Vérifiez la console (F12)."
    );
  }
}; // Fin de window.onload
