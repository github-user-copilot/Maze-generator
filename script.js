class MazeGenerator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 12;
        this.rooms = [];
        this.corridors = [];
        this.doors = [];
        this.doorWidth = 0.2; // Door width as a fraction of cell size
        
        // Set canvas size based on window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 800;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
    }

    generateMaze(roomCount) {
        this.rooms = [];
        this.corridors = [];
        this.doors = [];
        
        // Generate rooms
        for (let i = 0; i < roomCount; i++) {
            this.generateRoom();
        }

        // Generate corridors between rooms
        this.generateCorridors();

        // Draw everything
        this.draw();
    }

    generateRoom() {
        const minSize = 4;
        const maxSize = 8;
        const width = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const height = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        
        // Try to find a valid position for the room
        let attempts = 0;
        let room;
        do {
            const x = Math.floor(Math.random() * (this.cols - width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.rows - height - 2)) + 1;
            room = { x, y, width, height };
            attempts++;
        } while (this.isRoomOverlapping(room) && attempts < 100);

        if (attempts < 100) {
            this.rooms.push(room);
        }
    }

    isRoomOverlapping(newRoom) {
        return this.rooms.some(room => {
            return !(newRoom.x + newRoom.width < room.x ||
                    newRoom.x > room.x + room.width ||
                    newRoom.y + newRoom.height < room.y ||
                    newRoom.y > room.y + room.height);
        });
    }

    generateCorridors() {
        // Connect each room to the closest other room (MST-like)
        const connected = [this.rooms[0]];
        const unconnected = this.rooms.slice(1);
        while (unconnected.length > 0) {
            let minDist = Infinity, from, to;
            for (const c of connected) {
                for (const u of unconnected) {
                    const d = this.roomDistance(c, u);
                    if (d < minDist) {
                        minDist = d;
                        from = c;
                        to = u;
                    }
                }
            }
            // Connect from -> to
            const point1 = this.getValidDoorPoint(from, to);
            const point2 = this.getValidDoorPoint(to, from);
            this.createCorridor(point1, point2);
            connected.push(to);
            unconnected.splice(unconnected.indexOf(to), 1);
        }
    }

    roomDistance(r1, r2) {
        // Center-to-center distance
        const cx1 = r1.x + r1.width / 2;
        const cy1 = r1.y + r1.height / 2;
        const cx2 = r2.x + r2.width / 2;
        const cy2 = r2.y + r2.height / 2;
        return Math.abs(cx1 - cx2) + Math.abs(cy1 - cy2);
    }

    getValidDoorPoint(room, targetRoom) {
        // Find a wall center closest to the other room
        const cx = targetRoom.x + targetRoom.width / 2;
        const cy = targetRoom.y + targetRoom.height / 2;
        let best = null, minDist = Infinity;
        // Top
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
            const d = Math.abs(x - cx) + Math.abs(room.y - cy);
            if (d < minDist) { minDist = d; best = { x, y: room.y, side: 0 }; }
        }
        // Bottom
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
            const d = Math.abs(x - cx) + Math.abs(room.y + room.height - 1 - cy);
            if (d < minDist) { minDist = d; best = { x, y: room.y + room.height - 1, side: 2 }; }
        }
        // Left
        for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
            const d = Math.abs(room.x - cx) + Math.abs(y - cy);
            if (d < minDist) { minDist = d; best = { x: room.x, y, side: 3 }; }
        }
        // Right
        for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
            const d = Math.abs(room.x + room.width - 1 - cx) + Math.abs(y - cy);
            if (d < minDist) { minDist = d; best = { x: room.x + room.width - 1, y, side: 1 }; }
        }
        return best;
    }

    createCorridor(point1, point2) {
        // Compute corridor endpoints just outside the room walls
        const [start, end] = [this.getCorridorStart(point1), this.getCorridorStart(point2)];
        const corridor = [];
        let x = start.x, y = start.y;
        // Move horizontally to target x
        while (x !== end.x) {
            corridor.push({ x, y });
            x += x < end.x ? 1 : -1;
        }
        // Move vertically to target y
        while (y !== end.y) {
            corridor.push({ x, y });
            y += y < end.y ? 1 : -1;
        }
        corridor.push({ x, y }); // Add the last cell
        this.corridors.push(corridor);
        // Only add doors if they are actually connected to a corridor
        if (this.isDoorConnectedToCorridor(point1, corridor)) this.addDoor(point1);
        if (this.isDoorConnectedToCorridor(point2, corridor)) this.addDoor(point2);
    }

    getCorridorStart(point) {
        // Return the cell just outside the room wall for the door
        const { x, y, side } = point;
        let nx = x, ny = y;
        if (side === 0) ny--;
        if (side === 1) nx++;
        if (side === 2) ny++;
        if (side === 3) nx--;
        return { x: nx, y: ny };
    }

    isDoorConnectedToCorridor(point, corridor) {
        // Check if a corridor cell is directly adjacent to the door location (outside the room)
        const { x, y, side } = point;
        let nx = x, ny = y;
        if (side === 0) ny--;
        if (side === 1) nx++;
        if (side === 2) ny++;
        if (side === 3) nx--;
        return corridor.some(cell => cell.x === nx && cell.y === ny);
    }

    isPointInRoom(x, y) {
        return this.rooms.some(room => {
            return x >= room.x && x < room.x + room.width &&
                   y >= room.y && y < room.y + room.height;
        });
    }

    isPointOnRoomEdge(point) {
        // Only allow doors if the point is on the edge of a room and adjacent to a corridor
        const { x, y, side } = point;
        let nx = x, ny = y;
        if (side === 0) ny--;
        if (side === 1) nx++;
        if (side === 2) ny++;
        if (side === 3) nx--;
        return !this.isPointInRoom(nx, ny);
    }

    addDoor(point) {
        // Draw a short line centered on the wall
        const offset = this.cellSize * 0.2;
        let x1, y1, x2, y2;
        if (point.side === 0 || point.side === 2) {
            // Horizontal wall
            x1 = (point.x + 0.2) * this.cellSize;
            x2 = (point.x + 0.8) * this.cellSize;
            y1 = y2 = (point.y + (point.side === 0 ? 0 : 1)) * this.cellSize;
        } else {
            // Vertical wall
            y1 = (point.y + 0.2) * this.cellSize;
            y2 = (point.y + 0.8) * this.cellSize;
            x1 = x2 = (point.x + (point.side === 3 ? 0 : 1)) * this.cellSize;
        }
        this.doors.push({ x1, y1, x2, y2, width: this.cellSize * this.doorWidth });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw all floors (rooms and corridors) in light pink
        this.ctx.fillStyle = '#ffebf3';
        
        // Draw room floors
        this.rooms.forEach(room => {
            this.ctx.fillRect(
                room.x * this.cellSize,
                room.y * this.cellSize,
                room.width * this.cellSize,
                room.height * this.cellSize
            );
        });

        // Draw corridor floors as continuous paths
        this.corridors.forEach(corridor => {
            corridor.forEach(point => {
                this.ctx.fillRect(
                    point.x * this.cellSize,
                    point.y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            });
        });

        // Draw doors as short red lines
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = this.cellSize * this.doorWidth;
        this.ctx.lineCap = 'round';
        this.doors.forEach(door => {
            this.ctx.beginPath();
            this.ctx.moveTo(door.x1, door.y1);
            this.ctx.lineTo(door.x2, door.y2);
            this.ctx.stroke();
        });

        // Draw thin black walls for rooms only
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 0.5;
        this.ctx.lineCap = 'butt';

        // Draw room walls
        this.rooms.forEach(room => {
            this.ctx.strokeRect(
                room.x * this.cellSize,
                room.y * this.cellSize,
                room.width * this.cellSize,
                room.height * this.cellSize
            );
        });
    }
}

// Initialize the maze generator
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mazeCanvas');
    const generator = new MazeGenerator(canvas);
    
    // Generate initial maze
    generator.generateMaze(5);
    
    // Add event listener for generate button
    document.getElementById('generateBtn').addEventListener('click', () => {
        const roomCount = parseInt(document.getElementById('roomCount').value);
        generator.generateMaze(roomCount);
    });
    
    // Add event listener for maze size
    document.getElementById('mazeSize').addEventListener('change', (e) => {
        const size = e.target.value;
        switch(size) {
            case 'small':
                generator.cellSize = 18;
                break;
            case 'medium':
                generator.cellSize = 12;
                break;
            case 'large':
                generator.cellSize = 8;
                break;
        }
        generator.resizeCanvas();
        generator.generateMaze(parseInt(document.getElementById('roomCount').value));
    });
});
