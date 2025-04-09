window.onload = function() {

    const canvas = document.getElementById('simulationCanvas');
    if (!canvas) { console.error("Erreur : Canvas introuvable !"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Erreur : Contexte 2D non supporté."); alert("Canvas non supporté."); return; }

    // --- Configuration et Constantes ---
    const canvasWidth = 800; const canvasHeight = 600; canvas.width = canvasWidth; canvas.height = canvasHeight;
    const largeurRoute = 200; const largeurVoie = largeurRoute / 4;
    const centreX = canvasWidth / 2; const centreY = canvasHeight / 2;
    const voieEstExterieureY = centreY - largeurVoie * 1.5; const voieEstInterieureY = centreY - largeurVoie * 0.5;
    const voieOuestInterieureY = centreY + largeurVoie * 0.5; const voieOuestExterieureY = centreY + largeurVoie * 1.5;
    const voieSudExterieureX = centreX - largeurVoie * 1.5; const voieSudInterieureX = centreX - largeurVoie * 0.5;
    const voieNordInterieureX = centreX + largeurVoie * 0.5; const voieNordExterieureX = centreX + largeurVoie * 1.5;
    const largeurVoiture = 30; const hauteurVoiture = 15;
    const DUREE_ORANGE = 2000; const DUREE_VERT_MIN = 4000; const DUREE_VERT_MAX = 15000; const TEMPS_PAR_VOITURE = 500; const ZONE_DETECTION_ATTENTE = 150;
    const stopLineOuest = centreX - largeurRoute / 2 - 10; const stopLineEst = centreX + largeurRoute / 2 + 10;
    const stopLineNord = centreY - largeurRoute / 2 - 10; const stopLineSud = centreY + largeurRoute / 2 + 10;
    const ACCELERATION = 0.03; const DECELERATION_FREINAGE = 0.1; const DECELERATION_SUIVI = 0.05; const DISTANCE_DETECTION_FEU = 70; const DISTANCE_SECURITE_MIN = 15; const DISTANCE_DETECTION_VOITURE = 60;
    const PROBA_INFRACTION = 0.2; // Probabilité qu'un véhicule NORMAL soit infractionniste
    const FACTEUR_VITESSE_INFRACTION = 1.5;
    const SEUIL_DEPASSEMENT_VITESSE = 1.1;
    const DUREE_INDICATEUR_INFRACTION = 1000;
    // <-- NOUVEAU: Constantes pour véhicules d'urgence -->
    const PROBA_EMERGENCY = 0.04; // 2 chances sur 10 (20%) qu'un véhicule généré soit d'urgence
    const EMERGENCY_DETECTION_DISTANCE = 200; // Distance à laquelle l'urgence force le feu
    const COULEUR_URGENCE_1 = '#FF0000'; // Rouge (Pompier)
    const COULEUR_URGENCE_2 = '#0000FF'; // Bleu (Police)
    const COULEUR_URGENCE_FLASH_1 = '#FF0000';
    const COULEUR_URGENCE_FLASH_2 = '#0000FF';
    const VITESSE_MAX_URGENCE = 3.5; // Vitesse max spécifique pour les urgences

    // --- Variables Globales & Fonctions Utilitaires ---
    let stats_infractionsDetectees = 0;
    function incrementInfractionCounter() {
        stats_infractionsDetectees++;
    }
    const couleurs = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C', '#2ECC71', '#3498DB'];
    function teintePlusSombre(hexColor) { if(!hexColor || hexColor.length !== 7) return '#888888'; let r = parseInt(hexColor.slice(1, 3), 16); let g = parseInt(hexColor.slice(3, 5), 16); let b = parseInt(hexColor.slice(5, 7), 16); r = Math.floor(r / 1.5); g = Math.floor(g / 1.5); b = Math.floor(b / 1.5); return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`; }

    // <-- NOUVEAU: Variables globales pour la gestion de l'override des feux par urgence -->
    let emergencyOverrideActive = false;
    let emergencyOverrideDirection = null;


    // --- Classe Vehicule --- (MODIFIÉE pour urgence)
    class Vehicule {
        // <-- MODIFIÉ: Ajout du paramètre isEmergency -->
        constructor(x, y, largeur, hauteur, couleur = 'blue', vitesseMax = 1, direction = 'est', lane = 'interieure', ignoreRules = false, isEmergency = false) {
            this.x = x; this.y = y; this.largeur = largeur; this.hauteur = hauteur;
            this.direction = direction; this.lane = lane;
            this.isEmergency = isEmergency; // <-- NOUVEAU: Flag véhicule d'urgence
            this.ignoreRules = ignoreRules || this.isEmergency; // Urgence ignore toujours les règles de base

            this.vitesseMaxOriginale = vitesseMax;
            // <-- MODIFIÉ: Vitesse max spécifique si urgence -->
            this.vitesseMax = this.isEmergency ? VITESSE_MAX_URGENCE : (this.ignoreRules ? vitesseMax * FACTEUR_VITESSE_INFRACTION : vitesseMax);

            // <-- MODIFIÉ: Couleur spécifique si urgence -->
            if (this.isEmergency) {
                // Alternance simple pour la couleur de base de l'urgence
                this.couleur = (Math.random() < 0.5) ? COULEUR_URGENCE_1 : COULEUR_URGENCE_2;
            } else if (this.ignoreRules && !this.isEmergency) {
                 this.couleur = teintePlusSombre(couleur);
            } else {
                 this.couleur = couleur;
            }

            this.vitesseActuelle = 0; this.etat = 'acceleration';
            this.longueur = (this.direction === 'nord' || this.direction === 'sud') ? this.hauteur : this.largeur;
            this.largeurVisuelle = (this.direction === 'nord' || this.direction === 'sud') ? this.largeur : this.hauteur;
            this.vientDeFranchirLigneRouge = false;
            this.speedingInfractionDetected = false;
            this.markedForRemoval = false;

            this.destination = (Math.random() < 0.8 || this.isEmergency) ? 'tout_droit' : 'droite'; // Urgences vont souvent tout droit
            this.afficheClignotant = false;
        }

        dessiner(context) {
            let drawWidth = (this.direction === 'nord' || this.direction === 'sud') ? this.largeurVisuelle : this.longueur;
            let drawHeight = (this.direction === 'nord' || this.direction === 'sud') ? this.longueur : this.largeurVisuelle;
            let drawX = this.x - drawWidth / 2;
            let drawY = this.y - drawHeight / 2;

            context.fillStyle = this.couleur;
            context.fillRect(drawX, drawY, drawWidth, drawHeight);

             // <-- MODIFIÉ: Ajout des feux clignotants pour l'urgence -->
             if (this.isEmergency) {
                const flashSize = 4;
                const flashOffset = 2;
                const isFlashOn = Math.floor(Date.now() / 150) % 2 === 0; // Change toutes les 150ms

                // Positionnement simplifié sur le "toit"
                let flashX1 = drawX + drawWidth / 2 - flashSize - flashOffset;
                let flashX2 = drawX + drawWidth / 2 + flashOffset;
                let flashY = drawY; // Sur le bord avant dans la direction du mouvement

                // Adapter la position Y si vertical
                 if (this.direction === 'nord') flashY = drawY;
                 if (this.direction === 'sud') flashY = drawY + drawHeight - flashSize;
                 if (this.direction === 'ouest') flashX1 = drawX; // Sur le bord avant
                 if (this.direction === 'est') flashX1 = drawX + drawWidth - flashSize*2 - flashOffset*2; // Sur le bord avant


                context.fillStyle = isFlashOn ? COULEUR_URGENCE_FLASH_1 : COULEUR_URGENCE_FLASH_2;
                context.fillRect(flashX1, flashY, flashSize, flashSize);
                context.fillStyle = isFlashOn ? COULEUR_URGENCE_FLASH_2 : COULEUR_URGENCE_FLASH_1;
                context.fillRect(flashX2, flashY, flashSize, flashSize);

            } else if (this.ignoreRules && !this.isEmergency) { // Marqueur pour infractionniste normal
                context.fillStyle = 'red';
                context.fillRect(drawX + drawWidth / 2 - 2, drawY - 3, 4, 4);
            }

            // Clignotant normal (ne s'affiche pas si urgence pour éviter confusion visuelle)
            if (!this.isEmergency && this.afficheClignotant && Math.floor(Date.now() / 250) % 2 === 0) {
                context.fillStyle = '#FFA500';
                let signalSize = 5; let signalX = 0; let signalY = 0;
                switch (this.direction) { /* ... (calculs position clignotant inchangés) ... */ case 'est': signalX = drawX + drawWidth - signalSize; signalY = drawY + drawHeight - signalSize; break; case 'ouest': signalX = drawX; signalY = drawY; break; case 'sud': signalX = drawX; signalY = drawY + drawHeight - signalSize; break; case 'nord': signalX = drawX + drawWidth - signalSize; signalY = drawY; break; }
                context.fillRect(signalX, signalY, signalSize, signalSize);
            }
        }

        // <-- NOUVEAU: Helper pour calculer la distance au feu (simplifié) -->
        calculerDistanceAuFeu() {
            let distanceStop = Infinity;
             let positionAvant;
             switch (this.direction) {
                 case 'est': positionAvant = this.x + this.longueur / 2; distanceStop = stopLineOuest - positionAvant; break;
                 case 'ouest': positionAvant = this.x - this.longueur / 2; distanceStop = positionAvant - stopLineEst; break;
                 case 'sud': positionAvant = this.y + this.longueur / 2; distanceStop = stopLineNord - positionAvant; break;
                 case 'nord': positionAvant = this.y - this.longueur / 2; distanceStop = positionAvant - stopLineSud; break;
             }
             return distanceStop;
        }


        deplacer(feux, autresVehicules, deltaTime) {
            if (this.markedForRemoval) return;

            let doitFreinerPourFeu = false; let doitFreinerPourVoiture = false; let vitesseCibleVoitureDevant = this.vitesseMax;
            const prevX = this.x; const prevY = this.y;

            // 1. Vérifier véhicule devant (inchangé, les urgences freinent aussi pour les voitures)
            let vehiculeDevant = this.trouverVehiculeDevant(autresVehicules);
             if (vehiculeDevant) { let distanceNezArriere = this.calculerDistanceVehiculeDevant(vehiculeDevant); if (distanceNezArriere < DISTANCE_DETECTION_VOITURE) { if (distanceNezArriere < DISTANCE_SECURITE_MIN || vehiculeDevant.vitesseActuelle < this.vitesseActuelle - 0.1 || (vehiculeDevant.etat === 'arrete' && distanceNezArriere < DISTANCE_SECURITE_MIN * 2)) { doitFreinerPourVoiture = true; vitesseCibleVoitureDevant = Math.max(0, vehiculeDevant.vitesseActuelle * 0.8); if(this.etat !== 'freinage_voiture' && this.etat !== 'arrete') { this.etat = 'freinage_voiture'; } } else { vitesseCibleVoitureDevant = Math.min(this.vitesseMax, vehiculeDevant.vitesseActuelle); } } }


            // 2. Vérifier le feu ET l'infraction de feu rouge/orange (sauf si urgence)
            let feuPertinent = feux.find(feu => feu.directionControlee === this.direction);
            let distanceAuFeu = this.calculerDistanceAuFeu(); // Utilise le helper

            if (feuPertinent && this.etat !== 'arrete') {
                 let distanceDetectionDynamique = DISTANCE_DETECTION_FEU + (this.vitesseActuelle * 8);

                if (distanceAuFeu < distanceDetectionDynamique && distanceAuFeu > -this.longueur * 1.5) {
                     if (feuPertinent.etat === 'rouge' || feuPertinent.etat === 'orange') {
                         // <-- MODIFIÉ: Les véhicules d'urgence ignorent cette section -->
                         if (!this.isEmergency) {
                             if (!this.ignoreRules) { // Comportement normal : freiner
                                 doitFreinerPourFeu = true;
                                 if (this.etat !== 'freinage_feu' && this.etat !== 'freinage_voiture') { this.etat = 'freinage_feu'; } else if (this.etat === 'freinage_voiture'){ this.etat = 'freinage_feu'; }
                             } else { // Comportement infractionniste normal (non-urgence) : vérifier franchissement
                                 let franchissement = false;
                                  switch(this.direction) { /* ... (calcul franchissement inchangé) ... */ case 'est': franchissement = prevX + this.longueur / 2 < stopLineOuest && this.x + this.longueur / 2 >= stopLineOuest; break; case 'ouest': franchissement = prevX - this.longueur / 2 > stopLineEst && this.x - this.longueur / 2 <= stopLineEst; break; case 'sud': franchissement = prevY + this.longueur / 2 < stopLineNord && this.y + this.longueur / 2 >= stopLineNord; break; case 'nord': franchissement = prevY - this.longueur / 2 > stopLineSud && this.y - this.longueur / 2 <= stopLineSud; break; }

                                 if (franchissement && !this.vientDeFranchirLigneRouge) {
                                     // INFRACTION FEU DETECTEE (Non-Urgence)
                                     feuPertinent.detecterInfraction();
                                     this.vientDeFranchirLigneRouge = true;
                                     this.markedForRemoval = true; // Marquer POUR SUPPRESSION
                                     console.log("Véhicule NON-URGENCE marqué pour suppression (INFRACTION FEU)!", this.direction);
                                     return; // Sortir car sera supprimé
                                 }
                             }
                         } // Fin du if (!this.isEmergency)
                     } else { // Feu vert
                         this.vientDeFranchirLigneRouge = false; // Reset pour tous les types de véhicules
                     }
                 } else { // Hors zone ou déjà passé
                     this.vientDeFranchirLigneRouge = false;
                 }
             }

            // 3. Vérifier l'infraction d'excès de vitesse (uniquement pour non-urgence)
             // <-- MODIFIÉ: Les véhicules d'urgence ne comptent pas comme infraction de vitesse -->
            if (!this.isEmergency && this.ignoreRules && !this.speedingInfractionDetected && this.vitesseActuelle > 0) {
                if (this.vitesseActuelle > this.vitesseMaxOriginale * SEUIL_DEPASSEMENT_VITESSE) {
                    // INFRACTION VITESSE DETECTEE (Non-Urgence)
                    incrementInfractionCounter();
                    this.speedingInfractionDetected = true; // Marquer pour ne pas recompter
                    console.log("INFRACTION VITESSE (Non-Urgence) détectée!", this.direction, "Vitesse:", this.vitesseActuelle.toFixed(1), "Limite:", this.vitesseMaxOriginale.toFixed(1));
                }
            }

            // 4. Logique Clignotant (désactivé si urgence)
             const distanceActivationClignotant = DISTANCE_DETECTION_FEU * 1.8;
             if (!this.isEmergency && this.destination === 'droite' && distanceAuFeu > 5 && distanceAuFeu < distanceActivationClignotant && this.etat !== 'arrete' && this.etat !== 'freinage_feu') {
                 this.afficheClignotant = true;
             } else { this.afficheClignotant = false; }


            // 5. Décider de l'état et ajuster la vitesse
             let freinageActif = this.etat === 'freinage_feu' || this.etat === 'freinage_voiture';
             // Si on freinait mais plus besoin (et on n'est pas une urgence qui ignore les feux)
             if(freinageActif && !doitFreinerPourVoiture && (!doitFreinerPourFeu || (this.ignoreRules /* inclut urgence */)) ){
                 this.etat = 'acceleration';
                 freinageActif = false;
             }

             if (doitFreinerPourVoiture || (doitFreinerPourFeu && !this.ignoreRules /* urgence ignore 'doitFreinerPourFeu' */)) {
                  if(!freinageActif) {
                      // Seule la voiture devant fait freiner une urgence ici
                      this.etat = (doitFreinerPourFeu && !this.ignoreRules) ? 'freinage_feu' : 'freinage_voiture';
                  } else {
                      if(this.etat === 'freinage_voiture' && doitFreinerPourFeu && !this.ignoreRules) {
                          this.etat = 'freinage_feu'; // Priorité au feu si non-urgence
                      }
                  }
                  let deceleration = (this.etat === 'freinage_feu') ? DECELERATION_FREINAGE : DECELERATION_SUIVI;
                  this.vitesseActuelle -= deceleration;
                  if (this.vitesseActuelle <= 0) {
                      this.vitesseActuelle = 0;
                      // Une urgence arrêtée par une voiture redémarre dès que possible
                      if (this.etat === 'freinage_feu' || (this.etat === 'freinage_voiture' && vehiculeDevant && vehiculeDevant.vitesseActuelle < 0.1)) {
                           this.etat = 'arrete';
                      } else if (this.etat === 'freinage_voiture') {
                           this.etat = 'en_mouvement'; // Prêt à ré-accélérer si voiture devant bouge
                      }
                  }
             } else if (this.etat === 'arrete') {
                  let peutRedemarrerFeu = feuPertinent && (feuPertinent.etat === 'vert' || this.ignoreRules /* urgence peut démarrer même au rouge */);
                  let peutRedemarrerVoiture = !vehiculeDevant || this.calculerDistanceVehiculeDevant(vehiculeDevant) > DISTANCE_SECURITE_MIN * 1.2;
                  if (peutRedemarrerFeu && peutRedemarrerVoiture) {
                      this.etat = 'acceleration';
                  } else {
                      this.vitesseActuelle = 0;
                  }
             } else if (this.etat === 'acceleration') {
                  this.vitesseActuelle += ACCELERATION;
                  let vitesseCible = this.vitesseMax;
                  if(vehiculeDevant && this.calculerDistanceVehiculeDevant(vehiculeDevant) < DISTANCE_DETECTION_VOITURE + DISTANCE_SECURITE_MIN) {
                      vitesseCible = Math.min(vitesseCible, vehiculeDevant.vitesseActuelle); // Suit la voiture devant même en accélérant
                  }
                  if (this.vitesseActuelle >= vitesseCible) {
                      this.vitesseActuelle = vitesseCible;
                      this.etat = 'en_mouvement';
                  }
             } else { /* 'en_mouvement' */
                  let vitesseCibleFinale = this.vitesseMax;
                  if (vehiculeDevant && this.calculerDistanceVehiculeDevant(vehiculeDevant) < DISTANCE_DETECTION_VOITURE + this.vitesseActuelle * 2) {
                      vitesseCibleFinale = Math.min(vitesseCibleFinale, vehiculeDevant.vitesseActuelle); // Adapte à voiture devant
                  }

                 if (this.vitesseActuelle < vitesseCibleFinale) {
                      this.vitesseActuelle += ACCELERATION;
                      this.vitesseActuelle = Math.min(this.vitesseActuelle, vitesseCibleFinale);
                  } else if (this.vitesseActuelle > vitesseCibleFinale) {
                      // Ralentit si on va plus vite que la voiture de devant (ou si la cible a baissé)
                      this.vitesseActuelle -= DECELERATION_SUIVI;
                      this.vitesseActuelle = Math.max(0, this.vitesseActuelle);
                  }
                  // Si pas de voiture proche et sous la Vmax, on accélère vers Vmax
                 if(!vehiculeDevant || this.calculerDistanceVehiculeDevant(vehiculeDevant) > DISTANCE_DETECTION_VOITURE * 1.5) {
                     if(this.vitesseActuelle < this.vitesseMax) {
                          this.vitesseActuelle += ACCELERATION;
                          this.vitesseActuelle = Math.min(this.vitesseActuelle, this.vitesseMax);
                      }
                  }
             }

            // 6. Appliquer le mouvement (inchangé)
            if (this.vitesseActuelle > 0) { switch (this.direction) { case 'nord': this.y -= this.vitesseActuelle; break; case 'sud': this.y += this.vitesseActuelle; break; case 'est': this.x += this.vitesseActuelle; break; case 'ouest': this.x -= this.vitesseActuelle; break; } }

            // 7. Gestion Wrap Around (reset aussi speedingInfractionDetected)
            let checkWidth = (this.direction === 'nord' || this.direction === 'sud') ? this.largeurVisuelle : this.longueur;
            let checkHeight = (this.direction === 'nord' || this.direction === 'sud') ? this.longueur : this.largeurVisuelle;
            const resetStateOnWrap = () => {
                this.vitesseActuelle = 0; this.etat = 'acceleration';
                this.vientDeFranchirLigneRouge = false; this.afficheClignotant = false;
                this.speedingInfractionDetected = false; // Reset du flag vitesse
                this.destination = (Math.random() < 0.8 || this.isEmergency) ? 'tout_droit' : 'droite';
            };
            if (this.direction === 'est' && this.x - checkWidth / 2 > canvasWidth) { this.x = -checkWidth / 2; resetStateOnWrap();}
            else if (this.direction === 'ouest' && this.x + checkWidth / 2 < 0) { this.x = canvasWidth + checkWidth / 2; resetStateOnWrap();}
            else if (this.direction === 'sud' && this.y - checkHeight / 2 > canvasHeight) { this.y = -checkHeight / 2; resetStateOnWrap();}
            else if (this.direction === 'nord' && this.y + checkHeight / 2 < 0) { this.y = canvasHeight + checkHeight / 2; resetStateOnWrap();}
        }

        // --- Méthodes trouverVehiculeDevant et calculerDistanceVehiculeDevant --- (Inchangées)
        trouverVehiculeDevant(autresVehicules) { /* ... (inchangé) ... */ let vehiculeLePlusProche = null; let distanceMin = Infinity; for (const autre of autresVehicules) { if (autre === this || autre.direction !== this.direction || autre.lane !== this.lane) { continue; } let distance = -1; let estDevant = false; switch (this.direction) { case 'est': if (autre.x > this.x) { distance = autre.x - autre.longueur / 2 - (this.x + this.longueur / 2); estDevant = true; } break; case 'ouest': if (autre.x < this.x) { distance = (this.x - this.longueur / 2) - (autre.x + autre.longueur / 2); estDevant = true; } break; case 'sud': if (autre.y > this.y) { distance = autre.y - autre.longueur / 2 - (this.y + this.longueur / 2); estDevant = true; } break; case 'nord': if (autre.y < this.y) { distance = (this.y - this.longueur / 2) - (autre.y + autre.longueur / 2); estDevant = true; } break; } if (estDevant && distance < distanceMin && distance >= -this.longueur) { distanceMin = distance; vehiculeLePlusProche = autre; } } return vehiculeLePlusProche; }
        calculerDistanceVehiculeDevant(vehiculeDevant) { /* ... (inchangé) ... */ if (!vehiculeDevant) return Infinity; switch (this.direction) { case 'est': return vehiculeDevant.x - vehiculeDevant.longueur / 2 - (this.x + this.longueur / 2); case 'ouest': return (this.x - this.longueur / 2) - (vehiculeDevant.x + vehiculeDevant.longueur / 2); case 'sud': return vehiculeDevant.y - vehiculeDevant.longueur / 2 - (this.y + this.longueur / 2); case 'nord': return (this.y - this.longueur / 2) - (vehiculeDevant.y + vehiculeDevant.longueur / 2); default: return Infinity; } }

    } // Fin Classe Vehicule

    // --- Classe FeuTricolore --- (MODIFIÉE pour utiliser fonction globale d'incrémentation)
    class FeuTricolore {
        constructor(x, y, taille = 15, directionControlee, etatInitial = 'rouge') { /* ... propriétés inchangées ... */ this.x = x; this.y = y; this.taille = taille; this.directionControlee = directionControlee; this.etat = etatInitial; this.couleurRougeOn = '#FF0000'; this.couleurOrangeOn = '#FFA500'; this.couleurVertOn = '#00FF00'; this.couleurOff = '#444444'; this.infractionDetectee = false; this.tempsRestantInfraction = 0; }
        dessiner(context) { /* ... dessin inchangé ... */ let boitierLargeur = this.taille * 2 + 10; let boitierHauteur = this.taille * 6 + 20; let cercleRayon = this.taille; let centreXBoitier = this.x + boitierLargeur / 2; context.fillStyle = '#222222'; context.fillRect(this.x, this.y, boitierLargeur, boitierHauteur); if (this.infractionDetectee && this.tempsRestantInfraction > 0) { if (Math.floor(this.tempsRestantInfraction / (DUREE_INDICATEUR_INFRACTION / 4)) % 2 === 0) { context.strokeStyle = 'red'; context.lineWidth = 3; context.strokeRect(this.x - 2, this.y - 2, boitierLargeur + 4, boitierHauteur + 4); } } let yRouge = this.y + this.taille + 5; let yOrange = yRouge + this.taille * 2 + 5; let yVert = yOrange + this.taille * 2 + 5; context.beginPath(); context.arc(centreXBoitier, yRouge, cercleRayon, 0, Math.PI * 2); context.fillStyle = (this.etat === 'rouge') ? this.couleurRougeOn : this.couleurOff; context.fill(); context.strokeStyle = '#111'; context.lineWidth = 1; context.stroke(); context.beginPath(); context.arc(centreXBoitier, yOrange, cercleRayon, 0, Math.PI * 2); context.fillStyle = (this.etat === 'orange') ? this.couleurOrangeOn : this.couleurOff; context.fill(); context.stroke(); context.beginPath(); context.arc(centreXBoitier, yVert, cercleRayon, 0, Math.PI * 2); context.fillStyle = (this.etat === 'vert') ? this.couleurVertOn : this.couleurOff; context.fill(); context.stroke(); }
        changerEtat(nouvelEtat) { /* ... inchangé ... */ if (['rouge', 'orange', 'vert'].includes(nouvelEtat)) { this.etat = nouvelEtat; } else { console.warn("Etat de feu invalide:", nouvelEtat); } }

        // MODIFIÉ: Utilise la fonction globale pour incrémenter (NE SERA PAS appelé par urgence)
        detecterInfraction() {
            if (!this.infractionDetectee) {
                this.infractionDetectee = true;
                this.tempsRestantInfraction = DUREE_INDICATEUR_INFRACTION;
                incrementInfractionCounter(); // Compte seulement les infractions NON-URGENCE
            }
        }

        update(deltaTime) { /* ... inchangé ... */ if (this.tempsRestantInfraction > 0) { this.tempsRestantInfraction -= deltaTime; if (this.tempsRestantInfraction <= 0) { this.tempsRestantInfraction = 0; this.infractionDetectee = false; } } }
     }

    // --- Gestion des Véhicules ---
    let vehicules = [];
    // <-- MODIFIÉ: Génération incluant les urgences -->
    function genererVehicule() {
        if (vehicules.length > 45) return;

        let x, y, direction, lane;
        let couleur;
        let vitesse;
        let isEmergency = false;
        let ignoreRules = false;

        // Étape 1: Déterminer si c'est une urgence
        if (Math.random() < PROBA_EMERGENCY) {
            isEmergency = true;
            ignoreRules = true; // Les urgences ignorent les règles par défaut
            vitesse = VITESSE_MAX_URGENCE; // Vitesse spécifique urgence
            // Couleur sera définie dans le constructeur
        } else {
            // Étape 2: Si ce n'est pas une urgence, déterminer si c'est un infractionniste normal
            isEmergency = false;
            vitesse = 1.5 + Math.random() * 1.5; // Vitesse normale aléatoire
            ignoreRules = Math.random() < PROBA_INFRACTION;
            couleur = couleurs[Math.floor(Math.random() * couleurs.length)]; // Couleur aléatoire normale
        }


        const pointEntree = Math.floor(Math.random() * 4);
        lane = (Math.random() < 0.5) ? 'interieure' : 'exterieure';

        switch (pointEntree) {
            case 0: direction = 'est'; y = (lane === 'interieure') ? voieEstInterieureY : voieEstExterieureY; x = -largeurVoiture / 2; break;
            case 1: direction = 'ouest'; y = (lane === 'interieure') ? voieOuestInterieureY : voieOuestExterieureY; x = canvasWidth + largeurVoiture / 2; break;
            case 2: direction = 'sud'; x = (lane === 'interieure') ? voieSudInterieureX : voieSudExterieureX; y = -hauteurVoiture / 2; break;
            case 3: direction = 'nord'; x = (lane === 'interieure') ? voieNordInterieureX : voieNordExterieureX; y = canvasHeight + hauteurVoiture / 2; break;
        }

        // Crée le véhicule avec les flags déterminés
        let nouveauVehicule = new Vehicule(x, y, largeurVoiture, hauteurVoiture, couleur, vitesse, direction, lane, ignoreRules, isEmergency);
        vehicules.push(nouveauVehicule);
    }

    // --- Gestion des Feux ---
    let feuxTricolores = [];
    /* ... (Instanciation feux inchangée) ... */
    feuxTricolores.push(new FeuTricolore(stopLineOuest - 15*2 - 15 , voieEstExterieureY - 15, 15, 'est')); feuxTricolores.push(new FeuTricolore(stopLineEst + 15 , voieOuestExterieureY + 5 , 15, 'ouest')); feuxTricolores.push(new FeuTricolore(voieSudExterieureX - 15*2 - 15, stopLineNord - 15*6 - 30 , 15, 'sud')); feuxTricolores.push(new FeuTricolore(voieNordExterieureX + 15 , stopLineSud + 15 , 15, 'nord'));
    let etatCycleGlobal = 'EO_VERT'; let tempsRestantEtat = DUREE_VERT_MIN; let dernierTemps = 0;
    mettreAJourEtatFeux(); // <-- Appel initial


    // <-- MODIFIÉ: Fonction pour mettre à jour l'état des feux, prenant en compte l'override -->
    function mettreAJourEtatFeux(overrideDirection = null) {
        for (const feu of feuxTricolores) {
            let etatCible = 'rouge'; // Par défaut au rouge

            if (overrideDirection) {
                // Si override actif, mettre au vert la direction concernée (et l'opposée), rouge les autres
                 if (overrideDirection === 'est' || overrideDirection === 'ouest') {
                     if (feu.directionControlee === 'est' || feu.directionControlee === 'ouest') {
                         etatCible = 'vert';
                     }
                 } else { // Nord ou Sud
                     if (feu.directionControlee === 'nord' || feu.directionControlee === 'sud') {
                         etatCible = 'vert';
                     }
                 }
            } else {
                // Logique normale basée sur etatCycleGlobal
                switch (etatCycleGlobal) {
                    case 'EO_VERT':
                        if (feu.directionControlee === 'est' || feu.directionControlee === 'ouest') etatCible = 'vert';
                        break;
                    case 'EO_ORANGE':
                         if (feu.directionControlee === 'est' || feu.directionControlee === 'ouest') etatCible = 'orange';
                        break;
                    case 'NS_VERT':
                         if (feu.directionControlee === 'nord' || feu.directionControlee === 'sud') etatCible = 'vert';
                        break;
                    case 'NS_ORANGE':
                         if (feu.directionControlee === 'nord' || feu.directionControlee === 'sud') etatCible = 'orange';
                        break;
                }
            }
             feu.changerEtat(etatCible);
        }
    }

    function compterVoituresEnAttente(directionCible, tousLesVehicules) { /* ... (inchangé) ... */ let count = 0; for (const v of tousLesVehicules) { if (v.direction === directionCible && v.etat === 'arrete') { let estEnAttente = false; switch (directionCible) { case 'est': estEnAttente = v.x < stopLineOuest && v.x > stopLineOuest - ZONE_DETECTION_ATTENTE; break; case 'ouest': estEnAttente = v.x > stopLineEst && v.x < stopLineEst + ZONE_DETECTION_ATTENTE; break; case 'sud': estEnAttente = v.y < stopLineNord && v.y > stopLineNord - ZONE_DETECTION_ATTENTE; break; case 'nord': estEnAttente = v.y > stopLineSud && v.y < stopLineSud + ZONE_DETECTION_ATTENTE; break; } if (estEnAttente) { count++; } } } return count; }
    function calculerDureeVert(countPourVert, countSurRouge) { /* ... (inchangé) ... */ let dureeCalculee = DUREE_VERT_MIN + countPourVert * TEMPS_PAR_VOITURE; return Math.max(DUREE_VERT_MIN, Math.min(dureeCalculee, DUREE_VERT_MAX)); }

    // <-- MODIFIÉ: Cycle des feux prenant en compte l'override d'urgence -->
    function cycleSuivant(tempsActuel, tousLesVehicules) {
        if (dernierTemps === 0) dernierTemps = tempsActuel;
        let deltaTime = tempsActuel - dernierTemps;
        dernierTemps = tempsActuel;
        if (deltaTime <= 0 || deltaTime > 500) deltaTime = 16; // Gestion delta temps anormaux

        // Si un override d'urgence est actif, on bloque le cycle normal et on applique l'état d'urgence
        if (emergencyOverrideActive) {
             mettreAJourEtatFeux(emergencyOverrideDirection); // Force l'état vert pour l'urgence
             // On ne décrémente pas tempsRestantEtat, le cycle normal est en pause
             return; // Sortir, ne pas exécuter le cycle normal
        }

        // --- Si pas d'override, exécuter le cycle normal ---
        tempsRestantEtat -= deltaTime;

        if (tempsRestantEtat <= 0) {
            let prochaineDureeVert = DUREE_VERT_MIN;
            switch (etatCycleGlobal) {
                case 'EO_VERT':
                    etatCycleGlobal = 'EO_ORANGE';
                    tempsRestantEtat = DUREE_ORANGE;
                    break;
                case 'EO_ORANGE':
                    let countNord = compterVoituresEnAttente('nord', tousLesVehicules);
                    let countSud = compterVoituresEnAttente('sud', tousLesVehicules);
                    let countEstOrange = compterVoituresEnAttente('est', tousLesVehicules);
                    let countOuestOrange = compterVoituresEnAttente('ouest', tousLesVehicules);
                    prochaineDureeVert = calculerDureeVert(countNord + countSud, countEstOrange + countOuestOrange);
                    etatCycleGlobal = 'NS_VERT';
                    tempsRestantEtat = prochaineDureeVert;
                    break;
                case 'NS_VERT':
                    etatCycleGlobal = 'NS_ORANGE';
                    tempsRestantEtat = DUREE_ORANGE;
                    break;
                case 'NS_ORANGE':
                    let countEst = compterVoituresEnAttente('est', tousLesVehicules);
                    let countOuest = compterVoituresEnAttente('ouest', tousLesVehicules);
                    let countNordOrange = compterVoituresEnAttente('nord', tousLesVehicules);
                    let countSudOrange = compterVoituresEnAttente('sud', tousLesVehicules);
                    prochaineDureeVert = calculerDureeVert(countEst + countOuest, countNordOrange + countSudOrange);
                    etatCycleGlobal = 'EO_VERT';
                    tempsRestantEtat = prochaineDureeVert;
                    break;
            }
            mettreAJourEtatFeux(); // Met à jour les feux selon le nouvel etatCycleGlobal
        }
    }

     // <-- NOUVEAU: Fonction pour détecter les urgences approchant et activer l'override -->
     function checkForEmergencyOverride(tousLesVehicules) {
         let overrideNeeded = false;
         let overrideDir = null;

         for (const v of tousLesVehicules) {
             if (v.isEmergency) {
                 const distance = v.calculerDistanceAuFeu();
                 // Vérifier si l'urgence est AVANT le feu et dans la zone de détection
                 if (distance > 0 && distance < EMERGENCY_DETECTION_DISTANCE) {
                      overrideNeeded = true;
                      overrideDir = v.direction;
                      break; // Une seule urgence suffit pour déclencher l'override
                 }
             }
         }

         if (overrideNeeded) {
             if (!emergencyOverrideActive) {
                 console.log(`%cURGENCE DETECTEE: Forçage VERT pour ${overrideDir}`, 'color: red; font-weight: bold;');
             }
             emergencyOverrideActive = true;
             emergencyOverrideDirection = overrideDir;
         } else {
              if (emergencyOverrideActive) {
                  console.log("%cFin de l'override d'urgence.", 'color: green;');
                  // Important: Remettre à jour les feux selon le cycle normal immédiatement
                  // pour éviter qu'ils restent bloqués sur l'ancien état d'urgence.
                  mettreAJourEtatFeux();
              }
             emergencyOverrideActive = false;
             emergencyOverrideDirection = null;
         }
     }


    // --- Fonctions de Dessin ---
    function dessinerCarrefour() { /* ... (inchangé) ... */ ctx.fillStyle = '#666'; ctx.fillRect(centreX - largeurRoute / 2, 0, largeurRoute, canvasHeight); ctx.fillRect(0, centreY - largeurRoute / 2, canvasWidth, largeurRoute); ctx.strokeStyle = 'yellow'; ctx.lineWidth = 5; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(centreX, 0); ctx.lineTo(centreX, centreY - largeurRoute/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX, canvasHeight); ctx.lineTo(centreX, centreY + largeurRoute/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, centreY); ctx.lineTo(centreX - largeurRoute/2, centreY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(canvasWidth, centreY); ctx.lineTo(centreX + largeurRoute/2, centreY); ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, centreY - largeurRoute / 4); ctx.lineTo(centreX - largeurRoute / 2, centreY - largeurRoute / 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(canvasWidth, centreY - largeurRoute / 4); ctx.lineTo(centreX + largeurRoute / 2, centreY - largeurRoute / 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, centreY + largeurRoute / 4); ctx.lineTo(centreX - largeurRoute / 2, centreY + largeurRoute / 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(canvasWidth, centreY + largeurRoute / 4); ctx.lineTo(centreX + largeurRoute / 2, centreY + largeurRoute / 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX - largeurRoute / 4, 0); ctx.lineTo(centreX - largeurRoute / 4, centreY - largeurRoute / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX - largeurRoute / 4, canvasHeight); ctx.lineTo(centreX - largeurRoute / 4, centreY + largeurRoute / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX + largeurRoute / 4, 0); ctx.lineTo(centreX + largeurRoute / 4, centreY - largeurRoute / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX + largeurRoute / 4, canvasHeight); ctx.lineTo(centreX + largeurRoute / 4, centreY + largeurRoute / 2); ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(stopLineOuest, centreY - largeurRoute / 2); ctx.lineTo(stopLineOuest, centreY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(stopLineEst, centreY); ctx.lineTo(stopLineEst, centreY + largeurRoute / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX - largeurRoute / 2, stopLineNord); ctx.lineTo(centreX, stopLineNord); ctx.stroke(); ctx.beginPath(); ctx.moveTo(centreX, stopLineSud); ctx.lineTo(centreX + largeurRoute / 2, stopLineSud); ctx.stroke(); }
    function dessinerStatistiques(context) { /* ... (inchangé) ... */ const nombreVehicules = vehicules.length; const xPos = 10; const yPos = 20; const lineHeight = 18; context.fillStyle = 'rgba(0, 0, 0, 0.5)'; context.fillRect(xPos - 5, yPos - 15, 160, lineHeight * 2 + 20); context.fillStyle = 'white'; context.font = '14px Arial'; context.textAlign = 'left'; context.fillText(`Véhicules : ${nombreVehicules}`, xPos, yPos); context.fillText(`Infractions (non-urgence): ${stats_infractionsDetectees}`, xPos, yPos + lineHeight); if (emergencyOverrideActive) { context.fillStyle = 'yellow'; context.fillText(`URGENCE ACTIVE (${emergencyOverrideDirection})`, xPos, yPos + lineHeight * 2); }}
    function dessinerScene() { /* ... (inchangé) ... */ ctx.clearRect(0, 0, canvasWidth, canvasHeight); dessinerCarrefour(); for (const feu of feuxTricolores) { feu.dessiner(ctx); } for (const vehicule of vehicules) { vehicule.dessiner(ctx); } dessinerStatistiques(ctx); }

    // --- Boucle d'Animation --- (MODIFIÉE pour inclure check urgence)
    let tempsAnimationPrecedent = 0;
    function animate(tempsActuel) {
        if (tempsAnimationPrecedent === 0) tempsAnimationPrecedent = tempsActuel;
        let deltaTime = tempsActuel - tempsAnimationPrecedent;
        tempsAnimationPrecedent = tempsActuel;
        if (deltaTime <= 0 || deltaTime > 100) deltaTime = 16.6; // Frame time safety clamp

        const vehiculesActuels = [...vehicules]; // Copie pour itération stable

        // <-- NOUVEAU: 0. Vérifier si un override d'urgence est nécessaire -->
        checkForEmergencyOverride(vehiculesActuels);

        // 1. Mettre à jour cycle feux (prend en compte l'override détecté ci-dessus)
        cycleSuivant(tempsActuel, vehiculesActuels);

        // 2. Mettre à jour état interne feux (timer infraction visuelle normale)
        for (const feu of feuxTricolores) {
            feu.update(deltaTime);
        }

        // 3. Mettre à jour TOUS les véhicules
        for (const vehicule of vehicules) {
            vehicule.deplacer(feuxTricolores, vehiculesActuels, deltaTime);
        }

        // 4. Filtrer et supprimer SEULEMENT les véhicules marqués (infractions NON-URGENCE feu rouge)
        vehicules = vehicules.filter(vehicule => !vehicule.markedForRemoval);

        // 5. Redessiner la scène
        dessinerScene();

        // 6. Demander la prochaine frame
        requestAnimationFrame(animate);
    }

    // --- Démarrage ---
    console.log("Démarrage simulation : inclut véhicules d'urgence (20% proba) forçant les feux.");
    for(let i=0; i<15; i++) { genererVehicule(); }
    setInterval(genererVehicule, 700);
    animate(0);

}; // Fin de window.onload