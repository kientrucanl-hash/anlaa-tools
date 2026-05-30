/**
 * Core Logic Calculator for MECALC (Northern Standards)
 * Language: English 100% (Rule §2)
 */

/**
 * Calculates materials needed for Masonry (Xây tường)
 */
function calculateMasonry(lengthOrWalls, heightOrDoors, wallTypeOrBrick, brickTypeOrMortar, mortarGradeOrBrickWaste, doorCountOrMortarWaste, doorWidthOrAutoPlaster, doorHeightOrColPlaster, brickWasteOrDirectVol, mortarWaste, multiplier) {
    let wallsData = [];
    let doorsData = [];
    let brickType = "";
    let mortarGrade = "";
    let brickWaste = 3;
    let mWaste = 5;
    let autoPlasterSettings = null;
    let columnPlasterSettings = null;
    let directVolume = null;

    // Check if the call is in new array-based mode
    if (Array.isArray(lengthOrWalls)) {
        wallsData = lengthOrWalls;
        doorsData = heightOrDoors;
        brickType = wallTypeOrBrick;
        mortarGrade = brickTypeOrMortar;
        brickWaste = parseFloat(mortarGradeOrBrickWaste) || 0;
        mWaste = parseFloat(doorCountOrMortarWaste) || 0;
        autoPlasterSettings = doorWidthOrAutoPlaster;
        columnPlasterSettings = doorHeightOrColPlaster;
        directVolume = brickWasteOrDirectVol;
    } else {
        // Legacy call mode: convert parameters to array-based format
        const length = parseFloat(lengthOrWalls) || 0;
        const height = parseFloat(heightOrDoors) || 0;
        const wallType = wallTypeOrBrick || "110";
        brickType = brickTypeOrMortar;
        mortarGrade = mortarGradeOrBrickWaste;
        const doorCount = parseInt(doorCountOrMortarWaste) || 0;
        const doorWidth = parseFloat(doorWidthOrAutoPlaster) || 0;
        const doorHeight = parseFloat(doorHeightOrColPlaster) || 0;
        brickWaste = parseFloat(brickWasteOrDirectVol) || 0;
        mWaste = parseFloat(mortarWaste) || 0;
        const mult = parseFloat(multiplier) || 1;

        wallsData = [{ length, height, wallType, multiplier: mult }];
        doorsData = [];
        if (doorCount > 0 && doorWidth > 0 && doorHeight > 0) {
            doorsData.push({ type: "door-3", width: doorWidth, height: doorHeight, multiplier: doorCount, plasterJambs: false });
        }
    }

    let netArea = 0;
    let grossArea = 0;
    let doorArea = 0;
    let wallVolume = 0;
    let bricksTheory = 0;
    let bricksToBuy = 0;
    let wall110Volume = 0;
    let wall220Volume = 0;
    let grossPlasterArea = 0; // per-wall faces weighted sum (before door deduction)

    // For plastering outputs
    let plasterArea = 0;
    let plasterVolume = 0;
    let plasterCementKg = 0;
    let plasterSandM3 = 0;

    const brickSpec = BRICK_PROPERTIES[brickType];

    if (directVolume !== null && directVolume !== undefined) {
        // 1. Direct volume mode
        wallVolume = parseFloat(directVolume);
        const bricksPerM3 = brickSpec.estimation["110"]; // default approximation
        bricksTheory = wallVolume * bricksPerM3;
        bricksToBuy = Math.ceil(bricksTheory * (1 + brickWaste / 100));
        netArea = wallVolume / 0.11; // approximate net area
    } else {
        // 2. Detailed spreadsheet tables mode
        wallsData.forEach(wall => {
            const wArea = wall.length * wall.height * wall.multiplier;
            const wThickness = wall.wallType === "220" ? 0.22 : 0.11;
            const wVolume = wArea * wThickness;
            const wFaces = (wall.faces !== undefined) ? wall.faces : 2;

            grossArea += wArea;
            grossPlasterArea += wArea * wFaces;

            if (wall.wallType === "220") {
                wall220Volume += wVolume;
            } else {
                wall110Volume += wVolume;
            }
        });

        doorsData.forEach(door => {
            const dArea = door.width * door.height * door.multiplier;
            doorArea += dArea;
        });

        netArea = grossArea - doorArea;
        if (netArea < 0) netArea = 0;

        // Deduct door volume (default to 110mm thickness for doors)
        const grossVolume = wall110Volume + wall220Volume;
        const doorsVolume = doorArea * 0.11;
        wallVolume = grossVolume - doorsVolume;
        if (wallVolume < 0) wallVolume = 0;

        // Calculate bricks count based on wall types
        if (grossVolume > 0) {
            if (wall110Volume > 0) {
                const ratio = wall110Volume / grossVolume;
                const net110Vol = wallVolume * ratio;
                bricksTheory += net110Vol * brickSpec.estimation["110"];
            }
            if (wall220Volume > 0) {
                const ratio = wall220Volume / grossVolume;
                const net220Vol = wallVolume * ratio;
                bricksTheory += net220Vol * brickSpec.estimation["220"];
            }
        } else {
            bricksTheory = 0;
        }
        bricksToBuy = Math.ceil(bricksTheory * (1 + brickWaste / 100));
    }

    // Calculate core masonry mortar components
    let cementKg = 0;
    let sandM3 = 0;
    let waterLiters = 0;
    let specialAACMortarKg = 0;

    if (brickType === "none") {
        bricksTheory = 0;
        bricksToBuy = 0;
    } else if (brickType === "brick-aac") {
        specialAACMortarKg = netArea * brickSpec.specialMortarRate * (1 + mWaste / 100);
    } else {
        const mortarVolumeTheory = wallVolume * 0.23; // standard 23% mortar volume
        const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade];

        cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mWaste / 100);
        sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mWaste / 100);
        waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mWaste / 100);
    }

    // 3. Auto plastering calculation if enabled
    let hasAutoPlaster = false;
    let autoPlasterResults = null;
    
    if (autoPlasterSettings && autoPlasterSettings.enabled && brickType !== "brick-aac") {
        hasAutoPlaster = true;
        const plasterThickness = parseFloat(autoPlasterSettings.thickness);
        const plasterGrade = autoPlasterSettings.mortarGrade;
        const plasterWaste = parseFloat(autoPlasterSettings.waste);

        // Effective faces for result display (weighted average, rounded)
        const effectiveFaces = grossArea > 0 ? Math.round(grossPlasterArea / grossArea) : 2;

        let plasterArea = 0;
        if (autoPlasterSettings.directPlasterArea !== undefined && autoPlasterSettings.directPlasterArea !== null) {
            plasterArea = parseFloat(autoPlasterSettings.directPlasterArea);
        } else if (autoPlasterSettings.faces === "auto") {
            // Per-wall faces mode: scale gross plaster area down by door fraction
            plasterArea = grossArea > 0 ? grossPlasterArea * (netArea / grossArea) : 0;
        } else {
            const plasterFaces = parseInt(autoPlasterSettings.faces) || 2;
            plasterArea = netArea * plasterFaces;
        }
        
        // Calculate door jambs plastering
        let jambsLength = 0;
        if (directVolume === null && doorsData) {
            doorsData.forEach(door => {
                if (door.plasterJambs) {
                    const h = parseFloat(door.height);
                    const w = parseFloat(door.width);
                    const m = parseInt(door.multiplier);
                    if (door.type === "door-3") {
                        jambsLength += (2 * h + w) * m;
                    } else {
                        jambsLength += 2 * (h + w) * m;
                    }
                }
            });
        }
        
        const averageWallThickness = (wall220Volume > 0 && wall110Volume === 0) ? 0.22 : 0.11;
        const jambsPlasterVolume = jambsLength * averageWallThickness * (plasterThickness / 100);
        const flatPlasterVolume = plasterArea * (plasterThickness / 100);
        
        plasterVolume = flatPlasterVolume + jambsPlasterVolume;
        
        // Calculate column plastering if enabled
        if (columnPlasterSettings && columnPlasterSettings.enabled) {
            const colLength = parseFloat(columnPlasterSettings.length);
            const colWidth = parseFloat(columnPlasterSettings.width);
            const colPlasterVol = colLength * colWidth * (plasterThickness / 100);
            plasterVolume += colPlasterVol;
        }
        
        const plasterMix = MORTAR_MIX_DESIGNS[plasterGrade];
        plasterCementKg = plasterVolume * plasterMix.cement * (1 + plasterWaste / 100);
        plasterSandM3 = plasterVolume * plasterMix.sand * (1 + plasterWaste / 100);
        
        // Add plaster components to main totals
        cementKg += plasterCementKg;
        sandM3 += plasterSandM3;
        
        autoPlasterResults = {
            faces: effectiveFaces,
            thickness: plasterThickness,
            mortarGrade: plasterGrade,
            waste: plasterWaste,
            plasterArea: plasterArea,
            jambsLength: jambsLength,
            plasterVolume: plasterVolume,
            cementKg: plasterCementKg,
            sandM3: plasterSandM3
        };
    }

    const cementBags = Math.ceil(cementKg / PACKING_SPECS.cement);
    const specialAACMortarBags = Math.ceil(specialAACMortarKg / PACKING_SPECS.tileAdhesive);

    return {
        grossArea: grossArea,
        doorArea: doorArea,
        netArea: netArea,
        wallVolume: wallVolume,
        bricksCount: bricksToBuy,
        bricksTheory: bricksTheory,
        cementKg: cementKg,
        cementBags: cementBags,
        sandM3: sandM3,
        waterLiters: waterLiters,
        specialAACMortarKg: specialAACMortarKg,
        specialAACMortarBags: specialAACMortarBags,
        brickType: brickType,
        mortarGrade: mortarGrade,
        hasAutoPlaster: hasAutoPlaster,
        autoPlaster: autoPlasterResults
    };
}

