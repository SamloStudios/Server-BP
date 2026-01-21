export class Claim {
    claimManager = undefined;
    data = {
        data_block: undefined,
        id: undefined,
        owner: undefined,
        bounds: { xMin: 0, xMax: 0, zMin: 0, zMax: 0 },
        
        dimension: "minecraft:overworld",
        type: "player",
        cost: 0,
        on_sale: false,
        permissions: {
            trespass: true,
            break_blocks: false,
            place_blocks: false,
            interact: false,
            open_chest: false,
            kill_players: false,
            kill_hostiles: true,
            kill_neutral: false,
            elytra: true,
            magic: false,
            explosions: false
        },
        whitelist: [], // Lista de nombres de jugadores
        whitelist_permissions: [], //Permisos para jugadores amigos
        subclaims: [] // Lista de ids de subclaims
    }

    constructor(manager) {
        this.claimManager = manager;
    }

    /** Carga los datos crudos del objeto JSON al objeto de clase */
    init(data) {
        this.data = { ...this.data, ...data };
        return this; // Permite encadenar: new Claim(m).init(data)
    }

    /** Devuelve los datos crudos para guardar en JSON */
    getData() {
        return this.data;
    }

    save() {
        if (!this.claimManager) throw new ClaimManagerError('Manager no definido');
        this.claimManager.saveClaim(this);
    }

    delete() {
        if (!this.claimManager) throw new ClaimManagerError('Manager no definido');
        this.claimManager.deleteClaim(this.data.id);
    }

    // --- Getters y Setters Básicos ---

    getId() { return this.data.id; }
    setId(id) { this.data.id = id; }

    getOwner() { return this.data.owner; }
    setOwner(name) { this.data.owner = name; }

    getBounds() { return this.data.bounds; }
    setBounds({ xMin, xMax, zMin, zMax }) {
        this.data.bounds = {
            xMin: Math.floor(xMin),
            xMax: Math.floor(xMax),
            zMin: Math.floor(zMin),
            zMax: Math.floor(zMax)
        };
    }

    getDimension() { return this.data.dimension; }
    setDimension(dimId) { this.data.dimension = dimId; }

    getType() { return this.data.type; }
    setType(type) { this.data.type = type; }

    // --- Gestión de Permisos ---

    /** Cambia un permiso específico: .setPermission('break_blocks', true) */
    setPermission(key, value) {
        if (key in this.data.permissions) {
            this.data.permissions[key] = value;
        }
    }

    getPermission(key) {
        return this.data.permissions[key] ?? false;
    }

    // --- Whitelist ---

    addPlayer(playerName) {
        if (!this.data.whitelist.includes(playerName)) {
            this.data.whitelist.push(playerName);
        }
    }

    removePlayer(playerName) {
        this.data.whitelist = this.data.whitelist.filter(p => p !== playerName);
    }

    isWhitelisted(playerName) {
        return this.data.whitelist.includes(playerName) || playerName === this.data.owner;
    }
}




/*::Claim
// Is the datablock of claimData it is saved in (temporal data)
data_block : integer
id: integer
position_data: {xMin xMax zMin zMax}

// Types of claims there can be
// marker - it is just a marker for something, like a zone, city, place to be (multiple can overlap)
// area - it most of the capabilities of a claim but no player can place it (more permanent)
// mission - like an area, but most ephimeral, it can change its rules or dissapear because of being script controlled
// player - a claim made by a player, has a cost, and can be sold, or subclaims can be made inside it (need to check how thats gonna work) 
type : ["marker, mission, area, player] "subclaim"?? 

dimension : ["overworld, nether, the_end"] 
owner : String
whitelist : String[]
cost : Integer
on_sale : Boolean
permissions : {
    trespass : Boolean
    break_blocks : true/false
    place_blocks : true/false
    interact :
    open_chest :
    kill_players : 
    kill_hostiles : 
    kill_neutral :
    elytra : 
    magic : 
    explosions : 
}
whitelist_permissions {}
subclaims : Integer[]
*/

class ClaimManagerError extends Error {
    constructor (message) {
        super(message)
    }
}