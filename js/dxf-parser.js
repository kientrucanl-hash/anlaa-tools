/**
 * Lightweight Offline DXF CAD Parser for MECALC
 * Language: English 100% (Rule §2)
 */

window.DxfParser = {
    /**
     * Parses plain text content of a DXF file and extracts geometric entities.
     * Groups them by layer name and calculates their cumulative lengths.
     */
    parse: function(dxfText) {
        // Normalize line breaks
        const lines = dxfText.split(/\r?\n/).map(line => line.trim());
        const entities = [];
        
        let inEntitiesSection = false;
        let i = 0;
        
        while (i < lines.length) {
            const groupCode = lines[i];
            const value = lines[i + 1];
            
            if (groupCode === '0' && value === 'SECTION') {
                // Check if we entered the ENTITIES section
                let nextCode = lines[i + 2];
                let nextVal = lines[i + 3];
                if (nextCode === '2' && nextVal === 'ENTITIES') {
                    inEntitiesSection = true;
                    i += 4;
                    continue;
                }
            }
            
            if (groupCode === '0' && value === 'ENDSEC') {
                if (inEntitiesSection) {
                    inEntitiesSection = false; // Left entities section
                }
            }
            
            if (inEntitiesSection && groupCode === '0') {
                const entityType = value;
                if (entityType === 'LINE' || entityType === 'LWPOLYLINE') {
                    const entity = { type: entityType, layer: 'Default', points: [] };
                    i += 2;
                    
                    // Parse entity attributes until we hit next entity or end of section
                    let tempVertices = [];
                    while (i < lines.length) {
                        const code = lines[i];
                        const val = lines[i + 1];
                        
                        if (code === '0') {
                            // Hit the start of a new entity
                            break;
                        }
                        
                        if (code === '8') {
                            entity.layer = val;
                        }
                        
                        // Parse coordinates
                        if (entityType === 'LINE') {
                            if (code === '10') entity.x1 = parseFloat(val);
                            if (code === '20') entity.y1 = parseFloat(val);
                            if (code === '11') entity.x2 = parseFloat(val);
                            if (code === '21') entity.y2 = parseFloat(val);
                        } else if (entityType === 'LWPOLYLINE') {
                            if (code === '10') {
                                // Start of a vertex X
                                tempVertices.push({ x: parseFloat(val), y: 0 });
                            }
                            if (code === '20') {
                                // Vertex Y (matches the last X coordinate)
                                if (tempVertices.length > 0) {
                                    tempVertices[tempVertices.length - 1].y = parseFloat(val);
                                }
                            }
                        }
                        i += 2;
                    }
                    
                    // Build points for the entity
                    if (entityType === 'LINE') {
                        if (entity.x1 !== undefined && entity.y1 !== undefined && entity.x2 !== undefined && entity.y2 !== undefined) {
                            entity.points = [{x: entity.x1, y: entity.y1}, {x: entity.x2, y: entity.y2}];
                            entities.push(entity);
                        }
                    } else if (entityType === 'LWPOLYLINE') {
                        if (tempVertices.length > 1) {
                            entity.points = tempVertices;
                            entities.push(entity);
                        }
                    }
                    continue;
                }
            }
            i += 2;
        }
        
        // Group entities by layer and calculate total lengths
        const layers = {};
        entities.forEach(ent => {
            const layerName = ent.layer;
            if (!layers[layerName]) {
                layers[layerName] = { length: 0, count: 0, entities: [] };
            }
            
            let len = 0;
            if (ent.type === 'LINE') {
                const dx = ent.points[1].x - ent.points[0].x;
                const dy = ent.points[1].y - ent.points[0].y;
                len = Math.sqrt(dx * dx + dy * dy);
            } else if (ent.type === 'LWPOLYLINE') {
                for (let j = 0; j < ent.points.length - 1; j++) {
                    const dx = ent.points[j+1].x - ent.points[j].x;
                    const dy = ent.points[j+1].y - ent.points[j].y;
                    len += Math.sqrt(dx * dx + dy * dy);
                }
            }
            
            // DXF dimensions are typically in millimeters (mm).
            // Convert to meters (m) by dividing by 1000.
            const lenMeters = len / 1000;
            
            layers[layerName].length += lenMeters;
            layers[layerName].count++;
            layers[layerName].entities.push(ent);
        });
        
        return layers;
    }
};