/**
 * Calculates materials needed for Floor Screeding (Cán nền cân cốt)
 */
function calculateScreeding(area, thickness, mortarGrade, mortarWaste) {
    const thicknessM = thickness / 100; // cm to m
    const mortarVolumeTheory = area * thicknessM; // m3
    
    const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade];
    
    const cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mortarWaste / 100);
    const sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mortarWaste / 100);
    const waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mortarWaste / 100);
    
    const cementBags = Math.ceil(cementKg / PACKING_SPECS.cement);
    
    return {
        area: area,
        mortarVolume: mortarVolumeTheory,
        cementKg: cementKg,
        cementBags: cementBags,
        sandM3: sandM3,
        waterLiters: waterLiters,
        mortarGrade: mortarGrade,
        thickness: thickness
    };
}

/**
 * Calculates materials needed for Plastering (Trát tường)
 */
function calculatePlastering(area, faces, thickness, mortarGrade, mortarWaste) {
    // 1. Calculate total plastering surface area
    const totalArea = area * faces;

    // 2. Get standard mortar rate per m2 based on thickness
    const mortarRate = PLASTERING_MORTAR_RATES[thickness.toString()];
    const mortarVolumeTheory = totalArea * mortarRate; // m3

    // 3. Plastering mortar breakdown (fine sand and PC40 cement)
    const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade];

    const cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mortarWaste / 100);
    const sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mortarWaste / 100);
    const waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mortarWaste / 100);

    const cementBags = Math.ceil(cementKg / PACKING_SPECS.cement);

    return {
        totalArea: totalArea,
        mortarVolume: mortarVolumeTheory,
        cementKg: cementKg,
        cementBags: cementBags,
        sandM3: sandM3,
        waterLiters: waterLiters,
        mortarGrade: mortarGrade,
        thickness: thickness
    };
}

/**
 * Calculates materials and accessories needed for Tiling (Ốp lát)
 */
function calculateTiling(area, tileSize, method, mixRatio, groutWidth, tileThickness, tileWaste, adhesiveWaste, groutWaste) {
    const tileSpec = TILE_SPECS[tileSize];
    
    // 1. Calculate tiles count
    const tilesTheory = area / tileSpec.area;
    const tilesToBuy = Math.ceil(tilesTheory * (1 + tileWaste / 100));
    const boxesToBuy = Math.ceil(tilesToBuy / tileSpec.packSize);

    // 2. Estimate tiling adhesive and cement components
    let adhesiveKg = 0;
    let adhesiveBags = 0;
    let cementKg = 0;
    let cementBags = 0;

    if (method === "adhesive-pure") {
        // Pure tile adhesive method
        const isSmallTile = tileSpec.area <= 0.36; // gạch <= 60x60
        const baseRate = isSmallTile ? TILING_ADHESIVE_RATES.pure.small : TILING_ADHESIVE_RATES.pure.large;
        
        adhesiveKg = area * baseRate * (1 + adhesiveWaste / 100);
        adhesiveBags = Math.ceil(adhesiveKg / PACKING_SPECS.tileAdhesive);
    } else if (method === "adhesive-mixed") {
        // Mixed method: Tile adhesive + Cement (extremely common in Hanoi)
        const totalDryMix = area * TILING_ADHESIVE_RATES.mixed.rate * (1 + adhesiveWaste / 100);
        
        // Parse mixing ratio (Khối lượng)
        let adhesiveRatio = 0.5;
        let cementRatio = 0.5;

        if (mixRatio === "2:1") {
            adhesiveRatio = 2 / 3;
            cementRatio = 1 / 3;
        } else if (mixRatio === "1:2") {
            adhesiveRatio = 1 / 3;
            cementRatio = 2 / 3;
        }

        adhesiveKg = totalDryMix * adhesiveRatio;
        adhesiveBags = Math.ceil(adhesiveKg / PACKING_SPECS.tileAdhesive);

        cementKg = totalDryMix * cementRatio;
        cementBags = Math.ceil(cementKg / PACKING_SPECS.cement);
    }

    // 3. Estimate tile grout (keo chà ron) based on geometric dimensions
    // Parse tile sizes to mm: "30x60" -> w = 300mm, l = 600mm
    const dimensions = tileSize.split("x");
    const tileW = parseInt(dimensions[0]) * 10; // mm
    const tileL = parseInt(dimensions[1]) * 10; // mm

    // Grout theory rate formula (kg/m2) = [(A+B)/(A*B)] * C * D * 1.4
    const groutRateTheory = ((tileW + tileL) / (tileW * tileL)) * tileThickness * groutWidth * 1.4;
    const groutKg = area * groutRateTheory * (1 + groutWaste / 100);

    // 4. Estimate accessories (Crosses, Clips, Wedges)
    const crossToBuy = Math.ceil(area * tileSpec.accessories.cross * 1.05);
    const crossPacks = Math.ceil(crossToBuy / PACKING_SPECS.tileCross);

    let clipsToBuy = 0;
    let clipsPacks = 0;
    let wedgesToBuy = 0;
    let wedgesPacks = 0;

    if (tileSpec.accessories.clips > 0) {
        clipsToBuy = Math.ceil(area * tileSpec.accessories.clips * 1.05);
        clipsPacks = Math.ceil(clipsToBuy / PACKING_SPECS.tileClips);

        wedgesToBuy = Math.ceil(area * tileSpec.accessories.wedges * 1.05);
        wedgesPacks = Math.ceil(wedgesToBuy / PACKING_SPECS.tileWedges);
    }

    return {
        area: area,
        tilesCount: tilesToBuy,
        tilesTheory: tilesTheory,
        boxesCount: boxesToBuy,
        tileSpecSize: tileSpec.packSize,
        method: method,
        mixRatio: mixRatio,
        adhesiveKg: adhesiveKg,
        adhesiveBags: adhesiveBags,
        cementKg: cementKg,
        cementBags: cementBags,
        groutKg: groutKg,
        crossCount: crossToBuy,
        crossPacks: crossPacks,
        clipsCount: clipsToBuy,
        clipsPacks: clipsPacks,
        wedgesCount: wedgesToBuy,
        wedgesPacks: wedgesPacks,
        tileSize: tileSize
    };
}
